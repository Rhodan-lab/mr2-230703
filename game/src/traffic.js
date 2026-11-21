import { BLOCK, COLS, ROWS } from './config.js';
import { createVehicle, driveVehicle } from './vehicles.js';
import { angleDelta, clamp, distance } from './math.js';
import { choose } from './random.js';

const TYPES = ['sunburst', 'tico', 'tico', 'vectora', 'haulmax', 'parcelvan', 'taxi', 'vespera'];
const PAINT = ['#bb625a', '#79a49e', '#e8ce9a', '#416978', '#e5e1cc', '#8392a7', '#696b7b', '#ba896a'];

export function trafficLight(x, y, time) {
  const stagger = (Math.round(x / BLOCK) * 2 + Math.round(y / BLOCK) * 3) % 7;
  return Math.floor((time + stagger) / 7.5) % 2;
}

export function spawnTraffic(game, count = 125) {
  for (let i = 0; i < count; i++) {
    const horizontal = i % 2 === 0;
    const positive = game.random() > 0.5;
    const col = 1 + Math.floor(game.random() * (COLS - 1));
    const row = 1 + Math.floor(game.random() * (ROWS - 1));
    const offset = 75 + game.random() * 130;
    const direction = horizontal ? positive ? 1 : 3 : positive ? 2 : 0;
    const x = horizontal ? col * BLOCK + offset : col * BLOCK + (positive ? -20 : 20);
    const y = horizontal ? row * BLOCK + (positive ? 20 : -20) : row * BLOCK + offset;
    const type = choose(game.random, TYPES);
    const vehicle = createVehicle(type, x, y, direction * Math.PI / 2, type === 'taxi' ? undefined : choose(game.random, PAINT));
    vehicle.ai = { direction, cruise: 58 + game.random() * 55, wait: 0, turn: 0, junction: '' };
    vehicle.parked = false;
    game.vehicles.push(vehicle);
  }
  // Parked vehicles offer reliable steals in every district.
  for (let i = 0; i < 52; i++) {
    const col = 1 + i % 10;
    const row = 1 + Math.floor(i / 5) % 12;
    const type = TYPES[i % TYPES.length];
    game.vehicles.push(createVehicle(type, col * BLOCK + 96 + i % 2 * 65, row * BLOCK + 35, Math.PI / 2));
  }
}

export function updateTraffic(game, dt) {
  const t = game.clock.elapsed;
  for (const v of game.vehicles) {
    if (!v.ai || v.police || v.driver || v.spec.boat) continue;
    if (distance(v, game.player) > 1000) continue;
    const ai = v.ai;
    const horizontal = ai.direction % 2 === 1;
    const positive = ai.direction === 1 || ai.direction === 2;
    const main = horizontal ? v.x : v.y;
    const cross = horizontal ? v.y : v.x;
    const junction = positive ? Math.ceil(main / BLOCK) * BLOCK : Math.floor(main / BLOCK) * BLOCK;
    const ahead = Math.abs(junction - main);
    const ix = horizontal ? junction : Math.round(cross / BLOCK) * BLOCK;
    const iy = horizontal ? Math.round(cross / BLOCK) * BLOCK : junction;
    const green = trafficLight(ix, iy, t) === (horizontal ? 0 : 1);
    let target = ai.cruise;
    if (!green && ahead < 83 && ahead > 24) target *= clamp((ahead - 37) / 40, 0, 1);
    for (const other of game.vehicles) {
      if (other === v || distance(v, other) > 72) continue;
      const dx = other.x - v.x;
      const dy = other.y - v.y;
      const forward = dx * Math.sin(v.angle) - dy * Math.cos(v.angle);
      const lateral = dx * Math.cos(v.angle) + dy * Math.sin(v.angle);
      if (forward > 0 && forward < 67 && Math.abs(lateral) < 21) target = Math.min(target, Math.max(0, (forward - 30) * 2));
    }
    const key = `${ix},${iy}`;
    if (ahead < 12 && ai.junction !== key) {
      ai.junction = key;
      if (game.random() < 0.3) ai.direction = (ai.direction + (game.random() > 0.5 ? 1 : 3)) % 4;
    }
    const desired = ai.direction * Math.PI / 2;
    const steer = clamp(angleDelta(v.angle, desired) * 2.2, -1, 1);
    const throttle = clamp((target - v.speed) / 42, -0.7, 1);
    driveVehicle(game, v, throttle, steer, false, dt);
    if (v.x < 20 || v.x > COLS * BLOCK - 20 || v.y < 20 || v.y > ROWS * BLOCK - 20) ai.direction = (ai.direction + 2) % 4;
    if (target < 3) {
      ai.wait += dt;
      if (ai.wait > 4 && game.random() < dt * 0.2) {
        v.horn = 0.4;
        game.audio?.play('horn');
      }
      if (ai.wait > 13) ai.direction = (ai.direction + 1) % 4;
    } else ai.wait = 0;
    v.horn = Math.max(0, v.horn - dt);
  }
}

export function drawTrafficLights(ctx, game, bounds) {
  for (let x = Math.max(0, Math.floor(bounds.left / BLOCK) * BLOCK); x < bounds.right; x += BLOCK) {
    for (let y = Math.max(0, Math.floor(bounds.top / BLOCK) * BLOCK); y < bounds.bottom; y += BLOCK) {
      const phase = trafficLight(x, y, game.clock.elapsed);
      ctx.fillStyle = '#172c35';
      ctx.fillRect(x + 41, y - 47, 6, 17);
      ctx.fillRect(x - 48, y + 40, 17, 6);
      ctx.fillStyle = phase === 0 ? '#76e0b0' : '#f5675f';
      ctx.fillRect(x + 42, y - 45 + phase * 8, 4, 4);
      ctx.fillStyle = phase === 1 ? '#76e0b0' : '#f5675f';
      ctx.fillRect(x - 46 + (1 - phase) * 8, y + 41, 4, 4);
    }
  }
}
