// 通知 + Web Push

import { VAPID_PUBLIC_KEY } from './config.js';
import { previewOf } from './fx/table.js';
import { S, avatarUrl, profileOf, sb } from './state.js';
import { cut } from './utils.js';
import { notifOn } from './views/me.js';

// ===== 通知 =====
var swReg = null;
async function getReg() {
  if (swReg) return swReg;
  if (!('serviceWorker' in navigator)) return null;
  try { swReg = await navigator.serviceWorker.ready; } catch (e) { swReg = null; }
  return swReg;
}
// ===== Web Push =====
export function pushSupported() { return 'PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window; }
function urlB64ToBytes(b64) {
  var pad = '='.repeat((4 - b64.length % 4) % 4);
  var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  var out = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
function bytesToB64Url(buf) {
  var bin = '', a = new Uint8Array(buf);
  for (var i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function savePushSub(sub) {
  var j = sub.toJSON();
  var keys = j.keys || {};
  var r = await sb.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: keys.p256dh || bytesToB64Url(sub.getKey('p256dh')),
    p_auth: keys.auth || bytesToB64Url(sub.getKey('auth')),
    p_user_agent: navigator.userAgent.slice(0, 300)
  });
  return r.error;
}
// 订阅并保存；成功返回 null，失败返回中文提示
export async function pushSubscribe() {
  try {
    var reg = await getReg();
    if (!reg) return '通知服务还没准备好，请刷新页面后再试';
    var sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToBytes(VAPID_PUBLIC_KEY) });
    var err = await savePushSub(sub);
    if (err) { console.error(err); return '保存通知设置失败，请稍后再试'; }
    return null;
  } catch (e) {
    console.error(e);
    return '开启通知失败，请稍后再试';
  }
}
// 关闭通知或退出登录：取消订阅并删除服务器上的记录（尽力而为）
export async function pushUnsubscribe() {
  if (!pushSupported()) return;
  try {
    var reg = await getReg();
    var sub = reg && await reg.pushManager.getSubscription();
    if (!sub) return;
    var endpoint = sub.endpoint;
    try { if (S.me) await sb.rpc('delete_push_subscription', { p_endpoint: endpoint }); } catch (e) { /* 忽略 */ }
    await sub.unsubscribe();
  } catch (e) { /* 忽略 */ }
}
// 登录后重新同步（订阅地址可能被浏览器轮换，或换了账号）
export async function pushSync() {
  if (!pushSupported() || !notifOn()) return;
  var err = await pushSubscribe();
  if (err) console.warn('push sync failed');
}
// 操作成功后通知服务器去推送；不等结果，失败也不影响界面
// 能不能收到推送取决于对方的设备，跟发送方的浏览器支不支持 Push 无关，所以这里不检查 pushSupported()
export function firePush(type, id) {
  if (!id || !sb) return;
  try {
    var p = sb.functions.invoke('send-push', { body: { type: type, id: id } });
    if (p && p.catch) p.catch(function () { /* 忽略 */ });
  } catch (e) { /* 忽略 */ }
}

export async function notify(opts) {
  if (!notifOn()) return;
  if (pushSupported()) return; // 支持 Push 时由服务器推送，页面不再重复弹通知
  try {
    var reg = await getReg();
    if (!reg) return;
    await reg.showNotification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      renotify: true,
      icon: opts.icon || new URL('icon-192.png', location.href).href,
      badge: new URL('icon-192.png', location.href).href,
      data: opts.data || {}
    });
  } catch (e) { /* 通知失败不影响聊天 */ }
}
export async function closeNotifications(tag) {
  try {
    var reg = await getReg();
    if (!reg) return;
    (await reg.getNotifications({ tag: tag })).forEach(function (n) { n.close(); });
  } catch (e) { /* 忽略 */ }
}
export function notifyMessage(m, prefix) {
  var p = profileOf(m.sender_id);
  notify({
    title: p ? p.nickname : '新消息',
    body: cut((prefix || '') + previewOf(m.body), 80),
    tag: 'msg-' + m.sender_id,
    icon: p && avatarUrl(p.avatar_path),
    data: { peer: m.sender_id }
  });
}
