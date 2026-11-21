import { distance, label, polygon, glow } from './math.js';

export const STUNT_RAMPS = [
  {
    id: 'mercado-flight',
    name: 'MERCADO FLIGHT',
    x: 980,
    y: 2540,
    angle: Math.PI / 2,
    minimum: 145,
    reward: 800,
  },
  {
    id: 'harbor-hop',
    name: 'HARBOR HOP',
    x: 2940,
    y: 2820,
    angle: Math.PI / 2,
    minimum: 155,
    reward: 1000,
  },
  {
    id: 'costa-flight',
    name: 'COSTA FLIGHT',
    x: 1980,
    y: 420,
    angle: 0,
    minimum: 170,
    reward: 1300,
  },
  {
    id: 'greenfield-gap',
    name: 'GREENFIELD GAP',
    x: 280,
    y: 1540,
    angle: Math.PI,
    minimum: 140,
    reward: 900,
  },
  {
    id: 'palma-hop',
    name: 'PALMA HOP',
    x: 3380,
    y: 2380,
    angle: 0,
    minimum: 160,
    reward: 1200,
  },
  {
    id: 'mirador-leap',
    name: 'MIRADOR LEAP',
    x: 1260,
    y: 280,
    angle: -Math.PI / 2,
    minimum: 165,
    reward: 1400,
  },
];

export function createStunts() {
  return {
    active: null,
    launchX: 0,
    launchY: 0,
    airTime: 0,
    completed: [],
    cooldown: 0,
    result: null,
    resultAge: 0,
    bestDistance: 0,
  };
}

export function updateStunts(game, dt) {
  const state = game.stunts;
  const vehicle = game.player.vehicle;
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.resultAge += dt;
  if (!vehicle || vehicle.spec.boat || vehicle.exploded) return;
  if (!Number.isFinite(vehicle.altitude)) {
    vehicle.altitude = 0;
    vehicle.verticalSpeed = 0;
  }
  if (vehicle.altitude > 0 || vehicle.verticalSpeed > 0) {
    vehicle.verticalSpeed -= dt * 420;
    vehicle.altitude += vehicle.verticalSpeed * dt;
    state.airTime += dt;
    if (game.random() < dt * 9) game.fx.emit('tire', vehicle.x, vehicle.y + 12, 0, 0, 0.6);
    if (vehicle.altitude <= 0) landStunt(game, vehicle);
    return;
  }
  if (state.cooldown > 0 || game.shot) return;
  for (const ramp of STUNT_RAMPS) {
    if (distance(vehicle, ramp) > 21 || Math.abs(vehicle.speed) < ramp.minimum) continue;
    const direction = Math.cos(vehicle.angle - ramp.angle);
    if (direction < 0.7) continue;
    vehicle.verticalSpeed = 190 + Math.abs(vehicle.speed) * 0.13;
    vehicle.altitude = 1;
    state.active = ramp;
    state.launchX = vehicle.x;
    state.launchY = vehicle.y;
    state.airTime = 0;
    game.audio?.play('checkpoint');
    game.camera.shake = 2;
    break;
  }
}

function landStunt(game, vehicle) {
  const state = game.stunts;
  vehicle.altitude = 0;
  vehicle.verticalSpeed = 0;
  state.cooldown = 3;
  game.camera.shake = vehicle.spec.bike ? 3 : 6;
  game.fx.burst('tire', vehicle.x, vehicle.y, 15, 45);
  game.audio?.play('impact');
  if (!state.active) return;
  const travelled = Math.hypot(vehicle.x - state.launchX, vehicle.y - state.launchY);
  state.bestDistance = Math.max(state.bestDistance, travelled);
  const clean = vehicle.health > 20 && !game.city.isWater(vehicle.x, vehicle.y);
  if (clean && travelled > 95) {
    const first = !state.completed.includes(state.active.id);
    if (first) state.completed.push(state.active.id);
    const reward = first ? state.active.reward : Math.floor(state.active.reward / 5);
    game.economy.cash += reward;
    state.result = { title: 'STUNT JUMP COMPLETE', text: `${state.active.name} • ${Math.round(travelled)} m • +$${reward}` };
    game.fx.pop(`AIRTIME ${state.airTime.toFixed(1)}s`, vehicle.x, vehicle.y - 30, '#e4ce91');
    game.audio?.play('passed');
  } else {
    state.result = { title: 'STUNT JUMP', text: 'Not quite. Try a faster, cleaner approach.' };
  }
  state.resultAge = 0;
  state.active = null;
}

export function drawStuntRamps(ctx, game) {
  for (const ramp of STUNT_RAMPS) {
    if (distance(ramp, game.player) > 900) continue;
    ctx.save();
    ctx.translate(ramp.x, ramp.y);
    ctx.rotate(ramp.angle);
    ctx.fillStyle = '#1c323b66';
    ctx.fillRect(-15, -16, 34, 42);
    polygon(ctx, [[-14, 22], [14, 22], [14, -18], [-14, -18]], '#887d62');
    polygon(ctx, [[-14, 22], [-14, -18], [-18, -12], [-18, 22]], '#b9a173');
    ctx.strokeStyle = '#c9bb8b';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-13, -14 + i * 6);
      ctx.lineTo(13, -14 + i * 6);
      ctx.stroke();
    }
    for (let i = -1; i <= 1; i++) {
      polygon(ctx, [[i * 8 - 3, 8], [i * 8, 1], [i * 8 + 3, 8]], '#d7ba69');
    }
    ctx.restore();
  }
}

export function drawStuntResult(ctx, game) {
  const state = game.stunts;
  if (!state.result || state.resultAge > 4.5 || game.shot) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.resultAge * 3, (4.5 - state.resultAge) * 2);
  ctx.fillStyle = '#0b2431dd';
  ctx.fillRect(390, 426, 500, 67);
  label(ctx, state.result.title, 640, 451, 13, '#e6cc8d', 'center', 900);
  label(ctx, state.result.text, 640, 475, 12, '#b5d6c8', 'center', 500);
  ctx.restore();
}
