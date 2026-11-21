import { STEP, WORLD_W, WORLD_H } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { createClock, updateClock } from './time.js';
import { createWeather, updateWeather, WEATHER_TYPES } from './weather.js';
import { createVehicle, driveVehicle, collideVehicles, enterOrExitVehicle } from './vehicles.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnBoats, updateBoatWake } from './boats.js';
import { spawnPedestrians, updatePedestrians, makePed } from './peds.js';
import { createPoliceState, addWantedHeat, updatePolice } from './police.js';
import { createHelicopter, updateHelicopter } from './helicopter.js';
import { createParticles } from './particles.js';
import { createArsenal, seedPickups, createPickup, fireBullet, updateCombat } from './combat.js';
import { createStory, updateMissions, failMission, updateRooftopMeeting } from './missions.js';
import { createEconomy, updateEconomy, readSave, writeSave, storeVehicle } from './economy.js';
import { createJobs, updateSideJobs, cancelJob } from './jobs.js';
import { createMenuState, updateMenus } from './menus.js';
import { updateDialog } from './dialogs.js';
import { createCamera, updateCamera } from './camera.js';
import { createMinimap } from './minimap.js';
import { createAudio, RADIO_STATIONS } from './audio.js';
import { clamp, safeEntity, distance } from './math.js';
import { createStreetFurniture } from './streetscape.js';
import { createServices, updateServices } from './services.js';
import { createGarageMenu, updateGarage } from './garage.js';
import { createDiscoveries, updateDiscoveries } from './discoveries.js';
import { createNavigation, updateNavigation } from './navigation.js';
import { createAmbientState, initializeAmbientBoats, updateAmbient } from './ambient.js';
import { createStunts, updateStunts } from './stunts.js';
import { createMarine, updateMarine } from './marine.js';

export function createWorld(input, seed = 260621) {
  const random = createRandom(seed);
  const game = {
    seed,
    random,
    input,
    city: createCity(seed),
    player: {
      x: 610,
      y: 2260,
      vx: 0,
      vy: 0,
      angle: 0,
      aimAngle: 0,
      aiming: false,
      health: 100,
      armor: 65,
      stamina: 100,
      weapon: 1,
      arsenal: createArsenal(),
      vehicle: null,
      cooldown: 0,
      reload: 0,
      step: 0,
      hurtFlash: 0,
      skin: '#c58e69',
      shirt: '#e4d9bd',
    },
    vehicles: [],
    peds: [],
    bullets: [],
    pickups: [],
    skids: [],
    notifications: [],
    clock: createClock(),
    weather: createWeather(),
    police: createPoliceState(),
    helicopter: createHelicopter(),
    camera: createCamera(),
    fx: createParticles(random),
    story: createStory(),
    economy: createEconomy(),
    jobs: createJobs(),
    menu: createMenuState(),
    audio: createAudio(),
    radio: 1,
    screen: 'title',
    dialog: null,
    rooftop: null,
    heat: 0,
    frames: 0,
    steps: 0,
    shot: null,
    shotZoom: null,
    shotMarker: null,
    shotObjective: null,
    light: { night: 0, golden: 0, shadowX: -0.3, shadowY: 0.6, shadowAlpha: 0.2 },
    minimap: null,
    furniture: [],
    services: createServices(),
    garageMenu: createGarageMenu(),
    discoveries: createDiscoveries(),
    navigation: createNavigation(),
    ambient: createAmbientState(),
    stunts: createStunts(),
    marine: createMarine(),
    hasSave: false,
    stats: {
      distance: 0,
      crashes: 0,
      bullets: 0,
      longestDrift: 0,
      activeDrift: 0,
      maximumSpeed: 0,
      waterDistance: 0,
      timeOnFoot: 0,
    },
  };

  game.makePed = (x, y, flee = false) => makePed(game, x, y, flee);
  game.addHeat = amount => addWantedHeat(game, amount);
  game.fireBullet = (...args) => fireBullet(game, ...args);
  game.dropPickup = (...args) => game.pickups.push(createPickup(...args));
  game.notify = (title, text, life = 5) => {
    game.notifications.push({ title, text, life });
    if (game.notifications.length > 6) game.notifications.shift();
  };
  game.hurt = amount => hurtPlayer(game, amount);
  game.save = () => writeSave(game);
  game.storeCurrentVehicle = () => storeVehicle(game);
  game.boatWake = (boat, dt) => updateBoatWake(game, boat, dt);
  game.respawn = reason => beginRespawn(game, reason);
  game.finishRespawn = () => finishRespawn(game);
  spawnTraffic(game);
  spawnPedestrians(game);
  spawnBoats(game);
  initializeAmbientBoats(game);
  seedPickups(game);
  game.vehicles.push(createVehicle('sunburst', 650, 2275, Math.PI / 2));
  game.vehicles.push(createVehicle('vespera', 600, 2225, 0));
  game.minimap = createMinimap(game.city);
  game.furniture = createStreetFurniture(game.city);
  game.camera.x = game.player.x;
  game.camera.y = game.player.y;
  return game;
}

export function loadProgress(game) {
  game.hasSave = readSave(game);
  game.camera.x = game.player.x;
  game.camera.y = game.player.y;
  for (let i = 0; i < game.economy.garage.length; i++) {
    const item = game.economy.garage[i];
    const vehicle = createVehicle(item.type, 1178 + i * 35, 1713, Math.PI / 2, item.color);
    vehicle.owned = true;
    game.vehicles.push(vehicle);
  }
}

export function stepWorld(game, dt = STEP) {
  game.steps++;
  if (game.screen === 'play' && !game.dialog && !game.menu.death) {
    const wasGarageOpen = game.garageMenu.open;
    updateGarage(game, dt);
    if (wasGarageOpen || game.garageMenu.open) {
      game.input.clear();
      return;
    }
  }
  updateMenus(game, dt);
  if (game.screen === 'title') {
    updateClock(game.clock, dt, true);
    game.input.clear();
    return;
  }
  if (game.screen === 'paused' || game.menu.atlas || game.menu.help || game.menu.death) {
    game.input.clear();
    return;
  }
  updateClock(game.clock, dt, !!game.shot);
  updateWeather(game, dt);
  updateDialog(game, dt);
  updateRooftopMeeting(game, dt);
  game.player.hurtFlash = Math.max(0, game.player.hurtFlash - dt * 1.5);
  if (!game.dialog) updatePlayer(game, dt);
  updateTraffic(game, dt);
  updatePolice(game, dt);
  updateHelicopter(game, dt);
  updatePedestrians(game, dt);
  collideVehicles(game, dt);
  updateCombat(game, dt);
  updateMissions(game, dt);
  updateSideJobs(game, dt);
  updateEconomy(game, dt);
  updateServices(game, dt);
  updateDiscoveries(game, dt);
  updateNavigation(game, dt);
  updateAmbient(game, dt);
  updateStunts(game, dt);
  updateMarine(game, dt);
  game.fx.update(dt);
  updateCamera(game, dt);
  updateTransientState(game, dt);
  if (game.shotTick) game.shotTick(dt);
  game.input.clear();
}

function updatePlayer(game, dt) {
  const p = game.player;
  const input = game.input;
  if (game.rooftop) return;
  if (input.tap('KeyE')) enterOrExitVehicle(game);
  const horizontal = input.axis('KeyA', 'KeyD') || input.axis('ArrowLeft', 'ArrowRight');
  const vertical = input.axis('KeyW', 'KeyS') || input.axis('ArrowUp', 'ArrowDown');
  if (p.vehicle) {
    const v = p.vehicle;
    driveVehicle(game, v, -vertical, horizontal, input.down('Space'), dt);
    if (v.spec.boat) updateBoatWake(game, v, dt);
    p.x = v.x;
    p.y = v.y;
    p.vx = v.vx;
    p.vy = v.vy;
    game.stats.maximumSpeed = Math.max(game.stats.maximumSpeed, Math.abs(v.speed));
    game.stats.distance += Math.hypot(v.vx, v.vy) * dt;
    if (v.spec.boat) game.stats.waterDistance += Math.abs(v.speed) * dt;
    if (input.down('Space') && Math.abs(v.speed) > 90) {
      game.stats.activeDrift += dt;
      game.stats.longestDrift = Math.max(game.stats.longestDrift, game.stats.activeDrift);
    } else game.stats.activeDrift = 0;
    if (input.tap('KeyC')) {
      game.audio?.play('horn');
      v.horn = 0.5;
    }
    if (v.exploded && !game.shot) game.hurt(dt * 18);
  } else {
    const magnitude = Math.hypot(horizontal, vertical);
    const sprint = input.down('ShiftLeft') && p.stamina > 1 && magnitude > 0;
    const speed = sprint ? 147 : 86;
    p.stamina = clamp(p.stamina + (sprint ? -24 : 16) * dt, 0, 100);
    p.vx = magnitude ? horizontal / magnitude * speed : 0;
    p.vy = magnitude ? vertical / magnitude * speed : 0;
    if (magnitude && !p.aiming) p.angle = Math.atan2(p.vy, p.vx);
    const nextX = p.x + p.vx * dt;
    const nextY = p.y + p.vy * dt;
    if (!game.city.collision(nextX, p.y, 7)) p.x = nextX;
    if (!game.city.collision(p.x, nextY, 7)) p.y = nextY;
    p.step += magnitude * speed * dt * 0.1;
    if (game.city.isWater(p.x, p.y)) {
      p.vx *= 0.5;
      p.vy *= 0.5;
      game.hurt(dt * 4);
      if (game.random() < dt * 8) game.fx.emit('splash', p.x, p.y, 0, 0, 0.5);
    }
    game.stats.timeOnFoot += dt;
    for (const v of game.vehicles) {
      if (distance(p, v) < v.spec.w * 0.6 + 4 && Math.abs(v.speed) > 50) {
        game.hurt(Math.abs(v.speed) * dt * 0.8);
        p.x += v.vx * dt * 0.8;
        p.y += v.vy * dt * 0.8;
      }
    }
  }
  if (input.tap('KeyR')) {
    game.radio = (game.radio + 1) % 3;
    game.audio?.setStation(game.radio);
    game.notify(RADIO_STATIONS[game.radio].name, RADIO_STATIONS[game.radio].genre);
  }
  if (input.tap('KeyN') && game.story.active === null) {
    const index = WEATHER_TYPES.indexOf(game.weather.type);
    game.weather.type = WEATHER_TYPES[(index + 1) % WEATHER_TYPES.length];
    game.notify('COASTAL FORECAST', game.weather.type);
  }
  safeEntity(p, game.economy.respawn.x, game.economy.respawn.y);
  p.x = clamp(p.x, 0, WORLD_W - 20);
  p.y = clamp(p.y, 0, WORLD_H - 20);
}

function updateTransientState(game, dt) {
  for (let i = game.notifications.length - 1; i >= 0; i--) {
    game.notifications[i].life -= dt;
    if (game.notifications[i].life <= 0) game.notifications.splice(i, 1);
  }
  for (const skid of game.skids) skid.age += dt;
  if (game.skids.length > 1500) game.skids.splice(0, game.skids.length - 1500);
  if (game.steps % 120 === 0) game.skids = game.skids.filter(s => s.age < 60);
  for (const v of game.vehicles) {
    if (v.driver || v.ai || v.pursuit || distance(v, game.player) > 800) continue;
    if (Math.hypot(v.vx, v.vy) > 3 || v.health < 47) driveVehicle(game, v, 0, 0, false, dt);
  }
}

function hurtPlayer(game, amount) {
  const p = game.player;
  if (game.shot || game.menu.death || amount <= 0 || !Number.isFinite(amount)) return;
  const absorbed = Math.min(p.armor, amount * 0.7);
  p.armor -= absorbed;
  p.health -= amount - absorbed;
  p.hurtFlash = Math.max(p.hurtFlash, Math.min(1, amount / 16));
  if (p.health <= 0) game.respawn('WASTED');
}

function beginRespawn(game, reason) {
  if (game.menu.death) return;
  game.menu.death = reason;
  game.menu.deathTimer = 4.5;
  game.dialog = null;
  game.screen = 'play';
  failMission(game, reason === 'WASTED' ? 'Rico did not make it.' : 'Rico was arrested.');
  if (game.jobs.active) cancelJob(game, 'The shift is over.');
  game.audio?.play('failed');
}

function finishRespawn(game) {
  const p = game.player;
  const busted = game.menu.death === 'BUSTED';
  game.economy.cash = Math.max(0, game.economy.cash - (busted ? 400 : 250));
  if (p.vehicle) p.vehicle.driver = false;
  p.vehicle = null;
  const spawn = game.economy.owned.length ? game.economy.respawn : { x: 560, y: 1400 };
  p.x = spawn.x;
  p.y = spawn.y;
  p.vx = 0;
  p.vy = 0;
  p.health = 100;
  p.armor = 0;
  p.hurtFlash = 0;
  p.rooftopHeight = 0;
  game.rooftop = null;
  game.heat = 0;
  game.police.arrest = 0;
  game.police.unseen = 0;
  game.menu.death = null;
  game.camera.x = p.x;
  game.camera.y = p.y;
  game.vehicles = game.vehicles.filter(v => !v.pursuit);
  game.peds = game.peds.filter(ped => !ped.police);
  game.bullets.length = 0;
  game.save();
}
