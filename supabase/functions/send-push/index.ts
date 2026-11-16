// 聊天小程序的 Web Push 发送函数（Supabase Edge Function，Deno）
//
// 前端在发消息 / 发好友请求 / 通过好友请求之后，带着用户自己的 JWT 调用本函数；
// 函数核对"调用者确实刚刚做了这件事"，再用 VAPID 给对方所有已订阅的设备推送。
// 平台注入：SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY；需要手动设置的 secret：
// VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY、VAPID_SUBJECT。
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import webpush from "npm:web-push@3.6.7";

const ALLOWED_ORIGINS = ["https://rickzhou0527.github.io"];
const LOCAL_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const FRESH_MS = 2 * 60 * 1000;

type PushEvent = { type: "message" | "friend_request" | "friend_accepted"; id: number };
type Payload = { title: string; body: string; tag: string; peer?: string; tab?: string };

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const ok = ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN_RE.test(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function reply(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

// 特效表情 "[雪球]" 或定向的 "[雪球]#123"：去掉结尾的 #数字，不让原始 id 出现在通知里
function stripStickerId(s: string): string {
  return s.replace(/^(\[[^\[\]]{1,6}\])#\d+$/, "$1");
}

function cut(s: string, n: number): string {
  const chars = Array.from(s);
  return chars.length > n ? chars.slice(0, n).join("") + "…" : s;
}

// 只往浏览器官方的推送服务发请求（Apple、Google/FCM、Mozilla、Microsoft），
// 防止有人登记一个任意网址，让本函数替他向别的服务器发请求
const PUSH_HOST_RE = /^(fcm\.googleapis\.com|android\.googleapis\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com)$/i;
function isPushService(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

function isFresh(ts: string | null | undefined): boolean {
  const t = ts ? Date.parse(ts) : NaN;
  return Number.isFinite(t) && Date.now() - t < FRESH_MS && t - Date.now() < 60 * 1000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method_not_allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  if (!url || !adminKey || !vapidPublic || !vapidPrivate || !vapidSubject) {
    return reply(req, 500, { error: "not_configured" });
  }

  // 解析请求
  let ev: PushEvent;
  try {
    const b = await req.json();
    if (!b || !["message", "friend_request", "friend_accepted"].includes(b.type) || !Number.isSafeInteger(b.id) || b.id <= 0) {
      return reply(req, 400, { error: "invalid_body" });
    }
    ev = { type: b.type, id: b.id };
  } catch {
    return reply(req, 400, { error: "invalid_body" });
  }

  const admin = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 调用者身份来自 JWT
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !auth?.user) return reply(req, 401, { error: "not_authenticated" });
  const me = auth.user.id;

  // 核对事件，得出收件人、推送内容和去重用的 ref_id
  let recipient: string;
  let payload: Payload;
  let refId: number;

  if (ev.type === "message") {
    const { data: m } = await admin.from("messages").select("id,sender_id,receiver_id,body,created_at,reply_to").eq("id", ev.id).maybeSingle();
    if (!m || m.sender_id !== me) return reply(req, 403, { error: "forbidden" });
    if (!isFresh(m.created_at)) return reply(req, 400, { error: "too_old" });
    const { data: p } = await admin.from("profiles").select("nickname").eq("id", me).maybeSingle();
    recipient = m.receiver_id;
    refId = m.id;
    // 引用回复：推送正文前加上 回复「被引用的内容」
    let prefix = "";
    if (typeof m.reply_to === "number") {
      const { data: q } = await admin.from("messages").select("body").eq("id", m.reply_to).maybeSingle();
      if (q && typeof q.body === "string") prefix = "回复「" + cut(stripStickerId(q.body).replace(/^\[([^\[\]]{1,6})\]$/, "$1").replace(/\s+/g, " "), 20) + "」"; // 特效表情 "[水枪]" 显示成 水枪
    }
    payload = { title: p?.nickname ?? "新消息", body: cut(prefix + stripStickerId(m.body), 80), tag: "msg-" + me, peer: me };
  } else {
    const { data: f } = await admin.from("friendships").select("id,requester_id,addressee_id,status,updated_at").eq("id", ev.id).maybeSingle();
    if (!f) return reply(req, 403, { error: "forbidden" });
    const wantStatus = ev.type === "friend_request" ? "pending" : "accepted";
    const caller = ev.type === "friend_request" ? f.requester_id : f.addressee_id;
    if (caller !== me || f.status !== wantStatus) return reply(req, 403, { error: "forbidden" });
    if (!isFresh(f.updated_at)) return reply(req, 400, { error: "too_old" });
    const { data: p } = await admin.from("profiles").select("nickname").eq("id", me).maybeSingle();
    const name = p?.nickname ?? "好友";
    // 被拒绝后可以重新发起，同一行 id 会复用，所以把更新时间（秒）拼进去重键
    refId = f.id * 10_000_000_000 + Math.floor(Date.parse(f.updated_at) / 1000);
    if (ev.type === "friend_request") {
      recipient = f.addressee_id;
      payload = { title: "新的好友请求", body: name + " 想加你为好友", tag: "req-" + me, tab: "friends" };
    } else {
      recipient = f.requester_id;
      payload = { title: "好友请求已通过", body: name + " 通过了你的好友请求", tag: "req-" + me, peer: me };
    }
  }

  // 先占位：已经推送过就跳过（并发或重放）
  const { error: logErr } = await admin.from("push_log").insert({ kind: ev.type, ref_id: refId });
  if (logErr) {
    if (logErr.code === "23505") return reply(req, 200, { skipped: true });
    return reply(req, 500, { error: "log_failed" });
  }

  const { data: subs, error: subErr } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", recipient);
  if (subErr) return reply(req, 500, { error: "subscriptions_failed" });
  if (!subs || subs.length === 0) return reply(req, 200, { sent: 0, removed: 0 });

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const text = JSON.stringify(payload);
  let sent = 0;
  const gone: number[] = [];
  const ok: number[] = [];
  await Promise.all(subs.map(async (s) => {
    if (!isPushService(s.endpoint)) {
      gone.push(s.id); // 不是推送服务的地址：不发，顺手删掉
      return;
    }
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        text,
        { TTL: 60 * 60 * 24, urgency: "high" },
      );
      sent++;
      ok.push(s.id);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) gone.push(s.id);
      else console.error("push failed", code ?? String(e));
    }
  }));

  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  if (ok.length) await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", ok);
  return reply(req, 200, { sent, removed: gone.length });
});
