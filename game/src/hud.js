import { COLORS } from './config.js';
import { label, roundRect, clamp, distance } from './math.js';
import { districtAt } from './districts.js';
import { formatClock } from './time.js';
import { WEAPONS } from './combat.js';
import { STORY_MISSIONS, currentObjective, objectivePosition } from './missions.js';
import { drawMinimap } from './minimap.js';
import { RADIO_STATIONS } from './audio.js';

function panel(ctx, x, y, w, h, accent = null) {
  roundRect(ctx, x, y, w, h, 6, '#081a27e8');
  ctx.strokeStyle = '#adcbd51b';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (accent) {
    ctx.fillStyle = accent;
    ctx.fillRect(x, y + 6, 3, h - 12);
  }
}

export function drawHUD(ctx, game) {
  drawIdentity(ctx, game);
  drawDistrictBanner(ctx, game);
  drawStatus(ctx, game);
  drawObjective(ctx, game);
  drawMinimap(ctx, game);
  drawSpeedometer(ctx, game);
  drawPrompts(ctx, game);
  drawNotifications(ctx, game);
  drawMissionCard(ctx, game);
  drawReticle(ctx, game);
  if (game.player.hurtFlash > 0) {
    const vignette = ctx.createRadialGradient(640, 360, 130, 640, 360, 740);
    vignette.addColorStop(0, '#d7354d00');
    vignette.addColorStop(1, `rgba(188,30,54,${game.player.hurtFlash * 0.7})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 1280, 720);
  }
  if (game.police.arrest > 0.2) {
    panel(ctx, 500, 454, 280, 37, '#f3b68c');
    label(ctx, 'ARREST IMMINENT — KEEP MOVING', 640, 469, 10, '#f6cc9d', 'center', 800);
    ctx.fillStyle = '#e4a572';
    ctx.fillRect(512, 480, 256 * clamp(game.police.arrest / 3.5, 0, 1), 3);
  }
}

function drawIdentity(ctx, game) {
  // The restrained mark reads at contact-sheet size without covering the game.
  label(ctx, 'MARBELLA', 27, 36, 22, '#f4edd7', 'left', 900);
  label(ctx, 'R U N   2', 28, 53, 11, '#88cabe', 'left', 800);
  const district = districtAt(game.player.x, game.player.y);
  label(ctx, game.shotDistrictBanner?.name || district.name, 27, 83, 11, '#d4dace', 'left', 700);
  label(ctx, `${formatClock(game.clock)}   /   ${game.weather.type}`, 27, 101, 10, '#98b1b9', 'left', 600);
  if (game.weather.type === 'RAIN') {
    ctx.strokeStyle = '#83aebf';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(192 + i * 4, 91);
      ctx.lineTo(189 + i * 4, 99);
      ctx.stroke();
    }
  }
}

function drawDistrictBanner(ctx, game) {
  const district = districtAt(game.player.x, game.player.y);
  if (game.hudDistrictName !== district.name) {
    game.hudDistrictName = district.name;
    game.hudDistrictBanner = {
      name: district.name,
      subtitle: `${district.short.toUpperCase()} DISTRICT — MARBELLA`,
      started: game.clock.elapsed,
    };
  }
  const banner = game.shotDistrictBanner || game.hudDistrictBanner;
  if (!banner) return;
  const age = Math.max(0, game.clock.elapsed - banner.started);
  if (age > 9) return;
  const opacity = Math.min(age * 2, 1, (9 - age) / 1.4);
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  const width = Math.min(930, Math.max(400, banner.name.length * 24, banner.subtitle.length * 10));
  const x = (1280 - width) / 2;
  const y = 535;
  roundRect(ctx, x, y, width, 100, 5, '#081a27b8');
  ctx.fillStyle = '#edca7a';
  ctx.fillRect(640 - 26, y + 13, 52, 2);
  ctx.font = '700 36px Georgia,serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f5ead1';
  ctx.fillText(banner.name, 640, y + 60, width - 30);
  ctx.font = '700 15px Arial,sans-serif';
  ctx.fillStyle = '#afd3ca';
  ctx.fillText(banner.subtitle, 640, y + 84, width - 30);
  ctx.restore();
}

function drawStatus(ctx, game) {
  const stars = Math.ceil(game.heat);
  const flashing = game.police.gainFlash > 0 && Math.sin(game.clock.elapsed * 13) > 0;
  for (let i = 0; i < 5; i++) {
    label(ctx, '★', 1110 + i * 31, 43, 27, i < stars ? flashing ? '#fff3bd' : '#f8ce7f' : '#43535d', 'center', 700);
  }
  if (stars > 0) {
    label(ctx, game.police.seen ? 'PURSUIT ACTIVE' : 'SEARCHING FOR SUSPECT', 1250, 63, 9, '#f0a794', 'right', 800);
  }
  label(ctx, `$${Math.floor(game.economy.displayCash).toLocaleString()}`, 1250, 97, 28, '#a4e4bd', 'right', 800);
  label(ctx, `BANK  $${Math.floor(game.economy.bank).toLocaleString()}`, 1250, 115, 9, '#90adb4', 'right', 600);
  const p = game.player;
  const weapon = WEAPONS[p.weapon];
  const ammo = p.arsenal[p.weapon];
  label(ctx, weapon.name, 1250, 148, 11, '#e4e9dc', 'right', 800);
  if (p.weapon > 0) label(ctx, p.reload > 0 ? 'RELOADING' : `${ammo.ammo}  /  ${ammo.reserve}`, 1250, 170, 19, '#cad4cb', 'right', 700);
  drawWeaponSilhouette(ctx, p.weapon, 1137, 136);
}

function drawWeaponSilhouette(ctx, weapon, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#a5b8ba';
  if (weapon === 0) {
    roundRect(ctx, -4, 0, 13, 12, 3, '#a5b8ba');
    ctx.fillRect(-7, 3, 4, 7);
  } else if (weapon === 1) {
    ctx.fillRect(-12, 0, 26, 5);
    ctx.fillRect(-9, 4, 7, 10);
  } else {
    ctx.fillRect(-25, 1, 48, 5);
    ctx.fillRect(-12, 5, 6, 10);
    ctx.fillRect(-20, -3, 18, 4);
    ctx.fillRect(14, -1, 13, 3);
    if (weapon === 3) ctx.fillRect(-3, -5, 14, 3);
  }
  ctx.restore();
}

function drawObjective(ctx, game) {
  const story = game.story;
  const objective = currentObjective(game);
  const active = story.active !== null;
  const mission = active ? STORY_MISSIONS[story.active] : null;
  const title = game.shotObjective?.title || mission?.title || (game.jobs.active ? game.jobs.active.toUpperCase() : 'THE COAST IS YOURS');
  const text = game.shotObjective?.text || objective?.text || (game.jobs.active ? game.jobs.text : 'Press M to continue Rico’s story.');
  const hasMission = active || game.jobs.active || game.shotObjective;
  const width = Math.min(510, 45 + Math.max(title.length * 6.8, text.length * 6.1));
  const x = 27;
  const y = 128;
  panel(ctx, x, y, width, 78, hasMission ? '#edca7a' : '#73c7b5');
  label(ctx, `${game.shotObjective?.act || (mission ? `ACT ${mission.act}` : game.jobs.active ? 'SIDE HUSTLE' : 'FREE ROAM')}  /  ${title}`, x + 16, y + 23, 11, '#efd29a', 'left', 800);
  label(ctx, text, x + 16, y + 45, 12, '#e0e7dc', 'left', 500);
  const marker = game.shotMarker || objectivePosition(game);
  const range = marker ? `${Math.round(distance(marker, game.player))} m` : game.heat > 0 ? 'BREAK LINE OF SIGHT' : 'OPEN WORLD';
  const timer = game.shotObjective?.timer || (objective?.time ? story.timer : game.jobs.active ? game.jobs.timer : 0);
  label(ctx, range, x + 16, y + 65, 9, '#8abbbd', 'left', 800);
  if (timer > 0) {
    const min = Math.floor(timer / 60);
    const sec = Math.floor(timer % 60);
    label(ctx, `${min}:${String(sec).padStart(2, '0')}`, x + width - 14, y + 64, 16, timer < 20 ? '#ef8c82' : '#f2d390', 'right', 800);
  }
  if (objective?.type === 'heat') {
    ctx.fillStyle = '#efcc80';
    ctx.fillRect(x + 15, y + 73, (width - 30) * clamp(story.progress / objective.duration, 0, 1), 2);
  }
}

function drawSpeedometer(ctx, game) {
  const v = game.player.vehicle;
  if (!v) {
    panel(ctx, 1050, 602, 202, 77);
    label(ctx, 'RICO VELA', 1236, 627, 12, '#e4e6d6', 'right', 800);
    label(ctx, game.player.stamina < 20 ? 'CATCH YOUR BREATH' : 'ON FOOT  /  SHIFT TO SPRINT', 1236, 648, 9, '#91b9b9', 'right');
    ctx.fillStyle = '#6dbca7';
    ctx.fillRect(1065, 662, 170 * game.player.stamina / 100, 3);
    return;
  }
  const speed = Math.round(Math.abs(v.speed) * 0.54);
  panel(ctx, 1047, 571, 205, 109);
  label(ctx, String(speed).padStart(3, '0'), 1165, 630, 49, '#f3ecd8', 'right', 800);
  label(ctx, v.spec.boat ? 'KNOTS' : 'KM/H', 1181, 609, 9, '#95b9bd', 'left', 700);
  label(ctx, v.speed < -2 ? 'R' : Math.max(1, Math.min(6, Math.floor(speed / 38) + 1)), 1213, 633, 22, '#eacb80', 'center', 800);
  label(ctx, v.spec.name.toUpperCase(), 1062, 653, 10, '#b9d5d0', 'left', 700);
  ctx.fillStyle = '#30434b';
  ctx.fillRect(1062, 666, 175, 3);
  ctx.fillStyle = v.health < 35 ? '#e77e70' : '#7ebfad';
  ctx.fillRect(1062, 666, 175 * clamp(v.health / 100, 0, 1), 3);
  for (let i = 0; i < 19; i++) {
    ctx.fillStyle = i < speed / 12 ? i > 14 ? '#e7ba6f' : '#7fcbb9' : '#29444f';
    ctx.fillRect(1063 + i * 9, 582, 6, 4);
  }
  const station = RADIO_STATIONS[game.radio];
  label(ctx, `♫  ${station.name}   [R]`, 1249, 558, 10, station.color, 'right', 700);
}

function drawPrompts(ctx, game) {
  let text = '';
  const e = game.economy;
  if (e.nearest) {
    const p = e.nearest;
    text = e.owned.includes(p.id) ? `[B]  ${p.name}  /  REST & SAVE` : `[B]  BUY ${p.name}  •  $${p.price.toLocaleString()}  •  +$${p.income}/HR`;
  } else if (game.services.nearest) {
    const service = game.services.nearest;
    text = `[L]  ${service.name}  •  $${service.price}  /  ${service.detail.toUpperCase()}`;
  } else if (game.jobs.nearest && !game.jobs.active) text = `[J]  START ${game.jobs.nearest.name}`;
  else if (!game.player.vehicle) {
    const vehicle = game.vehicles.find(v => !v.exploded && distance(v, game.player) < 60);
    if (vehicle) text = `[E]  ${vehicle.ai ? 'TAKE' : 'ENTER'} ${vehicle.spec.name.toUpperCase()}`;
  }
  if (text) {
    ctx.font = 'bold 10px Arial';
    const width = ctx.measureText(text).width + 36;
    panel(ctx, 640 - width / 2, 641, width, 31, '#a3d5bf');
    label(ctx, text, 640, 661, 10, '#e4e9d8', 'center', 800);
  }
  label(ctx, 'E  ENTER / EXIT     M  STORY     H  CONTROLS     ESC  PAUSE', 640, 703, 8.5, '#a1b6b5', 'center', 600);
}

function drawNotifications(ctx, game) {
  const notifications = game.notifications.slice(-2);
  notifications.forEach((n, index) => {
    ctx.save();
    ctx.globalAlpha = clamp(n.life, 0, 1);
    const x = 836;
    const y = 218 + index * 63;
    panel(ctx, x, y, 416, 54, '#83c8c1');
    label(ctx, n.title, x + 13, y + 19, 10, '#a8d9ce', 'left', 800);
    label(ctx, n.text, x + 13, y + 38, 10, '#d8e2d9', 'left', 400);
    ctx.restore();
  });
}

function drawMissionCard(ctx, game) {
  const card = game.story.card;
  if (!card) return;
  const age = game.story.cardAge;
  ctx.save();
  ctx.globalAlpha = Math.min(age * 3, 1, (7 - age) * 2);
  const gradient = ctx.createLinearGradient(200, 0, 1080, 0);
  gradient.addColorStop(0, '#091b2800');
  gradient.addColorStop(0.2, '#091b28e8');
  gradient.addColorStop(0.8, '#091b28e8');
  gradient.addColorStop(1, '#091b2800');
  ctx.fillStyle = gradient;
  ctx.fillRect(200, 270, 880, 125);
  label(ctx, card.passed ? 'MISSION PASSED' : 'MISSION FAILED', 640, 304, 12, card.passed ? '#edcd81' : '#f19187', 'center', 900);
  label(ctx, card.title, 640, 343, 31, '#f1e7cb', 'center', 900);
  label(ctx, card.subtitle, 640, 373, 13, '#b8d8cb', 'center', 500);
  ctx.restore();
}

function drawReticle(ctx, game) {
  if (game.player.vehicle || game.dialog || !game.player.aiming) return;
  const { x, y } = game.input.mouse;
  ctx.save();
  ctx.strokeStyle = '#f2efd7c0';
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
    ctx.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
    ctx.stroke();
  }
  ctx.fillStyle = '#f0d9b4';
  ctx.fillRect(x - 1, y - 1, 2, 2);
  ctx.restore();
}
