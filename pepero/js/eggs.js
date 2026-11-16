// 彩蛋：图鉴、解锁、吐司，以及首页 11.11 / 乌萨奇 / 11:11 许愿的彩蛋
import { CONFIG } from './config.js';
import { $, burst, peperoRain, replayAnim } from './utils.js';

const EGGS=[
  {id:'ones',   icon:'🥢', name:'四根 Pepero',  hint:'首页的 11.11 好像可以点…',            desc:'把 11.11 的四个 1 变成了 Pepero'},
  {id:'peek',   icon:'🙈', name:'偷看礼物',     hint:'拆礼物之前，按住礼盒不要松手',          desc:'长按礼盒偷看了一眼'},
  {id:'ears',   icon:'👂', name:'耳朵的耳朵',   hint:'乌萨奇的耳朵好像很敏感',                desc:'摸了摸乌萨奇的耳朵'},
  {id:'party',  icon:'🎊', name:'乌拉狂欢',     hint:'一直戳乌萨奇会发生什么？',              desc:'连戳乌萨奇 11 下'},
  {id:'rainbow',icon:'🌈', name:'隐藏口味',     hint:'做 Pepero 时，每种口味都尝一尝',        desc:'解锁了彩虹口味'},
  {id:'gold',   icon:'✨', name:'金色 Pepero',  hint:'小游戏里偶尔会掉下闪闪发光的东西',      desc:'接住了金色 Pepero'},
  {id:'fever',  icon:'🔥', name:'连击模式',     hint:'小游戏里连续快速接住 5 个',             desc:'触发了 FEVER'},
  {id:'ps',     icon:'💌', name:'藏起来的 P.S.',hint:'信的署名好像藏着什么，按住试试',        desc:'看到了信背面的 P.S.'},
  {id:'wish',   icon:'🌠', name:'11:11 许愿',   hint:'在 11:11 的时候打开这里',               desc:'在 11:11 许了愿'},
  {id:'visit11',icon:'🏅', name:'第 11 次打开', hint:'多来看看，第 11 次会有惊喜',            desc:'第 11 次打开了这份礼物'},
];
const EGG_KEY='erduo-eggs';
const found=new Set((()=>{ try{ return JSON.parse(localStorage.getItem(EGG_KEY)||'[]'); }catch(_){ return []; } })());
let toastTimer;
export function toast(html,ms=2800){
  const t=$('#toast'); t.innerHTML=html; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('on'),ms);
}
export function unlock(id){
  if(found.has(id)) return;
  const egg=EGGS.find(e=>e.id===id); if(!egg) return;
  found.add(id);
  try{ localStorage.setItem(EGG_KEY,JSON.stringify([...found])); }catch(_){}
  toast(`🥚 发现彩蛋 ${found.size}/${EGGS.length} · ${egg.icon} ${egg.name}`);
  renderBook();
}
function renderBook(){
  $('#eggBtn').textContent=`🥚 彩蛋 ${found.size}/${EGGS.length}`;
  $('#bookSum').textContent = found.size===EGGS.length
    ? `全部找到啦！${CONFIG.toName}是最懂乌萨奇的人 🏆`
    : `已发现 ${found.size}/${EGGS.length}，没找到的看看提示`;
  $('#bookList').innerHTML=EGGS.map(e=>{
    const ok=found.has(e.id);
    return `<div class="egg${ok?'':' locked'}"><i>${ok?e.icon:'？'}</i><div><b>${ok?e.name:'？？？'}</b><small>${ok?e.desc:'提示：'+e.hint}</small></div></div>`;
  }).join('');
}
function openBook(){ renderBook(); $('#book').classList.add('on'); }

// 彩蛋 3、4：点乌萨奇的耳朵 / 连戳 11 下（礼盒、做 Pepero、信件页的乌萨奇）
let pokes=0, lastPoke=0;
function pokeBunny(host,e){
  const art=host.querySelector('img,svg'); if(!art) return;
  const r=art.getBoundingClientRect();
  const now=performance.now();
  pokes = now-lastPoke<700 ? pokes+1 : 1; lastPoke=now;
  if(pokes>=11){
    pokes=0; replayAnim(art,'party');
    burst(r.left+r.width/2,r.top+r.height/2,['乌拉！','呀哈！','💕','💗','哈！'],16);
    unlock('party'); return;
  }
  if((e.clientY-r.top)/r.height<0.3){
    replayAnim(art,'boing');
    burst(r.left+r.width/2,r.top+r.height*.15,['耳朵！'],1);
    unlock('ears');
  }
}

// 彩蛋 9：11:11 / 23:11 许愿
let wishShown='';
function checkWish(){
  const d=new Date(), key=d.toDateString()+d.getHours();
  if(d.getHours()%12===11 && d.getMinutes()===11 && wishShown!==key){
    wishShown=key;
    for(let i=0;i<6;i++){
      const m=document.createElement('div'); m.className='meteor';
      m.style.left=(60+Math.random()*50)+'vw'; m.style.top=(Math.random()*35)+'vh';
      m.style.animationDelay=(i*.45)+'s';
      document.body.appendChild(m); setTimeout(()=>m.remove(),5000);
    }
    $('#wish').classList.add('on'); setTimeout(()=>$('#wish').classList.remove('on'),4500);
    unlock('wish');
  }
}

export function initEggs(){
  $('#eggBtn').onclick=openBook;
  $('#toast').onclick=openBook;
  $('#bookClose').onclick=()=>$('#book').classList.remove('on');
  $('#book').onclick=e=>{ if(e.target.id==='book') $('#book').classList.remove('on'); };
  renderBook();

  // 彩蛋 1：点 11.11 的四个 1，变成 Pepero
  document.querySelectorAll('.date span').forEach(s=>s.addEventListener('click',()=>{
    if(s.dataset.stick) return;
    s.dataset.stick='1'; s.innerHTML='<i class="d-stick"></i>';
    if(document.querySelectorAll('.date span[data-stick]').length===4){ peperoRain(70); unlock('ones'); }
  }));

  ['#makeBunny','#letterBunny'].forEach(s=>$(s).addEventListener('click',e=>pokeBunny($(s),e)));
  $('#popBunny').addEventListener('click',e=>{ if($('#gift').classList.contains('open')) pokeBunny($('#popBunny'),e); });

  checkWish(); setInterval(checkWish,15000);
}
