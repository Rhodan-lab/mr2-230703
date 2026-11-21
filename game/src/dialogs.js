import { label, roundRect, polygon } from './math.js';

export const CHARACTERS = {
  rico: {
    name: 'RICO VELA',
    role: 'The prodigal wheelman',
    skin: '#bc8766',
    hair: '#27323b',
    coat: '#d2cbb1',
    accent: '#7fd4c6',
    shape: 0,
  },
  marisol: {
    name: 'MARISOL DUARTE',
    role: 'The city owes her',
    skin: '#b77d62',
    hair: '#272b35',
    coat: '#a3536b',
    accent: '#ed9db0',
    shape: 1,
  },
  sterling: {
    name: 'STERLING VANE',
    role: 'Nothing is personal. Everything is collateral.',
    skin: '#e0b89a',
    hair: '#bbb3a2',
    coat: '#304c66',
    accent: '#e2c68b',
    shape: 2,
  },
  reyes: {
    name: 'CAPTAIN REYES',
    role: 'Harbor authority. Private interests.',
    skin: '#b58468',
    hair: '#4b4642',
    coat: '#d3c7a4',
    accent: '#93b4cf',
    shape: 3,
  },
};

export function beginDialog(game, speaker, lines, title = '') {
  game.dialog = {
    speaker,
    lines,
    title,
    index: 0,
    reveal: 0,
    age: 0,
  };
  game.audio?.play('ui');
}

export function updateDialog(game, dt) {
  const dialog = game.dialog;
  if (!dialog) return;
  dialog.age += dt;
  dialog.reveal += dt * 64;
  if (game.input.tap('Enter') || game.input.tap('Mouse')) {
    const line = dialog.lines[dialog.index];
    if (dialog.reveal < line.length) dialog.reveal = line.length;
    else {
      dialog.index++;
      dialog.reveal = 0;
      if (dialog.index >= dialog.lines.length) game.dialog = null;
    }
  }
}

export function drawPortrait(ctx, key, x, y, size = 100) {
  const p = CHARACTERS[key] || CHARACTERS.rico;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  const bg = ctx.createLinearGradient(0, 0, 100, 100);
  bg.addColorStop(0, '#254657');
  bg.addColorStop(1, '#0d2231');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = p.accent + '35';
  ctx.beginPath();
  ctx.arc(60, 33, 40, 0, Math.PI * 2);
  ctx.fill();
  polygon(ctx, [[7, 100], [17, 76], [38, 67], [62, 67], [84, 77], [95, 100]], p.coat);
  polygon(ctx, [[35, 68], [49, 83], [64, 68], [59, 99], [40, 99]], '#e7ddc0');
  ctx.fillStyle = p.skin;
  ctx.fillRect(41, 57, 19, 19);
  ctx.beginPath();
  ctx.ellipse(50, 41, p.shape === 1 ? 19 : 22, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  polygon(ctx, [[29, 31], [35, 15], [58, 10], [71, 25], [67, 36], [62, 22], [35, 26], [30, 44]], p.hair);
  if (p.shape === 1) {
    polygon(ctx, [[32, 20], [25, 35], [25, 75], [36, 67], [35, 34]], p.hair);
    polygon(ctx, [[64, 19], [76, 40], [74, 76], [65, 67], [64, 34]], p.hair);
  }
  ctx.fillStyle = '#3a3c3d';
  ctx.fillRect(37, 38, 8, 2);
  ctx.fillRect(56, 38, 8, 2);
  ctx.fillStyle = '#9a684f';
  ctx.fillRect(48, 40, 4, 13);
  ctx.fillStyle = '#5d4841';
  ctx.fillRect(43, 59, 15, 2);
  if (p.shape === 2) {
    ctx.fillStyle = '#263c4a';
    ctx.fillRect(33, 34, 15, 10);
    ctx.fillRect(53, 34, 15, 10);
    ctx.fillRect(47, 37, 7, 2);
  }
  if (p.shape === 3) {
    ctx.fillStyle = '#3a474b';
    ctx.fillRect(28, 17, 44, 11);
    ctx.fillRect(36, 10, 29, 11);
    ctx.fillStyle = '#d7bd77';
    ctx.fillRect(46, 16, 8, 7);
    ctx.fillRect(70, 81, 7, 11);
    ctx.fillStyle = '#5e5047';
    ctx.fillRect(39, 53, 23, 4);
  }
  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 97, 100, 3);
  ctx.restore();
}

export function drawDialog(ctx, game) {
  const d = game.dialog;
  if (!d) return;
  ctx.fillStyle = 'rgba(4,12,22,.88)';
  ctx.fillRect(0, 0, 1280, 48);
  ctx.fillRect(0, 552, 1280, 168);
  roundRect(ctx, 212, 561, 856, 143, 4, '#0d2432ee');
  drawPortrait(ctx, d.speaker, 228, 579, 106);
  const character = CHARACTERS[d.speaker];
  label(ctx, character.name, 355, 589, 14, character.accent, 'left', 800);
  label(ctx, d.title, 1240, 31, 12, '#f0d9ac', 'right', 700);
  const words = d.lines[d.index].slice(0, Math.floor(d.reveal)).split(' ');
  let line = '';
  let y = 618;
  ctx.font = '18px Arial';
  for (const word of words) {
    if (ctx.measureText(line + word).width > 660) {
      label(ctx, line, 355, y, 18, '#e7e9df', 'left', 400);
      y += 25;
      line = '';
    }
    line += word + ' ';
  }
  label(ctx, line, 355, y, 18, '#e7e9df', 'left', 400);
  label(ctx, 'ENTER  /  CONTINUE', 1048, 686, 10, '#a4bfc3', 'right');
}
