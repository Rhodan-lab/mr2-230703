import { COAST } from './config.js';
import { distance, label, glow } from './math.js';
import { createVehicle } from './vehicles.js';
import { beginDialog } from './dialogs.js';

export const STORY_MISSIONS = [
  {
    id: 'homecoming',
    act: 1,
    title: 'A CITY WITH A PRICE',
    speaker: 'marisol',
    reward: 650,
    intro: [
      'Rico Vela. Six years gone and your first call is to me. Some habits survive prison.',
      'Come to my café in Old Mercado. Take a car. This city has grown teeth since you left.',
    ],
    steps: [
      { type: 'goto', x: 610, y: 2260, text: 'Meet Marisol at Café Rico in Old Mercado.' },
      { type: 'goto', x: 840, y: 2520, text: 'Collect your welcome-home envelope at the market.' },
    ],
  },
  {
    id: 'borrowed-sun',
    act: 1,
    title: 'BORROWED SUN',
    speaker: 'marisol',
    reward: 1100,
    intro: [
      'A Sunburst coupe is cooling off behind the Palma Social. The owner owes me a favor. He just does not know it yet.',
      'Bring it to the garage without turning it into modern art.',
    ],
    steps: [
      { type: 'steal', vehicle: 'sunburst', x: 3110, y: 1155, text: 'Steal Marisol’s marked Sunburst coupe.' },
      { type: 'deliver', x: 1175, y: 1730, time: 140, text: 'Deliver the Sunburst to the Vela garage.' },
    ],
  },
  {
    id: 'last-mile',
    act: 1,
    title: 'THE LAST MILE',
    speaker: 'reyes',
    reward: 1800,
    intro: [
      'Captain Reyes. Harbor security. What is in this Parcelvan is a matter of national privacy.',
      'Deliver it before the audit begins. No detours, no questions, no receipts.',
    ],
    steps: [
      { type: 'steal', vehicle: 'parcelvan', x: 3095, y: 2835, text: 'Take Reyes’s sealed Parcelvan at Dockside.' },
      { type: 'deliver', x: 1980, y: 600, time: 105, text: 'Beat the harbor audit. Deliver the sealed cargo.' },
    ],
  },
  {
    id: 'palma-circuit',
    act: 1,
    title: 'PALMA AFTER DARK',
    speaker: 'rico',
    reward: 2400,
    intro: [
      'Marisol says the street crews will not work with a ghost. Fine. Let them see how a ghost drives.',
      'Three blocks, eight corners. The boardwalk belongs to whoever crosses the line first.',
    ],
    steps: [
      { type: 'race', x: 3360, y: 1400, time: 135, text: 'Win the Palma night circuit.', points: [[3360, 1120], [2800, 1120], [2800, 560], [3360, 560], [3360, 1400]] },
    ],
  },
  {
    id: 'heatwave',
    act: 1,
    title: 'HEATWAVE',
    speaker: 'marisol',
    reward: 3100,
    intro: [
      'Reyes needs the patrols looking inland while his ship unloads. Give them something loud to look at.',
      'Get two stars. Keep moving for thirty seconds. Then disappear.',
    ],
    steps: [
      { type: 'heat', stars: 2, duration: 30, text: 'Draw a two-star response and survive 30 seconds.' },
      { type: 'evade', text: 'Break line of sight and lose the police.' },
    ],
  },
  {
    id: 'hostile-takeover',
    act: 2,
    title: 'HOSTILE TAKEOVER',
    speaker: 'sterling',
    reward: 4200,
    intro: [
      'Sterling Vane. I build futures. Occasionally, a truck parks across one.',
      'A competitor has a Haulmax in Dockside. Remove the vehicle from the equation.',
    ],
    steps: [
      { type: 'wreck', vehicle: 'haulmax', x: 2840, y: 3100, text: 'Destroy Vane’s rival cargo truck.' },
      { type: 'goto', x: 2260, y: 870, text: 'Collect payment outside Vane Capital.' },
    ],
  },
  {
    id: 'blue-water',
    act: 2,
    title: 'BLUE WATER, BLACK MONEY',
    speaker: 'reyes',
    reward: 5000,
    intro: [
      'The roads have cameras. The water has me. Borrow the Marlin at the eastern pier.',
      'Take the case beyond the breakwater. If anyone asks, you are giving a sunset tour.',
    ],
    steps: [
      { type: 'steal', vehicle: 'marlin', x: COAST + 150, y: 3130, text: 'Board the marked Marlin speedboat.' },
      { type: 'deliver', x: COAST + 830, y: 2550, time: 110, text: 'Deliver Reyes’s case beyond the breakwater.' },
    ],
  },
  {
    id: 'thin-air',
    act: 2,
    title: 'THIN AIR',
    speaker: 'marisol',
    reward: 6200,
    intro: [
      'Vane bought the city’s debt. Reyes bought the police. Neither bought our silence.',
      'Meet my source on the Mirador roof. The yellow access ring gets you upstairs.',
    ],
    steps: [
      { type: 'rooftop', x: 1155, y: 590, text: 'Reach the Mirador rooftop access. Press E at the ring.' },
      { type: 'evade', text: 'The source was watched. Lose the tail.' },
    ],
  },
  {
    id: 'paper-trail',
    act: 2,
    title: 'THE PAPER TRAIL',
    speaker: 'marisol',
    reward: 7400,
    intro: [
      'The convoy has Vane’s ledger. Two escorts and a delivery van. Hit them at the old freight exchange.',
      'Break the escort, take the van, bring me the truth.',
    ],
    steps: [
      { type: 'convoy', x: 2520, y: 2520, vehicle: 'parcelvan', text: 'Ambush the convoy. Wreck both escort cars.' },
      { type: 'steal', vehicle: 'parcelvan', x: 2520, y: 2520, text: 'Take the ledger van.' },
      { type: 'deliver', x: 610, y: 2260, time: 145, text: 'Bring the ledger to Marisol.' },
    ],
  },
  {
    id: 'vespera-run',
    act: 2,
    title: 'NEEDLE THROUGH THE CITY',
    speaker: 'rico',
    reward: 8600,
    intro: [
      'Four wheels are too obvious. I need the Vespera and a road nobody thinks to close.',
      'Get the ledger copies to the news bureau. Tonight Marbella hears the whole story.',
    ],
    steps: [
      { type: 'steal', vehicle: 'vespera', x: 895, y: 2255, text: 'Take the Vespera motorcycle.' },
      { type: 'deliver', x: 2250, y: 1150, time: 85, text: 'Race the ledger copies to Costa News.' },
    ],
  },
  {
    id: 'air-one',
    act: 3,
    title: 'EYES IN THE RAIN',
    speaker: 'reyes',
    reward: 10000,
    intro: [
      'You should have stayed gone, Vela. Every badge in Marbella has your name now.',
      'Look up. You cannot outrun a shadow when I own the light.',
    ],
    steps: [
      { type: 'heat', stars: 4, duration: 45, text: 'Survive Air One and the tactical response for 45 seconds.' },
      { type: 'evade', text: 'Escape the helicopter search grid.' },
    ],
  },
  {
    id: 'harbor-lockdown',
    act: 3,
    title: 'HARBOR LOCKDOWN',
    speaker: 'marisol',
    reward: 12500,
    intro: [
      'Reyes is burning the evidence. His armored cargo truck is heading for the incinerator.',
      'Stop the truck, Rico. We are past owing favors.',
    ],
    steps: [
      { type: 'wreck', vehicle: 'haulmax', x: 3110, y: 2815, text: 'Destroy Reyes’s evidence truck.' },
      { type: 'heat', stars: 3, duration: 25, text: 'Hold off the harbor response.' },
    ],
  },
  {
    id: 'vane-point',
    act: 3,
    title: 'THE VANE POINT',
    speaker: 'sterling',
    reward: 16000,
    intro: [
      'You think a ledger changes a city? I can buy another ledger. Another captain. Another you.',
      'Come to Costa Heights. Let us negotiate your exit.',
    ],
    steps: [
      { type: 'rooftop', x: 2285, y: 590, text: 'Confront Vane at the Costa Heights rooftop access.' },
      { type: 'steal', vehicle: 'vectora', x: 2275, y: 595, text: 'Take Vane’s Vectora GT and his escape funds.' },
      { type: 'deliver', x: 1175, y: 1730, time: 120, text: 'Deliver the Vectora to your garage.' },
    ],
  },
  {
    id: 'marbella-sunrise',
    act: 3,
    title: 'THE CITY IS OURS',
    speaker: 'rico',
    reward: 25000,
    intro: [
      'Marisol has the ledger. The city has the truth. Reyes still has the harbor.',
      'One last run. Take his launch, beat the blockade, and leave the old Marbella behind.',
    ],
    steps: [
      { type: 'steal', vehicle: 'marlin', x: COAST + 150, y: 3130, text: 'Steal Reyes’s escape launch.' },
      { type: 'heat', stars: 5, duration: 35, text: 'Survive the final five-star harbor lockdown.' },
      { type: 'deliver', x: COAST + 1050, y: 1550, time: 150, text: 'Reach the sunrise rendezvous in open water.' },
      { type: 'evade', text: 'Leave the last of Reyes’s police behind.' },
    ],
  },
];

export function createStory() {
  return {
    completed: 0,
    active: null,
    step: 0,
    timer: 0,
    progress: 0,
    target: null,
    escorts: [],
    checkpoint: 0,
    card: null,
    cardAge: 0,
    retry: null,
  };
}

export function startMission(game, index = game.story.completed) {
  const mission = STORY_MISSIONS[index];
  if (!mission) {
    game.notify('MARBELLA LEGEND', 'All fourteen story missions complete. The city is yours.');
    return;
  }
  if (game.jobs.active) game.jobs.active = null;
  const s = game.story;
  s.active = index;
  s.step = 0;
  s.card = null;
  s.retry = index;
  beginDialog(game, mission.speaker, mission.intro, `ACT ${mission.act}  /  ${mission.title}`);
  prepareObjective(game);
}

export function currentObjective(game) {
  const s = game.story;
  if (s.active === null) return null;
  return STORY_MISSIONS[s.active]?.steps[s.step] || null;
}

export function objectivePosition(game) {
  const objective = currentObjective(game);
  if (!objective) return game.jobs.marker;
  if (objective.type === 'race') {
    const point = objective.points[game.story.checkpoint];
    return point ? { x: point[0], y: point[1] } : objective;
  }
  if (['steal', 'wreck'].includes(objective.type) && game.story.target) return game.story.target;
  return Number.isFinite(objective.x) ? objective : null;
}

function prepareObjective(game) {
  const s = game.story;
  const objective = currentObjective(game);
  if (!objective) return passMission(game);
  s.progress = 0;
  s.timer = objective.time || 0;
  s.checkpoint = 0;
  if (['steal', 'wreck', 'convoy'].includes(objective.type)) {
    const existing = s.target;
    if (!existing || existing.type !== objective.vehicle || existing.exploded || existing.driver && objective.type !== 'steal') {
      s.target = createVehicle(objective.vehicle, objective.x, objective.y, Math.PI / 2);
      s.target.missionTag = 'story';
      game.vehicles.push(s.target);
    }
    if (objective.type === 'convoy') {
      s.target.ai = { direction: 1, cruise: 60, wait: 0, junction: '' };
      s.target.parked = false;
      s.escorts = [-65, 65].map(offset => {
        const v = createVehicle('sunburst', objective.x + offset, objective.y + 20, Math.PI / 2, '#354956');
        v.missionTag = 'escort';
        v.health = 140;
        v.ai = { direction: 1, cruise: 61, wait: 0, junction: '' };
        v.convoyLeader = s.target;
        v.parked = false;
        game.vehicles.push(v);
        return v;
      });
    }
  }
  if (objective.type === 'heat') game.addHeat(objective.stars);
  if (objective.type === 'rooftop') game.notify('ROOFTOP ACCESS', 'Approach the ring and press E.');
}

function advanceObjective(game) {
  game.story.step++;
  game.audio?.play('checkpoint');
  prepareObjective(game);
}

export function updateMissions(game, dt) {
  const s = game.story;
  s.cardAge += dt;
  if (s.card && s.cardAge > 7) s.card = null;
  if (game.input.tap('KeyM') && !game.dialog) {
    if (s.active === null) startMission(game, s.retry ?? s.completed);
    return;
  }
  if (s.active === null || game.dialog || game.shotObjective) return;
  const o = currentObjective(game);
  if (!o) return;
  if (o.time) {
    s.timer -= dt;
    if (s.timer <= 0) return failMission(game, 'The delivery window closed.');
  }
  const player = game.player;
  if (s.target?.exploded && ['steal', 'deliver'].includes(o.type)) return failMission(game, 'The required vehicle was destroyed.');
  let complete = false;
  if (o.type === 'goto') complete = distance(player, o) < 55;
  if (o.type === 'steal') complete = player.vehicle === s.target;
  if (o.type === 'deliver') complete = !!player.vehicle && (!s.target || player.vehicle === s.target) && distance(player, o) < 65 && Math.abs(player.vehicle.speed) < 95;
  if (o.type === 'wreck') complete = !!s.target?.exploded;
  if (o.type === 'convoy') complete = s.escorts.length === 2 && s.escorts.every(v => v.exploded);
  if (o.type === 'evade') complete = game.heat <= 0;
  if (o.type === 'heat') {
    if (Math.ceil(game.heat) >= o.stars) s.progress += dt;
    complete = s.progress >= o.duration;
  }
  if (o.type === 'race') {
    const point = o.points[s.checkpoint];
    if (point && player.vehicle && Math.hypot(player.x - point[0], player.y - point[1]) < 70) {
      s.checkpoint++;
      game.audio?.play('checkpoint');
    }
    complete = s.checkpoint >= o.points.length;
  }
  if (o.type === 'rooftop') {
    complete = distance(player, o) < 62 && game.input.tap('KeyE');
    if (complete) {
      beginRooftopMeeting(game, o);
      game.addHeat(2);
      game.player.arsenal[3].reserve += 90;
    }
  }
  if (complete) advanceObjective(game);
}

function beginRooftopMeeting(game, access) {
  const nearby = game.city.nearBuildings(access.x, access.y);
  nearby.sort((a, b) => distance({ x: a.x + a.w / 2, y: a.y + a.h / 2 }, access) - distance({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, access));
  const building = nearby[0];
  if (!building) return;
  if (game.player.vehicle) {
    game.player.vehicle.driver = false;
    game.player.vehicle = null;
  }
  const speaker = game.story.active === 12 ? 'sterling' : 'marisol';
  const host = game.makePed(building.x + building.w * 0.65, building.y + building.h * 0.45);
  host.rooftopHeight = building.height;
  host.shirt = speaker === 'sterling' ? '#355471' : '#a65d74';
  host.angle = Math.PI;
  game.rooftop = {
    building,
    host,
    returnX: access.x,
    returnY: access.y,
    timer: 1.6,
  };
  game.player.x = building.x + building.w * 0.35;
  game.player.y = building.y + building.h * 0.55;
  game.player.rooftopHeight = building.height;
  game.player.angle = 0;
  game.player.vx = 0;
  game.player.vy = 0;
  const lines = speaker === 'sterling' ? [
    'Look at it, Rico. Every light is a debt. I simply learned to collect.',
    'Keep your skyline, Vane. I am taking the keys. Marbella can settle its own account.',
  ] : [
    'From up here you can almost pretend the city is clean. The ledger says otherwise.',
    'Reyes moves the money. Vane signs the paper. Get me proof, and we give these streets back.',
  ];
  beginDialog(game, speaker, lines, 'ABOVE THE CITY');
}

export function updateRooftopMeeting(game, dt) {
  const meeting = game.rooftop;
  if (!meeting || game.dialog) return;
  meeting.timer -= dt;
  if (meeting.timer > 0) return;
  game.player.x = meeting.returnX;
  game.player.y = meeting.returnY;
  game.player.rooftopHeight = 0;
  game.rooftop = null;
  game.notify('BACK TO THE STREETS', 'The next move is yours.');
}

function passMission(game) {
  const s = game.story;
  const mission = STORY_MISSIONS[s.active];
  s.completed = Math.max(s.completed, s.active + 1);
  game.economy.cash += mission.reward;
  s.card = { passed: true, title: mission.title, subtitle: `+$${mission.reward.toLocaleString()}  •  RESPECT +` };
  s.cardAge = 0;
  s.active = null;
  s.retry = null;
  s.target = null;
  game.audio?.play('passed');
  game.save();
}

export function failMission(game, reason) {
  const s = game.story;
  if (s.active === null) return;
  s.card = { passed: false, title: 'MISSION FAILED', subtitle: `${reason}  Press M to retry.` };
  s.cardAge = 0;
  s.retry = s.active;
  s.active = null;
  game.audio?.play('failed');
}

export function drawMissionMarker(ctx, game) {
  const point = game.shotMarker || objectivePosition(game);
  if (!point) return;
  const t = game.clock.elapsed;
  const color = '#f3cc78';
  glow(ctx, point.x, point.y, 46, '#ffd27028');
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = -t * 18;
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, 33 + Math.sin(t * 2) * 2, 20, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(point.x, point.y - 37 + Math.sin(t * 2) * 4);
  ctx.lineTo(point.x - 8, point.y - 48 + Math.sin(t * 2) * 4);
  ctx.lineTo(point.x + 8, point.y - 48 + Math.sin(t * 2) * 4);
  ctx.fill();
  ctx.restore();
}
