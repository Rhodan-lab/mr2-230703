import { CITY_W, CITY_H, COAST } from './config.js';
import { DISTRICTS } from './districts.js';
import { PROPERTIES, BANKS } from './economy.js';
import { STORY_MISSIONS } from './missions.js';
import { label, roundRect } from './math.js';

export function drawAtlas(ctx, game) {
  ctx.fillStyle = '#071724f5';
  ctx.fillRect(30, 25, 1220, 670);
  label(ctx, 'THE MARBELLA ATLAS', 60, 73, 26, '#f0e4c8', 'left', 900);
  label(ctx, 'TAB / ESC TO CLOSE', 1218, 70, 10, '#99c3c2', 'right');
  const x = 61;
  const y = 111;
  const size = 523;
  ctx.fillStyle = '#123945';
  ctx.fillRect(x, y, size, size);
  if (game.minimap) ctx.drawImage(game.minimap, x, y, size, size);
  const scale = size / 4500;
  for (const district of DISTRICTS) {
    const dx = x + (district.x + district.w / 2) * 280 * scale;
    const dy = y + (district.y + district.h / 2) * 280 * scale;
    label(ctx, district.short.toUpperCase(), dx, dy, 8, '#d7e3d5', 'center', 700);
  }
  for (const property of PROPERTIES) {
    const owned = game.economy.owned.includes(property.id);
    const px = x + property.x * scale;
    const py = y + property.y * scale;
    roundRect(ctx, px - 7, py - 7, 14, 14, 2, owned ? '#75c6a5' : '#d3b976');
    label(ctx, owned ? '✓' : '$', px, py + 4, 10, '#163946', 'center', 900);
  }
  const px = x + game.player.x * scale;
  const py = y + game.player.y * scale;
  ctx.fillStyle = '#ffedba';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, 'YOU', px, py - 8, 8, '#fff0c2', 'center', 800);
  label(ctx, 'PROPERTY PORTFOLIO', 626, 133, 12, '#b8dbce', 'left', 800);
  PROPERTIES.forEach((p, index) => {
    const y = 163 + index * 62;
    const owned = game.economy.owned.includes(p.id);
    roundRect(ctx, 623, y - 15, 584, 52, 3, owned ? '#1c403e' : '#132b38');
    label(ctx, p.name, 637, y + 3, 12, owned ? '#abe3bd' : '#e5d0a1', 'left', 800);
    label(ctx, p.description, 637, y + 21, 10, '#92b0b6', 'left', 400);
    label(ctx, owned ? 'OWNED' : `$${p.price.toLocaleString()}`, 1193, y + 1, 12, owned ? '#8bdbac' : '#e5d1a2', 'right', 700);
    label(ctx, `+$${p.income}/HR`, 1193, y + 20, 10, '#84b5ae', 'right', 600);
  });
  const next = STORY_MISSIONS[game.story.completed];
  label(ctx, 'NEXT CHAPTER', 626, 566, 10, '#a7c5c0', 'left', 800);
  label(ctx, next ? next.title : 'MARBELLA LEGEND', 626, 591, 18, '#ebd29e', 'left', 800);
  label(ctx, next ? `ACT ${next.act}  •  M TO START  •  REWARD $${next.reward.toLocaleString()}` : 'All story missions complete. Build your empire.', 626, 616, 10, '#a1bdb9', 'left', 600);
  label(ctx, 'SAFEHOUSE  /  GARAGE  /  KIOSK  /  TAXI DEPOT  /  MARINA  /  PENTHOUSE', 62, 665, 9, '#8bb6b4', 'left', 600);
}
