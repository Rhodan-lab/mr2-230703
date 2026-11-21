import { TAU } from './config.js';
import { glow } from './math.js';

const STYLES = {
  spark: { color: '#ffd28a', gravity: 85, radius: 1.8, growth: -0.4 },
  smoke: { color: '#566573', gravity: -6, radius: 6, growth: 16 },
  fire: { color: '#ff9f45', gravity: -25, radius: 6, growth: -3 },
  blood: { color: '#a64d50', gravity: 45, radius: 2.3, growth: -0.2 },
  tire: { color: '#b4c2bd', gravity: -7, radius: 5, growth: 13 },
  splash: { color: '#d9f2e8', gravity: 9, radius: 3, growth: 5 },
  wake: { color: '#ecffef', gravity: 0, radius: 3, growth: 12 },
  fireball: { color: '#ffbf61', gravity: -24, radius: 23, growth: 15 },
  debris: { color: '#546775', gravity: 80, radius: 3, growth: 0 },
  muzzle: { color: '#fff1ae', gravity: 0, radius: 7, growth: 0 },
};

export function createParticles(random) {
  const particles = [];
  const pops = [];
  const plumes = [];

  function emit(type, x, y, vx = 0, vy = 0, life = 1) {
    if (particles.length > 1300) particles.shift();
    particles.push({
      type,
      x,
      y,
      vx: vx + (random() - 0.5) * 12,
      vy: vy + (random() - 0.5) * 12,
      life,
      maxLife: life,
      rotation: random() * TAU,
      seed: random(),
    });
  }

  function burst(type, x, y, count = 12, power = 80) {
    for (let i = 0; i < count; i++) {
      const angle = random() * TAU;
      const speed = random() * power;
      emit(type, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.35 + random() * 0.65);
    }
  }

  function explosion(x, y) {
    burst('spark', x, y, 45, 270);
    burst('debris', x, y, 15, 180);
    for (let i = 0; i < 16; i++) emit('fireball', x + (random() - 0.5) * 38, y + (random() - 0.5) * 28, (random() - 0.5) * 50, -30 - random() * 60, 0.6 + random() * 0.7);
    plumes.push({ x, y, life: 22, timer: 0 });
  }

  function pop(text, x, y, color = '#b2f3c8') {
    pops.push({ text, x, y, color, life: 2.2 });
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const s = STYLES[p.type];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += s.gravity * dt;
      p.vx *= Math.exp(-dt * 1.4);
    }
    for (let i = plumes.length - 1; i >= 0; i--) {
      const plume = plumes[i];
      plume.life -= dt;
      plume.timer -= dt;
      if (plume.timer <= 0) {
        emit('smoke', plume.x, plume.y, -8, -24, 4 + random() * 2);
        if (plume.life > 12) emit('fire', plume.x + (random() - 0.5) * 20, plume.y, 0, -25, 0.9);
        plume.timer = 0.08;
      }
      if (plume.life <= 0) plumes.splice(i, 1);
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].life -= dt;
      pops[i].y -= dt * 16;
      if (pops[i].life <= 0) pops.splice(i, 1);
    }
  }

  function draw(ctx, layer = 'all') {
    ctx.save();
    for (const p of particles) {
      const watery = p.type === 'wake' || p.type === 'splash';
      if (layer === 'water' && !watery || layer === 'air' && watery) continue;
      const s = STYLES[p.type];
      const age = p.maxLife - p.life;
      const alpha = Math.min(1, p.life * 2) * (p.type === 'smoke' ? 0.43 : p.type === 'wake' ? 0.55 : 0.85);
      const radius = Math.max(0.3, s.radius + s.growth * age);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      if (p.type === 'spark') {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
      } else if (p.type === 'fireball' || p.type === 'fire' || p.type === 'muzzle') {
        glow(ctx, p.x, p.y, radius * 2.4, '#ff9e4170');
        ctx.fillStyle = p.life > p.maxLife * 0.65 ? '#ffe9a3' : s.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, TAU);
        ctx.fill();
      } else if (p.type === 'wake') {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, radius, radius * 0.5, p.rotation, 0, TAU);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, TAU);
        ctx.fill();
      }
    }
    if (layer !== 'water') {
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      for (const pop of pops) {
        ctx.globalAlpha = Math.min(1, pop.life);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
      }
    }
    ctx.restore();
  }

  return { particles, pops, plumes, emit, burst, explosion, pop, update, draw };
}
