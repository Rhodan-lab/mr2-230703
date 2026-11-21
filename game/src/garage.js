import { createVehicle, drawVehicle, VEHICLE_TYPES } from './vehicles.js';
import { distance, label, roundRect, polygon } from './math.js';

export function createGarageMenu() {
  return {
    open: false,
    selection: 0,
    message: '',
    previewAngle: 0,
  };
}

export function updateGarage(game, dt) {
  const state = game.garageMenu;
  const input = game.input;
  const near = Math.hypot(game.player.x - 1175, game.player.y - 1730) < 120;
  if (input.tap('KeyU') && near && game.economy.owned.includes('garage')) {
    state.open = !state.open;
    state.selection = 0;
    state.message = '';
    if (state.open && game.player.vehicle) game.storeCurrentVehicle();
  }
  if (!state.open) return;
  state.previewAngle += dt * 0.32;
  const collection = game.economy.garage;
  const count = collection.length;
  if (input.tap('Escape') || input.tap('KeyU') && !near) {
    state.open = false;
    return;
  }
  if (input.tap('ArrowRight') || input.tap('KeyD')) state.selection = count ? (state.selection + 1) % count : 0;
  if (input.tap('ArrowLeft') || input.tap('KeyA')) state.selection = count ? (state.selection + count - 1) % count : 0;
  if (input.tap('Enter') && count > 0) {
    const selected = collection[state.selection];
    if (!VEHICLE_TYPES[selected.type]) return;
    if (game.player.vehicle) game.player.vehicle.driver = false;
    const vehicle = createVehicle(selected.type, 1175, 1700, Math.PI / 2, selected.color);
    vehicle.owned = true;
    vehicle.driver = true;
    vehicle.parked = false;
    game.vehicles.push(vehicle);
    game.player.vehicle = vehicle;
    game.player.x = vehicle.x;
    game.player.y = vehicle.y;
    state.open = false;
    game.notify('VELA CUSTOMS', `${vehicle.spec.name} retrieved from your garage.`);
    game.audio?.play('door');
  }
}

export function drawGarage(ctx, game) {
  const state = game.garageMenu;
  if (!state.open) return;
  ctx.fillStyle = '#061724f2';
  ctx.fillRect(120, 83, 1040, 554);
  label(ctx, 'VELA CUSTOMS', 159, 140, 32, '#f0e4c4', 'left', 900);
  label(ctx, 'YOUR PERSONAL COLLECTION', 160, 168, 11, '#86c7bd', 'left', 800);
  label(ctx, 'ESC TO CLOSE', 1120, 135, 10, '#a1c6c1', 'right');
  const collection = game.economy.garage;
  if (!collection.length) {
    label(ctx, 'AN EMPTY GARAGE IS AN OPPORTUNITY.', 640, 330, 24, '#e4c58a', 'center', 800);
    label(ctx, 'Bring a vehicle here and press B to add it to your collection.', 640, 369, 14, '#adc6c1', 'center', 400);
    return;
  }
  const item = collection[state.selection];
  const vehicle = createVehicle(item.type, 0, 0, state.previewAngle, item.color);
  const spec = vehicle.spec;
  ctx.save();
  ctx.translate(450, 374);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 190);
  glow.addColorStop(0, '#3f7e8244');
  glow.addColorStop(1, '#14344900');
  ctx.fillStyle = glow;
  ctx.fillRect(-210, -180, 420, 360);
  ctx.strokeStyle = '#476b7044';
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-180, i * 25);
    ctx.lineTo(180, i * 25);
    ctx.moveTo(i * 40, -100);
    ctx.lineTo(i * 40, 100);
    ctx.stroke();
  }
  ctx.scale(3.6, 3.6);
  drawVehicle(ctx, vehicle, game);
  ctx.restore();
  label(ctx, spec.name.toUpperCase(), 746, 286, 25, '#f2d59f', 'left', 800);
  label(ctx, spec.class, 747, 311, 11, '#a2c7c3', 'left', 700);
  const bars = [
    ['TOP SPEED', spec.max / 400],
    ['ACCELERATION', spec.power / 280],
    ['HANDLING', spec.grip / 11],
    ['DURABILITY', spec.mass / 3],
  ];
  bars.forEach(([name, value], index) => {
    const y = 350 + index * 38;
    label(ctx, name, 747, y, 9, '#93b1b4', 'left', 700);
    ctx.fillStyle = '#27434e';
    ctx.fillRect(747, y + 8, 290, 4);
    ctx.fillStyle = '#87cab7';
    ctx.fillRect(747, y + 8, 290 * value, 4);
  });
  label(ctx, `‹     ${state.selection + 1} / ${collection.length}     ›`, 450, 555, 18, '#c5d9c7', 'center', 700);
  label(ctx, 'LEFT / RIGHT TO BROWSE', 450, 580, 9, '#9ebebd', 'center');
  roundRect(ctx, 746, 540, 290, 41, 3, '#d7c699');
  label(ctx, 'ENTER  /  RETRIEVE VEHICLE', 891, 565, 11, '#1a3846', 'center', 800);
}
