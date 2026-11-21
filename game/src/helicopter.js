import { TAU } from './config.js';
import { distance, lerp, polygon, glow, label } from './math.js';

export function createHelicopter() {
  return {
    active: false,
    x: 1500,
    y: 1200,
    angle: 0.7,
    rotor: 0,
    sweep: 0,
    deploy: 14,
    rope: 0,
    searchX: 0,
    searchY: 0,
    altitude: 110,
    officers: 0,
  };
}

export function updateHelicopter(game, dt) {
  const h = game.helicopter;
  if (game.heat < 3.2) {
    h.active = false;
    return;
  }
  if (!h.active) {
    h.active = true;
    h.x = game.player.x - 200;
    h.y = game.player.y - 190;
    h.deploy = 9;
  }
  const t = game.clock.elapsed;
  const px = game.player.x;
  const py = game.player.y;
  const targetX = px - 165 + Math.cos(t * 0.17) * 55;
  const targetY = py - 90 + Math.sin(t * 0.21) * 45;
  const follow = 1 - Math.exp(-dt * 1.5);
  h.x = lerp(h.x, targetX, follow);
  h.y = lerp(h.y, targetY, follow);
  h.angle = 0.35 + Math.sin(t * 0.3) * 0.2;
  h.rotor = (h.rotor + dt * 49) % TAU;
  h.sweep = Math.sin(t * 0.65) * 0.33;
  h.searchX = px + Math.sin(t * 0.8) * 55;
  h.searchY = py + Math.cos(t * 0.63) * 36;
  h.deploy -= dt;
  h.rope = Math.max(0, h.rope - dt);
  if (h.deploy <= 0 && h.officers < 12) {
    h.rope = 4;
    h.deploy = 24;
    for (let i = 0; i < 2; i++) {
      const x = h.x + i * 23;
      const y = h.y + 30;
      if (game.city.collision(x, y, 10) || game.city.isWater(x, y)) continue;
      const officer = game.makePed(x, y);
      officer.police = true;
      officer.health = 110;
      officer.shirt = '#243f58';
      game.peds.push(officer);
      h.officers++;
    }
    game.notify('AIR ONE', 'Tactical officers deploying. Keep moving.');
  }
}

export function drawSearchlight(ctx, game) {
  const h = game.helicopter;
  if (!h.active) return;
  const ox = h.x;
  const oy = h.y - h.altitude;
  const tx = h.searchX;
  const ty = h.searchY;
  const angle = Math.atan2(ty - oy, tx - ox);
  const width = 74;
  const nx = -Math.sin(angle) * width;
  const ny = Math.cos(angle) * width;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const beam = ctx.createLinearGradient(ox, oy, tx, ty);
  beam.addColorStop(0, '#dfedff65');
  beam.addColorStop(0.55, '#d5e9ff19');
  beam.addColorStop(1, '#dceeff34');
  polygon(ctx, [[ox - 3, oy], [ox + 3, oy], [tx + nx, ty + ny], [tx - nx, ty - ny]], beam);
  ctx.translate(tx, ty);
  ctx.rotate(angle + Math.PI / 2);
  ctx.scale(1, 0.57);
  glow(ctx, 0, 0, 100, '#d6edff80');
  ctx.strokeStyle = '#d1e9fa44';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 75, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function drawHelicopter(ctx, game) {
  const h = game.helicopter;
  if (!h.active) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,10,22,.23)';
  ctx.beginPath();
  ctx.ellipse(h.x + 25, h.y + 15, 55, 19, h.angle, 0, TAU);
  ctx.fill();
  if (h.rope > 0) {
    ctx.strokeStyle = '#a8bac4';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(h.x + 10, h.y - h.altitude + 10);
    ctx.lineTo(h.x + 20, h.y + 27);
    ctx.stroke();
    const offset = (1 - h.rope / 4) * h.altitude;
    ctx.fillStyle = '#283c50';
    ctx.fillRect(h.x + 10, h.y - h.altitude + offset, 8, 13);
  }
  ctx.translate(h.x, h.y - h.altitude);
  ctx.rotate(h.angle);
  ctx.strokeStyle = '#a8b5bd';
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 18, -15);
    ctx.lineTo(side * 18, 25);
    ctx.stroke();
  }
  polygon(ctx, [[-6, 12], [6, 12], [4, 71], [-4, 71]], '#345064');
  polygon(ctx, [[-17, 60], [17, 60], [17, 66], [-17, 66]], '#b1b9b8');
  ctx.fillStyle = '#c6d0cf';
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 31, 0, 0, TAU);
  ctx.fill();
  polygon(ctx, [[-13, -18], [0, -29], [13, -18], [12, -4], [-12, -4]], '#284b63');
  ctx.strokeStyle = '#7ab0bd';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -27);
  ctx.lineTo(0, -6);
  ctx.stroke();
  ctx.fillStyle = '#344e62';
  ctx.fillRect(-14, 3, 28, 11);
  label(ctx, 'MPD', 0, 11, 7, '#d8e4de', 'center', 800);
  ctx.fillStyle = '#ff6874';
  ctx.fillRect(-19, -3, 3, 4);
  ctx.fillStyle = '#73d7bb';
  ctx.fillRect(16, -3, 3, 4);
  ctx.save();
  ctx.rotate(h.rotor);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    polygon(ctx, [[-3, 0], [2, 0], [6, -68], [0, -70]], '#b3c4cc99');
  }
  ctx.restore();
  ctx.strokeStyle = '#b8d1e344';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 66, h.rotor, h.rotor + 4.8);
  ctx.stroke();
  ctx.fillStyle = '#3b5569';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}
