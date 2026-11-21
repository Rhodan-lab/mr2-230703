import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const target = await (await fetch('http://127.0.0.1:9239/json/new?about:blank', { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
const pending = new Map();
const exceptions = [];
const requests = [];
let id = 0;
socket.addEventListener('message', message => {
  const packet = JSON.parse(message.data);
  if (packet.method === 'Runtime.exceptionThrown') exceptions.push(packet.params.exceptionDetails.exception?.description || packet.params.exceptionDetails.text);
  if (packet.method === 'Network.requestWillBeSent') requests.push(packet.params.request.url);
  if (packet.id) {
    const callback = pending.get(packet.id);
    pending.delete(packet.id);
    if (packet.error) callback.reject(new Error(JSON.stringify(packet.error)));
    else callback.resolve(packet.result);
  }
});
function send(method, params = {}) {
  const next = ++id;
  return new Promise((resolve, reject) => {
    pending.set(next, { resolve, reject });
    socket.send(JSON.stringify({ id: next, method, params }));
  });
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description);
  return result.result.value;
}
async function key(code, keyValue, number) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: keyValue, windowsVirtualKeyCode: number });
  await delay(50);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: keyValue, windowsVirtualKeyCode: number });
  await delay(80);
}
await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8089/?seed=260621' });
for (let i = 0; i < 100; i++) {
  await delay(100);
  if (await evaluate('Boolean(globalThis.__shotReady)')) break;
}
assert(await evaluate('Boolean(globalThis.__marbella)'), `Game failed to boot: ${exceptions.join('\n')}`);
assert.equal(await evaluate('__marbella.screen'), 'title');
await key('KeyH', 'h', 72);
assert(await evaluate('__marbella.menu.help'));
await key('KeyH', 'h', 72);
await key('Enter', 'Enter', 13);
assert.equal(await evaluate('__marbella.screen'), 'play');
await key('KeyE', 'e', 69);
assert(await evaluate('Boolean(__marbella.player.vehicle)'));
const before = await evaluate('({x:__marbella.player.x,y:__marbella.player.y})');
await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });
await delay(450);
await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });
const after = await evaluate('({x:__marbella.player.x,y:__marbella.player.y})');
assert(Math.hypot(after.x - before.x, after.y - before.y) > 5);
await key('Escape', 'Escape', 27);
assert.equal(await evaluate('__marbella.screen'), 'paused');
await key('ArrowDown', 'ArrowDown', 40);
await key('Enter', 'Enter', 13);
assert(await evaluate('__marbella.menu.saved'));
await key('Escape', 'Escape', 27);
await key('KeyH', 'h', 72);
assert(await evaluate('__marbella.menu.help'));
await key('Escape', 'Escape', 27);
assert(!await evaluate('__marbella.menu.help'));
await key('Tab', 'Tab', 9);
assert(await evaluate('__marbella.menu.atlas'));
await key('Escape', 'Escape', 27);
await key('KeyM', 'm', 77);
assert(await evaluate('Boolean(__marbella.dialog)'));
for (let i = 0; i < 5; i++) await key('Enter', 'Enter', 13);
assert(!await evaluate('Boolean(__marbella.dialog)'));
assert.equal(await evaluate('__marbella.story.active'), 0);
await key('KeyR', 'r', 82);
const audio = await evaluate('__marbella.audio.diagnostics()');
assert.equal(audio.initialized, true);
assert.equal(audio.state, 'running');
assert.equal(exceptions.length, 0, exceptions.join('\n'));
assert(requests.every(url => url.startsWith('http://127.0.0.1:8089/')));
const report = {
  titleAndControls: true,
  vehicleEnterAndKeyboardDriving: true,
  pauseSaveResume: true,
  cityAtlas: true,
  storyDialog: true,
  radioAndSynthAudio: audio,
  allRequestsLocal: true,
  requests: requests.length,
  exceptions,
};
writeFileSync('validation-browser.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
await send('Page.close');
socket.close();
