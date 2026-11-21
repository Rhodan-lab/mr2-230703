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
    screenToWorld(x, y) {
      return {
        x: (x - 640) / this.zoom + this.x,
        y: (y - 360) / this.zoom + this.y,
      };
    },
    worldToScreen(x, y) {
      return {
        x: (x - this.x) * this.zoom + 640,
        y: (y - this.y) * this.zoom + 360,
      };
    },
    bounds() {
      return {
        left: this.x - 650 / this.zoom,
        top: this.y - 370 / this.zoom,
        right: this.x + 650 / this.zoom,
        bottom: this.y + 370 / this.zoom,
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
  const desiredX = p.x + leadX;
  const desiredY = p.y + leadY - 18;
  const smoothing = 1 - Math.exp(-dt * 4);
  c.x = lerp(c.x, desiredX, smoothing);
  c.y = lerp(c.y, desiredY, smoothing);
  c.targetZoom = game.shotZoom || clamp(1.22 - speed / 850, 0.78, 1.22);
  c.zoom = lerp(c.zoom, c.targetZoom, 1 - Math.exp(-dt * 2));
  c.shake = Math.max(0, c.shake - dt * 20);
  c.shakeX = (game.random() - 0.5) * c.shake;
  c.shakeY = (game.random() - 0.5) * c.shake;
}
