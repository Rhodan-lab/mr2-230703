import { BLOCK, COLS, ROWS } from './config.js';
import { clamp, distance } from './math.js';
import { objectivePosition } from './missions.js';

function junctionKey(x, y) {
  return `${x}:${y}`;
}

export function createNavigation() {
  const nodes = new Map();
  for (let x = 0; x <= COLS; x++) {
    for (let y = 0; y <= ROWS; y++) {
      nodes.set(junctionKey(x, y), {
        x: x * BLOCK,
        y: y * BLOCK,
        gx: x,
        gy: y,
        neighbors: [],
      });
    }
  }
  for (const node of nodes.values()) {
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const neighbor = nodes.get(junctionKey(node.gx + dx, node.gy + dy));
      if (neighbor) node.neighbors.push(neighbor);
    }
  }
  return {
    nodes,
    route: [],
    cursor: 0,
    remaining: 0,
    destination: null,
    refresh: 0,
    instruction: 'EXPLORE MARBELLA',
    offRoad: false,
    recalculations: 0,
  };
}

function nearestNode(navigation, point) {
  const gx = clamp(Math.round(point.x / BLOCK), 0, COLS);
  const gy = clamp(Math.round(point.y / BLOCK), 0, ROWS);
  return navigation.nodes.get(junctionKey(gx, gy));
}

export function findRoadRoute(navigation, from, to, avoid = []) {
  const start = nearestNode(navigation, from);
  const finish = nearestNode(navigation, to);
  if (!start || !finish) return [];
  const frontier = [start];
  const previous = new Map();
  const cost = new Map([[start, 0]]);
  const estimate = new Map([[start, distance(start, finish)]]);
  const visited = new Set();
  while (frontier.length) {
    frontier.sort((a, b) => estimate.get(a) - estimate.get(b));
    const node = frontier.shift();
    if (node === finish) {
      const path = [{ x: to.x, y: to.y }];
      let cursor = finish;
      while (cursor) {
        path.unshift({ x: cursor.x, y: cursor.y });
        cursor = previous.get(cursor);
      }
      return path;
    }
    visited.add(node);
    for (const neighbor of node.neighbors) {
      if (visited.has(neighbor)) continue;
      let penalty = 0;
      for (const point of avoid) {
        if (distance(neighbor, point) < 180) penalty += BLOCK * 1.5;
      }
      const nextCost = cost.get(node) + BLOCK + penalty;
      if (!cost.has(neighbor) || nextCost < cost.get(neighbor)) {
        previous.set(neighbor, node);
        cost.set(neighbor, nextCost);
        const heuristic = Math.abs(neighbor.x - finish.x) + Math.abs(neighbor.y - finish.y);
        estimate.set(neighbor, nextCost + heuristic);
        if (!frontier.includes(neighbor)) frontier.push(neighbor);
      }
    }
  }
  return [];
}

export function updateNavigation(game, dt) {
  const n = game.navigation;
  const target = game.shotMarker || objectivePosition(game);
  n.refresh -= dt;
  if (!target || game.player.vehicle?.spec.boat) {
    n.route.length = 0;
    n.destination = target;
    n.offRoad = true;
    n.instruction = target ? 'FOLLOW THE OPEN WATER' : 'EXPLORE MARBELLA';
    return;
  }
  n.offRoad = false;
  const changed = !n.destination || distance(target, n.destination) > 30;
  if (changed || n.refresh <= 0) {
    const avoid = game.heat > 0 ? game.vehicles.filter(v => v.police && !v.exploded) : [];
    n.route = findRoadRoute(n, game.player, target, avoid);
    n.destination = { x: target.x, y: target.y };
    n.cursor = 0;
    n.refresh = 2;
    n.recalculations++;
  }
  while (n.cursor < n.route.length - 1 && distance(game.player, n.route[n.cursor]) < 75) n.cursor++;
  const next = n.route[n.cursor];
  n.remaining = 0;
  let previous = game.player;
  for (let i = n.cursor; i < n.route.length; i++) {
    n.remaining += distance(previous, n.route[i]);
    previous = n.route[i];
  }
  if (!next) return;
  if (distance(game.player, target) < 70) {
    n.instruction = 'DESTINATION AHEAD';
    return;
  }
  const angle = game.player.vehicle?.angle || game.player.angle + Math.PI / 2;
  const dx = next.x - game.player.x;
  const dy = next.y - game.player.y;
  const forward = dx * Math.sin(angle) - dy * Math.cos(angle);
  const side = dx * Math.cos(angle) + dy * Math.sin(angle);
  if (forward < -40) n.instruction = 'TURN AROUND WHEN SAFE';
  else if (Math.abs(side) > Math.abs(forward) * 0.6) n.instruction = side > 0 ? 'TURN RIGHT AT THE JUNCTION' : 'TURN LEFT AT THE JUNCTION';
  else n.instruction = 'CONTINUE STRAIGHT';
}

export function drawNavigationRoute(ctx, game, centerX, centerY, scale) {
  const n = game.navigation;
  if (!n.route.length || n.offRoad) return;
  ctx.save();
  ctx.strokeStyle = '#efd08ab8';
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  for (let i = n.cursor; i < n.route.length; i++) {
    const point = n.route[i];
    ctx.lineTo(centerX + (point.x - game.player.x) * scale, centerY + (point.y - game.player.y) * scale);
  }
  ctx.stroke();
  ctx.restore();
}
