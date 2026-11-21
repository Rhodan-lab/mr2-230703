import { WIDTH, HEIGHT } from './config.js';
import { timePalette } from './time.js';
import { visible, drawGround, drawBuildingShadow, drawBuilding, drawTree, drawStreetLights } from './city.js';
import { drawVehicle, drawVehicleLights } from './vehicles.js';
import { drawBoat } from './boats.js';
import { drawPedestrian } from './peds.js';
import { drawTrafficLights } from './traffic.js';
import { drawPuddles, drawRain } from './weather.js';
import { drawSearchlight, drawHelicopter } from './helicopter.js';
import { drawBullets, drawPickups } from './combat.js';
import { drawMissionMarker } from './missions.js';
import { drawProperties } from './economy.js';
import { drawSideJobs } from './jobs.js';
import { drawHUD } from './hud.js';
import { drawTitle, drawPause, drawHelp, drawDeath } from './menus.js';
import { drawDialog } from './dialogs.js';
import { drawAtlas } from './atlas.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = Math.round(globalThis.innerWidth * ratio);
    canvas.height = Math.round(globalThis.innerHeight * ratio);
    view.scale = Math.min(canvas.width / WIDTH, canvas.height / HEIGHT);
    view.x = (canvas.width - WIDTH * view.scale) / 2;
    view.y = (canvas.height - HEIGHT * view.scale) / 2;
  }

  function drawWorld(game) {
    const camera = game.camera;
    const bounds = camera.bounds();
    game.light = timePalette(game.clock);
    ctx.save();
    ctx.translate(640 + camera.shakeX, 360 + camera.shakeY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    drawGround(ctx, game, bounds);
    drawPuddles(ctx, game, bounds);
    drawSkids(ctx, game);
    game.fx.draw(ctx, 'water');
    for (const building of game.city.buildings) {
      if (visible(building, bounds, 230)) drawBuildingShadow(ctx, building, game.light);
    }
    drawTrafficLights(ctx, game, bounds);
    drawPickups(ctx, game);
    const objects = [];
    for (const building of game.city.buildings) {
      if (visible(building, bounds, 220)) objects.push({ y: building.y + building.h, type: 'building', object: building });
    }
    for (const tree of game.city.trees) {
      if (visible(tree, bounds, 70)) objects.push({ y: tree.y + 8, type: 'tree', object: tree });
    }
    for (const vehicle of game.vehicles) {
      if (visible(vehicle, bounds, 120)) objects.push({ y: vehicle.y + 14, type: vehicle.spec.boat ? 'boat' : 'vehicle', object: vehicle });
    }
    for (const ped of game.peds) {
      if (visible(ped, bounds, 60)) objects.push({ y: ped.y + 7, type: 'ped', object: ped });
    }
    if (!game.player.vehicle) objects.push({ y: game.player.y + 8, type: 'player', object: game.player });
    objects.sort((a, b) => a.y - b.y);
    for (const item of objects) {
      if (item.type === 'building') drawBuilding(ctx, item.object, game);
      if (item.type === 'tree') drawTree(ctx, item.object, game);
      if (item.type === 'vehicle') drawVehicle(ctx, item.object, game);
      if (item.type === 'boat') drawBoat(ctx, item.object, game);
      if (item.type === 'ped' || item.type === 'player') drawPedestrian(ctx, item.object, game, item.type === 'player');
    }
    drawProperties(ctx, game);
    drawSideJobs(ctx, game);
    drawMissionMarker(ctx, game);
    drawStreetLights(ctx, game, bounds);
    for (const vehicle of game.vehicles) {
      if (visible(vehicle, bounds, 160)) drawVehicleLights(ctx, vehicle, game);
    }
    game.fx.draw(ctx, 'air');
    drawBullets(ctx, game);
    drawSearchlight(ctx, game);
    drawHelicopter(ctx, game);
    ctx.restore();
    drawAtmosphere(ctx, game);
    drawRain(ctx, game);
  }

  function draw(game) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#061322';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (game.screen === 'title') drawTitle(ctx, game);
    else {
      drawWorld(game);
      drawHUD(ctx, game);
      drawDialog(ctx, game);
      if (game.screen === 'paused') drawPause(ctx, game);
      if (game.menu.atlas) drawAtlas(ctx, game);
      if (game.menu.help) drawHelp(ctx);
      drawDeath(ctx, game);
    }
    game.frames++;
  }

  resize();
  globalThis.addEventListener('resize', resize);
  return { draw, resize, ctx };
}

function drawSkids(ctx, game) {
  ctx.save();
  ctx.lineWidth = 2.5;
  for (const skid of game.skids) {
    ctx.strokeStyle = `rgba(9,19,26,${Math.max(0, 0.55 - skid.age / 110)})`;
    const nx = Math.cos(skid.angle) * skid.width / 2;
    const ny = Math.sin(skid.angle) * skid.width / 2;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(skid.x + nx * side, skid.y + ny * side);
      ctx.lineTo(skid.bx + nx * side, skid.by + ny * side);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawAtmosphere(ctx, game) {
  const light = game.light;
  ctx.save();
  if (light.night > 0) {
    ctx.fillStyle = `rgba(4,16,39,${light.night * 0.18})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  if (light.golden > 0.1) {
    const warm = ctx.createLinearGradient(1280, 0, 0, 720);
    warm.addColorStop(0, `rgba(255,183,103,${light.golden * 0.19})`);
    warm.addColorStop(1, '#a8584b05');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const sun = ctx.createRadialGradient(1245, 75, 0, 1245, 75, 400);
    sun.addColorStop(0, '#fff2ba38');
    sun.addColorStop(0.15, '#ffcd7b19');
    sun.addColorStop(1, '#ffc36500');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  const vignette = ctx.createRadialGradient(640, 340, 240, 640, 340, 790);
  vignette.addColorStop(0, '#020f2000');
  vignette.addColorStop(1, light.night > 0.5 ? '#03112060' : '#0a263022');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}
