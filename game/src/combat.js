import { TAU } from './config.js';
import { clamp, distance, glow, label } from './math.js';
import { damageVehicle } from './vehicles.js';
import { hurtPedestrian, frightenPedestrians } from './peds.js';

export const WEAPONS = [
  { name: 'FISTS', clip: 0, reserve: 0, damage: 24, delay: 0.4, spread: 0, speed: 0, pellets: 1, unlock: 0 },
  { name: 'PISTOL', clip: 12, reserve: 120, damage: 29, delay: 0.27, spread: 0.025, speed: 1050, pellets: 1, unlock: 0 },
  { name: 'SMG', clip: 32, reserve: 240, damage: 17, delay: 0.075, spread: 0.08, speed: 1120, pellets: 1, unlock: 3 },
  { name: 'RIFLE', clip: 30, reserve: 180, damage: 39, delay: 0.115, spread: 0.018, speed: 1350, pellets: 1, unlock: 8 },
  { name: 'SHOTGUN', clip: 6, reserve: 60, damage: 18, delay: 0.75, spread: 0.22, speed: 950, pellets: 7, unlock: 5 },
];

export function createArsenal() {
  return WEAPONS.map(w => ({ ammo: w.clip, reserve: w.reserve }));
}

export function fireBullet(game, x, y, angle, source = 'player', damage = 25, speed = 1100, life = 0.7) {
  const bullet = {
    x,
    y,
    previousX: x,
    previousY: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    source,
    damage,
    life,
    travelled: 0,
  };
  game.bullets.push(bullet);
  game.fx.emit('muzzle', x + Math.cos(angle) * 10, y + Math.sin(angle) * 10, 0, 0, 0.06);
  return bullet;
}

export function updateCombat(game, dt) {
  const p = game.player;
  const input = game.input;
  p.cooldown = Math.max(0, p.cooldown - dt);
  if (p.reload > 0) {
    p.reload -= dt;
    if (p.reload <= 0) {
      const spec = WEAPONS[p.weapon];
      const ammo = p.arsenal[p.weapon];
      const amount = Math.min(spec.clip - ammo.ammo, ammo.reserve);
      ammo.ammo += amount;
      ammo.reserve -= amount;
      game.audio?.play('reload');
    }
  }
  for (let i = 0; i < WEAPONS.length; i++) {
    if (input.tap(`Digit${i + 1}`) && game.story.completed >= WEAPONS[i].unlock) {
      p.weapon = i;
      p.reload = 0;
      game.audio?.play('ui');
    }
  }
  if (input.tap('KeyF')) reloadWeapon(game);
  p.aiming = input.mouse.down || input.down('KeyQ');
  const worldMouse = game.camera.screenToWorld(input.mouse.x, input.mouse.y);
  p.aimAngle = Math.atan2(worldMouse.y - p.y, worldMouse.x - p.x);
  if (!p.vehicle) p.angle = p.aiming ? p.aimAngle : p.angle;
  if ((input.mouse.down || input.down('KeyQ')) && p.cooldown <= 0 && p.reload <= 0 && game.screen === 'play' && !game.dialog) shootPlayer(game);
  updateBullets(game, dt);
  updatePickups(game, dt);
}

function shootPlayer(game) {
  const p = game.player;
  const spec = WEAPONS[p.weapon];
  if (p.weapon === 0) {
    for (const ped of game.peds) {
      if (distance(p, ped) < 35) hurtPedestrian(game, ped, spec.damage, 'player');
    }
    game.fx.burst('tire', p.x + Math.cos(p.aimAngle) * 17, p.y + Math.sin(p.aimAngle) * 17, 3, 12);
    p.cooldown = spec.delay;
    game.audio?.play('punch');
    return;
  }
  const ammo = p.arsenal[p.weapon];
  if (ammo.ammo <= 0) {
    reloadWeapon(game);
    return;
  }
  ammo.ammo--;
  p.cooldown = spec.delay;
  for (let i = 0; i < spec.pellets; i++) {
    const angle = p.aimAngle + (game.random() - 0.5) * spec.spread;
    fireBullet(game, p.x + Math.cos(angle) * 18, p.y + Math.sin(angle) * 18, angle, 'player', spec.damage, spec.speed);
  }
  frightenPedestrians(game, p.x, p.y, 320);
  game.addHeat(0.065);
  game.audio?.play(p.weapon === 2 ? 'smg' : p.weapon === 3 ? 'rifle' : p.weapon === 4 ? 'shotgun' : 'pistol');
  game.camera.shake = Math.max(game.camera.shake, p.weapon === 4 ? 3 : 0.7);
}

export function reloadWeapon(game) {
  const p = game.player;
  const ammo = p.arsenal[p.weapon];
  if (p.weapon === 0 || p.reload > 0 || ammo.reserve <= 0 || ammo.ammo === WEAPONS[p.weapon].clip) return;
  p.reload = p.weapon === 4 ? 2.1 : 1.35;
  game.audio?.play('reload');
}

function updateBullets(game, dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.life -= dt;
    b.previousX = b.x;
    b.previousY = b.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 6));
    for (let step = 0; step < steps && b.life > 0; step++) {
      b.x += b.vx * dt / steps;
      b.y += b.vy * dt / steps;
      b.travelled += Math.hypot(b.vx, b.vy) * dt / steps;
      if (game.city.collision(b.x, b.y, 1)) {
        game.fx.burst('spark', b.x, b.y, 4, 55);
        if (distance(b, game.player) < 350) game.audio?.play('ricochet');
        b.life = 0;
        break;
      }
      if (b.source === 'police' && distance(b, game.player) < (game.player.vehicle ? 15 : 9)) {
        game.hurt(b.damage);
        b.life = 0;
        break;
      }
      for (const v of game.vehicles) {
        if (v.driver && b.source === 'player' || v.police && b.source === 'police' || v.exploded) continue;
        if (distance(b, v) < v.spec.w * 0.65) {
          damageVehicle(game, v, b.damage * 0.75, b.source);
          game.fx.burst('spark', b.x, b.y, 6, 75);
          b.life = 0;
          break;
        }
      }
      if (b.source === 'player') {
        for (const ped of game.peds) {
          if (ped.health <= 0 || distance(b, ped) > 9) continue;
          hurtPedestrian(game, ped, b.damage, 'player');
          b.life = 0;
          break;
        }
      }
    }
    if (b.life <= 0 || !Number.isFinite(b.x)) game.bullets.splice(i, 1);
  }
}

export function drawBullets(ctx, game) {
  ctx.save();
  for (const b of game.bullets) {
    ctx.strokeStyle = b.source === 'player' ? '#fff3b1' : '#ffb487';
    ctx.lineWidth = b.source === 'player' ? 2.2 : 1.5;
    ctx.shadowColor = '#ffc76b';
    ctx.shadowBlur = 5;
    const speed = Math.hypot(b.vx, b.vy);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx / speed * 27, b.y - b.vy / speed * 27);
    ctx.stroke();
  }
  ctx.restore();
}

export function createPickup(type, x, y, amount = 1) {
  return { type, x, y, amount, age: 0, active: true };
}

export function seedPickups(game) {
  const points = [
    ['health', 610, 605, 40],
    ['armor', 1150, 1110, 50],
    ['ammo', 1730, 1429, 80],
    ['cash', 2292, 1980, 350],
    ['health', 3380, 1700, 50],
    ['ammo', 3110, 2910, 90],
    ['armor', 2260, 590, 60],
    ['cash', 840, 2565, 180],
  ];
  for (const [type, x, y, amount] of points) game.pickups.push(createPickup(type, x, y, amount));
}

function updatePickups(game, dt) {
  for (const item of game.pickups) {
    if (!item.active) continue;
    item.age += dt;
    if (distance(item, game.player) > 28) continue;
    const p = game.player;
    if (item.type === 'health') p.health = clamp(p.health + item.amount, 0, 100);
    if (item.type === 'armor') p.armor = clamp(p.armor + item.amount, 0, 100);
    if (item.type === 'cash') game.economy.cash += item.amount;
    if (item.type === 'ammo') for (const weapon of p.arsenal) weapon.reserve += item.amount;
    game.fx.pop(item.type === 'cash' ? `+$${item.amount}` : `+${item.type.toUpperCase()}`, item.x, item.y);
    game.audio?.play('pickup');
    item.active = false;
  }
}

export function drawPickups(ctx, game) {
  const colors = { health: '#9de5bd', armor: '#7ec7f0', cash: '#dfd27c', ammo: '#e5aa81' };
  const icons = { health: '+', armor: '◆', cash: '$', ammo: 'II' };
  for (const item of game.pickups) {
    if (!item.active || distance(item, game.player) > 850) continue;
    const y = item.y + Math.sin(game.clock.elapsed * 3 + item.x) * 3;
    glow(ctx, item.x, y, 21, colors[item.type] + '44');
    ctx.strokeStyle = colors[item.type];
    ctx.lineWidth = 1.5;
    ctx.strokeRect(item.x - 8, y - 8, 16, 16);
    label(ctx, icons[item.type], item.x, y + 5, 13, colors[item.type], 'center', 800);
  }
}
