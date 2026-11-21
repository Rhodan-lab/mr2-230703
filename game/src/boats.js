import { COAST, TAU } from './config.js';
import { createVehicle } from './vehicles.js';
import { polygon, label } from './math.js';

export function spawnBoats(game) {
  for (const [x, y, angle] of [
    [COAST + 150, 3130, Math.PI / 2],
    [COAST + 92, 3410, 0],
    [COAST + 185, 3425, 0],
    [COAST + 360, 2880, 1.9],
    [COAST + 640, 2200, 2.1],
  ]) game.vehicles.push(createVehicle('marlin', x, y, angle));
}

export function updateBoatWake(game, boat, dt) {
  boat.wakeTimer -= dt;
  if (Math.abs(boat.speed) < 15 || boat.wakeTimer > 0) return;
  const fx = Math.sin(boat.angle);
  const fy = -Math.cos(boat.angle);
  const x = boat.x - fx * 29;
  const y = boat.y - fy * 29;
  for (const side of [-1, 1]) {
    game.fx.emit('wake', x, y, -fx * 16 + Math.cos(boat.angle) * side * 22, -fy * 16 + Math.sin(boat.angle) * side * 22, 2.8);
  }
  if (Math.abs(boat.speed) > 90) game.fx.emit('splash', x, y, -fx * 30, -fy * 30, 1.2);
  boat.wakeTimer = 0.045;
}

export function drawBoat(ctx, boat, game) {
  ctx.save();
  ctx.translate(boat.x, boat.y + Math.sin(game.clock.elapsed * 2 + boat.id) * 1.1);
  ctx.rotate(boat.angle);
  ctx.fillStyle = '#123e4e66';
  ctx.beginPath();
  ctx.ellipse(3, 9, 18, 35, 0, 0, TAU);
  ctx.fill();
  polygon(ctx, [[0, -36], [13, -17], [15, 23], [10, 32], [-10, 32], [-15, 23], [-13, -17]], boat.color);
  polygon(ctx, [[0, -29], [9, -13], [10, 25], [-10, 25], [-9, -13]], '#78a2ae');
  polygon(ctx, [[0, -26], [9, -10], [-9, -10]], '#f0e8cb');
  ctx.fillStyle = '#e4d8ba';
  ctx.fillRect(-9, 3, 18, 20);
  ctx.fillStyle = '#2c586b';
  ctx.fillRect(-10, -7, 20, 9);
  ctx.fillStyle = '#f0e9d2';
  ctx.fillRect(-9, 7, 6, 8);
  ctx.fillRect(3, 7, 6, 8);
  ctx.fillStyle = '#243b46';
  ctx.fillRect(-9, 28, 18, 7);
  if (boat.driver) {
    ctx.fillStyle = '#daaa81';
    ctx.beginPath();
    ctx.arc(5, 7, 3.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d7e5da';
    ctx.fillRect(1, 10, 8, 6);
  }
  label(ctx, 'MARLIN', 0, 22, 4.5, '#335869', 'center');
  ctx.restore();
}
