import { COAST, BLOCK } from './config.js';
import { createVehicle, explodeVehicle } from './vehicles.js';
import { spawnCruiser } from './police.js';

export const SHOT_SCENARIOS = {
  chase: {
    name: '1-chase.jpg',
    description: 'Air One, five-star rain pursuit, neon, tactical officers and live traffic.',
  },
  goldenhour: {
    name: '2-goldenhour.jpg',
    description: 'Palma Row at sunset: driveable coastline, palms, crowds and foam.',
  },
  city: {
    name: '3-city.jpg',
    description: 'Downtown on foot: taxi service, property ownership, traffic and construction.',
  },
  boat: {
    name: '4-boat.jpg',
    description: 'A Marlin launching from the working docks into animated coastal water.',
  },
};

function seatPlayer(game, type, x, y, angle, color) {
  const v = createVehicle(type, x, y, angle, color);
  v.invincible = true;
  v.driver = true;
  v.parked = false;
  game.vehicles.push(v);
  game.player.vehicle = v;
  game.player.x = x;
  game.player.y = y;
  game.camera.x = x;
  game.camera.y = y;
  return v;
}

function ambientCar(game, type, x, y, angle, speed = 60, color) {
  const v = createVehicle(type, x, y, angle, color);
  v.invincible = true;
  v.ai = { direction: Math.round(angle / (Math.PI / 2) + 4) % 4, cruise: speed, wait: 0, junction: '' };
  v.parked = false;
  game.vehicles.push(v);
  return v;
}

function crowd(game, x, y, count, width, height) {
  for (let i = 0; i < count; i++) {
    const px = x + game.random() * width;
    const py = y + game.random() * height;
    if (!game.city.collision(px, py, 8)) game.peds.push(game.makePed(px, py));
  }
}

export function stageShot(game, name) {
  if (!SHOT_SCENARIOS[name]) name = 'chase';
  game.shot = name;
  game.screen = 'play';
  game.story.completed = 10;
  game.economy.cash = 48760;
  game.economy.displayCash = 48760;
  game.economy.bank = 129400;
  game.economy.owned = ['safehouse', 'garage'];
  game.player.weapon = 2;
  game.player.armor = 87;
  game.clock.elapsed = 35;
  game.notifications.length = 0;
  game.radio = 0;
  if (name === 'chase') stageChase(game);
  if (name === 'goldenhour') stageGolden(game);
  if (name === 'city') stageCity(game);
  if (name === 'boat') stageBoat(game);
  game.camera.zoom = game.shotZoom;
  game.menu.help = false;
  return SHOT_SCENARIOS[name];
}

function stageChase(game) {
  game.clock.hour = 22.4;
  game.weather.type = 'RAIN';
  game.weather.wet = 1;
  game.weather.thunder = 100;
  game.shotZoom = 1.2;
  game.camera.rotation = -0.15;
  game.vehicles = game.vehicles.filter(v => Math.hypot(v.x - 1740, v.y - 1400) > 600);
  const v = seatPlayer(game, 'vectora', 1695, 1420, Math.PI / 2 + 0.03, '#ef806a');
  v.vx = 247;
  v.speed = 247;
  game.heat = 5;
  game.police.gainFlash = 0;
  game.police.lastKnown = { x: 1695, y: 1420 };
  for (const [x, y, angle] of [
    [1550, 1418, 1.57],
    [1470, 1385, 1.67],
    [1335, 1419, 1.57],
    [2210, 1380, -1.57],
    [1685, 1235, 3.0],
    [1968, 1530, 0.1],
  ]) spawnCruiser(game, x, y, angle);
  ambientCar(game, 'taxi', 2010, 1378, -Math.PI / 2, 72);
  ambientCar(game, 'parcelvan', 2250, 1420, Math.PI / 2, 68);
  const wreck = createVehicle('tico', 1610, 1433, 1.9, '#5f7b85');
  game.vehicles.push(wreck);
  explodeVehicle(game, wreck);
  game.helicopter.active = true;
  game.helicopter.x = 1750;
  game.helicopter.y = 1315;
  game.helicopter.searchX = 1725;
  game.helicopter.searchY = 1420;
  game.helicopter.rope = 3.6;
  game.helicopter.deploy = 1.6;
  game.helicopter.altitude = 112;
  game.shotMarker = { x: 2250, y: 1420 };
  game.shotObjective = { act: 'ACT III', title: 'EYES IN THE RAIN', text: 'Survive Air One. Reach the harbor escape route.', timer: 47 };
  game.shotTick = dt => {
    // Staging protects the stunt vehicle; pursuit and driving remain fully live.
    game.heat = 5;
    game.helicopter.rope = Math.max(game.helicopter.rope, 1.5);
    if (game.steps % 15 === 0) {
      const p = game.player;
      game.fireBullet(p.x - 160, p.y - 40, 0.18, 'police', 0, 800, 0.55);
    }
  };
  crowd(game, 1430, 1453, 16, 160, 14);
  crowd(game, 1715, 1344, 12, 200, 14);
  for (let i = 0; i < 30; i++) {
    game.skids.push({ x: 1330 + i * 9, y: 1422 + Math.sin(i * 0.1) * 9, bx: 1340 + i * 9, by: 1422 + Math.sin((i + 1) * 0.1) * 9, angle: 1.57, age: 2, width: 19 });
  }
}

function stageGolden(game) {
  game.clock.hour = 17.55;
  game.weather.type = 'GOLDEN';
  game.shotZoom = 1.1;
  game.camera.rotation = -0.11;
  game.radio = 1;
  const v = seatPlayer(game, 'sunburst', 3380, 1600, 0, '#de7864');
  v.vy = -120;
  v.speed = 120;
  ambientCar(game, 'taxi', 3340, 1480, Math.PI, 55);
  ambientCar(game, 'vespera', 3380, 1430, 0, 60);
  ambientCar(game, 'tico', 3340, 1790, Math.PI, 50, '#a5ccb5');
  crowd(game, 3420, 1230, 45, 105, 680);
  game.shotObjective = { act: 'PALMA ROW', title: 'GOLDEN STATE OF MIND', text: 'Cruise the coast. Meet Marisol at Palma Social.', timer: 0 };
  game.shotMarker = { x: 3345, y: 1330 };
}

function stageCity(game) {
  game.clock.hour = 12.4;
  game.weather.type = 'CLEAR';
  game.shotZoom = 1.28;
  game.camera.rotation = -0.13;
  game.player.x = 1680;
  game.player.y = 1198;
  game.player.weapon = 0;
  game.player.angle = -0.2;
  game.camera.x = 1760;
  game.camera.y = 1198;
  // This view deliberately shows the player on foot next to a usable taxi.
  const taxi = createVehicle('taxi', 1700, 1213, 0);
  taxi.invincible = true;
  taxi.fare = true;
  game.vehicles.push(taxi);
  for (let i = 0; i < 8; i++) {
    ambientCar(game, ['tico', 'sunburst', 'parcelvan', 'taxi'][i % 4], 1450 + i * 95, 1140, Math.PI / 2, 45 + i * 2);
    ambientCar(game, ['haulmax', 'vectora', 'vespera'][i % 3], 1510 + i * 90, 1100, -Math.PI / 2, 54);
  }
  crowd(game, 1728, 1190, 14, 10, 150);
  crowd(game, 1480, 1168, 18, 150, 13);
  crowd(game, 1780, 1058, 16, 130, 14);
  game.shotObjective = { act: 'SIDE HUSTLE', title: 'COAST CAB • YOUR NEXT FARE', text: 'Enter the Coast Cab. Five fares. Keep the tips.', timer: 254 };
  game.shotMarker = { x: 1735, y: 1150 };
}

function stageBoat(game) {
  game.clock.hour = 15.6;
  game.weather.type = 'CLEAR';
  game.shotZoom = 1.08;
  game.camera.rotation = -0.12;
  game.shotFraming = { x: -225, y: 0 };
  const v = seatPlayer(game, 'marlin', COAST + 230, 3180, Math.PI / 2 - 0.24);
  v.vx = 180;
  v.vy = -40;
  v.speed = 185;
  game.radio = 1;
  game.shotObjective = { act: 'ACT II', title: 'BLUE WATER, BLACK MONEY', text: 'Take Reyes’s case beyond the breakwater.', timer: 96 };
  game.shotMarker = { x: COAST + 660, y: 3020 };
  crowd(game, 3450, 3005, 8, 60, 18);
  for (let i = 0; i < 65; i++) {
    const age = i / 30;
    const x = v.x - i * 4;
    const y = v.y + i * 0.75;
    for (const side of [-1, 1]) game.fx.emit('wake', x, y + side * (10 + i * 0.25), 0, side * 9, 3.5 - age);
  }
}
