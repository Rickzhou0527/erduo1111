// 背景漂浮的小图标
import { $ } from './utils.js';

export function addFloaters(n){
  const icons=['💕','🥢','✨','🎀','💗'];
  for(let i=0;i<n;i++){
    const d=document.createElement('div'); d.className='float';
    d.textContent=icons[i%icons.length];
    d.style.left=Math.random()*100+'vw';
    d.style.animationDuration=(9+Math.random()*10)+'s';
    d.style.animationDelay=(-Math.random()*18)+'s';
    $('#bg').appendChild(d);
  }
}

export function initBackground(){ addFloaters(14); }
