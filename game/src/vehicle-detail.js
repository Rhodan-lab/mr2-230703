import { polygon, label } from './math.js';

export function drawVehicleDetail(ctx, vehicle, game) {
  const v = vehicle;
  const w = v.spec.w;
  const h = v.spec.h;
  if (v.exploded || v.spec.bike) return;
  ctx.save();
  // Thin seams and layered paint highlights keep the silhouettes readable.
  ctx.strokeStyle = '#142e3a55';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-w * 0.42, -h * 0.33);
  ctx.lineTo(w * 0.42, -h * 0.33);
  ctx.moveTo(-w * 0.43, h * 0.35);
  ctx.lineTo(w * 0.43, h * 0.35);
  ctx.moveTo(-w * 0.45, -h * 0.08);
  ctx.lineTo(-w * 0.45, h * 0.2);
  ctx.moveTo(w * 0.45, -h * 0.08);
  ctx.lineTo(w * 0.45, h * 0.2);
  ctx.stroke();
  ctx.fillStyle = '#1b3038';
  ctx.fillRect(-w / 2 - 3, -h * 0.13, 4, 3);
  ctx.fillRect(w / 2 - 1, -h * 0.13, 4, 3);
  ctx.fillStyle = '#c9d0b6';
  ctx.fillRect(-w / 2 + 2, h * 0.12, 1, 4);
  ctx.fillRect(w / 2 - 3, h * 0.12, 1, 4);
  const gloss = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  gloss.addColorStop(0, '#ffffff00');
  gloss.addColorStop(0.35, '#ffffff00');
  gloss.addColorStop(0.47, '#ffffff24');
  gloss.addColorStop(0.52, '#ffffff06');
  gloss.addColorStop(1, '#ffffff00');
  ctx.fillStyle = gloss;
  ctx.fillRect(-w / 2 + 2, -h / 2 + 5, w - 4, h - 10);
  if (!['haulmax', 'parcelvan'].includes(v.type)) {
    // Driver silhouette can be seen through the front windscreen.
    ctx.fillStyle = '#ad9876';
    ctx.beginPath();
    ctx.ellipse(-w * 0.2, -h * 0.08, 2.3, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c2d7cf';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-w * 0.36, -h * 0.17);
    ctx.lineTo(w * 0.1, -h * 0.06);
    ctx.stroke();
  }
  if (v.type === 'vectora') {
    ctx.fillStyle = '#2c445044';
    ctx.fillRect(-w * 0.24, h * 0.32, w * 0.48, 5);
    ctx.strokeStyle = '#263d47';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, h * 0.32 + i);
      ctx.lineTo(w * 0.2, h * 0.32 + i);
      ctx.stroke();
    }
    polygon(ctx, [[-2, -h * 0.41], [2, -h * 0.41], [0, -h * 0.35]], '#e5e5c7');
  }
  if (v.type === 'parcelvan') {
    ctx.strokeStyle = '#596e6b';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.14);
    ctx.lineTo(0, h * 0.46);
    ctx.stroke();
    ctx.fillStyle = '#b29b6f';
    ctx.fillRect(-7, h * 0.3, 4, 7);
    ctx.fillRect(2, h * 0.27, 5, 10);
    label(ctx, 'EXPRESS', 0, h * 0.2, 3.3, '#436f73', 'center', 800);
  }
  if (v.type === 'taxi') {
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#e9c16c' : '#384e53';
        ctx.fillRect(side * (w / 2 - 3), -7 + i * 3, 2, 3);
      }
    }
  }
  if (v.type === 'interceptor') {
    ctx.fillStyle = '#1c3441';
    ctx.fillRect(-w * 0.32, -h * 0.39, w * 0.64, 6);
    label(ctx, String(21 + v.id % 77), 0, -h * 0.28, 5, '#ebebcf', 'center', 800);
  }
  if (v.health < 45) {
    ctx.strokeStyle = '#d2e2d47d';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-4, -h * 0.18);
    ctx.lineTo(1, -h * 0.1);
    ctx.lineTo(5, -h * 0.15);
    ctx.moveTo(1, -h * 0.1);
    ctx.lineTo(-3, -h * 0.04);
    ctx.stroke();
  }
  ctx.restore();
}
