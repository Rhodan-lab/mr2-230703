import { BLOCK, COLS, ROWS, COAST, CITY_W, TAU } from './config.js';
import { hash } from './random.js';
import { label, polygon, glow } from './math.js';
import { visible } from './city.js';

const AWNINGS = ['#b26d61', '#578b87', '#c5a765', '#677b9d'];

export function createStreetFurniture(city) {
  const furniture = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const x = col * BLOCK;
      const y = row * BLOCK;
      furniture.push({ type: 'hydrant', x: x + 51, y: y + 29 });
      furniture.push({ type: 'drain', x: x + 37, y: y + 108 });
      furniture.push({ type: 'bin', x: x + 52, y: y + 189 });
      if ((col + row) % 2 === 0) furniture.push({ type: 'bench', x: x + 153, y: y + 51 });
      if (col % 3 === 0) furniture.push({ type: 'bus', x: x + 118, y: y + 231 });
      if (row % 3 === 1) furniture.push({ type: 'vending', x: x + 229, y: y + 185 });
      if (col % 4 === 1) furniture.push({ type: 'planter', x: x + 206, y: y + 51 });
      if (col > 2 && col < 9 && row > 3 && row < 8) furniture.push({ type: 'cafe', x: x + 224, y: y + 123 });
      if (col < 4 && row > 7 && (col + row) % 2) furniture.push({ type: 'market', x: x + 103, y: y + 51 });
      furniture.push({ type: 'manhole', x: x + 13, y: y + 120 });
    }
  }
  // Dock safety features visually distinguish the industrial district.
  for (let i = 0; i < 18; i++) {
    furniture.push({ type: 'bollard', x: COAST - 8, y: 2950 + i * 30 });
  }
  for (let i = 0; i < 24; i++) {
    furniture.push({ type: 'beachbench', x: CITY_W + 68, y: 120 + i * 108 });
  }
  return furniture;
}

export function drawRoadTexture(ctx, game, bounds) {
  ctx.save();
  const startX = Math.floor(bounds.left / 50) * 50;
  const startY = Math.floor(bounds.top / 50) * 50;
  for (let x = startX; x < bounds.right; x += 50) {
    for (let y = startY; y < bounds.bottom; y += 50) {
      if (!game.city.isRoad(x, y)) continue;
      const seed = hash(x, y);
      ctx.fillStyle = game.light.night > 0.5 ? '#9faeb608' : '#192b3912';
      ctx.fillRect(x + seed * 29, y + seed * 7, 9 + seed * 10, 1);
      if (seed > 0.72) {
        ctx.strokeStyle = game.light.night > 0.5 ? '#020c161e' : '#253a3c20';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 12, y + 6);
        ctx.lineTo(x + 21, y + 3);
        ctx.lineTo(x + 29, y + 10);
        ctx.stroke();
      }
    }
  }
  for (let x = Math.floor(bounds.left / BLOCK) * BLOCK; x < Math.min(CITY_W, bounds.right); x += BLOCK) {
    for (let y = Math.floor(bounds.top / BLOCK) * BLOCK; y < bounds.bottom; y += BLOCK) {
      if (x < 0 || y < 0 || y > ROWS * BLOCK) continue;
      // Marked bays, arrows and reflective lane studs.
      ctx.strokeStyle = '#b9c4b75c';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const px = x + 75 + i * 45;
        ctx.strokeRect(px, y + 29, 38, 12);
      }
      ctx.fillStyle = '#d8d7bb66';
      polygon(ctx, [[x + 119, y + 20], [x + 111, y + 16], [x + 113, y + 19], [x + 101, y + 19], [x + 101, y + 21], [x + 113, y + 21], [x + 111, y + 24]], '#d8d7bb66');
      ctx.fillStyle = '#e0c57a';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 76 + i * 40, y - 1, 1.7, 1.7);
    }
  }
  ctx.restore();
}

export function drawFurniture(ctx, item, game) {
  const night = game.light.night > 0.5;
  const { x, y } = item;
  ctx.save();
  ctx.translate(x, y);
  switch (item.type) {
    case 'hydrant':
      ctx.fillStyle = '#142d3740';
      ctx.fillRect(-5, 1, 9, 4);
      ctx.fillStyle = '#aa7160';
      ctx.fillRect(-2, -7, 4, 9);
      ctx.fillRect(-4, -5, 8, 3);
      ctx.fillStyle = '#c6a784';
      ctx.fillRect(-2, -8, 4, 2);
      break;
    case 'drain':
      ctx.fillStyle = '#283d42';
      ctx.fillRect(-4, -7, 7, 14);
      ctx.strokeStyle = '#7e8a87';
      ctx.lineWidth = 0.8;
      for (let i = -5; i <= 5; i += 3) {
        ctx.beginPath();
        ctx.moveTo(-3, i);
        ctx.lineTo(2, i);
        ctx.stroke();
      }
      break;
    case 'bin':
      ctx.fillStyle = '#325b56';
      ctx.fillRect(-4, -7, 8, 11);
      ctx.fillStyle = '#667a69';
      ctx.fillRect(-5, -9, 10, 3);
      ctx.fillStyle = '#142f32';
      ctx.fillRect(-2, -8, 4, 2);
      break;
    case 'bench':
    case 'beachbench':
      ctx.fillStyle = '#223b3f66';
      ctx.fillRect(-11, -2, 24, 7);
      ctx.fillStyle = '#9e8b6b';
      ctx.fillRect(-12, -6, 24, 3);
      ctx.fillRect(-12, -2, 24, 3);
      ctx.fillStyle = '#3e5557';
      ctx.fillRect(-9, -7, 2, 11);
      ctx.fillRect(7, -7, 2, 11);
      break;
    case 'bus':
      ctx.fillStyle = '#203b4666';
      ctx.fillRect(-26, -6, 53, 15);
      ctx.fillStyle = '#779393';
      ctx.fillRect(-27, -13, 55, 17);
      ctx.fillStyle = '#b1c9c34d';
      ctx.fillRect(-24, -10, 49, 11);
      ctx.fillStyle = '#365564';
      ctx.fillRect(-22, -3, 44, 2);
      ctx.fillStyle = '#233f4e';
      ctx.fillRect(-30, -13, 3, 21);
      ctx.fillRect(25, -13, 3, 21);
      ctx.fillStyle = night ? '#e4b57f' : '#d6c49a';
      ctx.fillRect(-24, -18, 48, 5);
      label(ctx, 'MARBELLA TRANSIT', 0, -14, 3.8, '#294b5d', 'center', 800);
      break;
    case 'vending':
      ctx.fillStyle = '#304958';
      ctx.fillRect(-5, -12, 10, 18);
      ctx.fillStyle = night ? '#75c8cc' : '#b0d2c7';
      ctx.fillRect(-4, -10, 6, 9);
      ctx.fillStyle = '#b85d59';
      ctx.fillRect(-4, 0, 6, 5);
      label(ctx, 'SOL', -1, -3, 3, '#e8e6cb', 'center');
      if (night) glow(ctx, 0, 0, 14, '#5fd1df33');
      break;
    case 'planter':
      ctx.fillStyle = '#9a8c75';
      ctx.fillRect(-11, -6, 22, 12);
      ctx.fillStyle = '#496e50';
      ctx.fillRect(-9, -7, 18, 10);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i % 2 ? '#bba480' : '#82a271';
        ctx.fillRect(-8 + i * 2.5, -8 + Math.sin(i) * 2, 2, 3);
      }
      break;
    case 'cafe':
      for (const offset of [-17, 17]) {
        ctx.fillStyle = '#9e8770';
        ctx.beginPath();
        ctx.arc(0, offset, 7, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#d0b899';
        ctx.beginPath();
        ctx.arc(-1, offset - 1, 6, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#4a6a68';
        ctx.fillRect(-4, offset - 13, 8, 5);
        ctx.fillRect(-4, offset + 8, 8, 5);
        ctx.fillStyle = '#eae2c6';
        ctx.beginPath();
        ctx.arc(2, offset, 1.5, 0, TAU);
        ctx.fill();
      }
      break;
    case 'market':
      ctx.fillStyle = '#3b4d464d';
      ctx.fillRect(-22, -6, 45, 17);
      ctx.fillStyle = '#b59b74';
      ctx.fillRect(-21, -8, 42, 14);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i % 2 ? '#e9ce98' : '#ad7158';
        ctx.fillRect(-21 + i * 6, -12, 6, 8);
        ctx.fillStyle = ['#b1b869', '#e19d61', '#9a5556'][i % 3];
        ctx.beginPath();
        ctx.arc(-16 + i * 5.5, 0, 3, 0, TAU);
        ctx.fill();
      }
      break;
    case 'manhole':
      ctx.strokeStyle = night ? '#344b54' : '#3f5055';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 5, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.lineTo(4, 2);
      ctx.moveTo(-4, 2);
      ctx.lineTo(4, -2);
      ctx.stroke();
      break;
    case 'bollard':
      ctx.fillStyle = '#233f4933';
      ctx.fillRect(-4, 0, 10, 4);
      ctx.fillStyle = '#354850';
      ctx.fillRect(-2, -6, 5, 9);
      ctx.fillStyle = '#d6b45f';
      ctx.fillRect(-2, -5, 5, 3);
      break;
  }
  ctx.restore();
}

export function drawNeonAccents(ctx, b, game) {
  const night = game.light.night;
  if (night < 0.3 || !b.lit) return;
  const x = b.x - b.height * 0.28;
  const y = b.y - b.height * 0.62;
  const color = b.district.neon;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.globalAlpha = 0.55;
  if (b.id % 4 === 0) {
    ctx.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
    ctx.beginPath();
    ctx.moveTo(x + 1, y + b.h);
    ctx.lineTo(b.x + 1, b.y + b.h);
    ctx.stroke();
  }
  if (b.id % 7 === 0 && b.height > 30) {
    const sx = b.x + b.w - 9;
    const sy = b.y + b.h - b.height * 0.32;
    ctx.fillStyle = '#132739';
    ctx.globalAlpha = 1;
    ctx.fillRect(sx, sy - 29, 12, 37);
    const letters = b.sign.slice(0, 4).replace(' ', 'A');
    for (let i = 0; i < letters.length; i++) label(ctx, letters[i], sx + 6, sy - 20 + i * 8, 7, color, 'center', 800);
    glow(ctx, sx, b.y + b.h + 10, 50, color + '24');
  }
  ctx.restore();
}

export function drawStoreCanopy(ctx, b, game) {
  if (b.height > 62 || b.construction) return;
  const x = b.x - b.height * 0.28;
  const y = b.y + b.h - b.height * 0.62;
  const color = AWNINGS[b.id % AWNINGS.length];
  ctx.save();
  ctx.fillStyle = game.light.night > 0.5 ? '#17303f' : '#557c86';
  ctx.fillRect(b.x + 7, b.y + b.h - 7, b.w - 14, 8);
  for (let i = 0; i < b.w - 12; i += 8) {
    polygon(ctx, [[x + 6 + i, y + 10], [x + 13 + i, y + 10], [x + 17 + i, y + 18], [x + 10 + i, y + 18]], i % 16 ? '#d1c19b' : color);
  }
  ctx.fillStyle = '#102836';
  ctx.fillRect(b.x + b.w / 2 - 5, b.y + b.h - 7, 10, 8);
  ctx.restore();
}
