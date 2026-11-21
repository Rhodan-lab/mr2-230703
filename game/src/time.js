import { clamp, lerp } from './math.js';

export function createClock() {
  return { hour: 16.3, elapsed: 0, day: 1, previousHour: 16 };
}

export function updateClock(clock, dt, frozen = false) {
  clock.elapsed += dt;
  if (!frozen) clock.hour += dt / 55;
  if (clock.hour >= 24) {
    clock.hour -= 24;
    clock.day++;
  }
}

export function timePalette(clock) {
  const h = clock.hour;
  const night = h < 5.5 || h > 20.1 ? 1 : h < 7 ? (7 - h) / 1.5 : h > 18 ? (h - 18) / 2.1 : 0;
  const golden = Math.max(0, 1 - Math.abs(h - 17.5) / 1.6, 1 - Math.abs(h - 6.5) / 1.2);
  return {
    night: clamp(night, 0, 1),
    golden,
    shadowX: lerp(-0.36, -1.15, golden),
    shadowY: lerp(0.55, 0.28, golden),
    shadowAlpha: lerp(0.21, 0.33, golden),
    sky: night > 0.5 ? '#071526' : golden > 0.3 ? '#f2b47f' : '#9ed6df',
  };
}

export function formatClock(clock) {
  const hour = Math.floor(clock.hour);
  const minutes = Math.floor((clock.hour - hour) * 60);
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
