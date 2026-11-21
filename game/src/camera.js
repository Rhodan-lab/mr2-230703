import { clamp, lerp } from './math.js';

export function createCamera() {
  return {
    x: 1680,
    y: 1400,
    zoom: 1.05,
    targetZoom: 1.05,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    rotation: -0.12,
    screenToWorld(x, y) {
      const sx = (x - 640) / this.zoom;
      const sy = (y - 360) / this.zoom;
      const c = Math.cos(-this.rotation);
      const s = Math.sin(-this.rotation);
      return {
        x: sx * c - sy * s + this.x,
        y: sx * s + sy * c + this.y,
      };
    },
    worldToScreen(x, y) {
      const dx = x - this.x;
      const dy = y - this.y;
      const c = Math.cos(this.rotation);
      const s = Math.sin(this.rotation);
      return {
        x: (dx * c - dy * s) * this.zoom + 640,
        y: (dx * s + dy * c) * this.zoom + 360,
      };
    },
    bounds() {
      return {
        left: this.x - 740 / this.zoom,
        top: this.y - 490 / this.zoom,
        right: this.x + 740 / this.zoom,
        bottom: this.y + 490 / this.zoom,
      };
    },
  };
}

export function updateCamera(game, dt) {
  const c = game.camera;
  const p = game.player;
  const v = p.vehicle;
  const speed = Math.abs(v?.speed || 0);
  const leadX = (v?.vx || p.vx) * 0.44;
  const leadY = (v?.vy || p.vy) * 0.35;
  const desiredX = p.x + leadX + (game.shotFraming?.x || 0);
  const desiredY = p.y + leadY - 18 + (game.shotFraming?.y || 0);
  const smoothing = 1 - Math.exp(-dt * 4);
  c.x = lerp(c.x, desiredX, smoothing);
  c.y = lerp(c.y, desiredY, smoothing);
  c.targetZoom = game.shotZoom || clamp(1.22 - speed / 850, 0.78, 1.22);
  c.zoom = lerp(c.zoom, c.targetZoom, 1 - Math.exp(-dt * 2));
  c.shake = Math.max(0, c.shake - dt * 20);
  c.shakeX = (game.random() - 0.5) * c.shake;
  c.shakeY = (game.random() - 0.5) * c.shake;
}
