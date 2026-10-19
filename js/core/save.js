// FILE: js/core/save.js
// Сохранения: Yandex player.setData + localStorage, резервная копия, валидация, миграции.
WJ.Save = (function () {
  const KEY = 'wj_save_v1', KEY_BAK = 'wj_save_v1_backup';
  let timer = null, dirty = false, lastWritten = '';
  const U = WJ.Util;

  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  function sanitizeNumber(v, def, min, max) {
    v = U.finite(v, def);
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  }
  // Валидация: числа без NaN/Infinity, ограничение длин массивов
  function validate(state) {
    if (!state || typeof state !== 'object') return null;
    try {
      state.version = U.finite(state.version, 1, 1, 99) | 0;
      if (!Array.isArray(state.planets)) state.planets = [];
      state.planets = state.planets.slice(0, WJ.Config.PLANETS_MAX);
      state.activePlanet = U.finite(state.activePlanet, 0, 0, Math.max(0, state.planets.length - 1)) | 0;
      state.stars = U.finite(state.stars, 0, 0, 1e9);
      if (!Array.isArray(state.achievements)) state.achievements = [];
      if (!Array.isArray(state.stories)) state.stories = [];
      if (!state.settings || typeof state.settings !== 'object') state.settings = {};
      const s = state.settings;
      s.lang = ['ru', 'uz', 'en'].indexOf(s.lang) >= 0 ? s.lang : null;
      s.quality = ['auto', 'high', 'medium', 'low'].indexOf(s.quality) >= 0 ? s.quality : 'auto';
      s.sound = s.sound !== false; s.music = s.music !== false;
      s.vibro = s.vibro !== false;
      s.textSize = ['small', 'normal', 'large'].indexOf(s.textSize) >= 0 ? s.textSize : 'normal';
      s.reduceMotion = !!s.reduceMotion;
      s.tutorialDone = !!s.tutorialDone;
      state.lastSeenTs = U.finite(state.lastSeenTs, Date.now());
      return state;
    } catch (e) { return null; }
  }
  function migrate(state) {
    if (!state || !state.version) return state;
    // v1 — актуальная; будущие версии добавят шаги здесь.
    return state;
  }

  function load() {
    let raw = lsGet(KEY), state = null;
    if (raw) {
      try { state = validate(migrate(JSON.parse(raw))); } catch (e) { state = null; }
    }
    if (!state) {
      raw = lsGet(KEY_BAK);
      if (raw) { try { state = validate(migrate(JSON.parse(raw))); } catch (e) { state = null; } }
    }
    // Попытка подтянуть данные игрока Яндекса (если SDK доступен)
    if (!state && !WJ.YSDK.mock) {
      // асинхронно не загружаем — игрок мог уже играть; используется в ensureCloud
    }
    return state;
  }

  function write(state) {
    state = validate(state);
    if (!state) return false;
    state.lastSeenTs = Date.now();
    const json = JSON.stringify(state);
    if (json === lastWritten) return true;
    // резервная копия предыдущего
    const prev = lsGet(KEY);
    if (prev) lsSet(KEY_BAK, prev);
    const okLocal = lsSet(KEY, json);
    // облако (не блокирует)
    try {
      const player = WJ.YSDK.getPlayer();
      if (player && player.setData) player.setData({ wj: json }, false);
    } catch (e) {}
    if (okLocal) lastWritten = json;
    return okLocal;
  }
  function schedule() {
    dirty = true;
    if (timer) return;
    timer = setInterval(function () {
      if (!dirty) return;
      dirty = false;
      WJ.Bus.emit('save:flush');
    }, WJ.Config.SAVE_INTERVAL * 1000);
  }
  function flushNow() {
    if (timer) { clearInterval(timer); timer = null; }
    WJ.Bus.emit('save:flush');
  }
  function onHidden() { flushNow(); }

  return { load, save: write, schedule, flushNow, onHidden, validate, migrate, _write: write };
})();
