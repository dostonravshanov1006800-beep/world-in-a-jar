// FILE: js/ui/icons.js
// SVG-иконки одного стиля: скруглённые линии 2px. Никаких эмодзи.
WJ.Icons = (function () {
  function wrap(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  const I = {
    // время суток / дни
    dawn: '<path d="M12 3v3M4.6 6.6l2 2M3 14h3M18 14h3M17.4 8.6l2-2M8 18a4 4 0 0 1 8 0M2 21h20"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    day: '<circle cx="12" cy="12" r="4.5"/><path d="M3 12h2M19 12h2M12 3v2M12 19v2"/>',
    dusk: '<path d="M8 17a4 4 0 0 1 8 0M2 21h20M12 3l3 5h-6z"/>',
    night: '<path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/>',
    // погода
    rain: '<path d="M17 9a5 5 0 0 0-10 .8A4 4 0 0 0 8 18h9a4 4 0 0 0 0-8z"/><path d="M8 19.5v2M12 19.5v2M16 19.5v2"/>',
    wind: '<path d="M3 8h9a3 3 0 1 0-3-3M3 13h13a3 3 0 1 1-3 3M3 18h7"/>',
    snow: '<path d="M12 3v18M4 7.5l16 9M20 7.5l-16 9M12 7l-2-2M12 7l2-2M12 17l-2 2M12 17l2 2"/>',
    fog: '<path d="M4 9h16M6 13h13M4 17h15M8 5h9"/>',
    storm: '<path d="M17 8a5 5 0 0 0-10 .8A4 4 0 0 0 8 17h9a4 4 0 0 0 0-8z"/><path d="M12 12l-2.5 5h3L10 22"/>',
    rainbow: '<path d="M4 17a8 8 0 0 1 16 0M8 17a4 4 0 0 1 8 0M12 17a0.5 0.5 0 0 1 0 0M7 10l-1-1M12 8V6M17 10l1-1"/>',
    // энергия/гармония
    energy: '<path d="M13 2L5 13h5l-1 9 8-11h-5z"/>',
    harmony: '<path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 3.5c0 4-4 7.5-9 11.5z"/>',
    // кнопки
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="M7 5l12 7-12 7z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h14"/>',
    shelf: '<path d="M3 8h18M3 16h18M4 8v8M9 8v4M14 8v5M19 8v8"/>',
    pop: '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M4 20a5 5 0 0 1 10 0M14 17a4 4 0 0 1 6 3"/>',
    // жители/нужды
    food: '<path d="M6 4v6a3 3 0 0 0 6 0V4M9 4v16M15 4c2 0 3 2 3 5s-1 4-3 4v7"/>',
    rest: '<path d="M4 6h9v8H4zM13 10h4a3 3 0 0 1 3 3v1M6 14v6M11 14v6"/>',
    safety: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
    social: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="15" r="3"/><path d="M8 12v4h5"/>',
    meaning: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z"/>',
    heart: '<path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 3.5c0 4-4 7.5-9 11.5z"/>',
    // постройки/события
    home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
    fire: '<path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1.5 1-2 1 1 3 3 3 6a6 6 0 0 1-12 0c0-4 4-7 6-11z"/>',
    wheat: '<path d="M12 21V9M12 9c-2 0-4-2-4-4 2 0 4 1 4 4zM12 9c2 0 4-2 4-4-2 0-4 1-4 4zM12 14c-2 0-4-2-4-4M12 14c2 0 4-2 4-4"/>',
    baby: '<circle cx="12" cy="9" r="4"/><path d="M6 20a6 6 0 0 1 12 0M9 8.5h.01M15 8.5h.01M10 11.5a3 3 0 0 0 4 0"/>',
    cane: '<path d="M8 4v10a4 4 0 0 0 8 0V9M16 9l3 1"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z"/>',
    dove: '<path d="M4 8c3-3 6-3 8-1l5-4v6c0 6-4 10-9 10l2-5-6-6z"/>',
    hands: '<path d="M12 6a3 3 0 0 0-6 0v7M12 6a3 3 0 0 1 6 0v7M6 13l-2 2 5 5a5 5 0 0 0 7-1l2-3"/>',
    confetti: '<path d="M4 5l3 3M19 4l-2 4M12 10l-8 9 5 1M12 10l7 7-4 2M12 3v3"/>',
    lighthouse: '<path d="M9 21l1-13h4l1 13zM8 8h8M10 4h4l-2-2zM12 8v13M11 12h2"/>',
    shell: '<path d="M12 4a8 8 0 0 1 8 8c0 5-4 8-8 8-4 0-8-3-8-8M12 4c0 6-1 12-4 16M12 4c0 6 1 12 4 16"/>',
    drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
    cloud: '<path d="M17 9a5 5 0 0 0-10 .8A4 4 0 0 0 8 17h9a4 4 0 0 0 0-8z"/>',
    moon: '<path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/><path d="M15 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    tree: '<path d="M12 3l5 6h-3l4 6h-4v6M12 3L7 9h3l-4 6h4v6"/>',
    music: '<path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>',
    // советы
    adv_home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
    adv_talk: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    adv_risk: '<path d="M12 3l7 16-7-4-7 4z"/>',
    adv_wait: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 3h6"/>',
    adv_build: '<path d="M3 21V9l6-4v16M9 21V8l6-4v17M15 21V9l6-3v15M3 21h18"/>',
    adv_plant: '<path d="M12 21v-8M12 13c0-4 3-6 6-6 0 4-2 6-6 6zM12 13c0-4-3-6-6-6 0 4 2 6 6 6z"/>',
    adv_forgive: '<path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 3.5c0 4-4 7.5-9 11.5z"/><path d="M8 11l3 3 5-6"/>',
    adv_confess: '<path d="M12 4a8 8 0 0 1 8 8v8l-8-3-8 3v-8a8 8 0 0 1 8-8z"/><path d="M10 9l4 4M14 9l-4 4"/>',
    adv_rest: '<path d="M4 6h9v8H4zM13 10h4a3 3 0 0 1 3 3v1M6 14v6M11 14v6"/>',
    adv_passion: '<path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1.5 1-2 1 1 3 3 3 6a6 6 0 0 1-12 0c0-4 4-7 6-11z"/>',
    adv_trust: '<path d="M7 11v7a5 5 0 0 0 10 0v-7M7 11a5 5 0 0 1 10 0M12 6v3"/>',
    adv_leave: '<path d="M12 4a8 8 0 1 0 8 8M12 4V2M12 4l6 2M12 4l2 6"/>',
    adv_save: '<path d="M5 8h14v12H5zM5 8l2-4h10l2 4M10 12h4"/>',
    adv_share: '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.5 11l6-3.5M8.5 13l6 3.5"/>',
    adv_learn: '<path d="M4 5a8 4 0 0 1 16 0v9a8 4 0 0 1-16 0zM4 5a8 4 0 0 0 16 0M9 16h6"/>',
    adv_slow: '<circle cx="12" cy="13" r="8"/><path d="M12 9v5h4M9 3h6"/>',
    adv_help: '<path d="M12 5a7 7 0 0 0-4 12.7V21h8v-3.3A7 7 0 0 0 12 5z"/><path d="M10 2h4M9 10a3 3 0 1 1 4 2.7c-.8.5-1 1.1-1 2"/>',
    adv_fish: '<path d="M3 12c4-5 9-6 13-4l3-3v10l-3-3c-4 2-9 1-13-4zM8 10.5h.01M16 12h3"/>',
    adv_dance: '<circle cx="14" cy="5" r="2.5"/><path d="M14 8l-5 6 2 6M14 8l3 4 3-1M12 14h6l-1 6M7 15l-3 5"/>',
    adv_sky: '<path d="M3 17c3 0 4-2 8-2s6 2 10-3M6 8l2 2M12 6v2M18 8l-2 2"/>',
    adv_peace: '<path d="M12 5a3 3 0 0 0-6 0v7M12 5a3 3 0 0 1 6 0v7M6 12l-2 2 5 5a5 5 0 0 0 7-1l2-3"/>',
    adv_brave: '<path d="M6 21V9l6-5 6 5v12M9 21v-5h6v5M12 8h.01"/>',
    adv_careful: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2M12 3.5V7"/>',
    adv_party: '<path d="M4 5l3 3M19 4l-2 4M12 10l-8 9 5 1M12 10l7 7-4 2M12 3v3"/><path d="M7 17a2 2 0 1 0 4 0"/>',
    // разное
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    lang: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"/>',
    gift: '<path d="M4 10h16v11H4zM2 6h20v4H2zM12 6v15M12 6c-3 0-5-1-5-2.5S10 1 12 6c2-5 5-4 5-2.5S15 6 12 6z"/>',
  };
  // Синонимы для погоды
  I.weather_clear = I.day; I.weather_sun = I.sun; I.weather_rain = I.rain; I.weather_wind = I.wind;
  I.weather_snow = I.snow; I.weather_fog = I.fog; I.weather_storm = I.storm; I.weather_rainbow = I.rainbow;
  I.speed1 = '<path d="M9 5l7 7-7 7z"/>';
  I.speed2 = '<path d="M5 5l6 7-6 7zM13 5l6 7-6 7z"/>';
  I.tod_dawn = I.dawn; I.tod_day = I.day; I.tod_dusk = I.dusk; I.tod_night = I.night;
  I.ev_wheat = I.wheat; I.ev_baby = I.baby; I.ev_heart = I.heart; I.ev_star = I.star;
  return { get: function (name) { return I[name] ? wrap(I[name]) : wrap(I.book); }, wrap, raw: I };
})();
