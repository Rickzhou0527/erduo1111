// 通用小工具：选择器、切场景、转义、长按、飞出文字、Pepero 雨
export const $ = s => document.querySelector(s);
export const show = id => { document.querySelectorAll('.scene').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); };
export function escapeHTML(s){ return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
// 通用：长按
export function onLongPress(el,ms,fn,{start,cancel}={}){
  let t=null;
  el.addEventListener('pointerdown',e=>{ if(start&&start()===false) return; t=setTimeout(()=>{ t=null; fn(e); },ms); });
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>el.addEventListener(ev,()=>{ if(t){ clearTimeout(t); t=null; cancel&&cancel(); } }));
  el.addEventListener('contextmenu',e=>e.preventDefault());
}
// 通用：从某个点向四周飞出文字
export function burst(x,y,texts,n=12){
  for(let i=0;i<n;i++){
    const s=document.createElement('span'); s.className='burst';
    s.textContent=texts[i%texts.length];
    const a=Math.PI*2*i/n+Math.random()*.4, d=90+Math.random()*90;
    s.style.left=x+'px'; s.style.top=y+'px';
    s.style.setProperty('--dx',Math.cos(a)*d+'px'); s.style.setProperty('--dy',Math.sin(a)*d+'px');
    s.style.animationDelay=(Math.random()*.25)+'s';
    document.body.appendChild(s); setTimeout(()=>s.remove(),1800);
  }
}
// 通用：Pepero 雨
export function peperoRain(n=60){
  const cols=['#6B3E26','#FF8FAB','#8DB86B','#FFF6E0'];
  for(let i=0;i<n;i++){
    const d=document.createElement('div'); d.className='rain';
    const c=cols[i%cols.length];
    d.style.background=`linear-gradient(${c} 0 70%, #E9B872 70%)`;
    d.style.left=Math.random()*100+'vw';
    d.style.setProperty('--r',(Math.random()*720-360)+'deg');
    d.style.animationDuration=(2+Math.random()*2.5)+'s';
    d.style.animationDelay=(Math.random()*1.2)+'s';
    document.body.appendChild(d); setTimeout(()=>d.remove(),6000);
  }
}
export function replayAnim(el,cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
