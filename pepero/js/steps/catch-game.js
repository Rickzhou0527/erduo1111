// 3. 接 Pepero 小游戏（canvas）
import { CONFIG } from '../config.js';
import { $, show } from '../utils.js';
import { bunnySVG, bunnySrc } from '../bunny.js';
import { unlock } from '../eggs.js';
import { FLAVORS, getFlavor } from './make.js';

export const id='game';
const GOAL=11;
let cv, ctx;
let W,H,dpr, bx, items, score, last, spawnT, raf, yahaT=0, pops=[];
const imgs={};
function loadImg(mood){
  const im=new Image();
  im.onerror=()=>{ im.onerror=null; im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(bunnySVG(mood)); };
  im.src=bunnySrc(mood) || ('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(bunnySVG(mood)));
  return im;
}
function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2);
  const r=cv.getBoundingClientRect(); W=r.width; H=r.height;
  cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
}
// phase: howto（看规则）→ countdown（3-2-1，可以先练习拖动）→ play → done
let phase='howto', moved=false, idle=0, hintT=0, milestones={}, cdTimer;
function startGame(skipHowto){
  resize(); bx=W/2; items=[]; score=0; spawnT=0; pops=[]; moved=false; idle=0; milestones={};
  spawnCount=0; goldSeen=false; combo=0; lastCatch=0; fever=0; $('#love').classList.remove('on');
  updateHud(); document.body.classList.add('playing');
  phase='howto'; clearInterval(cdTimer);
  $('#howto').classList.toggle('off', !!skipHowto);
  last=performance.now(); cancelAnimationFrame(raf); raf=requestAnimationFrame(loop);
  if(skipHowto) countdown();
}
// 进入这一步（skipHowto：再玩一次时跳过规则）
export function enter(skipHowto){ show('#s-game'); startGame(skipHowto); }
function bigText(txt){ const el=$('#bigText'); el.textContent=txt; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
function countdown(){
  phase='countdown'; let n=3; bigText(n);
  cdTimer=setInterval(()=>{ n--; if(n>0) bigText(n); else { clearInterval(cdTimer); bigText('开始！'); phase='play'; } },800);
}
function updateHud(){ $('#score').textContent=`${score}/${GOAL}`; $('#barFill').style.width=(score/GOAL*100)+'%'; }
// 手机：相对拖动（像触控板），手指放在哪里都行，乌萨奇不会跳到手指底下被挡住
// 电脑：鼠标悬停时乌萨奇直接跟随光标
let dragX=null, dragBx=0;
const DRAG_GAIN=1.3;
function setBx(x){ bx=Math.max(40,Math.min(W-40,x)); moved=true; idle=0; }
let spawnCount=0, goldSeen=false, combo=0, lastCatch=0, fever=0, loveTimer;
function spawn(){
  spawnCount++;
  let gold = !goldSeen && (Math.random()<.07 || spawnCount===10);
  if(gold) goldSeen=true;
  const heart=!gold && Math.random()<.18;
  const fl = (getFlavor() && Math.random()<.5) ? getFlavor() : FLAVORS[Math.floor(Math.random()*FLAVORS.length)];
  const c = fl.rainbow ? fl.colors[Math.floor(Math.random()*fl.colors.length)] : fl.c;
  items.push({x:30+Math.random()*(W-60),y:-60,vy:(gold?120:140)+Math.random()*90+score*6,rot:(Math.random()-.5)*.6,vr:(Math.random()-.5)*2,heart,gold,c});
}
function drawStick(it){
  ctx.save(); ctx.translate(it.x,it.y); ctx.rotate(it.rot);
  ctx.lineWidth=2.5; ctx.strokeStyle='#4a3426';
  if(it.gold){ ctx.shadowColor='#FFD54A'; ctx.shadowBlur=18+Math.sin(performance.now()/120)*8; }
  rr(-6,-34,12,68,6); ctx.fillStyle=it.gold?'#FFE58A':'#E9B872'; ctx.fill(); ctx.stroke();
  rr(-7,-34,14,48,7); ctx.fillStyle=it.gold?'#F2B705':it.c; ctx.fill(); ctx.stroke();
  ctx.restore();
}
function showLove(){
  const lines=CONFIG.loveLines||[]; if(!lines.length) return;
  $('#love span').textContent=lines[Math.floor(Math.random()*lines.length)];
  $('#love').classList.add('on'); clearTimeout(loveTimer);
  loveTimer=setTimeout(()=>$('#love').classList.remove('on'),2400);
}
function drawHeart(it){
  ctx.save(); ctx.translate(it.x,it.y); ctx.font='30px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💗',0,0); ctx.restore();
}
function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

let goNext=()=>{};
function loop(t){
  if(!$('#s-game').classList.contains('active')) return;
  const dt=Math.min((t-last)/1000,.05); last=t;
  ctx.clearRect(0,0,W,H);
  if(fever>0) fever-=dt;
  if(phase==='play'){ spawnT-=dt; if(spawnT<=0){ spawn(); spawnT=(.55+Math.random()*.45)*(fever>0?.45:1); } }
  const ref=imgs.happy, ratio=(ref.naturalWidth&&ref.naturalHeight)?ref.naturalHeight/ref.naturalWidth:1.11;
  // 底部留出手指滑动区，乌萨奇站在滑动区上方
  const zone=Math.max(110,Math.min(160,H*.22));
  const bw=96, bh=bw*ratio, by=H-zone-bh;
  const zx=16, zy=H-zone+14, zw=W-32, zh=zone-28;
  ctx.fillStyle='rgba(255,143,171,.13)'; rr(zx,zy,zw,zh,24); ctx.fill();
  ctx.setLineDash([7,6]); ctx.strokeStyle='rgba(74,52,38,.35)'; ctx.lineWidth=2; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='rgba(74,52,38,.6)'; ctx.font='700 15px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('👆 手指在这里左右滑动',W/2,zy+zh/2); ctx.textBaseline='alphabetic';
  for(const it of items){
    it.y+=it.vy*dt; it.rot+=it.vr*dt;
    if(!it.done && it.y>by+20 && it.y<by+80 && Math.abs(it.x-bx)<bw*.55){
      it.done=true; score=Math.min(GOAL,score+(it.gold?3:it.heart?2:1)); yahaT=.35; updateHud();
      pops.push({x:bx,y:by,t:0,txt:it.gold?'+3 ✨':it.heart?'+2 💕':['呀哈！','乌拉！','哈！'][Math.floor(Math.random()*3)]});
      const now=performance.now();
      combo = now-lastCatch<2500 ? combo+1 : 1; lastCatch=now;
      if(it.gold){ showLove(); unlock('gold'); }
      if(combo>=5 && fever<=0 && score<GOAL){ fever=5; combo=0; bigText('🔥 FEVER！'); unlock('fever'); }
      else if(score<GOAL){
        if(!milestones.first){ milestones.first=1; bigText('接到啦！'); }
        else if(score>=6 && !milestones.half){ milestones.half=1; bigText('过半啦！'); }
        else if(score===GOAL-1 && !milestones.last){ milestones.last=1; bigText('还差 1 根！'); }
      }
    }
  }
  items=items.filter(it=>!it.done && it.y<H+80);
  items.forEach(it=>it.heart?drawHeart(it):drawStick(it));

  yahaT-=dt;
  const im=yahaT>0?imgs.yaha:imgs.happy;
  const hop=yahaT>0?Math.sin((.35-yahaT)/.35*Math.PI)*14:0;
  if(fever>0){ ctx.save(); ctx.shadowColor='#FFB300'; ctx.shadowBlur=30+Math.sin(performance.now()/90)*10; }
  if(im.complete) ctx.drawImage(im,bx-bw/2,by-hop,bw,bh);
  if(fever>0) ctx.restore();

  // 拖动提示：还没滑动过，或者停下超过 4 秒
  if(phase==='play') idle+=dt;
  if(phase!=='howto' && phase!=='done' && (!moved || idle>4)){
    hintT+=dt; const off=Math.abs(Math.sin(hintT*4))*10;
    const label='手指在下面左右滑动 👇', ty=by-hop-30;
    ctx.font='800 15px sans-serif'; const tw=ctx.measureText(label).width;
    const lx=Math.max(tw/2+18,Math.min(W-tw/2-18,bx));
    ctx.fillStyle='#fff'; ctx.strokeStyle='#4a3426'; ctx.lineWidth=2.5;
    rr(lx-tw/2-12,ty-15,tw+24,30,15); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#4a3426'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(label,lx,ty);
    ctx.font='28px sans-serif';
    ctx.fillText('👈',bx-bw/2-20-off,by+bh*.45); ctx.fillText('👉',bx+bw/2+20+off,by+bh*.45);
    ctx.textBaseline='alphabetic';
  }

  ctx.textAlign='center'; ctx.font='900 20px sans-serif';
  pops.forEach(p=>{ p.t+=dt; ctx.globalAlpha=Math.max(0,1-p.t); ctx.fillStyle='#FF6F94'; ctx.fillText(p.txt,p.x,p.y-20-p.t*50); });
  ctx.globalAlpha=1; pops=pops.filter(p=>p.t<1);

  if(score>=GOAL && phase==='play'){
    phase='done'; bigText('🎉 集齐 11 根！');
    setTimeout(()=>{ document.body.classList.remove('playing'); goNext(); },1400);
  }
  raf=requestAnimationFrame(loop);
}

export function init({ next }){
  goNext=next;
  cv=$('#cv'); ctx=cv.getContext('2d');
  imgs.happy=loadImg('happy'); imgs.yaha=loadImg('yaha');
  $('#startGame').onclick=()=>{ $('#howto').classList.add('off'); countdown(); };
  cv.addEventListener('pointerdown',e=>{
    if(phase==='howto') return;
    dragX=e.clientX; dragBx=bx;
    try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  });
  cv.addEventListener('pointermove',e=>{
    if(phase==='howto') return;
    if(dragX!==null) setBx(dragBx+(e.clientX-dragX)*DRAG_GAIN);
    else if(e.pointerType==='mouse') setBx(e.clientX-cv.getBoundingClientRect().left);
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>cv.addEventListener(t,()=>{ dragX=null; }));
  window.addEventListener('resize',()=>{ if($('#s-game').classList.contains('active')) resize(); });
}
