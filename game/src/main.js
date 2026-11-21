import { STEP } from './config.js';
import { createInput } from './input.js';
import { createWorld, loadProgress, stepWorld } from './world.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

export function boot() {
  const canvas = document.getElementById('game');
  const input = createInput(canvas);
  const params = new URLSearchParams(globalThis.location.search);
  const seed = Number(params.get('seed') || 260621);
  const game = createWorld(input, Number.isFinite(seed) ? seed : 260621);
  const renderer = createRenderer(canvas);
  if (params.has('shot')) stageShot(game, params.get('shot'));
  else loadProgress(game);
  let previous = 0;
  let accumulator = 0;
  let running = true;
  let lastPainted = 0;
  let fallback = null;
  let readyFrames = 0;
  const performanceState = { maxFrame: 0, steps: 0, fps: 0, samples: 0, sum: 0 };

  function frame(timestamp) {
    if (!running) return;
    const elapsed = previous ? Math.min(0.15, Math.max(0, (timestamp - previous) / 1000)) : STEP;
    previous = timestamp;
    performanceState.maxFrame = Math.max(performanceState.maxFrame, elapsed);
    performanceState.samples++;
    performanceState.sum += elapsed;
    if (performanceState.sum >= 1) {
      performanceState.fps = Math.round(performanceState.samples / performanceState.sum);
      performanceState.sum = 0;
      performanceState.samples = 0;
    }
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < 9) {
      stepWorld(game, STEP);
      accumulator -= STEP;
      steps++;
    }
    performanceState.steps += steps;
    game.audio.update(game);
    renderer.draw(game);
    lastPainted = timestamp;
    readyFrames++;
    if (readyFrames > 12) globalThis.__shotReady = true;
    if (!document.hidden) requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    previous = 0;
    accumulator = 0;
    if (document.hidden) {
      fallback = setInterval(() => frame(performance.now()), 1000 / 30);
    } else {
      clearInterval(fallback);
      fallback = null;
      requestAnimationFrame(frame);
    }
  });
  const activateAudio = () => {
    game.audio.initialize();
    game.audio.setStation(game.radio);
  };
  canvas.addEventListener('pointerdown', activateAudio);
  globalThis.addEventListener('keydown', activateAudio, { once: true });
  globalThis.addEventListener('beforeunload', () => {
    if (!game.shot && game.screen !== 'title') game.save();
  });
  // Read-only diagnostics plus a deterministic simulation hook for local validation.
  globalThis.__marbella = game;
  globalThis.__performance = performanceState;
  globalThis.__stepGame = count => {
    for (let i = 0; i < count; i++) stepWorld(game, STEP);
    renderer.draw(game);
  };
  globalThis.__stopGame = () => running = false;
  globalThis.__renderGame = () => renderer.draw(game);
  canvas.focus();
  requestAnimationFrame(frame);
  return game;
}

if (typeof document !== 'undefined') boot();
