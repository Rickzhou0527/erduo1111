// 4. 信：打字机效果，署名长按翻到背面看 P.S.
import { CONFIG } from '../config.js';
import { $, show, escapeHTML, onLongPress, peperoRain, replayAnim } from '../utils.js';
import { setBunny } from '../bunny.js';
import { unlock } from '../eggs.js';

export const id='letter';
export function letterTo(){ $('#letterTo').innerHTML=`给 ${CONFIG.toTitle?`<span class="to-title">${escapeHTML(CONFIG.toTitle)}</span> `:''}${escapeHTML(CONFIG.toName)}：`; }
let typing;
function typeLetter(){
  clearInterval(typing);
  if(psShown){ psShown=false; $('.card').classList.remove('ps'); letterTo(); }
  const full=CONFIG.message.join('\n'); const el=$('#msg'); let i=0;
  setBunny($('#letterBunny'),'happy');
  typing=setInterval(()=>{
    i++; el.innerHTML=escapeHTML(full.slice(0,i))+'<span class="cur"></span>';
    if(i>=full.length){ clearInterval(typing); setBunny($('#letterBunny'),'yaha'); }
  },90);
}

// 进入这一步
export function enter(){ show('#s-letter'); typeLetter(); }

let psShown=false;
function flipCard(toPS){
  const card=$('.card'); card.classList.add('flip');
  setTimeout(()=>{
    clearInterval(typing);
    psShown=toPS; card.classList.toggle('ps',toPS);
    if(toPS) $('#letterTo').textContent='（背面）'; else letterTo();
    $('#msg').innerHTML = escapeHTML((toPS?CONFIG.ps:CONFIG.message).join('\n'));
    card.classList.remove('flip');
  },250);
}

export function init({ goto }){
  $('#accept').onclick=()=>{ peperoRain(60); replayAnim($('#letterBunny'),'jump'); };
  onLongPress($('.card .from'),900,()=>{ if(!psShown){ flipCard(true); unlock('ps'); } });
  $('.card').addEventListener('click',()=>{ if(psShown) flipCard(false); });
  $('#replay').onclick=()=>{ goto('game',true); };
}
