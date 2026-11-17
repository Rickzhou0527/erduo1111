// agent.ts 的本地测试：用假的数据库和假的 OpenAI（mock fetch），不访问网络
// 运行：deno test supabase/functions/agent-chat/agent_test.ts
import { extractReply, MAX_REPLY, runJob } from "./agent.ts";

const ASKER = "11111111-1111-1111-1111-111111111111";
const PEER = "22222222-2222-2222-2222-222222222222";

type Q = { table: string; action: string; payload?: unknown; filters: [string, unknown][]; single: boolean };

// 可链式调用的假查询：所有方法返回自己，await 时交给 handler 算结果
function fakeDb(handler: (q: Q) => { data?: unknown; error?: unknown }, rpc: (fn: string, args: Record<string, unknown>) => { data?: unknown; error?: unknown }) {
  const log: Q[] = [];
  const builder = (table: string) => {
    const q: Q = { table, action: "select", filters: [], single: false };
    // deno-lint-ignore no-explicit-any
    const b: any = {};
    for (const m of ["select", "insert", "update", "delete"]) {
      b[m] = (payload?: unknown) => { if (m !== "select" || q.action === "select") { q.action = m; if (m !== "select") q.payload = payload; } return b; };
    }
    for (const m of ["eq", "in", "or", "order", "limit", "not"]) b[m] = (...a: unknown[]) => { if (m === "eq" || m === "in") q.filters.push([String(a[0]), a[1]]); return b; };
    b.maybeSingle = () => { q.single = true; return Promise.resolve(run()); };
    b.single = () => { q.single = true; return Promise.resolve(run()); };
    // deno-lint-ignore no-explicit-any
    b.then = (res: any, rej: any) => Promise.resolve(run()).then(res, rej);
    const run = () => {
      log.push(q);
      const r = handler(q);
      return { data: r.data ?? null, error: r.error ?? null };
    };
    return b;
  };
  return { admin: { from: builder, rpc: (fn: string, args: Record<string, unknown>) => Promise.resolve({ data: null, error: null, ...rpc(fn, args) }) }, log };
}

function world() {
  const state = {
    job: { id: 7, asker: ASKER, peer: PEER, message_id: 100, status: "running" } as Record<string, unknown>,
    memories: [{ id: 1, content: "她不吃香菜" }] as { id: number; content: string }[],
    messages: [] as Record<string, unknown>[],
    nextMem: 2,
    jobUpdates: [] as Record<string, unknown>[],
    searches: [] as Record<string, unknown>[],
  };
  const handler = (q: Q) => {
    if (q.table === "agent_jobs" && q.action === "select") return { data: state.job };
    if (q.table === "agent_jobs" && q.action === "update") { state.jobUpdates.push(q.payload as Record<string, unknown>); Object.assign(state.job, q.payload); return {}; }
    if (q.table === "friendships") return { data: [{ id: 1 }] };
    if (q.table === "profiles") return { data: [{ id: ASKER, nickname: "小红" }, { id: PEER, nickname: "小明" }] };
    if (q.table === "agent_memories" && q.action === "select") return { data: state.memories };
    if (q.table === "agent_memories" && q.action === "insert") { const id = state.nextMem++; state.memories.push({ id, content: (q.payload as { content: string }).content }); return { data: { id } }; }
    if (q.table === "agent_memories" && q.action === "delete") { const id = q.filters.find((f) => f[0] === "id")![1]; const n = state.memories.length; state.memories = state.memories.filter((m) => m.id !== id); return { data: n === state.memories.length ? [] : [{ id }] }; }
    if (q.table === "messages" && q.action === "select" && q.single) return { data: { sender_id: ASKER, body: "@榴莲 上次说的爬山是哪天？顺便查下明天天气" } };
    if (q.table === "messages" && q.action === "select") return { data: [{ id: 100, sender_id: ASKER, author: null, body: "@榴莲 上次说的爬山是哪天？顺便查下明天天气", created_at: "2026-11-18T01:00:00Z" }] };
    if (q.table === "messages" && q.action === "insert") { const row = { id: 200, ...(q.payload as object) }; state.messages.push(row); return { data: { id: 200 } }; }
    return {};
  };
  const rpc = (fn: string, args: Record<string, unknown>) => {
    if (fn === "agent_search_messages") { state.searches.push(args); return { data: [{ id: 50, sender_id: PEER, author: null, body: "周末去爬山", created_at: "2026-11-14T02:30:00Z" }] }; }
    return {};
  };
  return { state, ...fakeDb(handler, rpc) };
}

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { "Content-Type": "application/json" } });
const noPush = () => Promise.resolve();

Deno.test("tool loop: search_chats -> remember -> final text with web citation; reply stored, job done", async () => {
  const w = world();
  const requests: Record<string, unknown>[] = [];
  const script = [
    { id: "resp_1", output: [{ type: "web_search_call", id: "ws_1", status: "completed" }, { type: "function_call", call_id: "call_a", name: "search_chats", arguments: JSON.stringify({ query: "爬山", limit: 5 }) }] },
    { id: "resp_2", output: [{ type: "function_call", call_id: "call_b", name: "remember", arguments: JSON.stringify({ content: "他们周末去爬山" }) }, { type: "function_call", call_id: "call_c", name: "forget", arguments: JSON.stringify({ id: 1 }) }] },
    { id: "resp_3", output: [{ type: "message", content: [{ type: "output_text", text: "周六。明天多云，带件外套。", annotations: [{ type: "url_citation", url: "https://weather.example/cn", title: "天气", start_index: 0, end_index: 3 }] }] }] },
  ];
  let i = 0;
  const pushes: unknown[] = [];
  await runJob({
    admin: w.admin, apiKey: "test-key", model: "gpt-6-luna",
    fetchFn: ((_u: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)));
      if (new Headers(init.headers).get("Authorization") !== "Bearer test-key") throw new Error("auth header");
      return Promise.resolve(json(script[i++]));
    }) as unknown as typeof fetch,
    push: (to, p) => { pushes.push([to, p]); return Promise.resolve(); },
  }, 7);

  // 请求形状
  if (requests.length !== 3) throw new Error("expected 3 requests, got " + requests.length);
  const r0 = requests[0] as { model: string; instructions: string; tools: { type: string; name?: string }[]; input: { content: string }[]; previous_response_id?: string };
  if (r0.model !== "gpt-6-luna") throw new Error("model");
  if (!r0.tools.some((t) => t.type === "web_search")) throw new Error("web_search tool missing");
  for (const n of ["search_chats", "remember", "forget"]) if (!r0.tools.some((t) => t.name === n)) throw new Error("tool " + n);
  if (!r0.instructions.includes("你叫**榴莲**") || !r0.instructions.includes("小红") || !r0.instructions.includes("不要使用 emoji")) throw new Error("instructions");
  if (r0.previous_response_id) throw new Error("first request must not chain");
  const text0 = r0.input[0].content;
  if (!text0.includes("[#1] 她不吃香菜") || !text0.includes("小红：@榴莲") || !text0.includes("2026-11-18 09:00")) throw new Error("input context: " + text0);
  const r1 = requests[1] as { previous_response_id: string; input: { type: string; call_id: string; output: string }[] };
  if (r1.previous_response_id !== "resp_1" || r1.input[0].type !== "function_call_output" || r1.input[0].call_id !== "call_a") throw new Error("chaining 1");
  if (!r1.input[0].output.includes("周末去爬山") || !r1.input[0].output.includes("2026-11-14 10:30") || !r1.input[0].output.includes("小明")) throw new Error("search output: " + r1.input[0].output);
  const r2 = requests[2] as { previous_response_id: string; input: { call_id: string; output: string }[] };
  if (r2.previous_response_id !== "resp_2" || r2.input.length !== 2 || r2.input[1].call_id !== "call_c") throw new Error("chaining 2");
  if (!r2.input[1].output.includes('"deleted":1')) throw new Error("forget output " + r2.input[1].output);

  // 工具副作用：只搜这一对；记忆写入/删除
  if (w.state.searches[0].p_a !== ASKER || w.state.searches[0].p_b !== PEER || w.state.searches[0].p_limit !== 5) throw new Error("search args");
  if (w.state.memories.map((m) => m.content).join() !== "他们周末去爬山") throw new Error("memories: " + JSON.stringify(w.state.memories));

  // 回复
  const msg = w.state.messages[0] as { sender_id: string; receiver_id: string; author: string; body: string };
  if (msg.author !== "durian" || msg.sender_id !== ASKER || msg.receiver_id !== PEER) throw new Error("reply row");
  if (!msg.body.startsWith("周六。明天多云") || !msg.body.includes("https://weather.example/cn")) throw new Error("reply body (citation appended): " + msg.body);
  if (w.state.job.status !== "done" || w.state.job.reply_id !== 200) throw new Error("job not done: " + JSON.stringify(w.state.job));
  // 推送给双方，标题榴莲
  if (pushes.length !== 2) throw new Error("expected 2 pushes");
  const [p0, p1] = pushes as [string, { title: string; peer: string }][];
  if (p0[1].title !== "榴莲" || p0[0] !== ASKER || p0[1].peer !== PEER || p1[0] !== PEER || p1[1].peer !== ASKER) throw new Error("push targets");
});

Deno.test("missing OPENAI_API_KEY -> failed agent_unconfigured, no network", async () => {
  const w = world();
  let called = 0;
  await runJob({ admin: w.admin, apiKey: undefined, model: "m", fetchFn: (() => { called++; return Promise.resolve(json({})); }) as unknown as typeof fetch, push: noPush }, 7);
  if (called) throw new Error("must not call OpenAI");
  if (w.state.job.status !== "failed" || w.state.job.error !== "agent_unconfigured" || w.state.messages.length) throw new Error(JSON.stringify(w.state.job));
});

Deno.test("OpenAI http error -> failed openai_http, raw error never stored", async () => {
  const w = world();
  await runJob({ admin: w.admin, apiKey: "k", model: "m", fetchFn: (() => Promise.resolve(new Response('{"error":{"message":"sk-secret leaked"}}', { status: 500 }))) as unknown as typeof fetch, push: noPush }, 7);
  if (w.state.job.status !== "failed" || w.state.job.error !== "openai_http") throw new Error(JSON.stringify(w.state.job));
  if (JSON.stringify(w.state.jobUpdates).includes("secret")) throw new Error("leak");
});

Deno.test("timeout -> failed timeout", async () => {
  const w = world();
  await runJob({
    admin: w.admin, apiKey: "k", model: "m", timeoutMs: 30, push: noPush,
    fetchFn: ((_u: string, init: RequestInit) => new Promise((_res, rej) => {
      init.signal!.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
    })) as unknown as typeof fetch,
  }, 7);
  if (w.state.job.status !== "failed" || w.state.job.error !== "timeout") throw new Error(JSON.stringify(w.state.job));
});

Deno.test("endless tool calls: last round forces tool_choice none, then fails cleanly if still no text", async () => {
  const w = world();
  const bodies: Record<string, unknown>[] = [];
  let n = 0;
  await runJob({
    admin: w.admin, apiKey: "k", model: "m", push: noPush,
    fetchFn: ((_u: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return Promise.resolve(json({ id: "r" + n, output: [{ type: "function_call", call_id: "c" + n++, name: "search_chats", arguments: '{"query":"x"}' }] }));
    }) as unknown as typeof fetch,
  }, 7);
  // 第 6 轮之后不会再有第 7 次请求；最后一次带 tool_choice none
  if (bodies.length !== 6 || bodies[5].tool_choice !== "none" || bodies[0].tool_choice) throw new Error("rounds " + bodies.length);
});

Deno.test("empty model text -> failed empty_reply", async () => {
  const w = world();
  await runJob({ admin: w.admin, apiKey: "k", model: "m", push: noPush, fetchFn: (() => Promise.resolve(json({ id: "r", output: [{ type: "message", content: [{ type: "output_text", text: "  " }] }] }))) as unknown as typeof fetch }, 7);
  if (w.state.job.error !== "empty_reply") throw new Error(JSON.stringify(w.state.job));
});

Deno.test("extractReply caps at 4000 chars", () => {
  const out = extractReply([{ type: "message", content: [{ type: "output_text", text: "长".repeat(5000) }] }]);
  if (Array.from(out).length !== MAX_REPLY) throw new Error("length " + Array.from(out).length);
});
