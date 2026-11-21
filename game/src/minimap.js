import { BLOCK, CITY_W, CITY_H, COAST } from './config.js';
import { PROPERTIES, BANKS } from './economy.js';
import { objectivePosition } from './missions.js';
import { label, roundRect } from './math.js';
import { drawNavigationRoute } from './navigation.js';

export function createMinimap(city) {
  if (typeof document === 'undefined') return null;
  const map = document.createElement('canvas');
  map.width = 600;
  map.height = 600;
  const ctx = map.getContext('2d');
  const scale = 600 / 4500;
  ctx.fillStyle = '#143c4b';
  ctx.fillRect(0, 0, 600, 600);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = '#3c534d';
  ctx.fillRect(0, 0, CITY_W + 47, CITY_H + 47);
  ctx.fillStyle = '#9e9874';
  ctx.fillRect(CITY_W + 47, 0, COAST - CITY_W - 47, 2950);
  ctx.strokeStyle = '#80928d';
  ctx.lineWidth = 37;
  for (let x = 0; x <= CITY_W; x += BLOCK) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CITY_H);
    ctx.stroke();
  }
  for (let y = 0; y <= CITY_H; y += BLOCK) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CITY_W, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#62896c';
  for (const p of city.parks) ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = '#263f45';
  for (const b of city.buildings) ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
  ctx.fillStyle = '#948e74';
  ctx.fillRect(COAST - 80, 3070, 325, 30);
  ctx.fillRect(COAST - 80, 3350, 290, 30);
  ctx.restore();
  return map;
}

export function drawMinimap(ctx, game) {
  const x = 27;
  const y = 514;
  const w = 236;
  const h = 165;
  const scale = 0.19;
  roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 8, '#06131de8');
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.clip();
  ctx.fillStyle = '#153a48';
  ctx.fillRect(x, y, w, h);
  const px = game.player.x;
  const py = game.player.y;
  const mx = x + w / 2;
  const my = y + h / 2;
  const mapSize = 4500 * scale;
  if (game.minimap) ctx.drawImage(game.minimap, mx - px * scale, my - py * scale, mapSize, mapSize);
  if (game.heat > 0) {
    ctx.fillStyle = game.police.seen ? '#ef54701b' : '#4895db15';
    ctx.fillRect(x, y, w, h);
  }
  function dot(point, color, radius = 3, square = false) {
    const dx = mx + (point.x - px) * scale;
    const dy = my + (point.y - py) * scale;
    if (dx < x || dx > x + w || dy < y || dy > y + h) return;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#10252e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (square) ctx.rect(dx - radius, dy - radius, radius * 2, radius * 2);
    else ctx.arc(dx, dy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const p of PROPERTIES) dot(p, game.economy.owned.includes(p.id) ? '#8ee4af' : '#d5bb79', 3, true);
  for (const b of BANKS) dot(b, '#79cadf', 2);
  for (const v of game.vehicles) if (v.police && !v.exploded) dot(v, '#f46c80', 3);
  const marker = game.shotMarker || objectivePosition(game);
  if (marker) {
    dot(marker, '#f8d384', 5);
    if (game.navigation.offRoad) {
      ctx.strokeStyle = '#e5c478a6';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + (marker.x - px) * scale, my + (marker.y - py) * scale);
      ctx.stroke();
      ctx.setLineDash([]);
    } else drawNavigationRoute(ctx, game, mx, my, scale);
  }
  if (game.helicopter.active) {
    const hx = mx + (game.helicopter.x - px) * scale;
    const hy = my + (game.helicopter.y - py) * scale;
    ctx.strokeStyle = '#a9d7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx - 5, hy);
    ctx.lineTo(hx + 5, hy);
    ctx.moveTo(hx, hy - 5);
    ctx.lineTo(hx, hy + 5);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(game.player.vehicle?.angle || game.player.angle + Math.PI / 2);
  ctx.fillStyle = '#f8f3dc';
  ctx.strokeStyle = '#142b39';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  label(ctx, 'N', x + 14, y + 19, 11, '#eef1d5', 'center', 800);
  label(ctx, 'GPS  /  MARBELLA', x + w - 10, y + h - 9, 8, '#b4c9c1', 'right');
  ctx.fillStyle = '#70ceb8';
  ctx.fillRect(x + 3, y + h + 7, w * game.player.health / 100 * 0.5 - 4, 4);
  ctx.fillStyle = '#68a6d3';
  ctx.fillRect(x + w / 2 + 3, y + h + 7, w * game.player.armor / 100 * 0.5 - 4, 4);
}
