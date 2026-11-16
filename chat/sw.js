// 聊天页的 Service Worker：只负责显示通知（页面打开时由页面调用 showNotification）
// 和处理点击通知；不做离线缓存，也没有 Web Push。

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) {
      if (c.url.indexOf(self.registration.scope) === 0) {
        try { await c.focus(); } catch (e) { /* 忽略 */ }
        c.postMessage({ type: 'notification-click', peer: data.peer || null, tab: data.tab || null });
        return;
      }
    }
    // 没有已打开的页面：新开一个，带上参数，页面登录后会自己跳转
    const url = new URL('./', self.registration.scope);
    if (data.peer) url.searchParams.set('peer', data.peer);
    else if (data.tab) url.searchParams.set('tab', data.tab);
    await self.clients.openWindow(url.href);
  })());
});
