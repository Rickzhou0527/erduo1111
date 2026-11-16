// 乌萨奇：画的 SVG、图片优先级，以及往容器里放乌萨奇
import { CONFIG } from './config.js';
import { $ } from './utils.js';

/* ---------- 乌萨奇（平时 / 呀哈） ---------- */
export function bunnySVG(mood){
  const yaha = mood==='yaha';
  const Y='#FFF1CB', INK='#412521', PINK='#FFC2CA', sw=7;
  const arms = yaha
    ? `<path d="M62 150 C34 132 22 96 46 82 C64 90 76 128 78 158 C74 172 66 170 62 150Z" fill="${Y}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>
       <path d="M222 150 C250 132 262 96 238 82 C220 90 208 128 206 158 C210 172 218 170 222 150Z" fill="${Y}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`
    : `<path d="M52 292 C38 300 36 322 50 330 C62 328 68 312 64 296Z" fill="${Y}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>
       <path d="M232 292 C246 300 248 322 234 330 C222 328 216 312 220 296Z" fill="${Y}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  const mouth = yaha
    ? `<ellipse cx="142" cy="228" rx="10" ry="12" fill="#6d3544" stroke="${INK}" stroke-width="5"/>
       <ellipse cx="142" cy="233" rx="6" ry="5.5" fill="#FF9BB5"/>`
    : `<path d="M126 220 C132 210 140 212 142 222 C143 232 138 238 144 238 C150 236 146 228 148 220 C152 210 160 210 166 220" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`;
  return `<svg viewBox="8 0 268 400" width="268" height="400" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="116" cy="70" rx="20" ry="58" fill="${Y}" stroke="${INK}" stroke-width="${sw}"/>
    <ellipse cx="168" cy="70" rx="20" ry="58" fill="${Y}" stroke="${INK}" stroke-width="${sw}"/>
    <ellipse cx="116" cy="78" rx="10" ry="40" fill="${PINK}"/>
    <ellipse cx="168" cy="78" rx="10" ry="40" fill="${PINK}"/>
    ${arms}
    <ellipse cx="130" cy="352" rx="14" ry="16" fill="${Y}" stroke="${INK}" stroke-width="${sw}"/>
    <ellipse cx="154" cy="352" rx="14" ry="16" fill="${Y}" stroke="${INK}" stroke-width="${sw}"/>
    <ellipse cx="142" cy="230" rx="112" ry="114" fill="${Y}" stroke="${INK}" stroke-width="${sw}"/>
    <path d="M118 168 C106 158 94 160 84 172" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M166 168 C178 158 190 160 200 172" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="110" cy="202" rx="13" ry="12" fill="${INK}"/>
    <ellipse cx="176" cy="202" rx="13" ry="12" fill="${INK}"/>
    <ellipse cx="109" cy="198" rx="7" ry="5.2" fill="#fff"/>
    <ellipse cx="175" cy="198" rx="7" ry="5.2" fill="#fff"/>
    <ellipse cx="72" cy="232" rx="22" ry="15" fill="${PINK}"/>
    <ellipse cx="214" cy="230" rx="22" ry="15" fill="${PINK}"/>
    <g stroke="${INK}" stroke-width="3.4" stroke-linecap="round">
      <path d="M62 224 v13 M72 222 v15 M82 224 v13"/>
      <path d="M204 222 v13 M214 220 v15 M224 222 v13"/>
    </g>
    ${mouth}
  </svg>`;
}
export function bunnySrc(mood){
  return (mood==='yaha' && CONFIG.bunnyImageYaha) || CONFIG.bunnyImage || '';
}
function bunnyHTML(mood){
  const src=bunnySrc(mood);
  return src ? `<img src="${src}" style="width:100%;display:block" alt="乌萨奇">` : bunnySVG(mood);
}
export function setBunny(el, mood){
  el.innerHTML = bunnyHTML(mood);
  const img=el.querySelector('img');
  if(img) img.onerror=()=>{ img.outerHTML=bunnySVG(mood); };
}

// 首页礼盒、做 Pepero、信件页的乌萨奇
export function initBunnies(){
  ['#makeBunny','#letterBunny'].forEach(s=>setBunny($(s),'happy'));
  { const d=document.createElement('div'); $('#popBunny').appendChild(d); setBunny(d,'yaha'); }
}
