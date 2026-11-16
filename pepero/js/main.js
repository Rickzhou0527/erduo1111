// 入口：按原来的顺序初始化各个模块，并把四个步骤串起来
import { CONFIG } from './config.js';
import { $ } from './utils.js';
import { initBunnies } from './bunny.js';
import { initBackground } from './background.js';
import { initEggs } from './eggs.js';
import { initVisits } from './visits.js';
import * as gift from './steps/gift.js';
import * as make from './steps/make.js';
import * as game from './steps/catch-game.js';
import * as letter from './steps/letter.js';

// 步骤顺序：加一步 / 调换顺序，改这一行就行（每个步骤导出 id、init、可选的 enter）
const STEPS = [gift, make, game, letter];

document.querySelectorAll('.toName').forEach(e=>e.textContent=CONFIG.toName);
$('#fromName').textContent = CONFIG.fromName;
letter.letterTo();

initBunnies();
initBackground();
initEggs();
initVisits();

// 步骤之间的跳转：next 去下一步，goto 去指定的步骤，参数原样传给那一步的 enter
const gotoStep = (id, ...args) => STEPS.find(s => s.id === id).enter(...args);
STEPS.forEach((step, i) => step.init({
  next: (...args) => STEPS[i + 1].enter(...args),
  goto: gotoStep,
}));
