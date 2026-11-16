// "+" 工具面板

import { nearBottom, scrollToBottom } from './chat/view.js';
import { svgIcon } from './menu.js';
import { layoutApp } from './miniapps/host.js';
import { listMiniApps } from './miniapps/registry.js';
import { $, h } from './utils.js';

// ===== "+" 工具面板 =====
// 以后加工具：新建 miniapps/<名字>.js，再到 miniapps/registry.js 的 listMiniApps() 里加一行即可（图标用 SVG 符号 id，run 里调用 openApp(id, params)）
function plusTools() { return listMiniApps(); }
export function buildPlusPanel() {
  var g = $('toolGrid');
  plusTools().forEach(function (t) {
    var b = h('button', { type: 'button', 'aria-label': t.label }, svgIcon(t.icon), h('span', { text: t.label }));
    b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); }); // 不抢输入框焦点
    b.addEventListener('click', function () { closePanels(); t.run(); });
    g.appendChild(b);
  });
}
// 表情面板和 + 面板互斥，占同一个位置
export function setPanel(which) {
  var e = $('emojiPanel'), p = $('plusPanel'), nb = nearBottom();
  [[e, which === 'emoji'], [p, which === 'plus']].forEach(function (x) {
    if (x[0].hidden !== x[1]) return; // 状态没变
    x[0].hidden = !x[1];
    x[0].classList.remove('panel-up');
    if (x[1]) { void x[0].offsetWidth; x[0].classList.add('panel-up'); }
  });
  $('plusBtn').classList.toggle('open', which === 'plus');
  $('plusBtn').setAttribute('aria-expanded', which === 'plus' ? 'true' : 'false');
  if (which) $('input').blur();
  layoutApp();
  if (nb) setTimeout(scrollToBottom, 0);
}
export function closePanels() { setPanel(null); }
