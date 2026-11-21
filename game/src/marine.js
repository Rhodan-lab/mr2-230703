import { COAST, TAU } from './config.js';
import { distance, glow, label, polygon } from './math.js';
import { hash } from './random.js';

export function createMarine() {
  const buoys = [];
  for (let i = 0; i < 11; i++) {
    buoys.push({
      x: COAST + 300 + i % 3 * 210,
      y: 1770 + i * 145,
      red: i % 2 === 0,
      phase: i * 0.7,
    });
  }
  return {
    buoys,
    wind: 0.4,
    swell: 0,
    birdTimer: 0,
  };
}

export function updateMarine(game, dt) {
  const marine = game.marine;
  marine.swell += dt;
  marine.wind += (game.weather.type === 'RAIN' ? 0.8 - marine.wind : 0.35 - marine.wind) * dt * 0.1;
  for (const boat of game.vehicles) {
    if (!boat.spec.boat || Math.abs(boat.speed) < 12) continue;
    if (!boat.wakeTrail) boat.wakeTrail = [];
    boat.trailTimer = (boat.trailTimer || 0) - dt;
    if (boat.trailTimer <= 0) {
      boat.wakeTrail.unshift({
        x: boat.x - Math.sin(boat.angle) * 30,
        y: boat.y + Math.cos(boat.angle) * 30,
        angle: boat.angle,
        age: 0,
        strength: Math.min(1, Math.abs(boat.speed) / 160),
      });
      boat.trailTimer = 0.055;
    }
  }
  for (const boat of game.vehicles) {
    if (!boat.wakeTrail) continue;
    for (const point of boat.wakeTrail) point.age += dt;
    boat.wakeTrail = boat.wakeTrail.filter(point => point.age < 4).slice(0, 85);
  }
}

export function drawMarine(ctx, game, bounds) {
  drawWakeRibbons(ctx, game);
  const t = game.clock.elapsed;
  for (const buoy of game.marine.buoys) {
    if (distance(buoy, game.player) > 1100) continue;
    const bob = Math.sin(t * 1.7 + buoy.phase) * 1.2;
    const x = buoy.x;
    const y = buoy.y + bob;
    const color = buoy.red ? '#c87866' : '#68a993';
    ctx.fillStyle = '#1c546455';
    ctx.beginPath();
    ctx.ellipse(x - 3, y + 5, 8, 3, -0.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c2e5d64d';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 11 + bob, 5 + bob * 0.3, 0, 0, TAU);
    ctx.stroke();
    polygon(ctx, [[x - 5, y + 3], [x - 3, y - 7], [x + 3, y - 7], [x + 5, y + 3]], color);
    ctx.fillStyle = '#ddd9b6';
    ctx.fillRect(x - 2, y - 8, 4, 2);
    ctx.fillStyle = color;
    ctx.fillRect(x - 1, y - 15, 2, 7);
    ctx.beginPath();
    ctx.arc(x, y - 16, 2, 0, TAU);
    ctx.fill();
    if (game.light.night > 0.3 && Math.sin(t * 2 + buoy.phase) > 0.5) {
      glow(ctx, x, y - 16, 15, buoy.red ? '#ff7d6966' : '#72e0b766');
    }
  }
  if (bounds.right < COAST) return;
  // Whitecaps break the large water area into fine, animated surface detail.
  ctx.save();
  for (let i = 0; i < 95; i++) {
    const x = COAST + 20 + hash(i, 98) * 1380;
    const y = 1400 + hash(i, 47) * 2400;
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) continue;
    const phase = (t * 0.3 + hash(i, 44)) % 1;
    ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.23;
    ctx.strokeStyle = '#d9efe0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 9, y - 2 - phase, x + 20 + phase * 5, y + 1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWakeRibbons(ctx, game) {
  for (const boat of game.vehicles) {
    const trail = boat.wakeTrail;
    if (!trail || trail.length < 3 || distance(boat, game.player) > 1100) continue;
    ctx.save();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      trail.forEach((point, index) => {
        const width = 8 + point.age * 12;
        const x = point.x + Math.cos(point.angle) * side * width;
        const y = point.y + Math.sin(point.angle) * side * width;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#d9f3e466';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = '#effff033';
      ctx.lineWidth = 9;
      ctx.stroke();
    }
    for (let i = 0; i < trail.length - 1; i++) {
      const point = trail[i];
      const next = trail[i + 1];
      const width = (6 + point.age * 8) * point.strength;
      ctx.strokeStyle = `rgba(209,242,222,${Math.max(0, 0.23 - point.age * 0.05)})`;
      ctx.lineWidth = width * 1.5;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
