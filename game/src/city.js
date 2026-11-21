import { BLOCK, ROAD, COLS, ROWS, CITY_W, CITY_H, COAST, WORLD_W, WORLD_H, TAU } from './config.js';
import { createRandom, hash, choose } from './random.js';
import { districtAt, STREET_NAMES } from './districts.js';
import { circleRect, segmentRect, polygon, label, glow } from './math.js';

const ROOF_STYLES = ['aircon', 'helipad', 'water', 'skylight', 'solar', 'billboard', 'terrace', 'antenna', 'garden'];
const SHOP_NAMES = ['LUNA', 'SOL MAR', 'VELOCE', 'AZUL', 'CASA VELA', 'NOCHE', 'MERCADO', 'PALMA', 'HOTEL MIRADOR', 'REYES IMPORTS', 'CAFÉ RICO', 'MARBELLA SOCIAL'];

export function createCity(seed = 260621) {
  const random = createRandom(seed);
  const buildings = [];
  const trees = [];
  const parks = [];
  const lamps = [];
  const containers = [];
  const beaches = [];
  let id = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const district = districtAt(col * BLOCK + 100, row * BLOCK + 100);
      const x = col * BLOCK + ROAD / 2 + 17;
      const y = row * BLOCK + ROAD / 2 + 17;
      const park = district.short === 'Greenfield' && (col + row) % 3 === 0;
      if (park) {
        parks.push({ x, y, w: 158, h: 158, lake: (col + row) % 2 === 0 });
        for (let i = 0; i < 14; i++) trees.push({ x: x + 12 + random() * 138, y: y + 10 + random() * 138, palm: false, scale: 0.8 + random() * 0.5 });
      } else {
        const tower = district.short === 'Downtown';
        const split = random() > 0.18;
        for (let by = 0; by < 2; by++) {
          for (let bx = 0; bx < (split ? 2 : 1); bx++) {
            const w = split ? 68 + random() * 10 : 155;
            const h = 64 + random() * 16;
            const building = {
              id: id++,
              x: x + bx * 86,
              y: y + by * 87,
              w,
              h,
              height: tower ? 28 + random() * 75 : 13 + random() * 33,
              district,
              roof: choose(random, ROOF_STYLES),
              sign: SHOP_NAMES[id % SHOP_NAMES.length],
              tint: 0.8 + random() * 0.35,
              lit: random() > 0.3,
              construction: col === 6 && row === 4 && bx === 0 && by === 0,
            };
            buildings.push(building);
          }
        }
      }
      // Trees are strictly on sidewalk bands, never in the carriageway.
      for (let i = 0; i < 3; i++) {
        if (random() > 0.25) trees.push({ x: col * BLOCK + 55, y: row * BLOCK + 80 + i * 60, palm: col > 8, scale: 0.85 + random() * 0.3 });
      }
      lamps.push({ x: col * BLOCK + 48, y: row * BLOCK + 42 });
      lamps.push({ x: col * BLOCK + 223, y: row * BLOCK + 235 });
    }
  }
  // A taller signature tower and working crane anchor the downtown skyline.
  const signature = buildings.find(b => b.construction);
  if (signature) {
    signature.height = 94;
    signature.w = 78;
    signature.roof = 'construction';
  }
  for (let y = 80; y < 2850; y += 85) {
    trees.push({ x: CITY_W + 62, y, palm: true, scale: 1.2 });
    beaches.push({ x: CITY_W + 110 + random() * 65, y: y + random() * 45, color: choose(random, ['#f07e73', '#62b4c0', '#f4d78e', '#f3ece0']), angle: random() * TAU });
  }
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      containers.push({ x: 3060 + col * 62, y: 2975 + row * 61, w: 52, h: 26, color: choose(random, ['#b75e4e', '#487a87', '#cca961', '#6c8b7e', '#717792']), stack: row % 2 });
    }
  }
  const bins = new Map();
  for (const b of buildings) {
    const key = `${Math.floor(b.x / BLOCK)},${Math.floor(b.y / BLOCK)}`;
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key).push(b);
  }
  function nearBuildings(x, y) {
    const result = [];
    const bx = Math.floor(x / BLOCK);
    const by = Math.floor(y / BLOCK);
    for (let ix = -1; ix <= 1; ix++) {
      for (let iy = -1; iy <= 1; iy++) result.push(...(bins.get(`${bx + ix},${by + iy}`) || []));
    }
    return result;
  }
  function collision(x, y, radius = 10) {
    if (x < -35 || y < -35 || x > WORLD_W || y > WORLD_H) return true;
    return nearBuildings(x, y).some(b => circleRect(x, y, radius, b));
  }
  function lineOfSight(a, b) {
    const steps = Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 90);
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(1, steps);
      if (collision(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2)) return false;
    }
    return true;
  }
  function isRoad(x, y) {
    if (x > CITY_W + 45 || x < -44 || y < -44 || y > CITY_H + 44) return false;
    const rx = ((x % BLOCK) + BLOCK) % BLOCK;
    const ry = ((y % BLOCK) + BLOCK) % BLOCK;
    return rx < 44 || rx > BLOCK - 44 || ry < 44 || ry > BLOCK - 44;
  }
  function isWater(x, y) {
    if (x < COAST) return false;
    // Solid piers interrupt the water; ramps are at their tips.
    if (x < COAST + 245 && y > 3070 && y < 3100) return false;
    if (x < COAST + 210 && y > 3350 && y < 3380) return false;
    return true;
  }
  return { seed, buildings, trees, parks, lamps, containers, beaches, collision, nearBuildings, lineOfSight, isRoad, isWater };
}

export function visible(object, bounds, margin = 160) {
  return object.x > bounds.left - margin && object.x < bounds.right + margin && object.y > bounds.top - margin && object.y < bounds.bottom + margin;
}

export function drawGround(ctx, game, bounds) {
  const night = game.light.night;
  ctx.fillStyle = night > 0.5 ? '#182931' : '#8b9e86';
  ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  drawOcean(ctx, game, bounds);
  ctx.fillStyle = night > 0.5 ? '#334442' : '#bdbbaa';
  ctx.fillRect(-45, -45, CITY_W + 95, CITY_H + 90);
  const roadColor = night > 0.5 ? '#17252e' : game.weather.wet > 0.5 ? '#39464d' : '#515e64';
  ctx.fillStyle = roadColor;
  for (let x = 0; x <= CITY_W; x += BLOCK) ctx.fillRect(x - 44, -44, 88, CITY_H + 88);
  for (let y = 0; y <= CITY_H; y += BLOCK) ctx.fillRect(-44, y - 44, CITY_W + 88, 88);
  ctx.save();
  ctx.strokeStyle = night > 0.5 ? '#314048' : '#728087';
  ctx.lineWidth = 1;
  // Curbs and seams give the city a textured, constructed scale.
  for (let x = Math.max(0, Math.floor(bounds.left / BLOCK) * BLOCK); x < Math.min(CITY_W, bounds.right + BLOCK); x += BLOCK) {
    for (let y = Math.max(0, Math.floor(bounds.top / BLOCK) * BLOCK); y < Math.min(CITY_H, bounds.bottom + BLOCK); y += BLOCK) {
      ctx.strokeRect(x + 45, y + 45, 190, 190);
      ctx.strokeStyle = night > 0.5 ? '#2c4145' : '#a8aa9e';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 45, y + 45 + i * 24);
        ctx.lineTo(x + 60, y + 45 + i * 24);
        ctx.stroke();
      }
      ctx.strokeStyle = night > 0.5 ? '#42515a' : '#a2a99f';
      ctx.setLineDash([13, 13]);
      ctx.beginPath();
      ctx.moveTo(x + 57, y);
      ctx.lineTo(x + 223, y);
      ctx.moveTo(x, y + 57);
      ctx.lineTo(x, y + 223);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#baa36c';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(x + 51, y - 3);
      ctx.lineTo(x + 229, y - 3);
      ctx.moveTo(x + 51, y + 3);
      ctx.lineTo(x + 229, y + 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
      drawCrosswalk(ctx, x, y, night);
      if ((x / BLOCK + y / BLOCK) % 2 === 0) {
        ctx.save();
        ctx.translate(x + 98, y - 23);
        label(ctx, STREET_NAMES[(x / BLOCK + y / BLOCK) % STREET_NAMES.length], 0, 0, 5.5, night > 0.5 ? '#728990' : '#ccd1c5', 'left', 600);
        ctx.restore();
      }
    }
  }
  ctx.restore();
  drawParks(ctx, game, bounds);
  drawBeach(ctx, game, bounds);
  drawDocks(ctx, game, bounds);
}

function drawCrosswalk(ctx, x, y, night) {
  ctx.fillStyle = night > 0.5 ? '#607078' : '#d0d3c8';
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < 7; i++) {
    ctx.fillRect(x - 32 + i * 10, y - 49, 5, 12);
    ctx.fillRect(x - 32 + i * 10, y + 37, 5, 12);
    ctx.fillRect(x - 49, y - 32 + i * 10, 12, 5);
    ctx.fillRect(x + 37, y - 32 + i * 10, 12, 5);
  }
  ctx.globalAlpha = 1;
}

function drawOcean(ctx, game, bounds) {
  const night = game.light.night;
  const golden = game.light.golden;
  ctx.fillStyle = night > 0.5 ? '#092b3c' : golden > 0.25 ? '#449a9d' : '#389cae';
  ctx.fillRect(COAST, bounds.top - 20, WORLD_W, bounds.bottom - bounds.top + 40);
  const t = game.clock.elapsed;
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const x = COAST + i * 28 + Math.sin(t * 0.8 + i) * 8;
    ctx.strokeStyle = i < 3 ? 'rgba(222,245,231,.55)' : 'rgba(174,231,225,.16)';
    ctx.lineWidth = i < 3 ? 3 : 1;
    ctx.beginPath();
    for (let y = bounds.top - 30; y <= bounds.bottom + 30; y += 12) {
      const wave = Math.sin(y * 0.025 + t * 1.2 + i * 1.7) * (5 + i * 0.6);
      if (y === bounds.top - 30) ctx.moveTo(x + wave, y);
      else ctx.lineTo(x + wave, y);
    }
    ctx.stroke();
  }
  // Tiny wind streaks and sun glitter use stable world coordinates.
  for (let i = 0; i < 180; i++) {
    const x = COAST + hash(i, 3) * 1400;
    const y = Math.floor(bounds.top / 700) * 700 + hash(i, 12) * 1450;
    const shimmer = Math.sin(t * 2 + i * 5) * 0.5 + 0.5;
    ctx.globalAlpha = shimmer * (golden > 0.2 ? 0.6 : 0.24);
    ctx.fillStyle = golden > 0.2 ? '#ffe1a0' : '#d0eeee';
    ctx.fillRect(x, y, 4 + hash(i) * 18, 1.4);
  }
  ctx.restore();
}

function drawBeach(ctx, game, bounds) {
  if (bounds.right < CITY_W) return;
  const night = game.light.night;
  ctx.fillStyle = night > 0.5 ? '#6b6d60' : game.light.golden > 0.2 ? '#e3b981' : '#e4d0a3';
  ctx.fillRect(CITY_W + 47, -60, COAST - CITY_W - 47, 3000);
  ctx.fillStyle = night > 0.5 ? '#879181' : '#e3dfc5';
  ctx.fillRect(CITY_W + 47, 0, 30, 2940);
  ctx.strokeStyle = 'rgba(122,119,98,.3)';
  for (let y = Math.floor(bounds.top / 18) * 18; y < bounds.bottom; y += 18) {
    ctx.beginPath();
    ctx.moveTo(CITY_W + 47, y);
    ctx.lineTo(CITY_W + 77, y);
    ctx.stroke();
  }
  for (const item of game.city.beaches) {
    if (!visible(item, bounds, 40)) continue;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle);
    ctx.fillStyle = 'rgba(31,54,52,.2)';
    ctx.beginPath();
    ctx.ellipse(-8, 8, 15, 10, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = item.color;
    ctx.fillRect(19, -6, 11, 22);
    ctx.fillStyle = '#e6d9bc';
    ctx.fillRect(20, -2, 9, 2);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? item.color : '#f9e6c4';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 13, i * TAU / 8, (i + 1) * TAU / 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#fff4d1';
    ctx.fillRect(-1, -1, 2, 3);
    ctx.restore();
  }
}

function drawParks(ctx, game, bounds) {
  for (const park of game.city.parks) {
    if (!visible(park, bounds, 220)) continue;
    ctx.fillStyle = game.light.night > 0.5 ? '#214638' : '#739e6a';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.strokeStyle = '#b6b99a';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(park.x, park.y + 79);
    ctx.lineTo(park.x + park.w, park.y + 79);
    ctx.stroke();
    if (park.lake) {
      ctx.fillStyle = '#568f94';
      ctx.beginPath();
      ctx.ellipse(park.x + 80, park.y + 80, 43, 29, -0.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#b6e2dc';
      ctx.lineWidth = 2;
      const phase = game.clock.elapsed % 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(park.x + 80, park.y + 80, 7 + i * 9 + phase * 8, 3 + i * 5 + phase * 4, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = '#d7f3e9';
      ctx.fillRect(park.x + 79, park.y + 64, 3, 15);
    }
  }
}

function drawDocks(ctx, game, bounds) {
  if (bounds.bottom < 2900 || bounds.right < 2900) return;
  ctx.fillStyle = game.light.night > 0.5 ? '#354549' : '#a3aaa1';
  ctx.fillRect(3000, 2910, COAST - 3000, 750);
  for (const y of [3070, 3350]) {
    ctx.fillStyle = '#a48d6c';
    ctx.fillRect(COAST - 40, y, 285, 30);
    ctx.fillStyle = '#4d5854';
    for (let x = COAST - 36; x < COAST + 245; x += 14) ctx.fillRect(x, y, 2, 30);
    ctx.fillStyle = '#eee1ac';
    for (let x = COAST - 25; x < COAST + 230; x += 55) ctx.fillRect(x, y + 3, 5, 5);
  }
  for (const container of game.city.containers) {
    if (!visible(container, bounds)) continue;
    const { x, y, w, h, color } = container;
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.fillRect(x + 5, y + 6, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    for (let offset = 4; offset < w; offset += 5) ctx.fillRect(x + offset, y + 2, 2, h - 4);
    label(ctx, 'MRL', x + 13, y + 17, 7, '#e0d9bf');
  }
  drawCrane(ctx, 3400, 3180, 115, game.clock.elapsed, true);
  label(ctx, 'PUERTO MARBELLA', 3100, 3292, 18, '#d5d9c5', 'left', 800);
  for (let i = 0; i < 9; i++) {
    const x = COAST + 100 + i * 63;
    const y = 2940 + Math.sin(game.clock.elapsed * 0.7 + i * 2) * 40 + (i % 3) * 110;
    const flap = Math.sin(game.clock.elapsed * 5 + i) * 4;
    ctx.strokeStyle = '#e6eee6';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - flap);
    ctx.quadraticCurveTo(x - 2, y - 2, x, y + 1);
    ctx.quadraticCurveTo(x + 2, y - 2, x + 6, y - flap);
    ctx.stroke();
  }
}

export function drawBuildingShadow(ctx, building, light) {
  const b = building;
  const dx = light.shadowX * b.height;
  const dy = light.shadowY * b.height;
  polygon(ctx, [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w + dx, b.y + b.h + dy], [b.x + dx, b.y + b.h + dy]], `rgba(3,16,27,${light.shadowAlpha})`);
}

export function drawBuilding(ctx, b, game) {
  const night = game.light.night;
  const ex = -b.height * 0.28;
  const ey = -b.height * 0.62;
  const x = b.x + ex;
  const y = b.y + ey;
  const w = b.w;
  const h = b.h;
  const front = night > 0.5 ? '#233b4b' : b.district.color;
  const side = night > 0.5 ? '#172d3d' : '#7d929b';
  polygon(ctx, [[b.x, b.y + h], [b.x + w, b.y + h], [x + w, y + h], [x, y + h]], front);
  polygon(ctx, [[b.x + w, b.y], [b.x + w, b.y + h], [x + w, y + h], [x + w, y]], side);
  // Window grids are individual illuminated cells, not a flat facade texture.
  const floors = Math.max(1, Math.floor(b.height / 11));
  for (let floor = 0; floor < floors; floor++) {
    const p = (floor + 0.45) / floors;
    const wx = b.x + ex * p;
    const wy = b.y + h + ey * p;
    for (let offset = 7; offset < w - 4; offset += 11) {
      const lit = hash(b.id + offset, floor) > 0.34;
      ctx.fillStyle = night > 0.5 ? lit ? '#e9c57f' : '#385365' : '#476477';
      ctx.globalAlpha = night > 0.5 && lit ? 0.8 : 0.7;
      ctx.fillRect(wx + offset, wy - 4, 5.5, 4.3);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = night > 0.5 ? '#3a5262' : b.district.roof;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = night > 0.5 ? '#657b87' : '#e0d9bd';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = night > 0.5 ? '#2b4352' : '#8a9b9c';
  ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
  drawRooftop(ctx, b, x, y, game);
  if (b.height < 62 && b.lit) {
    const color = b.district.neon;
    ctx.fillStyle = '#142734';
    ctx.fillRect(x + 5, y + h - 3, w - 10, 13);
    if (night > 0.5) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 11;
    }
    label(ctx, b.sign, x + w / 2, y + h + 6, Math.min(8, (w - 12) / b.sign.length * 1.25), night > 0.5 ? color : '#fff0ce', 'center', 800);
    ctx.shadowBlur = 0;
    if (night > 0.5) {
      glow(ctx, b.x + w / 2, b.y + h + 12, 43, color + '48');
      if (game.weather.wet > 0.4) {
        ctx.save();
        ctx.globalAlpha = 0.17;
        ctx.fillStyle = color;
        for (let i = 0; i < 5; i++) ctx.fillRect(b.x + 8 - i * 3, b.y + h + 12 + i * 7, w - 16 + i * 6, 3);
        ctx.restore();
      }
    }
  }
  if (b.construction) drawCrane(ctx, b.x + w * 0.6, b.y + 40, b.height + 55, game.clock.elapsed, false);
}

function drawRooftop(ctx, b, x, y, game) {
  const cx = x + b.w / 2;
  const cy = y + b.h / 2;
  const dark = game.light.night > 0.5;
  switch (b.roof) {
    case 'helipad':
      ctx.strokeStyle = '#d3d1ae';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.min(b.w, b.h) * 0.34, Math.min(b.w, b.h) * 0.3, 0, 0, TAU);
      ctx.stroke();
      label(ctx, 'H', cx, cy + 8, 22, '#ded9b6', 'center', 700);
      break;
    case 'water':
      ctx.fillStyle = '#333f45';
      ctx.fillRect(cx - 10, cy + 7, 3, 13);
      ctx.fillRect(cx + 7, cy + 7, 3, 13);
      ctx.fillStyle = dark ? '#66767e' : '#b8b9aa';
      ctx.fillRect(cx - 14, cy - 13, 28, 25);
      ctx.beginPath();
      ctx.ellipse(cx, cy - 13, 14, 6, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#3c535c';
      ctx.strokeRect(cx - 14, cy - 8, 28, 16);
      break;
    case 'solar':
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#223e5b';
        ctx.fillRect(x + 12, y + 12 + i * 15, b.w - 24, 11);
        ctx.strokeStyle = '#6f99b1';
        ctx.lineWidth = 0.7;
        for (let j = 0; j < 4; j++) ctx.strokeRect(x + 12 + j * (b.w - 24) / 4, y + 12 + i * 15, (b.w - 24) / 4, 11);
      }
      break;
    case 'skylight':
      polygon(ctx, [[cx - 20, cy + 12], [cx - 20, cy - 8], [cx, cy - 17], [cx + 20, cy - 8], [cx + 20, cy + 12]], '#416f82');
      ctx.strokeStyle = '#a2bab8';
      for (let i = -15; i <= 15; i += 10) {
        ctx.beginPath();
        ctx.moveTo(cx + i, cy - 10);
        ctx.lineTo(cx + i, cy + 12);
        ctx.stroke();
      }
      break;
    case 'billboard':
      ctx.fillStyle = '#273a46';
      ctx.fillRect(x + 10, y + 16, 3, 20);
      ctx.fillRect(x + b.w - 13, y + 16, 3, 20);
      ctx.fillStyle = dark ? '#226174' : '#ede0c0';
      ctx.fillRect(x + 5, y + 1, b.w - 10, 24);
      label(ctx, b.id % 2 ? 'OWN THE NIGHT' : 'COSTA • 98.6', cx, y + 16, 6.8, dark ? '#f4b6d8' : '#234a60', 'center', 800);
      break;
    case 'terrace':
    case 'garden':
      ctx.fillStyle = '#708c63';
      ctx.fillRect(x + 9, y + 9, b.w - 18, b.h - 18);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#e9d4a6';
        ctx.fillRect(x + 13 + i * 16, y + 23, 10, 18);
        ctx.fillStyle = '#345c46';
        ctx.beginPath();
        ctx.arc(x + 17 + i * 18, y + 12, 5, 0, TAU);
        ctx.fill();
      }
      break;
    case 'antenna':
      ctx.strokeStyle = '#9ca9ac';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 14);
      ctx.lineTo(cx, cy - 31);
      ctx.moveTo(cx - 13, cy - 16);
      ctx.lineTo(cx + 13, cy - 16);
      ctx.stroke();
      ctx.fillStyle = Math.sin(game.clock.elapsed * 3) > 0 ? '#ff675d' : '#8c454c';
      ctx.fillRect(cx - 2, cy - 32, 4, 4);
      break;
    case 'construction':
      ctx.fillStyle = '#a7a08b';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 9 + i * 16, y + 10, 6, b.h - 20);
      break;
    default:
      for (let i = 0; i < 2; i++) {
        const ax = x + 12 + i * 25;
        ctx.fillStyle = dark ? '#61727d' : '#c8c9b9';
        ctx.fillRect(ax, y + 16, 18, 28);
        ctx.fillStyle = '#4a6068';
        ctx.beginPath();
        ctx.arc(ax + 9, y + 25, 6, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#71848b';
        for (let j = 0; j < 4; j++) ctx.strokeRect(ax + 3, y + 32 + j * 2, 12, 1);
      }
  }
}

export function drawCrane(ctx, x, y, height, time, harbor = false) {
  const topY = y - height;
  ctx.strokeStyle = '#d6aa4d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x - 4, topY);
  ctx.lineTo(x + 4, topY);
  ctx.lineTo(x + 8, y);
  ctx.moveTo(x - 42, topY + 5);
  ctx.lineTo(x + 105, topY + 5);
  ctx.moveTo(x - 42, topY + 14);
  ctx.lineTo(x + 105, topY + 14);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let yy = y; yy > topY + 12; yy -= 16) {
    ctx.moveTo(x - 7, yy);
    ctx.lineTo(x + 7, yy - 16);
    ctx.lineTo(x - 7, yy - 16);
  }
  for (let xx = x - 42; xx < x + 100; xx += 15) {
    ctx.moveTo(xx, topY + 5);
    ctx.lineTo(xx + 15, topY + 14);
    ctx.lineTo(xx + 15, topY + 5);
  }
  ctx.moveTo(x + 75, topY + 15);
  ctx.lineTo(x + 75 + Math.sin(time) * 3, topY + 74);
  ctx.stroke();
  ctx.fillStyle = '#3e575b';
  ctx.fillRect(x - 41, topY + 4, 24, 15);
  ctx.fillStyle = '#c9dfe0';
  ctx.fillRect(x + 5, topY + 10, 12, 14);
}

export function drawTree(ctx, tree, game) {
  const { x, y, palm, scale } = tree;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(2,20,24,.23)';
  ctx.beginPath();
  ctx.ellipse(-12, 8, 19, 9, -0.3, 0, TAU);
  ctx.fill();
  if (palm) {
    ctx.strokeStyle = '#78674e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(5, -18, 2, -34);
    ctx.stroke();
    const sway = Math.sin(game.clock.elapsed * 0.7 + x) * 0.06;
    ctx.translate(2, -34);
    ctx.rotate(sway);
    for (let i = 0; i < 7; i++) {
      ctx.rotate(TAU / 7);
      ctx.fillStyle = i % 2 ? '#477c57' : '#659363';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(13, -10, 31, 4);
      ctx.quadraticCurveTo(12, -1, 0, 0);
      ctx.fill();
      ctx.strokeStyle = '#a1b27b';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.lineTo(25, 2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#5b6b46';
    ctx.fillRect(-2, -23, 4, 23);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? '#5e8d63' : '#49775a';
      ctx.beginPath();
      ctx.arc(Math.cos(i) * 9, -25 + Math.sin(i) * 7, 12, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#7ba472';
    ctx.beginPath();
    ctx.arc(-3, -30, 10, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawStreetLights(ctx, game, bounds) {
  for (const lamp of game.city.lamps) {
    if (!visible(lamp, bounds, 80)) continue;
    ctx.strokeStyle = '#354957';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lamp.x, lamp.y);
    ctx.lineTo(lamp.x - 3, lamp.y - 18);
    ctx.lineTo(lamp.x - 12, lamp.y - 18);
    ctx.stroke();
    ctx.fillStyle = game.light.night > 0.3 ? '#ffdf9b' : '#c9cfbf';
    ctx.fillRect(lamp.x - 16, lamp.y - 20, 8, 4);
    if (game.light.night > 0.3) {
      glow(ctx, lamp.x - 12, lamp.y, 49, '#ffcd6840');
      glow(ctx, lamp.x - 12, lamp.y - 18, 12, '#ffe3a285');
    }
  }
}
