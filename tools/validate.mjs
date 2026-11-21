import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInput } from '../game/src/input.js';
import { createWorld, stepWorld, loadProgress } from '../game/src/world.js';
import { createVehicle, driveVehicle, damageVehicle, enterOrExitVehicle, VEHICLE_TYPES } from '../game/src/vehicles.js';
import { STORY_MISSIONS, startMission, currentObjective, updateMissions, failMission } from '../game/src/missions.js';
import { PROPERTIES, buyProperty, updateEconomy } from '../game/src/economy.js';
import { visitService, CITY_SERVICES } from '../game/src/services.js';
import { findRoadRoute } from '../game/src/navigation.js';
import { startSideJob, updateSideJobs } from '../game/src/jobs.js';
import { updateStunts } from '../game/src/stunts.js';
import { stageShot } from '../game/src/shots.js';
import { updateHelicopter } from '../game/src/helicopter.js';
import { updatePolice } from '../game/src/police.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
};
const results = [];
function test(name, work) {
  work();
  results.push({ name, passed: true });
  console.log(`PASS ${name}`);
}
function fresh(seed = 260621) {
  const game = createWorld(createInput(null), seed);
  game.screen = 'play';
  return game;
}

test('Every source module imports independently', () => {
  const files = readdirSync('game/src').filter(file => file.endsWith('.js'));
  assert(files.length >= 35);
  for (const file of files) {
    const source = readFileSync(`game/src/${file}`, 'utf8');
    assert(!/https?:\/\//.test(source));
    assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(source));
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) assert(match[1].startsWith('./'));
  }
});

test('Seeded city is reproducible, collision-safe and contains 400+ buildings', () => {
  const a = fresh(17);
  const b = fresh(17);
  assert(a.city.buildings.length >= 400);
  assert.deepEqual(a.city.buildings, b.city.buildings);
  assert(a.city.isRoad(1680, 1400));
  assert(!a.city.collision(1680, 1400, 10));
  for (const tree of a.city.trees) assert(!a.city.isRoad(tree.x, tree.y));
  assert(a.city.isWater(4000, 3200));
  assert(!a.city.isWater(3600, 3080));
});

test('All nine vehicle types accelerate with finite, bounded physics', () => {
  const g = fresh();
  g.vehicles = [];
  g.peds = [];
  for (const type of Object.keys(VEHICLE_TYPES)) {
    const v = createVehicle(type, type === 'marlin' ? 4100 : 1680, 1400, 0);
    v.invincible = true;
    for (let i = 0; i < 60; i++) driveVehicle(g, v, 1, 0.1, false, 1 / 60);
    assert(Number.isFinite(v.x) && Number.isFinite(v.vx));
    assert(Math.abs(v.speed) <= v.spec.max + 1);
    assert(v.speed > 0);
  }
  const damaged = createVehicle('sunburst', NaN, Infinity);
  damaged.vx = Infinity;
  driveVehicle(g, damaged, 0, 0, false, 1 / 60);
  assert(Number.isFinite(damaged.x) && Number.isFinite(damaged.y));
});

test('Player can enter, drive and exit a nearby vehicle', () => {
  const g = fresh();
  g.vehicles = [createVehicle('sunburst', 1680, 1400, Math.PI / 2)];
  g.player.x = 1680;
  g.player.y = 1428;
  assert(enterOrExitVehicle(g));
  assert(g.player.vehicle);
  g.input.held.add('KeyW');
  for (let i = 0; i < 60; i++) stepWorld(g);
  assert(g.player.x > 1700);
  g.input.held.clear();
  assert(enterOrExitVehicle(g));
  assert.equal(g.player.vehicle, null);
});

test('NPC damage does not implicate the player', () => {
  const g = fresh();
  const cruiser = createVehicle('interceptor', 1680, 1400);
  damageVehicle(g, cruiser, 10, 'world');
  assert.equal(g.heat, 0);
  damageVehicle(g, cruiser, 10, 'player');
  assert(g.heat > 0);
});

test('Fourteen story missions progress through every objective to completion', () => {
  const g = fresh();
  let objectiveCount = 0;
  for (let index = 0; index < STORY_MISSIONS.length; index++) {
    startMission(g, index);
    assert(g.dialog);
    g.dialog = null;
    let safety = 0;
    while (g.story.active !== null && safety++ < 20) {
      g.dialog = null;
      const o = currentObjective(g);
      assert(o);
      g.input.pressed.clear();
      if (o.type === 'goto' || o.type === 'rooftop') {
        g.player.x = o.x;
        g.player.y = o.y;
        if (o.type === 'rooftop') g.input.pressed.add('KeyE');
      }
      if (o.type === 'steal') {
        g.player.vehicle = null;
        g.player.x = g.story.target.x;
        g.player.y = g.story.target.y;
        // Use the actual vehicle entry interaction rather than bypass its distance check.
        const target = g.story.target;
        g.vehicles = g.vehicles.filter(v => v === target || Math.hypot(v.x - target.x, v.y - target.y) > 100);
        assert(enterOrExitVehicle(g));
        assert.equal(g.player.vehicle, target);
      }
      if (o.type === 'deliver') {
        assert(g.player.vehicle);
        g.player.x = o.x;
        g.player.y = o.y;
        g.player.vehicle.speed = 0;
      }
      if (o.type === 'wreck') damageVehicle(g, g.story.target, 1000, 'player');
      if (o.type === 'convoy') for (const escort of g.story.escorts) damageVehicle(g, escort, 1000, 'player');
      if (o.type === 'evade') g.heat = 0;
      if (o.type === 'heat') {
        g.heat = o.stars;
        g.story.progress = o.duration;
      }
      if (o.type === 'race') {
        if (!g.player.vehicle) g.player.vehicle = createVehicle('sunburst', 0, 0);
        for (const point of o.points) {
          g.player.x = point[0];
          g.player.y = point[1];
          updateMissions(g, 1 / 60);
        }
      } else updateMissions(g, 1 / 60);
      objectiveCount++;
    }
    assert.equal(g.story.active, null, `Mission ${index} did not complete`);
    assert.equal(g.story.completed, index + 1);
    assert(g.story.card.passed);
  }
  assert(objectiveCount >= 29);
});

test('Timed failure retains a retry path', () => {
  const g = fresh();
  startMission(g, 2);
  g.dialog = null;
  g.player.vehicle = g.story.target;
  updateMissions(g, 0.1);
  g.story.timer = 0.01;
  updateMissions(g, 1);
  assert.equal(g.story.active, null);
  assert.equal(g.story.retry, 2);
  assert.equal(g.story.card.passed, false);
  startMission(g, g.story.retry);
  assert.equal(g.story.active, 2);
});

test('Deliveries reject a substituted vehicle', () => {
  const g = fresh();
  startMission(g, 1);
  g.dialog = null;
  g.player.vehicle = g.story.target;
  updateMissions(g, 1 / 60);
  const objective = currentObjective(g);
  g.player.x = objective.x;
  g.player.y = objective.y;
  g.player.vehicle = createVehicle('tico', objective.x, objective.y);
  updateMissions(g, 1 / 60);
  assert.equal(g.story.active, 1);
  g.player.vehicle = g.story.target;
  g.player.vehicle.speed = 0;
  updateMissions(g, 1 / 60);
  assert.equal(g.story.active, null);
});

test('Property ownership, hourly income, garage and saves persist', () => {
  const g = fresh();
  g.economy.cash = 100000;
  for (const p of PROPERTIES) assert(buyProperty(g, p));
  assert.equal(g.economy.owned.length, 6);
  const bankBefore = g.economy.bank;
  g.clock.hour = 17.2;
  updateEconomy(g, 1);
  assert(g.economy.bank > bankBefore);
  g.player.vehicle = createVehicle('vectora', 1175, 1730);
  g.storeCurrentVehicle();
  g.story.completed = 8;
  g.save();
  const loaded = fresh();
  loadProgress(loaded);
  assert.equal(loaded.economy.owned.length, 6);
  assert.equal(loaded.story.completed, 8);
  assert.equal(loaded.economy.garage[0].type, 'vectora');
  assert(loaded.vehicles.some(v => v.owned && v.type === 'vectora'));
});

test('Taxi shift requires a cab and pays five fares', () => {
  const g = fresh();
  assert.equal(startSideJob(g, 'taxi'), false);
  g.player.vehicle = createVehicle('taxi', 0, 0);
  assert(startSideJob(g, 'taxi'));
  let safety = 0;
  while (g.jobs.active && safety++ < 20) {
    updateSideJobs(g, 0.1);
    if (g.jobs.marker) {
      g.player.x = g.jobs.marker.x;
      g.player.y = g.jobs.marker.y;
      g.player.vehicle.speed = 0;
      updateSideJobs(g, 0.1);
    }
  }
  assert.equal(g.jobs.completed, 1);
  assert(g.jobs.tips > 1500);
});

test('Repair, medical care, resupply and concealed respray work', () => {
  const g = fresh();
  g.economy.cash = 10000;
  g.player.health = 5;
  assert(visitService(g, CITY_SERVICES[0]));
  assert.equal(g.player.health, 100);
  g.player.vehicle = createVehicle('sunburst', 1175, 1700);
  g.player.vehicle.health = 10;
  g.services.cooldown = 0;
  assert(visitService(g, CITY_SERVICES[3]));
  assert.equal(g.player.vehicle.health, 100);
  g.services.cooldown = 0;
  g.heat = 2;
  g.police.seen = true;
  assert.equal(visitService(g, CITY_SERVICES[4]), false);
  g.police.seen = false;
  assert(visitService(g, CITY_SERVICES[4]));
  assert.equal(g.heat, 0);
});

test('Police helicopter activates, tracks and deploys real officers', () => {
  const g = fresh();
  g.player.x = 1680;
  g.player.y = 1400;
  g.heat = 5;
  updateHelicopter(g, 0.01);
  assert(g.helicopter.active);
  g.helicopter.x = 1700;
  g.helicopter.y = 1370;
  g.helicopter.deploy = 0;
  updateHelicopter(g, 0.01);
  assert(g.peds.some(p => p.police));
  g.heat = 0;
  updateHelicopter(g, 0.01);
  assert(!g.helicopter.active);
});

test('WASTED and BUSTED restore health and clear pursuit', () => {
  for (const reason of ['WASTED', 'BUSTED']) {
    const g = fresh();
    g.heat = 5;
    g.respawn(reason);
    assert.equal(g.menu.death, reason);
    g.finishRespawn();
    assert.equal(g.player.health, 100);
    assert.equal(g.heat, 0);
    assert.equal(g.menu.death, null);
    assert(g.economy.cash < 2450);
  }
});

test('GPS A-star returns contiguous road intersections', () => {
  const g = fresh();
  const route = findRoadRoute(g.navigation, { x: 560, y: 1120 }, { x: 2800, y: 3080 });
  assert(route.length > 5);
  for (let i = 1; i < route.length - 1; i++) {
    assert.equal(Math.abs(route[i].x - route[i - 1].x) + Math.abs(route[i].y - route[i - 1].y), 280);
  }
});

test('Helicopter search can be escaped rather than seeing through buildings', () => {
  const g = fresh();
  g.vehicles = [];
  g.peds = [];
  g.player.x = 4700;
  g.player.y = 2000;
  g.heat = 4;
  g.police.spawn = 1000;
  g.police.lastKnown = { x: 1680, y: 1400 };
  g.helicopter.active = true;
  g.helicopter.searchX = 1680;
  g.helicopter.searchY = 1400;
  for (let i = 0; i < 3000; i++) {
    updatePolice(g, 1 / 60);
    updateHelicopter(g, 1 / 60);
  }
  assert.equal(g.heat, 0);
});

test('Stunt ramps launch a fast vehicle and reward a clean landing', () => {
  const g = fresh();
  const v = createVehicle('sunburst', 980, 2540, Math.PI / 2);
  g.player.vehicle = v;
  v.speed = 220;
  updateStunts(g, 1 / 60);
  assert(v.altitude > 0);
  let steps = 0;
  while (v.altitude > 0 && steps++ < 300) {
    v.x += 220 / 60;
    updateStunts(g, 1 / 60);
  }
  assert(g.stunts.completed.includes('mercado-flight'));
  assert(g.stunts.bestDistance > 100);
});

test('Long simulation and each staged scenario remain finite', () => {
  for (const shot of [null, 'chase', 'goldenhour', 'city', 'boat']) {
    const g = fresh();
    if (shot) stageShot(g, shot);
    const steps = shot ? 600 : 3600;
    for (let i = 0; i < steps; i++) stepWorld(g);
    for (const entity of [g.player, ...g.vehicles, ...g.peds]) {
      assert(Number.isFinite(entity.x) && Number.isFinite(entity.y), `${shot} has nonfinite entity`);
    }
    assert(g.fx.particles.length <= 1400);
  }
});

writeFileSync('validation-gameplay.json', JSON.stringify({ tests: results, passed: results.length }, null, 2));
console.log(`${results.length} behavioral checks passed.`);
