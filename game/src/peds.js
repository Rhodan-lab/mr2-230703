import { BLOCK, CITY_W, TAU } from './config.js';
import { clamp, distance, safeEntity } from './math.js';
import { choose } from './random.js';

const SHIRTS = ['#dbd5ae', '#dc8576', '#63a8ad', '#a6b5c9', '#edd4b1', '#9989a4', '#f0b86f', '#578b82'];
const SKINS = ['#b77c57', '#dda983', '#8e614c', '#efc7a0'];

export function makePed(game, x, y, fleeing = false) {
  return {
    x,
    y,
    originX: x,
    originY: y,
    vx: 0,
    vy: 0,
    angle: game.random() * TAU,
    targetAngle: game.random() * TAU,
    shirt: choose(game.random, SHIRTS),
    skin: choose(game.random, SKINS),
    health: 70,
    flee: fleeing ? 8 : 0,
    wander: game.random() * 4,
    step: game.random() * TAU,
    police: false,
    shoot: 0,
    down: 0,
    umbrella: game.random() > 0.65,
    cash: 20 + Math.floor(game.random() * 90),
  };
}

export function spawnPedestrians(game) {
  for (let i = 0; i < 240; i++) {
    const col = 1 + Math.floor(game.random() * 11);
    const row = 1 + Math.floor(game.random() * 13);
    const edge = game.random() > 0.5;
    const x = col * BLOCK + (edge ? 53 : 70 + game.random() * 140);
    const y = row * BLOCK + (edge ? 70 + game.random() * 140 : 53);
    game.peds.push(makePed(game, x, y));
  }
  for (let i = 0; i < 70; i++) {
    const beach = i < 42;
    const x = beach ? CITY_W + 60 + game.random() * 75 : 560 + game.random() * 220;
    const y = beach ? 800 + game.random() * 1600 : 2405 + game.random() * 18;
    game.peds.push(makePed(game, x, y));
  }
}

export function frightenPedestrians(game, x, y, radius = 250) {
  for (const ped of game.peds) {
    if (Math.hypot(ped.x - x, ped.y - y) < radius && !ped.police) {
      ped.flee = 5 + game.random() * 4;
      ped.targetAngle = Math.atan2(ped.y - y, ped.x - x);
    }
  }
}

export function updatePedestrians(game, dt) {
  const player = game.player;
  for (const ped of game.peds) {
    const d = distance(ped, player);
    if (d > 850) continue;
    if (ped.health <= 0) {
      ped.down += dt;
      continue;
    }
    ped.flee = Math.max(0, ped.flee - dt);
    ped.shoot = Math.max(0, ped.shoot - dt);
    ped.wander -= dt;
    if (ped.police && game.heat > 0) {
      ped.targetAngle = Math.atan2(player.y - ped.y, player.x - ped.x);
      if (d < 310 && ped.shoot <= 0 && game.city.lineOfSight(ped, player)) {
        game.fireBullet(ped.x, ped.y, ped.targetAngle, 'police', 14, 750, 1.1);
        ped.shoot = 1.2;
      }
    } else {
      if (!player.vehicle && player.aiming && d < 140) ped.flee = 5;
      if (ped.wander <= 0) {
        const back = Math.hypot(ped.x - ped.originX, ped.y - ped.originY) > 90;
        ped.targetAngle = back ? Math.atan2(ped.originY - ped.y, ped.originX - ped.x) : game.random() * TAU;
        ped.wander = 2 + game.random() * 4;
      }
    }
    let speed = ped.police ? d > 150 ? 65 : 0 : ped.flee > 0 ? 87 : 19;
    if (ped.flee > 0 && !ped.police) ped.targetAngle = Math.atan2(ped.y - player.y, ped.x - player.x);
    ped.angle = ped.targetAngle;
    ped.vx = Math.cos(ped.angle) * speed;
    ped.vy = Math.sin(ped.angle) * speed;
    const nx = ped.x + ped.vx * dt;
    const ny = ped.y + ped.vy * dt;
    if (!game.city.collision(nx, ny, 6) && !game.city.isWater(nx, ny)) {
      ped.x = nx;
      ped.y = ny;
    } else {
      ped.targetAngle += Math.PI * 0.72;
      ped.wander = 0.8;
    }
    ped.step += speed * dt * 0.13;
    for (const v of game.vehicles) {
      const near = distance(ped, v);
      if (near < 54 && Math.abs(v.speed) > 50 && !ped.police) ped.flee = 4;
      if (near < v.spec.w * 0.55 + 5 && Math.abs(v.speed) > 48) {
        hurtPedestrian(game, ped, Math.abs(v.speed) * 0.6, v.driver ? 'player' : 'world');
        ped.x += v.vx * dt * 3;
        ped.y += v.vy * dt * 3;
      }
    }
    safeEntity(ped, ped.originX, ped.originY);
  }
  if (game.peds.length > 440) game.peds = game.peds.filter(ped => ped.down < 40);
}

export function hurtPedestrian(game, ped, amount, source) {
  if (ped.health <= 0) return;
  ped.health -= amount;
  ped.flee = 9;
  game.fx.burst('blood', ped.x, ped.y, 5);
  if (source === 'player') game.addHeat(ped.police ? 1.1 : 0.45);
  if (ped.health <= 0) {
    game.dropPickup('cash', ped.x + 8, ped.y, ped.cash);
    if (game.random() > 0.5) game.dropPickup('ammo', ped.x - 6, ped.y + 5, 24);
  }
}

export function drawPedestrian(ctx, ped, game, player = false) {
  const dead = ped.health <= 0;
  ctx.save();
  const elevation = ped.rooftopHeight || 0;
  ctx.translate(ped.x - elevation * 0.28, ped.y - elevation * 0.62);
  ctx.rotate(dead ? ped.angle + 1 : ped.angle + Math.PI / 2);
  ctx.fillStyle = 'rgba(3,19,26,.25)';
  ctx.beginPath();
  ctx.ellipse(-3, 4, dead ? 11 : 7, dead ? 5 : 10, 0, 0, TAU);
  ctx.fill();
  if (dead) {
    ctx.fillStyle = '#734c45';
    ctx.beginPath();
    ctx.ellipse(2, 1, 11, 4, 0.3, 0, TAU);
    ctx.fill();
  }
  const walk = dead ? 0 : Math.sin(ped.step || 0) * 3;
  ctx.fillStyle = player ? '#284357' : '#334557';
  ctx.fillRect(-4, 2 + walk, 3, 7);
  ctx.fillRect(1, 2 - walk, 3, 7);
  ctx.fillStyle = ped.police ? '#243f58' : player ? '#e4d9bd' : ped.shirt;
  ctx.beginPath();
  ctx.ellipse(0, -1, 6, 7, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = ped.skin || '#c58e69';
  ctx.fillRect(-8, -3, 3, 7 - walk * 0.4);
  ctx.fillRect(5, -3, 3, 7 + walk * 0.4);
  ctx.fillStyle = ped.skin || '#c58e69';
  ctx.beginPath();
  ctx.arc(0, -6, 4.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = ped.police ? '#213e56' : '#342f2b';
  ctx.beginPath();
  ctx.arc(0, -7, 4, Math.PI, TAU);
  ctx.fill();
  if (player && ped.weapon > 0) {
    ctx.fillStyle = '#263641';
    ctx.fillRect(5, -13, ped.weapon === 1 ? 3 : 4, ped.weapon === 1 ? 8 : 15);
  }
  if (ped.police) {
    ctx.fillStyle = '#d6bc6e';
    ctx.fillRect(-4, -3, 2, 2);
  }
  if (!player && !ped.police && ped.umbrella && game.weather.type === 'RAIN' && !dead) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#688895' : '#4c6a80';
      ctx.beginPath();
      ctx.moveTo(3, -8);
      ctx.arc(3, -8, 12, i * TAU / 6, (i + 1) * TAU / 6);
      ctx.fill();
    }
  }
  ctx.restore();
}
