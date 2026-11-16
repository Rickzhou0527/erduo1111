// 1. 拆礼物
import { $, onLongPress } from '../utils.js';
import { unlock } from '../eggs.js';

export const id='gift';
export function init({ next }){
  // 彩蛋 2：拆之前长按礼盒 2 秒，偷看一眼
  let peeked=false;
  onLongPress($('#gift'),2000,()=>{
    const g=$('#gift'); g.classList.remove('pressing'); g.classList.add('peek');
    $('#giftNote').classList.add('on'); peeked=true; unlock('peek');
  },{
    start:()=>{ if($('#gift').classList.contains('open')) return false; $('#gift').classList.add('pressing'); },
    cancel:()=>$('#gift').classList.remove('pressing'),
  });
  $('#gift').addEventListener('click', ()=>{
    const g=$('#gift'); if(g.classList.contains('open')) return;
    if(peeked){ peeked=false; return; }   // 长按松手时的这次 click 不算，下一次点击再打开
    g.classList.remove('shake','peek','pressing'); g.classList.add('open'); $('#giftNote').classList.remove('on');
    $('#introHint').textContent='乌拉！乌萨奇带着 Pepero 来找你啦';
    setTimeout(()=>$('#toMake').classList.remove('hidden'),700);
  });
  $('#toMake').onclick=()=>next();
}
