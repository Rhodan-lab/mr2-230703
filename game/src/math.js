import { TAU } from './config.js';

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const finite = n => Number.isFinite(n) ? n : 0;

export function angleDelta(a, b) {
  return ((b - a + Math.PI * 3) % TAU) - Math.PI;
}

export function approach(value, target, amount) {
  return value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
}

export function circleRect(x, y, radius, box) {
  const px = clamp(x, box.x, box.x + box.w);
  const py = clamp(y, box.y, box.y + box.h);
  return (x - px) ** 2 + (y - py) ** 2 < radius ** 2;
}

export function segmentRect(ax, ay, bx, by, box) {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 16));
  for (let i = 0; i <= steps; i++) {
    if (circleRect(lerp(ax, bx, i / steps), lerp(ay, by, i / steps), 1, box)) return true;
  }
  return false;
}

export function safeEntity(entity, fallbackX = 1680, fallbackY = 1400) {
  if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) {
    entity.x = fallbackX;
    entity.y = fallbackY;
    entity.vx = 0;
    entity.vy = 0;
  }
  entity.vx = finite(entity.vx);
  entity.vy = finite(entity.vy);
  entity.angle = finite(entity.angle);
}

export function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.closePath();
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export function glow(ctx, x, y, radius, color, alpha = 1) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

export function label(ctx, text, x, y, size = 14, color = '#fff', align = 'left', weight = 600) {
  ctx.font = `${weight} ${size}px Arial,sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
