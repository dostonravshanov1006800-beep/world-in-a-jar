// FILE: js/game.js
// Машина состояний: boot -> menu -> play <-> pause, adbreak, error.
// Один rAF-цикл, фиксированный шаг симуляции 10 Гц, автосейв, реклама, офлайн.
WJ.Game = (function () {
  const U = WJ.Util, C = WJ.Config;
  let state = 'boot';
  const TRANSITIONS = {
    boot: ['menu', 'error'],
    menu: ['play', 'error'],
    play: ['pause', 'adbreak', 'menu', 'error'],
    pause: ['play', 'menu', 'error'],
    adbreak: ['play', 'error'],
    error: [],
  };
  let world = null, meta = null;
  let rafId = 0, lastTime = 0, acc = 0;
  let simRunning = false;
  let lastSaveHadChanges = false;
  let chapterAdShown = 0;
  let lastLetterDay = 0;
  let debug = location.search.indexOf('debug=1') >= 0;

  function setState(next) {
    if (state === next) return; // повторный вход безопасен
    if (TRANSITIONS[state].indexOf(next) < 0) { WJ.Errors.record('fsm', 'illegal ' + state + '->' + next); return; }
    state = next;
    if (next === 'play') { WJ.YSDK.gameplayStart(); simRunning = true; }
    if (next === 'pause' || next === 'menu' || next === 'adbreak') { WJ.YSDK.gameplayStop(); }
    if (next === 'menu') showMenu();
    if (next === 'play') hideMenu();
  }
  function showMenu() {
    const menu = document.getElementById('menu');
    if (menu) menu.classList.remove('hidden');
    document.getElementById('hud-top').classList.add('hidden');
    document.getElementById('hud-bottom').classList.add('hidden');
  }
  function hideMenu() {
    const menu = document.getElementById('menu');
    if (menu) menu.classList.add('hidden');
    document.getElementById('hud-top').classList.remove('hidden');
    document.getElementById('hud-bottom').classList.remove('hidden');
  }

  // ---------- Сохранение ----------
  function buildSave() {
    if (!world) return meta;
    const planets = meta.planets.slice();
    const ps = world.serialize();
    ps.pop = world.residents.length;
    ps.lastSeenTs = Date.now();
    planets[meta.activePlanet] = ps;
    return {
      version: C.version,
      planets, activePlanet: meta.activePlanet,
      settings: WJ.UI.settings,
      stars: meta.stars,
      achievements: meta.achievements,
      lastSeenTs: Date.now(),
    };
  }
  function saveNow() {
    try { WJ.Save.save(buildSave()); lastSaveHadChanges = false; } catch (e) { WJ.Errors.logTag('save', e); }
  }
  function markDirty() { lastSaveHadChanges = true; WJ.Save.schedule(); }

  // ---------- Запуск ----------
  function boot(saved) {
    meta = saved || {
      version: C.version,
      planets: [],
      activePlanet: 0,
      settings: { quality: 'auto', sound: true, music: true, vibro: true, textSize: 'normal', lang: null },
      stars: 0,
      achievements: [],
      lastSeenTs: Date.now(),
      unlockedChapters: 0,
    };
    meta.storiesSeen = meta.storiesSeen || [];
    const bootEl = document.getElementById('boot');
    const bootText = document.getElementById('boot-text');

    const finishBoot = function () {
      WJ.UI.setSettings(meta.settings);
      WJ.UI.setText();
      if (bootEl) { bootEl.style.opacity = '0'; setTimeout(function () { bootEl.classList.add('hidden'); }, 600); }
      setState('menu');
    };

    if (!WJ.Render.init(document.getElementById('gl'))) {
      document.getElementById('fatal-title').textContent = WJ.I18n.t('ui.noWebgl');
      document.getElementById('fatal-text').textContent = WJ.I18n.t('ui.noWebglHint');
      document.getElementById('boot').classList.add('hidden');
      document.getElementById('fatal').classList.remove('hidden');
      setState('error');
      return;
    }
    WJ.Render.bindContext(document.getElementById('gl'));
    if (bootText) bootText.textContent = '…';
    finishBoot();
  }

  // ---------- Планеты ----------
  function startPlanet(i) {
    const data = meta.planets[i];
    if (!data) { newPlanet(i); return; }
    // офлайн-прогресс
    const hours = (Date.now() - (data.lastSeenTs || Date.now())) / 3600000;
    const offlineDays = Math.floor(hours * 3600 / C.DAY_SECONDS);
    loadPlanet(i, data);
    if (offlineDays > 0) {
      const got = WJ.World.offlineProgress(world, offlineDays, meta);
      if (got > 0) WJ.UI.toast(WJ.I18n.t('ui.newDay', { n: world.day }) + ' (+' + got + ')');
    }
    resumePlay();
  }
  function loadPlanet(i, data) {
    disposeWorld();
    world = WJ.World.create(data.seed, { name: data.name, deserialize: true });
    WJ.World.deserializeWorld(world, data);
    meta.activePlanet = i;
    WJ.Jar.setTagName(world.planetName);
    lastLetterDay = world.day;
    markDirty();
  }
  function newPlanet(slot) {
    disposeWorld();
    const seed = Math.floor(Math.random() * 1e9);
    world = WJ.World.create(seed, {});
    meta.activePlanet = slot !== undefined ? slot : meta.planets.length;
    meta.planets[meta.activePlanet] = world.serialize();
    meta.planets[meta.activePlanet].pop = world.residents.length;
    WJ.Jar.setTagName(world.planetName);
    lastLetterDay = world.day;
    WJ.UI.toast(WJ.I18n.t('ui.newPlanet'));
    markDirty();
    resumePlay();
  }
  function disposeWorld() {
    if (!world) return;
    try {
      WJ.Residents.clearAll();
      WJ.Buildings.clear();
      WJ.Chronicle.clear();
      WJ.Planet.dispose();
    } catch (e) { WJ.Errors.logTag('dispose', e); }
    world = null;
  }
  function resumePlay() {
    if (state === 'menu' || state === 'pause') setState('play');
    if (!WJ.UI.settings.tutorialDone) WJ.UI.startTutorial();
  }

  // ---------- События шины ----------
  function bindBus() {
    WJ.Bus.on('tap', function (e) {
      if (state !== 'play') return;
      if (WJ.UI.currentResident) { WJ.UI.hideResident(); return; }
      const id = WJ.Render.pickResident(e.x, e.y, WJ.Residents.hitboxes);
      if (id && world) {
        const r = world.byId(id);
        if (r) {
          const rec = WJ.Residents.byId.get(id);
          if (rec) {
            const wp = new THREE.Vector3();
            rec.root.getWorldPosition(wp);
            WJ.Render.focusOn(wp);
          }
          WJ.UI.showResident(world, r);
        }
      }
    });
    WJ.Bus.on('weather:changed', function (d) {
      WJ.Audio.setWeather(d.type);
      markDirty();
    });
    WJ.Bus.on('sfx:thunder', function (d) { WJ.Audio.thunder(d.delay); });
    WJ.Bus.on('day:new', function (d) {
      // Письмо дня
      const lines = [];
      (world.residents || []).forEach(function (r) {
        const l = WJ.Advice.letterLine(r);
        if (l) lines.push(l.text);
      });
      setTimeout(function () { WJ.UI.showLetter(lines); }, 400);
      markDirty();
    });
    WJ.Bus.on('chronicle:added', function () { markDirty(); WJ.UI.addChronEntry && WJ.UI.addChronEntry(arguments); });
    WJ.Bus.on('story:opened', function (d) {
      WJ.UI.toast(WJ.I18n.t('ui.storyOpen', { s: WJ.I18n.t('story.' + d.id) }), 'star');
      WJ.Audio.chime();
      markDirty();
    });
    WJ.Bus.on('stars:add', function (d) { meta.stars += d.n; markDirty(); });
    WJ.Bus.on('chapter:done', function (d) {
      WJ.UI.toast(WJ.I18n.t('ui.chapterDone') + ': ' + WJ.I18n.t('chapter.' + Math.min(d.n, 6)), 'star');
      meta.unlockedChapters = Math.max(meta.unlockedChapters || 0, d.n);
      // межстраничная реклама на смене главы
      if (chapterAdShown !== d.n) {
        chapterAdShown = d.n;
        setState('adbreak');
        WJ.YSDK.showInterstitial(function (err) { setState('play'); });
      }
      markDirty();
    });
    WJ.Bus.on('ach:check', function (w) { checkAchievements(w || world); });
    WJ.Bus.on('save:flush', function () { if (lastSaveHadChanges) saveNow(); });
    WJ.Bus.on('ui:pause', function () { setState(state === 'play' ? 'pause' : 'play'); });
    WJ.Bus.on('ui:speed', function (d) { if (world) world.speed = d.speed; });
    // настройки
    WJ.UI.bind({
      onWeather: function (type) {
        if (!world) return;
        const res = WJ.World.applyWeather(world, type);
        if (!res.ok) {
          WJ.UI.toast(res.reason === 'energy' ? WJ.I18n.t('ui.energyLow') : WJ.I18n.t('ui.rainbowNeed'), 'energy');
        } else {
          WJ.UI.toast(WJ.I18n.t('ui.weatherSet', { w: WJ.I18n.t('weather.' + type) }));
        }
      },
      onAdvice: function (rid, aid) {
        if (!world) return;
        const res = WJ.World.giveAdvice(world, rid, aid);
        if (!res.ok && res.reason === 'already') return;
        markDirty();
      },
      onSettings: function (key, value) {
        if (key === 'reset') {
          try { localStorage.removeItem('wj_save_v1'); localStorage.removeItem('wj_save_v1_backup'); } catch (e) {}
          location.reload();
          return;
        }
        meta.settings[key] = value;
        if (key === 'quality') {
          if (value === 'auto') { WJ.Quality.enableAuto(true); }
          else { WJ.Quality.enableAuto(false); WJ.Quality.set(value, true); WJ.Render.applyTier(value); }
        }
        if (key === 'music' || key === 'sound') WJ.Audio.setVolumes({ music: meta.settings.music, sound: meta.settings.sound });
        if (key === 'lang') { WJ.I18n.setLang(value); WJ.UI.setText(); WJ.UI.buildSettings(); }
        if (key === 'tutorialDone') meta.settings.tutorialDone = true;
        markDirty();
      },
    });
    // видимость
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        WJ.Audio.suspend();
        saveNow();
        if (state === 'play') setState('pause');
      } else {
        WJ.Audio.resume();
      }
    });
    window.addEventListener('pagehide', saveNow);
    window.addEventListener('resize', WJ.Render.resize);
    // первый тап — звук
    const unlockAudio = function () { WJ.Audio.unlock(); window.removeEventListener('pointerdown', unlockAudio); };
    window.addEventListener('pointerdown', unlockAudio);
    // меню
    document.getElementById('menu-play').addEventListener('click', function () {
      WJ.Audio.unlock();
      const ap = meta.activePlanet || 0;
      // тяжёлая генерация мира — под оверлеем, чтобы экран не «замерзал»
      const bootEl = document.getElementById('boot');
      const bootText = document.getElementById('boot-text');
      if (bootEl) {
        bootEl.classList.remove('hidden');
        bootEl.style.opacity = '1';
        if (bootText) bootText.textContent = WJ.I18n.t('ui.generating');
      }
      setTimeout(function () {
        try {
          if (meta.planets[ap]) startPlanet(ap);
          else newPlanet(ap);
        } finally {
          if (bootEl) { bootEl.style.opacity = '0'; setTimeout(function () { bootEl.classList.add('hidden'); }, 600); }
        }
      }, 40);
    });
    document.getElementById('menu-ach').addEventListener('click', function () {
      WJ.UI.showAchievements(meta.achievements);
    });
    document.getElementById('menu-lang').addEventListener('click', function () {
      const next = { ru: 'uz', uz: 'en', en: 'ru' }[WJ.I18n.lang] || 'ru';
      WJ.I18n.setLang(next);
      meta.settings.lang = next;
      WJ.UI.setText();
      WJ.UI.setSettings(meta.settings);
      markDirty();
    });
    // ежедневный подарок
    const today = new Date().toDateString();
    if (meta.lastGiftDay !== today) {
      meta.lastGiftDay = today;
      meta.stars += C.STARS_DAILY;
      setTimeout(function () { WJ.UI.toast(WJ.I18n.t('ui.dailyGift', { n: C.STARS_DAILY }), 'star'); }, 1500);
      markDirty();
    }
  }

  // ---------- Достижения ----------
  function unlock(id) {
    if (meta.achievements.indexOf(id) >= 0) return;
    meta.achievements.push(id);
    WJ.UI.toast(WJ.I18n.t('ach.' + id), 'star');
    WJ.Audio.chime();
    markDirty();
  }
  function checkAchievements(w) {
    if (!w) return;
    if (w.hasBuilding && w.hasBuilding('campfire')) unlock('first_fire');
    if (w.flags.homeBuilt) unlock('first_home');
    if (w.flags.wedding) unlock('first_wedding');
    if (w.flags.birth) unlock('first_birth');
    if (w.flags.rainbowSeen) unlock('rainbow_seen');
    if (w.quarrelDays >= 5) unlock('no_quarrel_5');
    if (w.flags.ignoredAdvice) unlock('ignored_advice');
    if (w.flags.stormSurvived) unlock('storm_survived');
    if ((w.achCount.harvest || 0) >= 10) unlock('harvest_10');
    if (w.residents.length >= 12) unlock('pop_12');
    if (w.residents.length >= 24) unlock('pop_24');
    if (w.flags.elder) unlock('elder_first');
    if (w.flags.departure) unlock('stars_3');
    if (w.flags.reconciliation) unlock('reconciliation');
    if (w.flags.festivalHeld) unlock('festival_held');
    if (w.hasBuilding('lighthouse')) unlock('lighthouse');
    if (w.hasBuilding('school')) unlock('school_built');
    if ((meta.planets || []).length >= 3) unlock('full_shelf');
    if (w.chronicle.entries.length >= 50) unlock('chronicle_50');
    if (w.flags.discoveryShell) unlock('discovery_shell');
    if (w.flags.discoveryStar) unlock('discovery_star');
    if ((w.achCount.planted || 0) >= 3) unlock('three_plants');
    if (w.day >= 30) unlock('day_30');
    // совет, который житель послушал и получилось хорошо -> мудрый совет
    if (w.residents.some(function (r) { return r.adviceToday && r.adviceToday.followed && r.adviceToday.ok; })) unlock('wise_advice');
    if (w.residents.some(function (r) { return r.adviceToday && !r.adviceToday.followed; })) w.flags.ignoredAdvice = true;
  }

  // ---------- Главный цикл ----------
  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;
    const simActive = state === 'play';
    if (world && simActive) {
      // фиксированный шаг 10 Гц
      acc += dt;
      const STEP = 1 / C.SIM_HZ;
      let guard = 0;
      while (acc >= STEP && guard++ < 8) {
        WJ.World.update(world, STEP * WJ.UI.speed);
        WJ.World.advanceConstruction(world, STEP * WJ.UI.speed);
        acc -= STEP;
      }
      WJ.UI.updateHud(world);
      // аудио-состояние
      const part = world.dayT < 0.07 ? 'morning' : (world.dayT < 0.42 ? 'day' : (world.dayT < 0.52 ? 'evening' : 'night'));
      WJ.Audio.setDayPart(part);
      WJ.Audio.frame(ts / 1000);
      WJ.Residents.frame(dt);
      // все жители ушли — мягкая «Новая банка»
      if (world.residents.length === 0 && !world._newJarAsked) {
        world._newJarAsked = true;
        const slot = meta.activePlanet;
        setTimeout(function () {
          if (!world || world.residents.length > 0) return;
          WJ.UI.modal(WJ.I18n.t('ui.newPlanet') + '?', function (ok) {
            if (!world || world.residents.length > 0) return;
            newPlanet(slot);
          });
        }, 3000);
      }
      if (debug) {
        WJ.UI.updateDebug('FPS ' + Math.round(1 / Math.max(dt, 0.001)) + ' | DC ' + WJ.Render.drawCalls +
          ' | pop ' + world.residents.length + ' | tier ' + WJ.Quality.tier + ' | seed ' + world.seed);
      }
    }
    if (world || state === 'menu') {
      try { WJ.Render.frame(dt, world ? WJ.World.weatherVisual() : { dayT: 0.3 }); } catch (e) { WJ.Errors.logTag('render.frame', e); }
    }
  }

  function start(saved) {
    WJ.Errors.install();
    boot(saved);
    bindBus();
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
    WJ.YSDK.init().then(function () {
      WJ.YSDK.loadingReady();
      const lang = WJ.YSDK.getLang();
      if (!meta || (!meta.settings.lang && lang)) {
        WJ.I18n.setLang(lang);
        WJ.UI.setText();
      }
    });
  }

  return {
    start, saveNow,
    get state() { return state; },
    get world() { return world; },
    get meta() { return meta; },
    get debug() { return debug; },
    newPlanet, startPlanet, setState,
  };
})();
