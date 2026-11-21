import { COAST, CITY_W, BLOCK, TAU } from './config.js';
import { createVehicle, driveVehicle } from './vehicles.js';
import { angleDelta, clamp, distance, label, glow } from './math.js';

const NEWS = [
  'Costa News: Vane Capital denies links to harbor redevelopment scandal.',
  'Weather desk: warm currents bring late showers to the Marbella coast.',
  'Traffic: expect delays around Old Mercado and Reyes Boulevard.',
  'Harbor authority urges residents to avoid restricted dock facilities.',
  'The Palma night market opens at dusk. Support local businesses.',
  'Police commissioner promises a safe summer. Residents remain skeptical.',
  'Coast Cab is hiring. A clean driving record is apparently optional.',
  'Property market: marina prices rise as overseas investment returns.',
  'Marbella Social announces another sold-out weekend on Palma Row.',
  'Greenfield residents celebrate the restoration of the park fountains.',
  'News editorial: who really owns the streets of this city?',
  'Reyes says the port is secure. In unrelated news, three boats are missing.',
];

const WORLD_EVENTS = [
  {
    id: 'broken-cab',
    title: 'A DRIVER IN TROUBLE',
    description: 'A stranded Coast Cab. Bring it to Vela Customs for a finders fee.',
    type: 'taxi',
    x: 1960,
    y: 1988,
    destination: { x: 1175, y: 1730 },
    reward: 650,
  },
  {
    id: 'lost-bike',
    title: 'SOMEONE’S PRIDE & JOY',
    description: 'An abandoned Vespera. Return it to Palma Row for a reward.',
    type: 'vespera',
    x: 870,
    y: 1400,
    destination: { x: 3360, y: 1960 },
    reward: 950,
  },
  {
    id: 'late-parcel',
    title: 'OFF THE CLOCK',
    description: 'A forgotten Parcelvan. Its owner is waiting near the port.',
    type: 'parcelvan',
    x: 2520,
    y: 868,
    destination: { x: 3090, y: 2820 },
    reward: 1100,
  },
];

export function createAmbientState() {
  return {
    newsTimer: 18,
    newsIndex: 0,
    newsLine: '',
    newsAge: 0,
    eventTimer: 45,
    event: null,
    eventVehicle: null,
    completed: [],
    boatTimer: 0,
    initialized: false,
    hornCooldown: 0,
  };
}

export function initializeAmbientBoats(game) {
  const route = [
    { x: COAST + 590, y: 2100 },
    { x: COAST + 900, y: 2900 },
    { x: COAST + 650, y: 3550 },
    { x: COAST + 350, y: 2700 },
  ];
  for (let i = 0; i < 3; i++) {
    const point = route[i];
    const boat = createVehicle('marlin', point.x, point.y, i);
    boat.aiBoat = { route, index: (i + 1) % route.length, cruise: 52 + i * 9 };
    boat.parked = false;
    boat.color = ['#d9dfcb', '#adc8c9', '#d4bd9c'][i];
    game.vehicles.push(boat);
  }
}

export function updateAmbient(game, dt) {
  const a = game.ambient;
  a.newsTimer -= dt;
  a.newsAge += dt;
  a.hornCooldown = Math.max(0, a.hornCooldown - dt);
  if (a.newsTimer <= 0) {
    a.newsLine = NEWS[a.newsIndex++ % NEWS.length];
    a.newsAge = 0;
    a.newsTimer = 23;
  }
  for (const boat of game.vehicles) {
    if (!boat.aiBoat || boat.driver || boat.exploded || distance(boat, game.player) > 1200) continue;
    const ai = boat.aiBoat;
    const destination = ai.route[ai.index];
    const desired = Math.atan2(destination.x - boat.x, -(destination.y - boat.y));
    const difference = angleDelta(boat.angle, desired);
    driveVehicle(game, boat, clamp((ai.cruise - boat.speed) / 45, -0.3, 1), clamp(difference * 1.6, -1, 1), false, dt);
    game.boatWake(boat, dt);
    if (distance(boat, destination) < 85) ai.index = (ai.index + 1) % ai.route.length;
  }
  if (game.input.tap('KeyC') && a.hornCooldown <= 0 && game.player.vehicle) {
    a.hornCooldown = 0.7;
    for (const ped of game.peds) {
      if (distance(ped, game.player) < 110 && !ped.police) {
        ped.flee = 1.5;
        ped.targetAngle = Math.atan2(ped.y - game.player.y, ped.x - game.player.x);
      }
    }
    for (const v of game.vehicles) {
      if (v.ai && distance(v, game.player) < 140) v.ai.cruise = Math.min(130, v.ai.cruise + 8);
    }
  }
  if (game.shot || game.story.active !== null || game.jobs.active) return;
  a.eventTimer -= dt;
  if (!a.event && a.eventTimer <= 0) {
    const info = WORLD_EVENTS.find(event => !a.completed.includes(event.id));
    if (!info) return;
    a.event = info;
    a.eventVehicle = createVehicle(info.type, info.x, info.y, Math.PI / 2);
    a.eventVehicle.health = 44;
    a.eventVehicle.missionTag = 'opportunity';
    game.vehicles.push(a.eventVehicle);
    game.notify(info.title, info.description, 8);
  }
  if (a.event && a.eventVehicle) {
    if (a.eventVehicle.exploded) {
      game.notify('OPPORTUNITY LOST', 'There will be other chances.');
      a.completed.push(a.event.id);
      a.event = null;
      a.eventVehicle = null;
      a.eventTimer = 65;
    } else if (game.player.vehicle === a.eventVehicle && distance(game.player, a.event.destination) < 65) {
      game.economy.cash += a.event.reward;
      game.notify('FAVOR RETURNED', `+$${a.event.reward}. Marbella remembers its own.`);
      game.audio?.play('passed');
      a.completed.push(a.event.id);
      a.event = null;
      a.eventVehicle = null;
      a.eventTimer = 90;
    }
  }
}

export function drawAmbientOpportunity(ctx, game) {
  const a = game.ambient;
  if (!a.event || !a.eventVehicle) return;
  const point = game.player.vehicle === a.eventVehicle ? a.event.destination : a.eventVehicle;
  if (distance(point, game.player) > 800) return;
  const y = point.y - 36 + Math.sin(game.clock.elapsed * 2) * 3;
  glow(ctx, point.x, point.y, 28, '#9ee8bd28');
  label(ctx, '!', point.x, y, 20, '#9ee8bd', 'center', 900);
  if (distance(point, game.player) < 150) label(ctx, game.player.vehicle === a.eventVehicle ? 'RETURN THE VEHICLE' : 'NEIGHBORHOOD FAVOR', point.x, y - 20, 8, '#bbddc3', 'center', 800);
}

export function drawNewsTicker(ctx, game) {
  const a = game.ambient;
  if (game.radio !== 2 || !game.player.vehicle || a.newsAge > 10 || !a.newsLine || game.shot) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, a.newsAge * 2, (10 - a.newsAge) * 2);
  ctx.fillStyle = '#0d2933e8';
  ctx.fillRect(346, 670, 592, 23);
  ctx.beginPath();
  ctx.rect(354, 670, 576, 23);
  ctx.clip();
  label(ctx, a.newsLine, 360 - Math.max(0, a.newsAge - 2) * 13, 685, 10, '#bad8cf', 'left', 500);
  ctx.restore();
}
