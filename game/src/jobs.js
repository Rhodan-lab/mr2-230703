import { COAST } from './config.js';
import { distance, label, glow } from './math.js';

export const SIDE_JOBS = [
  { id: 'race', name: 'BOARDWALK CIRCUIT', x: 3360, y: 1960, key: 'KeyJ', reward: 1600 },
  { id: 'rampage', name: 'DOCKSIDE RAMPAGE', x: 2840, y: 3100, key: 'KeyJ', reward: 2200 },
  { id: 'taxi', name: 'COAST CAB SHIFT', x: 1735, y: 1150, key: 'KeyJ', reward: 800 },
  { id: 'tour', name: 'MARLIN BOAT TOURS', x: COAST + 145, y: 3130, key: 'KeyJ', reward: 1400 },
];

const FARES = [
  { name: 'A nurse running late', pickup: [1735, 1150], destination: [560, 1400], tip: 250 },
  { name: 'A musician with a broken amp', pickup: [610, 1429], destination: [1120, 2520], tip: 180 },
  { name: 'A tourist chasing the sunset', pickup: [1175, 2550], destination: [3360, 1680], tip: 340 },
  { name: 'A chef with a secret recipe', pickup: [3375, 1710], destination: [840, 2260], tip: 260 },
  { name: 'Someone who says very little', pickup: [895, 2250], destination: [2240, 560], tip: 600 },
];

const CIRCUIT = [[3360, 1400], [3080, 1400], [3080, 840], [3360, 840], [3360, 1960]];
const TOUR = [[COAST + 380, 2950], [COAST + 700, 2550], [COAST + 950, 2900], [COAST + 600, 3450], [COAST + 150, 3130]];

export function createJobs() {
  return {
    active: null,
    stage: 0,
    timer: 0,
    marker: null,
    fareState: 'pickup',
    fareStart: 0,
    tips: 0,
    score: 0,
    wrecksBefore: 0,
    completed: 0,
    text: '',
    nearest: null,
  };
}

export function startSideJob(game, id) {
  if (game.story.active !== null) {
    game.notify('FINISH YOUR STORY OBJECTIVE', 'Side work will still be here.');
    return false;
  }
  const j = game.jobs;
  const v = game.player.vehicle;
  if (id === 'taxi' && v?.type !== 'taxi') {
    game.notify('COAST CAB', 'Bring a Coast Cab to begin a five-fare shift.');
    return false;
  }
  if (id === 'tour' && !v?.spec.boat) {
    game.notify('MARLIN TOURS', 'Board a speedboat to begin a guided tour.');
    return false;
  }
  if (id === 'race' && !v) {
    game.notify('BOARDWALK CIRCUIT', 'Bring a car or motorcycle to the starting grid.');
    return false;
  }
  j.active = id;
  j.stage = 0;
  j.tips = 0;
  j.score = 0;
  j.fareState = 'pickup';
  j.timer = id === 'race' ? 145 : id === 'taxi' ? 480 : id === 'tour' ? 220 : 75;
  j.wrecksBefore = game.vehicles.filter(car => car.exploded).length;
  if (id === 'rampage') {
    game.player.weapon = 4;
    game.player.arsenal[4].reserve += 80;
    game.addHeat(2);
  }
  game.notify(SIDE_JOBS.find(job => job.id === id).name, 'Job started. Follow the gold marker.');
  return true;
}

export function updateSideJobs(game, dt) {
  const j = game.jobs;
  j.nearest = SIDE_JOBS.find(job => distance(job, game.player) < 100) || null;
  if (game.input.tap('KeyJ') && j.nearest && !j.active) startSideJob(game, j.nearest.id);
  if (!j.active || game.dialog) return;
  j.timer -= dt;
  if (j.timer <= 0) {
    if (j.active === 'rampage' && j.score >= 4) finishJob(game);
    else cancelJob(game, 'Time ran out. Come back for another try.');
    return;
  }
  const p = game.player;
  if (j.active === 'race' || j.active === 'tour') {
    const route = j.active === 'race' ? CIRCUIT : TOUR;
    const point = route[j.stage];
    j.marker = { x: point[0], y: point[1] };
    j.text = `${j.active === 'race' ? 'Checkpoint' : 'Scenic stop'} ${j.stage + 1} / ${route.length}`;
    if (p.vehicle && distance(p, j.marker) < 75) {
      j.stage++;
      game.audio?.play('checkpoint');
      if (j.stage >= route.length) return finishJob(game);
      if (j.active === 'tour') {
        const narration = ['The old lighthouse still guides the fishing boats.', 'Costa Heights. Every balcony has a secret.', 'The reef is protected. The money offshore is not.', 'Reyes says he owns the harbor. The sea disagrees.'];
        game.notify('YOUR CAPTAIN SPEAKING', narration[(j.stage - 1) % narration.length]);
      }
    }
  }
  if (j.active === 'taxi') {
    if (p.vehicle?.type !== 'taxi') {
      j.text = 'Return to your Coast Cab to continue the shift.';
      return;
    }
    const fare = FARES[j.stage];
    const point = j.fareState === 'pickup' ? fare.pickup : fare.destination;
    j.marker = { x: point[0], y: point[1] };
    p.vehicle.fare = j.fareState === 'deliver';
    j.text = `${j.stage + 1}/5 • ${j.fareState === 'pickup' ? 'Pick up' : 'Deliver'}: ${fare.name}`;
    if (distance(p, j.marker) < 48 && Math.abs(p.vehicle.speed) < 16) {
      if (j.fareState === 'pickup') {
        j.fareState = 'deliver';
        j.fareStart = j.timer;
        game.audio?.play('door');
        game.notify('PASSENGER ABOARD', fare.name);
      } else {
        const duration = j.fareStart - j.timer;
        const tip = duration < 70 ? fare.tip : Math.floor(fare.tip * 0.3);
        const pay = 150 + tip;
        j.tips += pay;
        game.economy.cash += pay;
        game.fx.pop(`FARE +$${pay}`, p.x, p.y - 35);
        game.audio?.play('pickup');
        j.stage++;
        j.fareState = 'pickup';
        p.vehicle.fare = false;
        if (j.stage >= FARES.length) return finishJob(game);
      }
    }
  }
  if (j.active === 'rampage') {
    j.score = game.vehicles.filter(v => v.exploded).length - j.wrecksBefore;
    j.text = `Wreck vehicles: ${j.score}/4 • survive the response`;
    j.marker = null;
  }
}

function finishJob(game) {
  const j = game.jobs;
  const info = SIDE_JOBS.find(job => job.id === j.active);
  const bonus = j.active === 'race' ? Math.floor(j.timer * 8) : j.active === 'tour' ? Math.floor(j.timer * 4) : 0;
  game.economy.cash += info.reward + bonus;
  j.completed++;
  game.story.card = { passed: true, title: `${info.name} COMPLETE`, subtitle: `+$${info.reward + bonus}  •  SIDE HUSTLE ${j.completed}` };
  game.story.cardAge = 0;
  game.audio?.play('passed');
  j.active = null;
  j.marker = null;
  game.save();
}

export function cancelJob(game, reason) {
  game.jobs.active = null;
  game.jobs.marker = null;
  game.notify('SHIFT ENDED', reason);
}

export function drawSideJobs(ctx, game) {
  if (game.jobs.active || game.story.active !== null) return;
  const icons = { race: '⚑', rampage: '!', taxi: 'T', tour: '≈' };
  for (const job of SIDE_JOBS) {
    if (distance(job, game.player) > 850) continue;
    const y = job.y - 22;
    glow(ctx, job.x, job.y, 26, '#75d7c32c');
    ctx.strokeStyle = '#8cd9c5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(job.x, y, 12, 0, Math.PI * 2);
    ctx.stroke();
    label(ctx, icons[job.id], job.x, y + 5, 14, '#9ee5ca', 'center');
  }
}
