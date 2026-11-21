// Local Chrome DevTools driver. It never supplies pixels or art to the game.
// The four JPEGs are Page.captureScreenshot captures after actual key events.
import { mkdirSync, writeFileSync } from 'node:fs';

const port = 9239;
const origin = 'http://127.0.0.1:8089';
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let sequence = 0;
const errors = [];

async function connect() {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const pending = new Map();
  socket.addEventListener('message', message => {
    const packet = JSON.parse(message.data);
    if (packet.method === 'Runtime.exceptionThrown') {
      const detail = packet.params.exceptionDetails;
      errors.push(detail.exception?.description || detail.text);
    }
    if (packet.id) {
      const handler = pending.get(packet.id);
      pending.delete(packet.id);
      if (packet.error) handler?.reject(new Error(JSON.stringify(packet.error)));
      else handler?.resolve(packet.result);
    }
  });
  function send(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  return { send, socket, target };
}

const browser = await connect();
const { send } = browser;
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function key(code, keyValue, duration = 500) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: keyValue, windowsVirtualKeyCode: keyValue.charCodeAt(0) });
  await delay(duration);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: keyValue, windowsVirtualKeyCode: keyValue.charCodeAt(0) });
}

async function navigate(query) {
  await send('Page.navigate', { url: origin + '/' + query });
  for (let i = 0; i < 150; i++) {
    await delay(100);
    if (await evaluate('Boolean(globalThis.__shotReady)')) return;
  }
  throw new Error('Game did not become ready');
}

mkdirSync('screenshots', { recursive: true });
const stages = [
  { shot: 'chase', name: '1-chase.jpg', drive: 450 },
  { shot: 'goldenhour', name: '2-goldenhour.jpg', drive: 620 },
  { shot: 'city', name: '3-city.jpg', drive: 180 },
  { shot: 'boat', name: '4-boat.jpg', drive: 530 },
];
const report = [];
for (const stage of stages) {
  await navigate(`?shot=${stage.shot}&seed=260621`);
  await key('KeyW', 'w', stage.drive);
  await delay(120);
  const diagnostics = await evaluate(`(() => {
    const g = __marbella;
    const entities = [g.player, ...g.vehicles, ...g.peds];
    return {
      scenario: g.shot,
      buildings: g.city.buildings.length,
      vehicles: g.vehicles.length,
      peds: g.peds.length,
      finite: entities.every(e => Number.isFinite(e.x) && Number.isFinite(e.y)),
      position: {x:g.player.x,y:g.player.y},
      speed: g.player.vehicle?.speed || 0,
      heat: g.heat,
      fps: __performance.fps,
      steps: g.steps,
    };
  })()`);
  if (!diagnostics.finite) throw new Error('Non-finite entity in screenshot');
  let capture = await send('Page.captureScreenshot', { format: 'jpeg', quality: 87, captureBeyondViewport: false });
  let bytes = Buffer.from(capture.data, 'base64');
  if (bytes.length > 204800) {
    capture = await send('Page.captureScreenshot', { format: 'jpeg', quality: 76, captureBeyondViewport: false });
    bytes = Buffer.from(capture.data, 'base64');
  }
  if (bytes.length > 204800) throw new Error('JPEG exceeds byte cap');
  writeFileSync(`screenshots/${stage.name}`, bytes);
  report.push({ name: stage.name, bytes: bytes.length, ...diagnostics });
  console.log(JSON.stringify(report.at(-1)));
}
if (errors.length) throw new Error(errors.join('\n'));
writeFileSync('validation-capture.json', JSON.stringify({ errors, report }, null, 2));
await send('Page.close');
browser.socket.close();
