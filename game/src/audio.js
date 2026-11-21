import { clamp } from './math.js';

export const RADIO_STATIONS = [
  { name: 'NOCHE FM', genre: 'NIGHT DRIVE / 98.6', color: '#c3a4e4' },
  { name: 'RADIO PALMA', genre: 'COSTA LATINA / 104.2', color: '#efc17d' },
  { name: 'COSTA NEWS', genre: 'THE CITY NEVER LIES / 89.1', color: '#94d7d8' },
];

export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let engine = null;
  let engineGain = null;
  let engineFilter = null;
  let siren = null;
  let sirenGain = null;
  let rotor = null;
  let rotorGain = null;
  let rainSource = null;
  let rainGain = null;
  let noiseBuffer = null;
  let station = 0;
  let beat = 0;
  let nextBeat = 0;
  let muted = false;
  let volume = 0.65;

  function oscillator(type, frequency, gain, destination = master) {
    const source = context.createOscillator();
    const level = context.createGain();
    source.type = type;
    source.frequency.value = frequency;
    level.gain.value = gain;
    source.connect(level);
    level.connect(destination);
    source.start();
    return { source, level };
  }

  function initialize() {
    if (context) {
      context.resume();
      return;
    }
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    context = new Audio();
    master = context.createGain();
    master.gain.value = volume;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 5;
    master.connect(compressor);
    compressor.connect(context.destination);
    musicGain = context.createGain();
    musicGain.gain.value = 0.23;
    musicGain.connect(master);
    noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      previous = (previous + white * 0.12) / 1.12;
      data[i] = previous * 3;
    }
    engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 470;
    engineFilter.connect(master);
    const motor = oscillator('sawtooth', 40, 0, engineFilter);
    engine = motor.source;
    engineGain = motor.level;
    const police = oscillator('sine', 660, 0);
    siren = police.source;
    sirenGain = police.level;
    const helicopter = oscillator('triangle', 23, 0);
    rotor = helicopter.source;
    rotorGain = helicopter.level;
    rainGain = context.createGain();
    rainGain.gain.value = 0;
    const rainFilter = context.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 950;
    rainSource = context.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;
    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    rainSource.start();
    nextBeat = context.currentTime + 0.1;
  }

  function tone(frequency, duration, type = 'sine', gain = 0.15, when = 0, endFrequency = null, destination = master) {
    if (!context || !destination) return;
    const start = Math.max(context.currentTime, context.currentTime + when);
    const source = context.createOscillator();
    const envelope = context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, start);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + Math.min(0.012, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(envelope);
    envelope.connect(destination);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  function noise(duration, gain, cutoff = 1200, when = 0) {
    if (!context) return;
    const start = context.currentTime + when;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.start(start, Math.random());
    source.stop(start + duration);
  }

  function play(name) {
    if (!context || muted) return;
    if (name === 'pistol' || name === 'smg' || name === 'rifle' || name === 'shotgun') {
      const heavy = name === 'shotgun';
      noise(heavy ? 0.32 : 0.13, heavy ? 0.52 : 0.28, name === 'smg' ? 2300 : 1400);
      tone(heavy ? 120 : name === 'rifle' ? 190 : 260, 0.12, 'triangle', 0.3, 0, 40);
    } else if (name === 'explosion') {
      noise(1.5, 0.8, 650);
      tone(80, 1.1, 'sine', 0.65, 0, 23);
      noise(0.7, 0.35, 1800, 0.09);
    } else if (name === 'thunder') {
      noise(2.1, 0.35, 250);
      tone(43, 1.8, 'sine', 0.16, 0, 24);
    } else if (name === 'impact') {
      noise(0.18, 0.27, 650);
      tone(110, 0.2, 'triangle', 0.18, 0, 35);
    } else if (name === 'ricochet') {
      tone(1700 + Math.random() * 900, 0.14, 'sine', 0.06, 0, 500);
    } else if (name === 'pickup' || name === 'checkpoint') {
      tone(660, 0.12, 'sine', 0.12);
      tone(990, 0.22, 'sine', 0.1, 0.07);
      if (name === 'checkpoint') tone(1320, 0.2, 'sine', 0.08, 0.15);
    } else if (name === 'passed') {
      [261.63, 329.63, 392, 523.25, 659.25].forEach((frequency, i) => tone(frequency, 0.48, 'triangle', 0.13, i * 0.1));
    } else if (name === 'failed') {
      [392, 311, 233, 196].forEach((frequency, i) => tone(frequency, 0.35, 'triangle', 0.11, i * 0.15));
    } else if (name === 'wanted') {
      tone(440, 0.15, 'square', 0.035);
      tone(660, 0.2, 'square', 0.035, 0.16);
    } else if (name === 'horn') {
      tone(370, 0.3, 'sawtooth', 0.06);
      tone(466, 0.3, 'triangle', 0.06);
    } else if (name === 'door') {
      noise(0.08, 0.15, 550);
      tone(110, 0.1, 'triangle', 0.13);
    } else if (name === 'reload') {
      noise(0.06, 0.12, 2400);
      noise(0.06, 0.12, 1800, 0.13);
    } else if (name === 'punch') {
      noise(0.1, 0.15, 500);
    } else tone(760, 0.08, 'sine', 0.07);
  }

  function musicStep(when, step) {
    const delay = Math.max(0, when - context.currentTime);
    if (station === 0) {
      const bass = [55, 55, 65.4, 49][Math.floor(step / 8) % 4];
      if (step % 2 === 0) tone(bass, 0.22, 'sawtooth', 0.09, delay, null, musicGain);
      if (step % 4 === 0) tone(100, 0.14, 'sine', 0.2, delay, 35, musicGain);
      const arpeggio = [220, 261.63, 329.63, 440, 392, 329.63, 261.63, 196];
      tone(arpeggio[step % 8], 0.24, 'triangle', 0.055, delay, null, musicGain);
      if (step % 4 === 2) tone(1500, 0.04, 'square', 0.018, delay, null, musicGain);
    } else if (station === 1) {
      const roots = [146.83, 196, 174.61, 220];
      const root = roots[Math.floor(step / 8) % roots.length];
      if ([0, 3, 6].includes(step % 8)) {
        [1, 1.25, 1.5, 2].forEach((ratio, i) => tone(root * ratio, 0.32, 'triangle', 0.07, delay + i * 0.014, null, musicGain));
      }
      if (step % 4 === 0) tone(root / 2, 0.3, 'sine', 0.13, delay, null, musicGain);
      if (step % 2) tone(800 + step % 3 * 230, 0.035, 'triangle', 0.025, delay, null, musicGain);
    } else {
      if (step % 4 === 0) tone(73.42, 0.2, 'sine', 0.1, delay, null, musicGain);
      if (step % 8 === 6) tone(293.66, 0.12, 'triangle', 0.035, delay, null, musicGain);
      if (step % 2 === 1) tone(1400, 0.035, 'square', 0.012, delay, null, musicGain);
    }
  }

  function update(game) {
    if (!context) return;
    const now = context.currentTime;
    const vehicle = game.player.vehicle;
    const speed = Math.abs(vehicle?.speed || 0);
    const bike = vehicle?.spec.bike;
    const boat = vehicle?.spec.boat;
    const targetFrequency = vehicle ? (bike ? 72 : boat ? 33 : 34) + speed * (bike ? 0.65 : 0.36) : 28;
    engine.frequency.setTargetAtTime(targetFrequency, now, 0.12);
    engineGain.gain.setTargetAtTime(vehicle && !vehicle.exploded ? 0.065 + speed * 0.0002 : 0, now, 0.12);
    engineFilter.frequency.setTargetAtTime(400 + speed * 3, now, 0.15);
    const nearby = game.vehicles.filter(v => v.police && !v.exploded).some(v => Math.hypot(v.x - game.player.x, v.y - game.player.y) < 550);
    sirenGain.gain.setTargetAtTime(nearby && game.heat > 0 ? 0.035 : 0, now, 0.1);
    siren.frequency.setTargetAtTime(Math.sin(now * 5) > 0 ? 680 : 910, now, 0.035);
    rotorGain.gain.setTargetAtTime(game.helicopter.active ? 0.045 * (0.6 + Math.sin(now * 26) * 0.4) : 0, now, 0.015);
    rotor.frequency.setTargetAtTime(25 + Math.sin(now * 1.3) * 2, now, 0.1);
    rainGain.gain.setTargetAtTime(game.weather.type === 'RAIN' ? 0.16 : 0, now, 1);
    const musicOn = game.screen === 'title' || !!vehicle;
    musicGain.gain.setTargetAtTime(musicOn ? 0.25 : 0.04, now, 0.4);
    if (nextBeat < now - 1) nextBeat = now;
    while (nextBeat < now + 0.15) {
      musicStep(nextBeat, beat++);
      nextBeat += station === 1 ? 0.19 : 0.16;
    }
    master.gain.setTargetAtTime(muted ? 0 : volume * (game.screen === 'paused' ? 0.35 : 1), now, 0.1);
  }

  function setStation(index) {
    station = clamp(index, 0, 2);
    beat = 0;
    play('ui');
  }

  function setVolume(value) {
    volume = clamp(value, 0, 1);
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  function diagnostics() {
    return {
      initialized: !!context,
      state: context?.state || 'waiting-for-input',
      station: RADIO_STATIONS[station].name,
      muted,
      volume,
    };
  }

  return { initialize, play, update, setStation, setVolume, toggleMute, diagnostics };
}
