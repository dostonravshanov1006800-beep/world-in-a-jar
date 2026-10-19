// FILE: js/core/errors.js
// Глобальный перехват ошибок: лог в память (до 50), мягкий тост, игра продолжает работать.
WJ.Errors = (function () {
  const log = [];
  let toastTimer = null, lastShown = 0;
  function record(kind, message) {
    const t = Date.now();
    log.push({ t, kind, message: String(message).slice(0, 300) });
    if (log.length > 50) log.shift();
    try { console.warn('[WJ]', kind, message); } catch (e) {}
  }
  function windowOnError(msg, src, line, col, err) {
    record('error', (msg || '') + (src ? ' @' + src + ':' + line : '') + (err && err.stack ? ' :: ' + String(err.stack).slice(0, 200) : ''));
    softToast();
    return false; // не глушим стандартное поведение
  }
  function rejection(ev) {
    const r = ev && ev.reason;
    record('rejection', (r && (r.stack || r.message)) || String(r));
    softToast();
  }
  function softToast() {
    const now = Date.now();
    if (now - lastShown < 10000) return; // не спамим
    lastShown = now;
    try {
      if (WJ.UI && WJ.UI.toast) { WJ.UI.toast(WJ.I18n.t('ui.errToast'), 'warn'); return; }
    } catch (e) {}
    // UI ещё не готов — попробуем позже
    clearTimeout(toastTimer);
    toastTimer = setTimeout(softToast, 1500);
  }
  function logTag(tag, err) { record('catch', tag + ': ' + ((err && err.message) || err)); }
  function debugWarn(msg) {
    if (!WJ.Game || WJ.Game.debug) { try { console.warn('[WJ i18n]', msg); } catch (e) {} }
  }
  function install() {
    window.addEventListener('error', windowOnError);
    window.addEventListener('unhandledrejection', rejection);
  }
  return { install, record, logTag, debugWarn, getLog: function () { return log.slice(); } };
})();
