// 2. 做 Pepero
import { CONFIG } from '../config.js';
import { $, show, replayAnim } from '../utils.js';
import { rpc } from '../supabase.js';
import { setBunny } from '../bunny.js';
import { unlock } from '../eggs.js';

export const id='make';
export const FLAVORS=[
  {n:'牛奶巧克力',c:'#6B3E26'},{n:'草莓',c:'#FF8FAB'},{n:'抹茶',c:'#8DB86B'},{n:'白巧克力',c:'#FFF6E0'},
];
const SPRINKLES=[
  {n:'彩虹糖针',c:['#FF6F94','#FFE066','#7BD3EA','#A6E3A1','#fff']},
  {n:'粉色爱心',c:['#FF6F94','#FFC2D1']},{n:'杏仁碎',c:['#D9A066','#F2D3A0']},
];
let flavor=null, sprinkle=null;
export const getFlavor=()=>flavor;
function addChip(container,f,onPick,dot){
  const b=document.createElement('button'); b.className='chip';
  b.innerHTML=`<i style="background:${dot(f)}"${f.rainbow?' class="rainbow-dot"':''}></i>${f.n}`;
  b.onclick=()=>{container.querySelectorAll('.chip').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');onPick(f)};
  container.appendChild(b); return b;
}
function chips(container,list,onPick,dot){ list.forEach(f=>addChip(container,f,onPick,dot)); }
// 彩蛋 5：4 种口味都试过后，解锁隐藏的彩虹口味
const RAINBOW={n:'🌈 彩虹',db:'彩虹',c:'#FF6F94',rainbow:true,
  colors:['#FF6F94','#FFB86B','#FFE066','#A6E3A1','#7BD3EA','#C3A6FF'],
  bg:'linear-gradient(#FF6F94 0 17%,#FFB86B 17% 34%,#FFE066 34% 51%,#A6E3A1 51% 68%,#7BD3EA 68% 85%,#C3A6FF 85%)'};
const tried=new Set();
function pickFlavor(f){
  flavor=f; const c=$('#coat'); c.style.background=f.bg||f.c; c.classList.add('on');
  if(sprinkle) showCombo();
  else $('#makeHint').textContent = f.rainbow ? '彩虹 Pepero！只有你有 🌈' : '② 撒点装饰';
  replayAnim($('#makeBunny'),'jump');
  if(!f.rainbow){
    tried.add(f.n);
    if(tried.size===FLAVORS.length && !$('#flavors .chip.new')){
      addChip($('#flavors'),RAINBOW,pickFlavor,()=>'').classList.add('new');
      $('#makeHint').classList.remove('reply'); $('#makeHint').textContent='每种都尝过了？解锁隐藏口味 🌈';
      unlock('rainbow');
    }
  }
}
let lastCombo='';
function comboKey(){ return `${flavor.db||flavor.n}+${sprinkle.n}`; }
function showCombo(){
  const key=comboKey(), hint=$('#makeHint');
  hint.textContent=(CONFIG.peperoReplies||{})[key]||'好看！这根是你的 ✨';
  hint.classList.add('reply'); replayAnim(hint,'jump');
  if(key!==lastCombo){ lastCombo=key; rpc('record_pepero',{p_flavor:flavor.db||flavor.n,p_sprinkle:sprinkle.n,p_final:false}); }
}

// 进入这一步
export function enter(){ show('#s-make'); }

export function init({ next }){
  chips($('#flavors'),FLAVORS,pickFlavor,f=>f.c);
  chips($('#sprinkles'),SPRINKLES,s=>{
    if(!flavor){ $('#makeHint').textContent='先选巧克力口味哦'; return; }
    sprinkle=s; const c=$('#coat'); c.querySelectorAll('.sp').forEach(e=>e.remove());
    for(let i=0;i<26;i++){
      const d=document.createElement('span'); d.className='sp';
      d.style.background=s.c[i%s.c.length];
      d.style.left=(Math.random()*16)+'px'; d.style.top=(4+Math.random()*90)+'%';
      d.style.transform=`rotate(${Math.random()*180}deg)`;
      if(s.n==='粉色爱心'){d.style.borderRadius='50%';d.style.height='6px';d.style.width='6px'}
      c.appendChild(d);
    }
    setBunny($('#makeBunny'),'yaha');
    showCombo();
    $('#toGame').classList.remove('hidden');
  },s=>s.c[0]);
  $('#toGame').onclick=()=>{
    if(flavor && sprinkle) rpc('record_pepero',{p_flavor:flavor.db||flavor.n,p_sprinkle:sprinkle.n,p_final:true});
    next(false);
  };
}
