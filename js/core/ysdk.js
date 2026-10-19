// FILE: js/core/ysdk.js
// Yandex Games SDK с авто-mock: на file:// или при отсутствии SDK за 3 секунды
// включается полный локальный режим. Игра не падает ни при каких ответах SDK.
WJ.YSDK = (function () {
  let ysdk = null, mock = false, ready = false, initPromise = null;
  let gpStarted = false, lastInterstial = 0, bootTime = Date.now();

  function init() {
    if (initPromise) return initPromise;
    initPromise = new Promise(function (resolve) {
      let settled = false;
      function finish(sdk, isMock) {
        if (settled) return;
        settled = true;
        ysdk = sdk; mock = isMock; ready = true;
        resolve(WJ.YSDK);
      }
      // SDK нужен только на платформе Яндекс Игр; на file://, localhost и внешних
      // хостингах (GitHub Pages и т.п.) сразу включаем полный локальный режим —
      // никаких сетевых запросов и ошибок в консоли.
      const isYandexHost = /(^|\.)yandex\.(net|ru|com)$/.test(location.hostname) || /\.games\.s3\.yandex\.net$/.test(location.hostname);
      const isHttp = (location.protocol === 'http:' || location.protocol === 'https:') && isYandexHost;
      if (isHttp) {
        // Пытаемся подгрузить SDK платформы; при ошибке/таймауте — mock.
        if (typeof YaGames !== 'undefined') {
          try {
            YaGames.init().then(function (sdk) { finish(sdk, false); })
            .catch(function () { finish(null, true); });
          } catch (e) { finish(null, true); }
        } else {
          const s = document.createElement('script');
          // Абсолютный URL SDK Яндекс Игр; если недоступен — работаем на mock
          s.src = 'https://sdk.games.s3.yandex.net/sdk.js';
          s.onerror = function () {
            // запасной вариант: относительный путь (хостинг Яндекс Игр)
            const s2 = document.createElement('script');
            s2.src = '/sdk.js';
            s2.onload = s.onload;
            s2.onerror = function () { finish(null, true); };
            document.head.appendChild(s2);
          };
          s.onload = function () {
            try {
              YaGames.init().then(function (sdk) { finish(sdk, false); })
              .catch(function () { finish(null, true); });
            } catch (e) { finish(null, true); }
          };
          s.onerror = function () { finish(null, true); };
          document.head.appendChild(s);
        }
        setTimeout(function () { finish(null, true); }, 3000);
      } else {
        finish(null, true);
      }
    });
    return initPromise;
  }

  function safeCall(fnName, fallback) {
    try {
      if (mock || !ysdk) return fallback && fallback();
      const f = ysdk[fnName];
      return f ? f.call(ysdk) : (fallback && fallback());
    } catch (e) { return fallback && fallback(); }
  }

  function getLang() {
    if (mock || !ysdk) return (navigator.language || 'en').slice(0, 2).toLowerCase();
    try { return (ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang || 'en').slice(0, 2).toLowerCase(); }
    catch (e) { return 'en'; }
  }
  function loadingReady() {
    if (mock || !ysdk) return;
    try { ysdk.features && ysdk.features.LoadingAPI && ysdk.features.LoadingAPI.ready(); } catch (e) {}
  }
  function gameplayStart() {
    if (gpStarted) return;
    gpStarted = true;
    if (mock || !ysdk) return;
    try { ysdk.features && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.start(); } catch (e) {}
  }
  function gameplayStop() {
    if (!gpStarted) return;
    gpStarted = false;
    if (mock || !ysdk) return;
    try { ysdk.features && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.stop(); } catch (e) {}
  }
  // Межстраничная: не чаще 1 раза в 180 с и не в первые 2 минуты
  function showInterstitial(cb) {
    const now = Date.now();
    if (now - bootTime < 120000 || now - lastInterstial < 180000) { cb && cb(false); return; }
    lastInterstial = now;
    if (mock || !ysdk) {
      // заглушка: «реклама» на 1 секунду
      setTimeout(function () { cb && cb(false); }, 1000);
      return;
    }
    try {
      ysdk.adv.showFullscreenAdv({ callbacks: {
        onClose: function () { cb && cb(false); },
        onError: function () { cb && cb(true); },
      }});
    } catch (e) { cb && cb(true); }
  }
  // Вознаграждаемая: награда строго один раз в onRewarded
  function showRewarded(onReward, onDone) {
    let rewarded = false;
    if (mock || !ysdk) {
      setTimeout(function () { rewarded = true; onReward && onReward(); onDone && onDone(); }, 800);
      return;
    }
    try {
      ysdk.adv.showRewardedVideo({ callbacks: {
        onRewarded: function () { if (!rewarded) { rewarded = true; onReward && onReward(); } },
        onClose: function () { onDone && onDone(); },
        onError: function () { onDone && onDone(); },
      }});
    } catch (e) { onDone && onDone(); }
  }
  function getPlayer() {
    // Обёртка над player.setData/getData; в mock — localStorage
    if (mock || !ysdk) return null;
    try { return ysdk.getPlayer({ scopes: false }) || null; } catch (e) { return null; }
  }
  return {
    init, getLang, loadingReady, gameplayStart, gameplayStop, showInterstitial, showRewarded, getPlayer,
    get ready() { return ready; }, get mock() { return mock || !ysdk; },
  };
})();
