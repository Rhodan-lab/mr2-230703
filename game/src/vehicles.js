import { TAU, WORLD_W, WORLD_H } from './config.js';
import { clamp, approach, distance, safeEntity, roundRect, polygon, glow, label } from './math.js';

export const VEHICLE_TYPES = {
  sunburst: { name: 'Sunburst', class: 'SPORT COUPE', w: 23, h: 43, power: 195, max: 310, grip: 8.2, drag: 0.55, steer: 2.45, mass: 1, color: '#ef8a4b', seats: 2 },
  tico: { name: 'Tico', class: 'CITY HATCH', w: 22, h: 34, power: 147, max: 235, grip: 9, drag: 0.8, steer: 2.8, mass: 0.8, color: '#79b7a2', seats: 4 },
  vectora: { name: 'Vectora GT', class: 'SUPERSPORT', w: 26, h: 45, power: 256, max: 390, grip: 8.9, drag: 0.45, steer: 2.3, mass: 1, color: '#e5cb7d', seats: 2 },
  haulmax: { name: 'Haulmax', class: 'HEAVY TRUCK', w: 31, h: 65, power: 114, max: 180, grip: 6.7, drag: 0.9, steer: 1.5, mass: 2.8, color: '#a27c5e', seats: 2 },
  parcelvan: { name: 'Parcelvan', class: 'DELIVERY', w: 28, h: 50, power: 126, max: 195, grip: 7.6, drag: 0.9, steer: 1.9, mass: 1.7, color: '#dad6bc', seats: 2 },
  taxi: { name: 'Coast Cab', class: 'TAXI SERVICE', w: 25, h: 45, power: 169, max: 265, grip: 8.4, drag: 0.6, steer: 2.2, mass: 1.2, color: '#e7b74d', seats: 4 },
  interceptor: { name: 'Interceptor', class: 'POLICE PURSUIT', w: 26, h: 47, power: 218, max: 332, grip: 9.3, drag: 0.5, steer: 2.4, mass: 1.5, color: '#e7ece8', seats: 4 },
  vespera: { name: 'Vespera', class: 'MOTORCYCLE', w: 11, h: 30, power: 268, max: 345, grip: 10.5, drag: 0.8, steer: 3.4, mass: 0.45, color: '#eb6658', seats: 1, bike: true },
  marlin: { name: 'Marlin', class: 'SPEEDBOAT', w: 30, h: 66, power: 180, max: 300, grip: 2.6, drag: 1.1, steer: 1.6, mass: 1.8, color: '#e5e3cf', seats: 4, boat: true },
};

let vehicleId = 0;

export function createVehicle(type, x, y, angle = 0, color) {
  const spec = VEHICLE_TYPES[type] || VEHICLE_TYPES.sunburst;
  return {
    id: vehicleId++,
    type,
    spec,
    x,
    y,
    angle,
    vx: 0,
    vy: 0,
    speed: 0,
    steer: 0,
    lean: 0,
    health: 100,
    fire: 0,
    exploded: false,
    color: color || spec.color,
    ai: null,
    driver: false,
    police: type === 'interceptor',
    parked: true,
    horn: 0,
    brake: false,
    invincible: false,
    damageCooldown: 0,
    shotTimer: 0,
    skidTimer: 0,
    wakeTimer: 0,
    owned: false,
    missionTag: null,
  };
}

export function driveVehicle(game, vehicle, throttle, steer, brake, dt) {
  const v = vehicle;
  const s = v.spec;
  if (v.exploded) throttle = 0;
  safeEntity(v);
  const forwardX = Math.sin(v.angle);
  const forwardY = -Math.cos(v.angle);
  const rightX = Math.cos(v.angle);
  const rightY = Math.sin(v.angle);
  let forward = v.vx * forwardX + v.vy * forwardY;
  let lateral = v.vx * rightX + v.vy * rightY;
  const onRoad = game.city.isRoad(v.x, v.y);
  const onWater = game.city.isWater(v.x, v.y);
  const terrain = s.boat ? onWater ? 1 : 0.12 : onRoad ? 1 : 0.64;
  if (!s.boat && onWater) {
    v.health -= dt * 18;
    forward *= Math.exp(-dt * 5);
    if (v.driver) game.player.health -= dt * 3;
  }
  forward += throttle * s.power * terrain * dt;
  forward *= Math.exp(-s.drag * dt * (throttle === 0 ? 1.9 : 0.42));
  forward = clamp(forward, -s.max * 0.32, s.max * terrain);
  if (brake) forward *= Math.exp(-dt * (s.bike ? 2.7 : 1.7));
  const grip = s.grip * (brake ? 0.16 : 1) * (game.weather.wet > 0.5 ? 0.76 : 1);
  lateral *= Math.exp(-grip * dt);
  const steering = steer * s.steer * clamp(Math.abs(forward) / 85, 0, 1) * (forward < 0 ? -1 : 1);
  v.angle += steering * dt;
  v.lean = approach(v.lean, steer * clamp(Math.abs(forward) / 220, 0, 1) * 0.38, dt * 3);
  v.steer = steer;
  v.brake = brake || throttle < 0;
  v.vx = Math.sin(v.angle) * forward + Math.cos(v.angle) * lateral;
  v.vy = -Math.cos(v.angle) * forward + Math.sin(v.angle) * lateral;
  v.speed = forward;
  const previousX = v.x;
  const previousY = v.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(v.vx, v.vy) * dt / 10));
  for (let step = 0; step < steps; step++) {
    const nextX = v.x + v.vx * dt / steps;
    const nextY = v.y + v.vy * dt / steps;
    const blocked = s.boat ? !game.city.isWater(nextX, nextY) : game.city.collision(nextX, nextY, s.w * 0.48);
    if (!blocked) {
      v.x = nextX;
      v.y = nextY;
    } else {
      const impact = Math.hypot(v.vx, v.vy);
      if (impact > 55 && v.damageCooldown <= 0) {
        damageVehicle(game, v, impact * 0.075, v.driver ? 'player' : 'world');
        game.fx.burst('spark', v.x, v.y, 9);
        game.audio?.play('impact');
        v.damageCooldown = 0.4;
        if (v.driver) game.camera.shake = Math.max(game.camera.shake, impact * 0.025);
      }
      v.vx *= -0.28;
      v.vy *= -0.28;
      v.speed *= -0.28;
      break;
    }
  }
  v.x = clamp(v.x, -25, WORLD_W - 10);
  v.y = clamp(v.y, -25, WORLD_H - 10);
  v.damageCooldown = Math.max(0, v.damageCooldown - dt);
  v.skidTimer -= dt;
  if (!s.boat && Math.abs(forward) > 65 && (brake || Math.abs(lateral) > 36) && v.skidTimer <= 0) {
    game.skids.push({ x: previousX, y: previousY, bx: v.x, by: v.y, angle: v.angle, age: 0, width: s.w * 0.72 });
    game.fx.emit('tire', v.x, v.y, -v.vx * 0.2, -v.vy * 0.2, 0.7);
    v.skidTimer = 0.035;
  }
  if (v.health < 47 && !v.exploded && game.random() < dt * 16) game.fx.emit('smoke', v.x, v.y, 0, -16, 2);
  if (v.health < 18 && !v.invincible && !v.exploded) {
    v.fire += dt;
    if (game.random() < dt * 25) game.fx.emit('fire', v.x, v.y, 0, -25, 0.8);
    if (v.fire > 5) explodeVehicle(game, v);
  }
  safeEntity(v);
}

export function damageVehicle(game, v, amount, source) {
  if (v.invincible || v.exploded) return;
  v.health -= Math.max(0, amount);
  if (source === 'player' && v.police) game.addHeat(0.3);
  if (v.health <= 0) explodeVehicle(game, v);
}

export function explodeVehicle(game, v) {
  if (v.exploded || v.invincible) return;
  v.exploded = true;
  v.health = 0;
  v.color = '#263038';
  game.fx.explosion(v.x, v.y);
  game.camera.shake = 14;
  game.audio?.play('explosion');
  for (const other of game.vehicles) {
    if (other === v || other.exploded) continue;
    const d = distance(v, other);
    if (d < 110) {
      const power = 1 - d / 110;
      const direction = Math.atan2(other.y - v.y, other.x - v.x);
      other.vx += Math.cos(direction) * 180 * power;
      other.vy += Math.sin(direction) * 180 * power;
      damageVehicle(game, other, 48 * power, v.driver ? 'player' : 'world');
    }
  }
  if (v.driver && !game.shot) game.hurt(58);
}

export function collideVehicles(game, dt) {
  const vehicles = game.vehicles;
  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    if (distance(a, game.player) > 850) continue;
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      if (!!a.spec.boat !== !!b.spec.boat) continue;
      const radius = (a.spec.w + b.spec.w) * 0.62;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= radius || d < 0.01) continue;
      const nx = dx / d;
      const ny = dy / d;
      const separation = (radius - d) * 0.51;
      a.x -= nx * separation;
      a.y -= ny * separation;
      b.x += nx * separation;
      b.y += ny * separation;
      const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (closing <= 0) continue;
      const impulse = closing * 0.72 / (1 / a.spec.mass + 1 / b.spec.mass);
      a.vx -= nx * impulse / a.spec.mass;
      a.vy -= ny * impulse / a.spec.mass;
      b.vx += nx * impulse / b.spec.mass;
      b.vy += ny * impulse / b.spec.mass;
      if (closing > 45 && a.damageCooldown <= 0) {
        damageVehicle(game, a, closing * 0.07, b.driver ? 'player' : 'world');
        damageVehicle(game, b, closing * 0.07, a.driver ? 'player' : 'world');
        game.fx.burst('spark', (a.x + b.x) / 2, (a.y + b.y) / 2, 8);
        a.damageCooldown = 0.5;
        game.audio?.play('impact');
        if (a.driver || b.driver) {
          game.addHeat(a.police || b.police ? 0.45 : 0.05);
          game.camera.shake = 4;
        }
      }
    }
  }
}

export function enterOrExitVehicle(game) {
  const player = game.player;
  if (player.vehicle) {
    const v = player.vehicle;
    for (const side of [1, -1]) {
      const x = v.x + Math.cos(v.angle) * (v.spec.w + 9) * side;
      const y = v.y + Math.sin(v.angle) * (v.spec.w + 9) * side;
      if (game.city.collision(x, y, 8)) continue;
      if (game.city.isWater(x, y) && v.spec.boat) continue;
      player.x = x;
      player.y = y;
      player.vehicle = null;
      v.driver = false;
      v.parked = true;
      game.notify('ON FOOT', 'Rico Vela');
      return true;
    }
    game.notify('NO SAFE EXIT', 'Find a clear sidewalk or dock');
    return false;
  }
  let nearest = null;
  let range = 66;
  for (const v of game.vehicles) {
    if (v.exploded) continue;
    const d = distance(player, v);
    if (d < range) {
      range = d;
      nearest = v;
    }
  }
  if (!nearest) return false;
  if (nearest.ai || nearest.police) {
    game.addHeat(nearest.police ? 1 : 0.4);
    game.peds.push(game.makePed(nearest.x + 24, nearest.y, true));
  }
  nearest.ai = null;
  nearest.driver = true;
  nearest.parked = false;
  player.vehicle = nearest;
  player.x = nearest.x;
  player.y = nearest.y;
  game.notify(nearest.spec.name.toUpperCase(), nearest.spec.class);
  game.audio?.play('door');
  return true;
}

export function drawVehicle(ctx, v, game) {
  if (v.spec.boat) return;
  const s = v.spec;
  const w = s.w;
  const h = s.h;
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  ctx.fillStyle = 'rgba(0,9,16,.36)';
  ctx.beginPath();
  ctx.ellipse(-3, 5, w * 0.66, h * 0.57, 0, 0, TAU);
  ctx.fill();
  if (s.bike) {
    drawMotorbike(ctx, v, game);
    ctx.restore();
    return;
  }
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#111d26';
    ctx.fillRect(side * (w / 2) - 2, -h * 0.32, 4, 10);
    ctx.fillRect(side * (w / 2) - 2, h * 0.21, 4, 10);
    ctx.fillStyle = '#9eafb2';
    ctx.fillRect(side * (w / 2) - 1, -h * 0.29, 2, 4);
  }
  roundRect(ctx, -w / 2, -h / 2, w, h, 5, v.color);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 5, 2, h - 11);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fillRect(w / 2 - 4, -h / 2 + 5, 2, h - 11);
  if (v.type === 'haulmax') {
    roundRect(ctx, -w / 2 + 1, -6, w - 2, h / 2 + 4, 2, '#9f9c88');
    ctx.fillStyle = '#757f7b';
    for (let x = -w / 2 + 4; x < w / 2 - 2; x += 5) ctx.fillRect(x, -4, 1, h / 2);
  } else if (v.type === 'parcelvan') {
    ctx.fillStyle = '#c8c7b0';
    ctx.fillRect(-w / 2 + 3, -5, w - 6, h * 0.5);
    label(ctx, 'VELA', 0, 10, 5, '#537b7c', 'center', 900);
  } else {
    polygon(ctx, [[-w * 0.4, -h * 0.19], [w * 0.4, -h * 0.19], [w * 0.32, -h * 0.03], [-w * 0.32, -h * 0.03]], '#284f66');
    ctx.fillStyle = '#8bb5bf';
    ctx.fillRect(-w * 0.32, -h * 0.18, w * 0.62, 2);
    polygon(ctx, [[-w * 0.3, h * 0.18], [w * 0.3, h * 0.18], [w * 0.38, h * 0.31], [-w * 0.38, h * 0.31]], '#24475a');
    ctx.fillStyle = v.police ? '#20333f' : v.color;
    ctx.fillRect(-w * 0.32, 0, w * 0.64, h * 0.18);
  }
  ctx.fillStyle = '#eaf2d6';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, 5, 3);
  ctx.fillRect(w / 2 - 7, -h / 2 + 2, 5, 3);
  ctx.fillStyle = v.brake ? '#ff6955' : '#b94a47';
  ctx.fillRect(-w / 2 + 2, h / 2 - 4, 5, 3);
  ctx.fillRect(w / 2 - 7, h / 2 - 4, 5, 3);
  ctx.fillStyle = '#b9c3b4';
  ctx.fillRect(-4, h / 2 - 2, 8, 2);
  if (v.type === 'vectora') {
    ctx.fillStyle = '#203c4c';
    ctx.fillRect(-w * 0.46, h * 0.36, w * 0.92, 3);
  }
  if (v.police && !v.exploded) {
    ctx.fillStyle = '#1c3141';
    ctx.fillRect(-w / 2 + 1, 0, w - 2, 5);
    const flash = Math.sin(game.clock.elapsed * 15 + v.id) > 0;
    ctx.fillStyle = flash ? '#ff5267' : '#7a2f46';
    ctx.fillRect(-9, -1, 8, 4);
    ctx.fillStyle = flash ? '#234a7a' : '#6dc7ff';
    ctx.fillRect(1, -1, 8, 4);
    label(ctx, 'MPD', 0, h * 0.39, 5, '#263f50', 'center', 900);
  }
  if (v.type === 'taxi') {
    roundRect(ctx, -9, -1, 18, 7, 2, '#fff3b6');
    label(ctx, v.fare ? 'FARE' : 'TAXI', 0, 4, 4.8, '#414f4a', 'center', 900);
  }
  if (v.health < 65) {
    ctx.strokeStyle = '#39474e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, -h * 0.35);
    ctx.lineTo(2, -h * 0.22);
    ctx.lineTo(-3, -h * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMotorbike(ctx, v) {
  const lean = v.lean * 10;
  ctx.fillStyle = '#101c25';
  roundRect(ctx, -3, -19, 6, 12, 2, '#14212a');
  roundRect(ctx, -3, 8, 6, 12, 2, '#14212a');
  polygon(ctx, [[-4 + lean, -12], [4 + lean, -12], [6 + lean, 8], [-6 + lean, 8]], v.color);
  ctx.fillStyle = '#c2d6d4';
  ctx.fillRect(-8 + lean, -11, 16, 2);
  ctx.fillStyle = '#1d3444';
  ctx.fillRect(-5 + lean, -3, 10, 12);
  // Rider remains visible in both player and ambient bikes.
  ctx.fillStyle = '#e2d1ad';
  ctx.fillRect(-8 + lean, -6, 3, 8);
  ctx.fillRect(5 + lean, -6, 3, 8);
  ctx.fillStyle = '#44596a';
  ctx.fillRect(-6 + lean, 5, 4, 9);
  ctx.fillRect(2 + lean, 5, 4, 9);
  ctx.fillStyle = '#ebddbc';
  ctx.beginPath();
  ctx.arc(lean, -5, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1f4054';
  ctx.fillRect(-4 + lean, -8, 8, 3);
}

export function drawVehicleLights(ctx, v, game) {
  if (v.exploded || v.spec.boat) return;
  const night = game.light.night;
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  if (night > 0.3) {
    const gradient = ctx.createLinearGradient(0, -20, 0, -155);
    gradient.addColorStop(0, '#e2e9bb55');
    gradient.addColorStop(1, '#a5d9de00');
    polygon(ctx, [[-8, -18], [8, -18], [47, -154], [-47, -154]], gradient);
    glow(ctx, 0, -v.spec.h / 2, 22, '#e1f1c070');
  }
  if (v.police && game.heat > 0) {
    const flash = Math.sin(game.clock.elapsed * 15 + v.id) > 0;
    const color = flash ? '#ff385d' : '#398dff';
    ctx.globalCompositeOperation = 'screen';
    glow(ctx, flash ? -10 : 10, 0, 63, color + '65');
    if (game.weather.wet > 0.2) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = color;
      for (let i = 0; i < 8; i++) ctx.fillRect(-26 - i * 4, 18 + i * 7, 52 + i * 8, 2.5);
    }
  }
  ctx.restore();
}
