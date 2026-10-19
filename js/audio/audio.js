// FILE: js/audio/audio.js
// Процедурный звук на WebAudio: генеративный эмбиент (пэды + колокольчики
// в пентатонике), эффекты погоды, UI. Контекст — только после первого касания.
WJ.Audio = (function () {
  const U = WJ.Util;
  let ctx = null, master, musicGain, sfxGain;
  let started = false, musicOn = true, sfxOn = true;
  let padOscs = [], weatherNodes = null;
  const PENTA = [0, 2, 4, 7, 9]; // мажорная пентатоника
  let baseNote = 57; // A3
  let currentWeather = 'clear', dayPart = 'day';
  let ambNext = 0, arpNext = 0, noiseBuf = null;

  function ensureCtx() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.32 : 0; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 0.5 : 0; sfxGain.connect(master);
      return true;
    } catch (e) { return false; }
  }
  function unlock() {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    if (!started) { started = true; startMusic(); }
  }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(function () {}); }
  function resume() { if (ctx && started && ctx.state === 'suspended') ctx.resume().catch(function () {}); }

  // ---------- Музыка: мягкий эмбиент ----------
  function startMusic() {
    stopPads();
    const now = ctx.currentTime;
    padOscs = [];
    const chords = [[0, 7, 12], [2, 9, 14], [-3, 4, 12], [0, 5, 9]];
    const chord = chords[Math.floor(Math.random() * chords.length)];
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sine';
      osc.frequency.value = midiHz(baseNote + chord[i]);
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.06 / (i + 1), now + 3);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.017;
      const lg = ctx.createGain(); lg.gain.value = 0.012;
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900;
      osc.connect(g); g.connect(filter); filter.connect(musicGain);
      osc.start();
      padOscs.push({ osc, g, lfo });
    }
  }
  function stopPads() {
    padOscs.forEach(function (p) { try { p.osc.stop(); p.lfo.stop(); } catch (e) {} });
    padOscs = [];
  }
  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function arpTick(t) {
    if (!ctx || !started) return;
    if (t < arpNext) return;
    arpNext = t + 2.2 + Math.random() * 3.5;
    if (Math.random() < 0.7) {
      const deg = PENTA[Math.floor(Math.random() * PENTA.length)];
      const oct = Math.random() < 0.5 ? 24 : 12;
      bell(baseNote + deg + oct, 0.05 + Math.random() * 0.04, 2.5);
    }
  }
  function bell(note, vol, dur) {
    if (!ctx || !started) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiHz(note);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g); g.connect(musicGain);
    osc.start(now); osc.stop(now + dur + 0.05);
  }

  // ---------- Шумовые эффекты ----------
  function makeNoise(type) {
    if (!ctx) return null;
    if (!noiseBuf) noiseBuf = noiseBuffer();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    if (type === 'rain') { f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.6; g.gain.value = 0.10; }
    else if (type === 'wind') {
      f.type = 'lowpass'; f.frequency.value = 500;
      g.gain.value = 0.12;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3;
      const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      src.lfo = lfo;
    }
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start();
    return { src, g, type };
  }
  function stopWeatherLoop() {
    if (weatherNodes) {
      try { weatherNodes.src.stop(); if (weatherNodes.src.lfo) weatherNodes.src.lfo.stop(); } catch (e) {}
      weatherNodes = null;
    }
  }
  function noiseBuffer() {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function setWeather(type) { currentWeather = type; }
  function setDayPart(dp) { dayPart = dp; }

  function frame(now) {
    if (!ctx || !started || ctx.state !== 'running') return;
    const wantNoise = (currentWeather === 'rain' || currentWeather === 'storm') ? 'rain'
      : (currentWeather === 'wind') ? 'wind' : null;
    if (wantNoise && (!weatherNodes || weatherNodes.type !== wantNoise)) {
      stopWeatherLoop();
      weatherNodes = makeNoise(wantNoise);
    } else if (!wantNoise && weatherNodes) stopWeatherLoop();
    arpTick(now);
    if (dayPart === 'morning' && now > ambNext) { ambNext = now + 4 + Math.random() * 6; bird(); }
    else if (dayPart === 'night' && now > ambNext) { ambNext = now + 2 + Math.random() * 4; cricket(); }
  }
  function bird() {
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const osc = ctx.createOscillator(); osc.type = 'sine';
      const f0 = 1800 + Math.random() * 1200;
      osc.frequency.setValueAtTime(f0, now + i * 0.14);
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.3, now + i * 0.14 + 0.07);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.9, now + i * 0.14 + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.14);
      g.gain.linearRampToValueAtTime(0.03, now + i * 0.14 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.15);
      osc.connect(g); g.connect(sfxGain);
      osc.start(now + i * 0.14); osc.stop(now + i * 0.14 + 0.2);
    }
  }
  function cricket() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'square';
    osc.frequency.value = 4200 + Math.random() * 400;
    const g = ctx.createGain(); g.gain.value = 0;
    for (let i = 0; i < 4; i++) {
      g.gain.setValueAtTime(0.008, now + i * 0.05);
      g.gain.setValueAtTime(0, now + i * 0.05 + 0.03);
    }
    osc.connect(g); g.connect(sfxGain);
    osc.start(now); osc.stop(now + 0.25);
  }
  function thunder(delaySec) {
    if (!ctx || !started) return;
    const now = ctx.currentTime + (delaySec || 0);
    if (!noiseBuf) noiseBuf = noiseBuffer();
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(300, now);
    f.frequency.exponentialRampToValueAtTime(80, now + 1.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.35, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(now); src.stop(now + 2.3);
  }
  function click() {
    if (!ctx || !started) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 720;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(g); g.connect(sfxGain);
    osc.start(now); osc.stop(now + 0.08);
  }
  function sticker() {
    if (!ctx || !started) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.09, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g); g.connect(sfxGain);
    osc.start(now); osc.stop(now + 0.18);
  }
  function chime() {
    if (!ctx || !started) return;
    [0, 4, 7, 12].forEach(function (d, i) {
      setTimeout(function () { bell(baseNote + 12 + d, 0.07, 1.6); }, i * 90);
    });
  }
  function splash() {
    if (!ctx || !started) return;
    const now = ctx.currentTime;
    if (!noiseBuf) noiseBuf = noiseBuffer();
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(now); src.stop(now + 0.35);
  }
  function fireCrackle() {
    if (!ctx || !started) return;
    if (Math.random() > 0.02) return;
    const now = ctx.currentTime;
    if (!noiseBuf) noiseBuf = noiseBuffer();
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.playbackRate.value = 0.4 + Math.random() * 0.3;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 1600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(now); src.stop(now + 0.1);
  }

  function setVolumes(v) {
    musicOn = v.music !== false; sfxOn = v.sound !== false;
    if (musicGain) musicGain.gain.value = musicOn ? 0.32 : 0;
    if (sfxGain) sfxGain.gain.value = sfxOn ? 0.5 : 0;
  }
  function fadeTo(suspendAudio) {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(suspendAudio ? 0 : 0.85, t + 0.4);
  }

  return {
    unlock, suspend, resume, frame, setWeather, setDayPart, thunder, click, sticker, chime, splash, fireCrackle, setVolumes, fadeTo,
    get started() { return started; },
  };
})();
