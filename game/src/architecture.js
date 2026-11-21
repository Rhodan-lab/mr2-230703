import { TAU } from './config.js';
import { hash } from './random.js';
import { polygon, label } from './math.js';

export function drawArchitecturalDetail(ctx, b, game) {
  const x = b.x - b.height * 0.28;
  const y = b.y - b.height * 0.62;
  const w = b.w;
  const h = b.h;
  const night = game.light.night > 0.5;
  ctx.save();
  // Edge caps, access hatches and roof gravel ground the procedural structures.
  ctx.fillStyle = night ? '#0b233229' : '#142b3920';
  for (let i = 0; i < 25; i++) {
    const px = x + 8 + hash(b.id, i) * (w - 16);
    const py = y + 8 + hash(i, b.id + 3) * (h - 16);
    ctx.fillRect(px, py, 1, 1);
  }
  ctx.strokeStyle = night ? '#9eb0b026' : '#e8e3c329';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h / 2);
  ctx.lineTo(x + w - 4, y + h / 2);
  ctx.stroke();
  if (b.id % 4 === 0) {
    ctx.fillStyle = night ? '#63777e' : '#b8b8a6';
    ctx.fillRect(x + w - 19, y + h - 22, 11, 14);
    ctx.fillStyle = '#546e76';
    ctx.fillRect(x + w - 17, y + h - 19, 7, 11);
  }
  if (b.district.short === 'Palma Row' && b.id % 3 === 0) drawPool(ctx, x, y, w, h, game);
  if (b.district.short === 'Costa Heights' && b.height > 30) drawBalconies(ctx, b, game);
  if (b.district.short === 'Old Mercado') drawTerracotta(ctx, x, y, w, h, b.id, night);
  if (b.district.short === 'Dockside') drawIndustrialVent(ctx, x, y, w, h, game);
  if (b.district.short === 'Downtown' && b.id % 9 === 0) drawGlassAtrium(ctx, x, y, w, h, night);
  if (b.construction) drawScaffolding(ctx, b, game);
  ctx.restore();
}

function drawPool(ctx, x, y, w, h, game) {
  ctx.fillStyle = '#dfd5b6';
  ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  ctx.fillStyle = game.light.night > 0.5 ? '#2a8495' : '#5fc1c3';
  ctx.fillRect(x + 16, y + 16, w - 32, h - 32);
  ctx.strokeStyle = '#c2ebe179';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const py = y + 20 + i * (h - 40) / 4;
    ctx.beginPath();
    ctx.moveTo(x + 18, py);
    ctx.quadraticCurveTo(x + w / 2, py + Math.sin(game.clock.elapsed * 1.2 + i) * 3, x + w - 18, py);
    ctx.stroke();
  }
  ctx.fillStyle = '#ccaf87';
  ctx.fillRect(x + 12, y + 20, 3, 16);
  ctx.fillRect(x + w - 15, y + h - 36, 3, 16);
}

function drawBalconies(ctx, b, game) {
  const floors = Math.floor(b.height / 14);
  for (let i = 0; i < floors; i++) {
    const t = (i + 0.25) / Math.max(1, floors);
    const x = b.x - b.height * 0.28 * t;
    const y = b.y + b.h - b.height * 0.62 * t;
    ctx.fillStyle = game.light.night > 0.5 ? '#73848b' : '#dbcbb0';
    ctx.fillRect(x + 5, y, b.w - 10, 2.4);
    ctx.strokeStyle = '#678692';
    ctx.lineWidth = 0.6;
    for (let j = 10; j < b.w - 6; j += 8) {
      ctx.beginPath();
      ctx.moveTo(x + j, y);
      ctx.lineTo(x + j, y - 4);
      ctx.stroke();
    }
  }
}

function drawTerracotta(ctx, x, y, w, h, id, night) {
  if (id % 3 !== 0) return;
  ctx.fillStyle = night ? '#695857' : '#ba886b';
  ctx.fillRect(x + 7, y + 7, w - 14, h - 14);
  ctx.strokeStyle = night ? '#997b6666' : '#dec19688';
  ctx.lineWidth = 0.6;
  for (let yy = y + 8; yy < y + h - 7; yy += 5) {
    ctx.beginPath();
    ctx.moveTo(x + 7, yy);
    ctx.lineTo(x + w - 7, yy);
    ctx.stroke();
  }
  for (let xx = x + 12; xx < x + w - 7; xx += 9) {
    ctx.beginPath();
    ctx.moveTo(xx, y + 7);
    ctx.lineTo(xx, y + h - 7);
    ctx.stroke();
  }
  ctx.fillStyle = '#846e5d';
  ctx.fillRect(x + w / 2 - 2, y + 5, 4, h - 10);
}

function drawIndustrialVent(ctx, x, y, w, h, game) {
  ctx.fillStyle = '#445e66';
  ctx.fillRect(x + w - 20, y + 10, 8, h - 20);
  ctx.fillStyle = '#a5b4ad';
  for (let offset = 15; offset < h - 14; offset += 13) {
    ctx.beginPath();
    ctx.ellipse(x + w - 16, y + offset, 5, 3, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#d5be7a';
  ctx.fillRect(x + 9, y + h - 12, 17, 4);
  ctx.fillStyle = '#354b57';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 9 + i * 5, y + h - 12, 2, 4);
}

function drawGlassAtrium(ctx, x, y, w, h, night) {
  const gradient = ctx.createLinearGradient(x + 12, y, x + w - 12, y + h);
  gradient.addColorStop(0, night ? '#6596a5' : '#9fced0');
  gradient.addColorStop(1, night ? '#244e65' : '#3e758f');
  polygon(ctx, [[x + 12, y + 13], [x + w - 12, y + 13], [x + w - 6, y + h - 12], [x + 6, y + h - 12]], gradient);
  ctx.strokeStyle = '#b5d1cc';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 11 + (w - 22) * i / 5, y + 13);
    ctx.lineTo(x + 7 + (w - 14) * i / 5, y + h - 12);
    ctx.stroke();
  }
}

function drawScaffolding(ctx, b, game) {
  ctx.strokeStyle = '#bfc0a1';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const y = b.y + b.h - i * 12;
    const shift = -i * 5;
    ctx.moveTo(b.x + shift, y);
    ctx.lineTo(b.x + b.w + shift, y);
    for (let j = 0; j < 4; j++) {
      const x = b.x + shift + j * b.w / 3;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y - 12);
    }
  }
  ctx.stroke();
  ctx.fillStyle = '#d4b261';
  ctx.fillRect(b.x - 3, b.y + b.h + 3, b.w + 6, 4);
  ctx.fillStyle = '#3b4c53';
  for (let i = 0; i < b.w; i += 10) ctx.fillRect(b.x + i, b.y + b.h + 3, 4, 4);
}
