// 빼빼로 只给这几个账号看：读 chat 登录后 supabase-js 存在 localStorage 的会话（同一个域名下共享）
// 首页用它决定显不显示入口；pepero 页面在 <head> 里用它把别人送回首页
(function () {
  var ALLOW = ['rick0527', 'rickzhou'];
  function currentUser() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!/^sb-.+-auth-token$/.test(k)) continue;
        var v = JSON.parse(localStorage.getItem(k) || 'null');
        var u = v && (v.user || (v.currentSession && v.currentSession.user));
        var name = ((u && u.email) || '').split('@')[0].toLowerCase();
        if (name) return name;
      }
    } catch (e) { /* 读不到就当没登录 */ }
    return '';
  }
  window.PEPERO_OK = ALLOW.indexOf(currentUser()) >= 0;
})();
