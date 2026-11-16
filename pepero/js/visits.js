// 访问次数：打开时记一次，显示第几次打开，第 N 次弹出悄悄话
import { CONFIG } from './config.js';
import { $, burst, escapeHTML } from './utils.js';
import { rpc } from './supabase.js';
import { setBunny } from './bunny.js';
import { addFloaters } from './background.js';
import { unlock } from './eggs.js';

export function initVisits(){
  (async function recordVisit(){
    const n=await rpc('record_visit');
    if(typeof n==='number') showVisits(n);
  })();
  $('#noteOk').onclick=()=>{ $('#noteModal').classList.remove('on'); burst(innerWidth/2,innerHeight*.45,['💕','💗','✨'],10); };
  $('#noteModal').onclick=e=>{ if(e.target.id==='noteModal') $('#noteModal').classList.remove('on'); };
}
function showVisits(n){
  const el=$('#visits'), name=escapeHTML(CONFIG.toName);
  el.innerHTML = n===1 ? `<span>✨ ${name}第一次打开这份礼物</span>`
    : n===11 ? `<span>🎉 这是${name}第 11 次打开这份礼物！</span>`
    : `<span>💕 这是${name}第 ${n} 次打开这份礼物</span>`;
  el.classList.add('on');
  // 彩蛋 10：第 11 次打开，金色特别版
  if(n===11){ document.body.classList.add('gold-day'); addFloaters(16); unlock('visit11'); }
  const note=(CONFIG.visitNotes||{})[n];
  if(note) setTimeout(()=>showNote(n,note),1200);
}
// 第 N 次打开的悄悄话弹窗
function showNote(n,text){
  $('#noteNum').textContent=`第 ${n} 次见面的悄悄话`;
  $('#noteText').textContent=text;
  setBunny($('#noteBunny'),'yaha');
  $('#noteModal').classList.add('on');
}
