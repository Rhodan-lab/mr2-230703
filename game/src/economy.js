import { SAVE_KEY } from './config.js';
import { distance, label, roundRect, glow } from './math.js';

export const PROPERTIES = [
  { id: 'safehouse', name: 'MERCADO SAFEHOUSE', kind: 'SAFEHOUSE', x: 610, y: 2260, price: 1800, income: 120, description: 'A bed, a clean shirt, a fresh start.' },
  { id: 'garage', name: 'VELA CUSTOMS', kind: 'GARAGE', x: 1175, y: 1730, price: 4200, income: 260, description: 'Store and repair your favorite rides.' },
  { id: 'kiosk', name: 'PALMA BEACH CLUB', kind: 'BEACH KIOSK', x: 3375, y: 1430, price: 6500, income: 410, description: 'Sun, surf, and strictly cash business.' },
  { id: 'taxi', name: 'COAST CAB DEPOT', kind: 'TAXI DEPOT', x: 1735, y: 1150, price: 9500, income: 620, description: 'Five fares. One city. Endless stories.' },
  { id: 'marina', name: 'MARLIN MARINA', kind: 'MARINA SLIP', x: 3510, y: 3110, price: 14000, income: 900, description: 'Your own piece of the open water.' },
  { id: 'penthouse', name: 'MIRADOR PENTHOUSE', kind: 'PENTHOUSE', x: 2275, y: 590, price: 32000, income: 2200, description: 'The view you always said you deserved.' },
];

export const BANKS = [
  { x: 1730, y: 860, name: 'COSTA TRUST' },
  { x: 2860, y: 2005, name: 'MARBELLA SAVINGS' },
  { x: 615, y: 2555, name: 'MERCADO CREDIT' },
];

export function createEconomy() {
  return {
    cash: 2450,
    bank: 0,
    owned: [],
    garage: [],
    respawn: { x: 610, y: 2260 },
    incomeHour: 16,
    incomeTotal: 0,
    displayCash: 2450,
    nearest: null,
    purchases: 0,
  };
}

export function buyProperty(game, property) {
  const e = game.economy;
  if (e.owned.includes(property.id)) {
    e.respawn = { x: property.x, y: property.y };
    game.player.health = 100;
    if (property.id === 'garage' && game.player.vehicle) storeVehicle(game);
    game.notify('HOME SWEET HOME', `${property.name} • respawn point set`);
    game.save();
    return true;
  }
  if (e.cash < property.price) {
    game.notify('INSUFFICIENT FUNDS', `${property.name} costs $${property.price.toLocaleString()}`);
    game.audio?.play('failed');
    return false;
  }
  e.cash -= property.price;
  e.owned.push(property.id);
  e.purchases++;
  e.respawn = { x: property.x, y: property.y };
  game.notify('PROPERTY ACQUIRED', `${property.name} • +$${property.income}/hour`);
  game.audio?.play('passed');
  game.fx.pop('PROPERTY ACQUIRED', property.x, property.y - 30, '#f6d082');
  game.save();
  return true;
}

export function storeVehicle(game) {
  const v = game.player.vehicle;
  if (!v || v.exploded) return;
  const stored = game.economy.garage;
  const record = { type: v.type, color: v.color };
  if (stored.some(item => item.type === record.type && item.color === record.color)) {
    v.health = 100;
    v.fire = 0;
    game.notify('FULL SERVICE', 'Bodywork repaired. Tank full.');
  } else {
    if (stored.length >= 8) stored.shift();
    stored.push(record);
    v.owned = true;
    v.health = 100;
    game.notify('GARAGE UPDATED', `${v.spec.name} saved to your collection`);
  }
}

export function updateEconomy(game, dt) {
  const e = game.economy;
  e.displayCash += (e.cash - e.displayCash) * Math.min(1, dt * 7);
  const hour = Math.floor(game.clock.hour);
  if (hour !== e.incomeHour && !game.shot) {
    e.incomeHour = hour;
    const income = PROPERTIES.filter(p => e.owned.includes(p.id)).reduce((sum, p) => sum + p.income, 0);
    if (income > 0) {
      e.bank += income;
      e.incomeTotal += income;
      game.notify('PROPERTY INCOME', `+$${income.toLocaleString()} deposited to Costa Trust`);
      game.audio?.play('pickup');
    }
  }
  e.nearest = PROPERTIES.find(p => distance(p, game.player) < 90) || null;
  if (game.input.tap('KeyB') && e.nearest) buyProperty(game, e.nearest);
  if (game.input.tap('KeyG')) {
    const bank = BANKS.find(b => distance(b, game.player) < 95);
    if (bank) {
      const amount = Math.floor(e.cash);
      e.bank += amount;
      e.cash = 0;
      game.notify(bank.name, `$${amount.toLocaleString()} deposited. Safe from arrest fees.`);
      game.audio?.play('pickup');
      game.save();
    } else game.notify('FIND A COSTA TRUST ATM', 'Banks are marked with a blue $ on the map.');
  }
  if (game.input.tap('KeyK')) game.save();
}

export function writeSave(game) {
  const e = game.economy;
  const data = {
    version: 2,
    cash: Math.floor(e.cash),
    bank: Math.floor(e.bank),
    owned: e.owned,
    garage: e.garage,
    respawn: e.respawn,
    completed: game.story.completed,
    station: game.radio,
    hour: game.clock.hour,
    jobs: game.jobs.completed,
  };
  try {
    globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(data));
    game.notify('GAME SAVED', 'Your city. Your story.');
    return true;
  } catch {
    game.notify('STORAGE UNAVAILABLE', 'Progress continues for this visit.');
    return false;
  }
}

export function readSave(game) {
  try {
    const raw = globalThis.localStorage?.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 2 || !Number.isFinite(data.cash)) return false;
    game.economy.cash = Math.max(0, data.cash);
    game.economy.displayCash = game.economy.cash;
    game.economy.bank = Math.max(0, Number(data.bank) || 0);
    game.economy.owned = (data.owned || []).filter(id => PROPERTIES.some(p => p.id === id));
    game.economy.garage = (data.garage || []).slice(0, 8);
    const point = data.respawn;
    if (Number.isFinite(point?.x) && Number.isFinite(point?.y)) game.economy.respawn = point;
    game.player.x = game.economy.respawn.x;
    game.player.y = game.economy.respawn.y;
    game.story.completed = Math.max(0, Math.min(14, Number(data.completed) || 0));
    game.radio = Math.max(0, Math.min(2, Number(data.station) || 0));
    game.clock.hour = Math.max(0, Math.min(23.99, Number(data.hour) || 16));
    game.economy.incomeHour = Math.floor(game.clock.hour);
    game.jobs.completed = Number(data.jobs) || 0;
    return true;
  } catch {
    return false;
  }
}

export function drawProperties(ctx, game) {
  for (const p of PROPERTIES) {
    if (distance(p, game.player) > 900) continue;
    const owned = game.economy.owned.includes(p.id);
    const color = owned ? '#8ad7b0' : '#edd07d';
    const y = p.y - 25 + Math.sin(game.clock.elapsed * 2) * 2;
    glow(ctx, p.x, p.y, 26, color + '22');
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x - 11, y + 8);
    ctx.lineTo(p.x - 11, y - 4);
    ctx.lineTo(p.x, y - 13);
    ctx.lineTo(p.x + 11, y - 4);
    ctx.lineTo(p.x + 11, y + 8);
    ctx.closePath();
    ctx.stroke();
    label(ctx, owned ? '✓' : '$', p.x, y + 3, 13, color, 'center', 800);
    if (!owned && distance(p, game.player) < 340) {
      roundRect(ctx, p.x - 43, y + 16, 86, 24, 3, '#0d2632e8');
      label(ctx, 'FOR SALE', p.x, y + 25, 6.5, color, 'center', 800);
      label(ctx, `$${p.price.toLocaleString()}`, p.x, y + 35, 8, '#eaf1df', 'center');
    }
  }
  for (const bank of BANKS) {
    if (distance(bank, game.player) > 850) continue;
    roundRect(ctx, bank.x - 8, bank.y - 13, 16, 23, 2, '#305b70');
    label(ctx, '$', bank.x, bank.y + 2, 15, '#95dbe0', 'center', 700);
  }
}
