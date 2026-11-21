import { BLOCK, COAST } from './config.js';
import { districtAt, DISTRICTS } from './districts.js';
import { distance, label, glow } from './math.js';
import { hash } from './random.js';

export const LANDMARKS = [
  { id: 'mirador', name: 'MIRADOR OVERLOOK', x: 560, y: 560, reward: 200 },
  { id: 'mercado', name: 'MERCADO DE LA LUNA', x: 840, y: 2520, reward: 200 },
  { id: 'palma', name: 'PALMA PROMENADE', x: 3360, y: 840, reward: 200 },
  { id: 'port', name: 'PUERTO MARBELLA', x: 3500, y: 3200, reward: 200 },
  { id: 'costa', name: 'COSTA HEIGHTS', x: 2240, y: 560, reward: 200 },
  { id: 'greenfield', name: 'GREENFIELD FOUNTAINS', x: 560, y: 1120, reward: 200 },
  { id: 'capital', name: 'VANE CAPITAL TOWER', x: 1960, y: 1120, reward: 200 },
];

export function createDiscoveries() {
  const packages = [];
  for (let i = 0; i < 28; i++) {
    const col = 1 + i % 10;
    const row = 1 + Math.floor(i / 2) % 12;
    packages.push({
      id: i,
      x: col * BLOCK + 52,
      y: row * BLOCK + 75 + hash(i, 51) * 130,
      found: false,
    });
  }
  return {
    districts: [],
    landmarks: [],
    packages,
    packageCount: 0,
    banner: null,
    bannerAge: 0,
    achievementKeys: [],
    totalRewards: 0,
    lastDistrict: null,
    driftRewardCooldown: 0,
  };
}

export function updateDiscoveries(game, dt) {
  const d = game.discoveries;
  d.bannerAge += dt;
  d.driftRewardCooldown = Math.max(0, d.driftRewardCooldown - dt);
  if (game.shot || game.dialog) return;
  const district = districtAt(game.player.x, game.player.y);
  if (d.lastDistrict !== district.name) {
    d.lastDistrict = district.name;
    d.banner = district.name;
    d.bannerAge = 0;
  }
  if (!d.districts.includes(district.name)) {
    d.districts.push(district.name);
    game.economy.cash += 100;
    d.totalRewards += 100;
    if (d.districts.length === DISTRICTS.length) awardAchievement(game, 'city', 'EVERY CORNER', 'Discovered all seven Marbella districts.', 1800);
  }
  for (const landmark of LANDMARKS) {
    if (d.landmarks.includes(landmark.id) || distance(game.player, landmark) > 75) continue;
    d.landmarks.push(landmark.id);
    game.economy.cash += landmark.reward;
    d.totalRewards += landmark.reward;
    game.notify('LANDMARK DISCOVERED', `${landmark.name} • +$${landmark.reward}`);
  }
  for (const item of d.packages) {
    if (item.found || distance(item, game.player) > 21) continue;
    item.found = true;
    d.packageCount++;
    const reward = 150 + d.packageCount * 25;
    game.economy.cash += reward;
    d.totalRewards += reward;
    game.fx.pop(`HIDDEN STASH ${d.packageCount}/28 +$${reward}`, item.x, item.y - 17, '#b9dfb5');
    game.audio?.play('pickup');
    if (d.packageCount === 28) awardAchievement(game, 'stashes', 'NOTHING STAYS HIDDEN', 'Recovered all 28 hidden stashes.', 8000);
  }
  if (game.stats.maximumSpeed > 340) awardAchievement(game, 'speed', 'COSTA LIGHTNING', 'Reach 184 km/h on a Marbella street.', 750);
  if (game.stats.longestDrift > 3) awardAchievement(game, 'drift', 'SIDEWAYS HOME', 'Hold a high-speed drift for three seconds.', 500);
  if (game.stats.waterDistance > 3000) awardAchievement(game, 'water', 'BLUE HORIZON', 'Travel three kilometers by speedboat.', 800);
  if (game.economy.owned.length === 6) awardAchievement(game, 'empire', 'THE COAST IS YOURS', 'Own all six properties.', 6000);
  if (game.jobs.completed >= 5) awardAchievement(game, 'hustler', 'ALWAYS WORKING', 'Complete five side hustles.', 1500);
}

function awardAchievement(game, id, name, description, cash) {
  const d = game.discoveries;
  if (d.achievementKeys.includes(id)) return;
  d.achievementKeys.push(id);
  d.totalRewards += cash;
  game.economy.cash += cash;
  game.notify(`MILESTONE / ${name}`, `${description} +$${cash}`);
  game.audio?.play('passed');
}

export function drawDiscoveries(ctx, game) {
  const d = game.discoveries;
  for (const item of d.packages) {
    if (item.found || distance(item, game.player) > 450) continue;
    const pulse = 0.6 + Math.sin(game.clock.elapsed * 3 + item.id) * 0.2;
    ctx.save();
    ctx.globalAlpha = pulse;
    glow(ctx, item.x, item.y, 14, '#c6d99c44');
    ctx.fillStyle = '#a7b77c';
    ctx.fillRect(item.x - 4, item.y - 3, 8, 6);
    ctx.fillStyle = '#e5ddae';
    ctx.fillRect(item.x - 1, item.y - 3, 2, 6);
    ctx.restore();
  }
}

export function drawDistrictBanner(ctx, game) {
  const d = game.discoveries;
  if (!d.banner || d.bannerAge > 4 || game.shot) return;
  ctx.save();
  ctx.globalAlpha = Math.min(d.bannerAge * 2, 1, (4 - d.bannerAge) * 2);
  label(ctx, 'NOW ENTERING', 1018, 493, 9, '#9fc6c1', 'right', 600);
  label(ctx, d.banner, 1018, 520, 22, '#e9d7b3', 'right', 800);
  ctx.restore();
}
