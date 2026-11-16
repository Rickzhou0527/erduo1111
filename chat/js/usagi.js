// Usagi 图片（加载失败时退化成 emoji）

import { $, clear, h } from './utils.js';

// ===== Usagi 图片（加载失败时退化成 emoji，不出现裂图） =====
var IMG_NORMAL = 'usagi.png', IMG_YAHA = 'usagi-yaha.png';
export function usagi(kind, cls) {
  var wrap = document.createDocumentFragment();
  var img = h('img', { class: 'usagi ' + (cls || ''), src: kind === 'yaha' ? IMG_YAHA : IMG_NORMAL, alt: '', draggable: 'false' });
  img.addEventListener('error', function () {
    var f = h('span', { class: 'usagi-fallback ' + (cls || ''), text: '🐰', 'aria-hidden': 'true' });
    if (img.parentNode) img.parentNode.replaceChild(f, img);
  });
  wrap.appendChild(img);
  return wrap;
}
export function setUsagi(box, kind) { clear(box).appendChild(usagi(kind)); }
export function emptyState(text, tiny) {
  return h('div', { class: 'empty' + (tiny ? ' tiny' : '') }, usagi('normal', 'bob'), h('p', { text: text }));
}
export function popYaha(text) {
  var pop = $('pop');
  clear(pop).appendChild(h('div', { class: 'yaha' }, usagi('yaha'), h('div', { class: 'shout', text: text || '呀哈！' })));
  pop.hidden = false;
  setTimeout(function () { pop.hidden = true; clear(pop); }, 1700);
}
