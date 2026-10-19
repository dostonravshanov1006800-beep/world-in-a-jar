// FILE: js/render/quality.js
// Тиры качества + автоопределение по FPS (первые 3 секунды, далее не чаще раза в 10 с).
WJ.Quality = (function () {
  const U = WJ.Util;
  let tier = 'medium', manual = false;
  let frames = 0, acc = 0, lastAdjust = 0, autoEnabled = true;

  function detectInitial() {
    // Эвристика: мобильные и маленькие экраны стартуют с medium
    const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    const cores = navigator.hardwareConcurrency || 4;
    if (mob && cores <= 4) return 'medium';
    if (mob) return 'high'; // современные телефоны тянут high; авто-тюнинг снизит при лагах
    return 'high';
  }
  function set(t, isManual) {
    if (isManual) manual = true;
    if (t !== tier) { tier = t; WJ.Bus.emit('quality:changed', tier); }
    lastAdjust = performance.now();
  }
  function init() {
    tier = detectInitial();
    return tier;
  }
  // Вызывается каждый кадр с dt
  function frame(dt) {
    if (manual || !autoEnabled) return;
    const now = performance.now();
    if (now - lastAdjust < 10000) return;
    frames++; acc += dt;
    if (acc >= 1) {
      const fps = frames / acc;
      frames = 0; acc = 0;
      if (fps < 40) {
        const order = ['high', 'medium', 'low'];
        const i = order.indexOf(tier);
        if (i < 2) set(order[i + 1]);
      }
    }
  }
  function enableAuto(v) { autoEnabled = !!v; if (v) manual = false; }
  return {
    init, set, frame, enableAuto,
    get tier() { return tier; },
    get manual() { return manual; },
    cfg: function () { return WJ.Config.tiers[tier]; },
  };
})();
