import { BLOCK, CITY_W, CITY_H } from './config.js';
import { createVehicle, driveVehicle } from './vehicles.js';
import { angleDelta, clamp, distance } from './math.js';

export function createPoliceState() {
  return {
    spawn: 0,
    unseen: 0,
    seen: false,
    arrest: 0,
    gainFlash: 0,
    lastKnown: { x: 0, y: 0 },
    dispatch: 0,
    unitsLost: 0,
  };
}

export function addWantedHeat(game, amount) {
  if (amount <= 0 || game.screen !== 'play') return;
  const before = Math.ceil(game.heat);
  game.heat = clamp(game.heat + amount, 0, 5);
  game.police.unseen = 0;
  if (Math.ceil(game.heat) > before) {
    game.police.gainFlash = 3;
    game.audio?.play('wanted');
    const lines = [
      'Dispatch: suspect reported. Units respond.',
      'Dispatch: pursuit authorized. Seal the intersections.',
      'Dispatch: armed suspect. Officers, use cover.',
      'Air One inbound. Keep the suspect illuminated.',
      'All units. Harbor lockdown. No way out.',
    ];
    game.notify('MARBELLA POLICE', lines[Math.ceil(game.heat) - 1]);
  }
}

export function spawnCruiser(game, x, y, angle = 0) {
  const cruiser = createVehicle('interceptor', x, y, angle);
  cruiser.parked = false;
  cruiser.pursuit = {
    stuck: 0,
    lastX: x,
    lastY: y,
    shoot: 1.8,
    ram: 0,
    target: null,
    route: [],
    repath: 0,
  };
  cruiser.invincible = !!game.shot;
  game.vehicles.push(cruiser);
  return cruiser;
}

function roadRoute(cruiser, target) {
  // The Manhattan road graph avoids steering through the building interiors.
  const cx = Math.round(cruiser.x / BLOCK) * BLOCK;
  const cy = Math.round(cruiser.y / BLOCK) * BLOCK;
  const tx = Math.round(target.x / BLOCK) * BLOCK;
  const ty = Math.round(target.y / BLOCK) * BLOCK;
  const route = [];
  if (Math.abs(cruiser.x - cx) < Math.abs(cruiser.y - cy)) {
    route.push({ x: cx + 19, y: cy + 19 });
  } else route.push({ x: cx + 19, y: cy + 19 });
  let x = cx;
  let y = cy;
  for (let i = 0; i < 28 && (x !== tx || y !== ty); i++) {
    if (Math.abs(tx - x) > Math.abs(ty - y)) x += Math.sign(tx - x) * BLOCK;
    else y += Math.sign(ty - y) * BLOCK;
    route.push({ x: x + 19, y: y + 19 });
  }
  route.push({ x: target.x, y: target.y });
  return route;
}

export function updatePolice(game, dt) {
  const p = game.police;
  const target = game.player;
  p.gainFlash = Math.max(0, p.gainFlash - dt);
  p.seen = false;
  const stars = Math.ceil(game.heat);
  const active = game.vehicles.filter(v => v.police && !v.exploded && !v.driver && v.pursuit);
  p.spawn -= dt;
  if (stars > 0 && active.length < Math.min(10, stars * 2) && p.spawn <= 0) {
    const side = game.random() > 0.5 ? 1 : -1;
    const x = clamp(Math.round((target.x + side * 450) / BLOCK) * BLOCK + 20, 20, CITY_W - 20);
    const y = clamp(Math.round(target.y / BLOCK) * BLOCK + 20, 20, CITY_H - 20);
    spawnCruiser(game, x, y, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    p.spawn = Math.max(2, 8 - stars);
  }
  let nearArrest = false;
  for (const cruiser of active) {
    const pursuit = cruiser.pursuit;
    const d = distance(cruiser, target);
    if (stars === 0) {
      driveVehicle(game, cruiser, 0, 0, true, dt);
      continue;
    }
    const sees = d < 470 && game.city.lineOfSight(cruiser, target);
    if (sees) {
      p.seen = true;
      p.lastKnown.x = target.x;
      p.lastKnown.y = target.y;
    }
    pursuit.repath -= dt;
    if (pursuit.repath <= 0) {
      pursuit.route = roadRoute(cruiser, sees ? target : p.lastKnown);
      pursuit.repath = 1.7;
    }
    let destination;
    if (sees && d < 220) {
      const lead = stars > 2 ? 0.5 : 0.15;
      destination = {
        x: target.x + (target.vehicle?.vx || 0) * lead,
        y: target.y + (target.vehicle?.vy || 0) * lead,
      };
    } else {
      while (pursuit.route.length > 1 && distance(cruiser, pursuit.route[0]) < 65) pursuit.route.shift();
      destination = pursuit.route[0] || p.lastKnown;
    }
    const desiredAngle = Math.atan2(destination.x - cruiser.x, -(destination.y - cruiser.y));
    const difference = angleDelta(cruiser.angle, desiredAngle);
    const steer = clamp(difference * 1.8, -1, 1);
    let throttle = Math.abs(difference) > 1.1 && cruiser.speed > 105 ? -0.55 : 1;
    if (d < 35 && !target.vehicle) throttle = -0.65;
    pursuit.stuck = Math.hypot(cruiser.x - pursuit.lastX, cruiser.y - pursuit.lastY) < 0.08 ? pursuit.stuck + dt : Math.max(0, pursuit.stuck - dt);
    pursuit.lastX = cruiser.x;
    pursuit.lastY = cruiser.y;
    if (pursuit.stuck > 1.5) {
      throttle = -0.8;
      if (pursuit.stuck > 3) {
        cruiser.angle += 1.5;
        pursuit.stuck = 0;
      }
    }
    driveVehicle(game, cruiser, throttle, steer, false, dt);
    pursuit.shoot -= dt;
    if (stars >= 3 && d < 300 && sees && pursuit.shoot <= 0) {
      const direction = Math.atan2(target.y - cruiser.y, target.x - cruiser.x);
      game.fireBullet(cruiser.x, cruiser.y, direction + (game.random() - 0.5) * 0.14, 'police', 12, 830, 1);
      game.audio?.play('pistol');
      pursuit.shoot = 0.9 + game.random() * 0.8;
    }
    if (d < 55 && Math.abs(target.vehicle?.speed || 0) < 12) nearArrest = true;
  }
  const helicopter = game.helicopter;
  const airVisibility = game.weather.type === 'RAIN' ? 86 : game.light.night > 0.4 ? 105 : 145;
  const insideSearchlight = Math.hypot(helicopter.searchX - target.x, helicopter.searchY - target.y) < airVisibility;
  if (helicopter.active && insideSearchlight && game.city.lineOfSight(helicopter, target)) {
    p.seen = true;
    p.lastKnown.x = target.x;
    p.lastKnown.y = target.y;
  }
  if (stars > 0) {
    p.unseen = p.seen ? 0 : p.unseen + dt;
    if (p.unseen > 9 && !game.shot) {
      game.heat = Math.max(0, game.heat - dt * 0.16);
      if (game.heat === 0) {
        game.notify('PURSUIT EVADED', 'Keep your head down, Rico.');
        game.audio?.play('passed');
        p.unitsLost++;
      }
    }
  }
  p.arrest = nearArrest && stars > 0 ? p.arrest + dt : Math.max(0, p.arrest - dt * 2);
  if (p.arrest > 3.5 && !game.shot) game.respawn('BUSTED');
}
