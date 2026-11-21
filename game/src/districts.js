import { BLOCK } from './config.js';

export const DISTRICTS = [
  { name: 'MARBELLA DOWNTOWN', short: 'Downtown', color: '#7ea9ba', x: 3, y: 3, w: 5, h: 5, roof: '#758e9c', neon: '#63e0e1' },
  { name: 'PALMA ROW', short: 'Palma Row', color: '#efb78c', x: 10, y: 0, w: 2, h: 10, roof: '#d9bea2', neon: '#ff96b7' },
  { name: 'COSTA HEIGHTS', short: 'Costa Heights', color: '#c7aece', x: 6, y: 0, w: 4, h: 3, roof: '#c4b4ac', neon: '#dba6ff' },
  { name: 'DOCKSIDE YARDS', short: 'Dockside', color: '#8eaba9', x: 7, y: 10, w: 5, h: 4, roof: '#7e9699', neon: '#ffbc69' },
  { name: 'OLD MERCADO', short: 'Old Mercado', color: '#dba781', x: 0, y: 7, w: 7, h: 7, roof: '#b38570', neon: '#ffb766' },
  { name: 'MIRADOR HILLS', short: 'Mirador Hills', color: '#a8bd93', x: 0, y: 0, w: 6, h: 3, roof: '#b5ad9a', neon: '#97e5b0' },
  { name: 'GREENFIELD PARKS', short: 'Greenfield', color: '#82b9a0', x: 0, y: 3, w: 3, h: 4, roof: '#a2b8a0', neon: '#a3f4cd' },
];

export function districtAt(x, y) {
  if (x >= 3200 && y >= 2850) return DISTRICTS[3];
  if (x >= 3200) return DISTRICTS[1];
  const bx = Math.floor(x / BLOCK);
  const by = Math.floor(y / BLOCK);
  for (const d of DISTRICTS.slice(1)) {
    if (bx >= d.x && bx < d.x + d.w && by >= d.y && by < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}

export const STREET_NAMES = [
  'VELA AVENUE',
  'CALLE DEL SOL',
  'OCEAN DRIVE',
  'MERCADO STREET',
  'REYES BOULEVARD',
  'PALMA PROMENADE',
  'LIBERTAD AVENUE',
  'MIRADOR ROAD',
];
