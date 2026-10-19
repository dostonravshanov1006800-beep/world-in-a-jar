// FILE: js/main.js
// Точка входа: DOMContentLoaded, загрузка сохранения, запуск игры.
(function () {
  function onReady() {
    let saved = null;
    try { saved = WJ.Save.load(); } catch (e) { WJ.Errors.record('main.load', e); saved = null; }
    // язык: из настроек или из браузера/SDK
    const lang = (saved && saved.settings && saved.settings.lang) || null;
    WJ.I18n.setLang(lang || (navigator.language || 'ru').slice(0, 2));
    if (WJ.I18n.lang === 'en' && !lang && /^(ru|uz)/i.test(navigator.language || '')) WJ.I18n.setLang(navigator.language.slice(0, 2).toLowerCase());
    WJ.Game.start(saved);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
