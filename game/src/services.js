import { distance, label, glow, roundRect, clamp } from './math.js';

export const CITY_SERVICES = [
  {
    id: 'hospital',
    name: 'MARBELLA GENERAL',
    kind: 'medical',
    x: 560,
    y: 1400,
    price: 125,
    icon: '+',
    color: '#9de0bc',
    detail: 'Emergency care • health restored',
  },
  {
    id: 'mercado-food',
    name: 'CAFÉ RICO',
    kind: 'food',
    x: 610,
    y: 2290,
    price: 35,
    icon: 'C',
    color: '#edb985',
    detail: 'Café con leche • +35 health',
  },
  {
    id: 'palma-food',
    name: 'SOL MAR CANTINA',
    kind: 'food',
    x: 3380,
    y: 1985,
    price: 45,
    icon: 'C',
    color: '#edb985',
    detail: 'Fresh seafood • +45 health',
  },
  {
    id: 'workshop',
    name: 'VELA CUSTOMS',
    kind: 'repair',
    x: 1175,
    y: 1700,
    price: 250,
    icon: 'W',
    color: '#8ed6cb',
    detail: 'Engine, bodywork & custom paint',
  },
  {
    id: 'spray',
    name: 'NOCHE BODY SHOP',
    kind: 'spray',
    x: 2290,
    y: 2255,
    price: 650,
    icon: 'P',
    color: '#c7a8e8',
    detail: 'New plates • lose up to 3 stars while unseen',
  },
  {
    id: 'supply',
    name: 'DOCKSIDE OUTFITTERS',
    kind: 'supply',
    x: 2860,
    y: 2860,
    price: 450,
    icon: 'A',
    color: '#e6c18d',
    detail: 'Armor & ammunition • licensed for trouble',
  },
];

const PAINT_COLORS = [
  '#d98169',
  '#78a8a0',
  '#eccd8d',
  '#496f86',
  '#b08aa6',
  '#e8e2cb',
  '#3c4c5e',
  '#91a86e',
];

export function createServices() {
  return {
    nearest: null,
    cooldown: 0,
    lastVisit: null,
    repairs: 0,
    spent: 0,
    resupplies: 0,
  };
}

export function visitService(game, service) {
  const player = game.player;
  const vehicle = player.vehicle;
  const state = game.services;
  if (state.cooldown > 0) return false;
  if (game.economy.cash < service.price) {
    game.notify(service.name, `Service costs $${service.price}. Carry enough cash.`);
    return false;
  }
  if ((service.kind === 'repair' || service.kind === 'spray') && !vehicle) {
    game.notify(service.name, 'Bring a vehicle into the marked service bay.');
    return false;
  }
  if (service.kind === 'spray' && (game.police.seen || game.heat > 3)) {
    game.notify('TOO HOT TO HANDLE', 'Break line of sight. No service above three stars.');
    return false;
  }
  game.economy.cash -= service.price;
  state.spent += service.price;
  state.cooldown = 2;
  state.lastVisit = service.id;
  if (service.kind === 'medical') {
    player.health = 100;
    player.stamina = 100;
    game.notify('ALL PATCHED UP', 'Try not to come straight back, Rico.');
  }
  if (service.kind === 'food') {
    player.health = clamp(player.health + service.price, 0, 100);
    player.stamina = 100;
    game.notify(service.name, 'A taste of home. Health restored.');
  }
  if (service.kind === 'repair' || service.kind === 'spray') {
    vehicle.health = 100;
    vehicle.fire = 0;
    vehicle.color = PAINT_COLORS[Math.floor(game.random() * PAINT_COLORS.length)];
    state.repairs++;
    if (service.kind === 'spray') {
      game.heat = 0;
      game.police.arrest = 0;
      game.notify('A DIFFERENT CAR', 'New plates. Fresh paint. Another chance.');
    } else game.notify('FULL SERVICE', `${vehicle.spec.name} is ready for another run.`);
    game.fx.burst('tire', vehicle.x, vehicle.y, 24, 30);
  }
  if (service.kind === 'supply') {
    player.armor = 100;
    for (let i = 1; i < player.arsenal.length; i++) player.arsenal[i].reserve += 90;
    state.resupplies++;
    game.notify('OUTFITTED', 'Armor full. Reserve ammunition replenished.');
  }
  game.audio?.play('pickup');
  game.save();
  return true;
}

export function updateServices(game, dt) {
  game.services.cooldown = Math.max(0, game.services.cooldown - dt);
  game.services.nearest = CITY_SERVICES.find(service => distance(service, game.player) < 65) || null;
  if (game.input.tap('KeyL') && game.services.nearest && !game.dialog) visitService(game, game.services.nearest);
}

export function drawServices(ctx, game) {
  for (const service of CITY_SERVICES) {
    if (distance(service, game.player) > 700) continue;
    const { x, y, color } = service;
    ctx.save();
    ctx.globalAlpha = 0.8;
    glow(ctx, x, y, 24, color + '20');
    roundRect(ctx, x - 8, y - 22, 16, 17, 2, '#183b49');
    label(ctx, service.icon, x, y - 10, 11, color, 'center', 800);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
