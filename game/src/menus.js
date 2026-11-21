import { TITLE, COAST } from './config.js';
import { label, roundRect, polygon, glow } from './math.js';
import { hash } from './random.js';
import { PROPERTIES } from './economy.js';
import { STORY_MISSIONS } from './missions.js';
import { RADIO_STATIONS } from './audio.js';

export const CONTROL_GROUPS = [
  ['MOVEMENT', [
    ['W A S D / ARROWS', 'Walk / drive / pilot'],
    ['SHIFT', 'Sprint on foot'],
    ['SPACE', 'Handbrake / drift'],
    ['E', 'Enter / exit a nearby vehicle'],
    ['C', 'Sound the horn'],
  ]],
  ['COMBAT', [
    ['MOUSE', 'Aim'],
    ['LEFT CLICK / Q', 'Fire / punch'],
    ['1 2 3 4 5', 'Fists / pistol / SMG / rifle / shotgun'],
    ['F', 'Reload weapon'],
    ['PICKUPS', 'Walk or drive over to collect'],
  ]],
  ['YOUR CITY', [
    ['M', 'Start next story mission / retry'],
    ['ENTER', 'Advance story dialog'],
    ['J', 'Begin a nearby side job'],
    ['B', 'Buy / visit nearby property'],
    ['G', 'Deposit cash at a bank'],
    ['K', 'Save progress'],
  ]],
  ['EXTRAS', [
    ['R', 'Cycle three radio stations'],
    ['TAB', 'City atlas / property portfolio'],
    ['H', 'Controls overlay'],
    ['ESC', 'Pause / resume'],
    ['V', 'Mute / unmute audio'],
    ['N', 'Change weather in free roam'],
  ]],
];

export function createMenuState() {
  return {
    selection: 0,
    help: false,
    atlas: false,
    age: 0,
    death: null,
    deathTimer: 0,
    saved: false,
  };
}

export function updateMenus(game, dt) {
  const input = game.input;
  const menu = game.menu;
  menu.age += dt;
  if (game.screen === 'title') {
    if (input.tap('Enter') || input.tap('Space') || input.tap('Mouse')) {
      game.screen = 'play';
      game.audio.initialize();
      game.notify('WELCOME HOME, RICO', 'Press M for the story. Steal a ride with E.');
    }
    return;
  }
  if (menu.death) {
    menu.deathTimer -= dt;
    if (menu.deathTimer <= 0) game.finishRespawn();
    return;
  }
  if (input.tap('Escape')) {
    if (menu.help) menu.help = false;
    else if (menu.atlas) menu.atlas = false;
    else {
      game.screen = game.screen === 'paused' ? 'play' : 'paused';
      menu.selection = 0;
    }
    game.audio?.play('ui');
  }
  if (input.tap('KeyH')) menu.help = !menu.help;
  if (input.tap('Tab')) menu.atlas = !menu.atlas;
  if (input.tap('KeyV')) game.audio?.toggleMute();
  if (game.screen !== 'paused' || menu.help || menu.atlas) return;
  if (input.tap('ArrowDown') || input.tap('KeyS')) menu.selection = (menu.selection + 1) % 5;
  if (input.tap('ArrowUp') || input.tap('KeyW')) menu.selection = (menu.selection + 4) % 5;
  if (input.tap('Enter') || input.tap('Space')) {
    const actions = [
      () => game.screen = 'play',
      () => { game.save(); menu.saved = true; },
      () => menu.atlas = true,
      () => menu.help = true,
      () => { game.save(); game.screen = 'title'; },
    ];
    actions[menu.selection]();
    game.audio?.play('ui');
  }
}

export function drawTitle(ctx, game) {
  const time = game.clock.elapsed;
  const sky = ctx.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, '#182d50');
  sky.addColorStop(0.35, '#af6a82');
  sky.addColorStop(0.63, '#efb17e');
  sky.addColorStop(1, '#113a4e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1280, 720);
  const sunY = 288 + Math.sin(time * 0.1) * 8;
  glow(ctx, 875, sunY, 235, '#ffc87a55');
  ctx.fillStyle = '#f5ca89';
  ctx.beginPath();
  ctx.arc(875, sunY, 103, 0, Math.PI * 2);
  ctx.fill();
  // Horizon skyline is drawn from original geometry, not an external illustration.
  for (let layer = 0; layer < 3; layer++) {
    const color = ['#7b6c82', '#445a70', '#173a50'][layer];
    for (let i = 0; i < 36; i++) {
      const x = i * 42 - 20 + layer * 11;
      const height = 35 + hash(i, layer) * (70 + layer * 45);
      const y = 413 - height + layer * 10;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 31 + hash(i, 3) * 15, height + 40);
      if (i % 5 === 0) {
        ctx.fillRect(x + 10, y - 18, 4, 20);
        ctx.fillRect(x + 4, y + 6, 28, 4);
      }
      if (layer === 2) {
        for (let wy = y + 10; wy < 412; wy += 15) {
          for (let wx = x + 6; wx < x + 29; wx += 9) {
            if (hash(wx, wy) > 0.4) {
              ctx.fillStyle = '#e4bc8677';
              ctx.fillRect(wx, wy, 3, 5);
            }
          }
        }
      }
    }
  }
  const water = ctx.createLinearGradient(0, 415, 0, 720);
  water.addColorStop(0, '#447d8a');
  water.addColorStop(1, '#082d42');
  ctx.fillStyle = water;
  ctx.fillRect(0, 415, 1280, 305);
  for (let i = 0; i < 70; i++) {
    const y = 422 + i * 4.7;
    const width = 30 + i * 4 + Math.sin(time + i) * 14;
    ctx.fillStyle = `rgba(244,193,139,${0.22 * (1 - i / 75)})`;
    ctx.fillRect(875 - width / 2 + Math.sin(i * 1.4 + time) * 16, y, width, 1.5);
    ctx.strokeStyle = '#9bd3d71f';
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(time + i) * 2);
    ctx.bezierCurveTo(340, y - 9, 900, y + 7, 1280, y);
    ctx.stroke();
  }
  drawTitlePalm(ctx, 1170, 500, 1.1, time);
  drawTitlePalm(ctx, 1075, 540, 0.65, time + 2);
  const shade = ctx.createLinearGradient(0, 0, 1000, 0);
  shade.addColorStop(0, '#071a2fe8');
  shade.addColorStop(0.75, '#071a2f22');
  shade.addColorStop(1, '#071a2f00');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 1280, 720);
  label(ctx, 'AN ORIGINAL OPEN-WORLD CRIME STORY', 84, 154, 11, '#93d3cf', 'left', 800);
  label(ctx, 'MARBELLA', 78, 257, 91, '#f5ead0', 'left', 900);
  label(ctx, 'RUN', 79, 345, 96, '#f5ead0', 'left', 900);
  label(ctx, '2', 315, 345, 96, '#edb784', 'left', 900);
  ctx.fillStyle = '#7ac8bf';
  ctx.fillRect(84, 372, 72, 3);
  label(ctx, 'A CITY WITH A PRICE.', 84, 408, 19, '#e2c9b2', 'left', 600);
  label(ctx, 'Fourteen jobs. Seven districts. One last way home.', 84, 439, 13, '#b6c6c7', 'left', 400);
  roundRect(ctx, 84, 484, 246, 48, 3, '#d8c494');
  label(ctx, game.hasSave ? 'ENTER  /  CONTINUE STORY' : 'ENTER  /  WELCOME HOME', 207, 514, 12, '#183349', 'center', 800);
  label(ctx, 'WASD  DRIVE & WALK     E  STEAL A RIDE     M  STORY', 84, 564, 10, '#abcac9', 'left', 700);
  label(ctx, 'H  CONTROLS     ALL MUSIC & ART GENERATED IN REAL TIME', 84, 586, 9, '#80a6af', 'left', 600);
  label(ctx, 'MARBELLA • COSTA DEL VIENTO', 84, 678, 10, '#a6bcbc', 'left', 700);
  label(ctx, 'NO LOADING. NO LIMITS. JUST THE COAST.', 1200, 678, 9, '#93bdc1', 'right', 600);
}

function drawTitlePalm(ctx, x, y, scale, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#0b2b3e';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(0, 170);
  ctx.bezierCurveTo(-30, 90, 22, -70, 0, -180);
  ctx.stroke();
  ctx.translate(0, -180);
  ctx.rotate(Math.sin(time * 0.5) * 0.02);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    polygon(ctx, [[0, 0], [18, -26], [87, -10], [125, 36], [76, 3], [21, -5]], '#0b2d40');
  }
  ctx.restore();
}

export function drawPause(ctx, game) {
  ctx.fillStyle = '#061522cf';
  ctx.fillRect(0, 0, 1280, 720);
  label(ctx, 'MARBELLA RUN 2', 100, 116, 16, '#87c9bc', 'left', 800);
  label(ctx, 'TAKE A BREATH.', 96, 183, 47, '#f0e6cc', 'left', 900);
  const choices = ['RESUME', game.menu.saved ? 'SAVED ✓' : 'SAVE GAME', 'CITY ATLAS', 'CONTROLS', 'SAVE & QUIT TO TITLE'];
  choices.forEach((choice, i) => {
    const y = 259 + i * 54;
    if (i === game.menu.selection) {
      roundRect(ctx, 96, y - 27, 410, 43, 3, '#8fcdbb22');
      ctx.fillStyle = '#90d2bc';
      ctx.fillRect(96, y - 27, 3, 43);
    }
    label(ctx, choice, 117, y, 16, i === game.menu.selection ? '#f4e6c3' : '#8da9b0', 'left', 700);
  });
  label(ctx, 'UP / DOWN  SELECT     ENTER  CONFIRM     ESC  RESUME', 100, 610, 10, '#9cbcbf', 'left');
  label(ctx, 'YOUR EMPIRE', 745, 245, 12, '#edcf92', 'left', 800);
  const stats = [
    ['STORY', `${game.story.completed} / 14 MISSIONS`],
    ['PROPERTIES', `${game.economy.owned.length} / 6 OWNED`],
    ['GARAGE', `${game.economy.garage.length} VEHICLES`],
    ['SIDE HUSTLES', `${game.jobs.completed} COMPLETED`],
    ['BANK', `$${game.economy.bank.toLocaleString()}`],
  ];
  stats.forEach(([key, value], i) => {
    label(ctx, key, 745, 287 + i * 40, 10, '#82a4ae', 'left', 700);
    label(ctx, value, 1135, 287 + i * 40, 14, '#d8e5d8', 'right', 700);
  });
}

export function drawHelp(ctx) {
  ctx.fillStyle = '#061521f0';
  ctx.fillRect(70, 55, 1140, 609);
  label(ctx, 'KNOW YOUR CITY', 108, 111, 30, '#f0e5c7', 'left', 900);
  label(ctx, 'H OR ESC TO CLOSE', 1170, 108, 10, '#8cbebd', 'right');
  CONTROL_GROUPS.forEach(([title, controls], group) => {
    const x = 110 + group % 2 * 540;
    const y = 165 + Math.floor(group / 2) * 225;
    label(ctx, title, x, y, 12, '#e3c387', 'left', 800);
    controls.forEach(([key, action], i) => {
      label(ctx, key, x, y + 28 + i * 25, 10, '#95d3c7', 'left', 700);
      label(ctx, action, x + 166, y + 28 + i * 25, 11, '#cfdbd2', 'left', 400);
    });
  });
}

export function drawDeath(ctx, game) {
  if (!game.menu.death) return;
  ctx.fillStyle = '#091521a8';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#081623dd';
  ctx.fillRect(0, 275, 1280, 151);
  label(ctx, game.menu.death, 640, 353, 65, game.menu.death === 'WASTED' ? '#e89991' : '#e4c38c', 'center', 900);
  label(ctx, game.menu.death === 'WASTED' ? 'MARBELLA GENERAL • YOU LIVE TO DRIVE ANOTHER DAY' : 'REYES TAKES HIS CUT. THE STREETS WILL REMEMBER.', 640, 392, 12, '#c3ceca', 'center', 600);
}
