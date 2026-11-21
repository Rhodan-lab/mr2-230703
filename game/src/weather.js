import { clamp } from './math.js';
import { hash } from './random.js';

export const WEATHER_TYPES = ['CLEAR', 'GOLDEN', 'OVERCAST', 'RAIN'];

export function createWeather() {
  return { type: 'CLEAR', wet: 0, lightning: 0, thunder: 24, change: 120, wind: 0.4 };
}

export function updateWeather(game, dt) {
  const w = game.weather;
  w.wet = clamp(w.wet + (w.type === 'RAIN' ? dt * 0.3 : -dt * 0.025), 0, 1);
  w.lightning = Math.max(0, w.lightning - dt * 3);
  w.change -= dt;
  if (w.change < 0 && !game.shot) {
    w.type = WEATHER_TYPES[Math.floor(game.random() * WEATHER_TYPES.length)];
    w.change = 110 + game.random() * 140;
  }
  if (w.type === 'RAIN') {
    w.thunder -= dt;
    if (w.thunder <= 0) {
      w.lightning = 0.65;
      w.thunder = 19 + game.random() * 24;
      game.audio?.play('thunder');
    }
  }
}

export function drawRain(ctx, game) {
  if (game.weather.type !== 'RAIN') return;
  const t = game.clock.elapsed;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(182,218,236,.27)';
  ctx.beginPath();
  for (let i = 0; i < 270; i++) {
    const x = (hash(i, 4) * 1400 + t * 145) % 1400 - 60;
    const y = (hash(i, 9) * 820 + t * (510 + hash(i) * 250)) % 820 - 50;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y + 17 + hash(i, 5) * 13);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(178,220,235,.13)';
  for (let i = 0; i < 24; i++) {
    const phase = (t * 1.7 + hash(i, 18)) % 1;
    ctx.globalAlpha = 1 - phase;
    ctx.beginPath();
    ctx.ellipse(hash(i, 11) * 1280, hash(i, 15) * 720, phase * 11, phase * 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  if (game.weather.lightning > 0) {
    ctx.fillStyle = `rgba(199,221,255,${game.weather.lightning * 0.4})`;
    ctx.fillRect(0, 0, 1280, 720);
  }
}

export function drawPuddles(ctx, game, bounds) {
  if (game.weather.wet < 0.05) return;
  ctx.save();
  ctx.globalAlpha = game.weather.wet * 0.4;
  for (let x = Math.floor(bounds.left / 140) * 140; x < bounds.right; x += 140) {
    for (let y = Math.floor(bounds.top / 140) * 140; y < bounds.bottom; y += 140) {
      if (!game.city.isRoad(x, y)) continue;
      ctx.fillStyle = hash(x, y) > 0.5 ? '#2b7b91' : '#8b5b8d';
      ctx.beginPath();
      ctx.ellipse(x + 15, y + 9, 19 + hash(x, y) * 29, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
