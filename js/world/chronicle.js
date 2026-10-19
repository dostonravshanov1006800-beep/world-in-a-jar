// FILE: js/world/chronicle.js
// Летопись: журнал событий с датой, иконкой, текстом; фильтры; тап — камера летит.
WJ.Chronicle = (function () {
  const U = WJ.Util;
  let entries = [];
  const rng = WJ.Rng.create(777);

  const PLACE = {
    ru: ['у ручья', 'на холме', 'у костра', 'на площади', 'у колодца', 'в поле', 'у маяка', 'на берегу'],
    uz: ['soy bo\u2019yida', 'tepada', 'gulxan yonida', 'maydonda', 'quduq yonida', 'dalada', 'mayak yonida', 'qirg\u2019oqda'],
    en: ['by the brook', 'on the hill', 'by the campfire', 'on the square', 'by the well', 'in the field', 'by the lighthouse', 'on the shore'],
  };

  function add(kind, familyKey, params, icon, day) {
    const lang = WJ.I18n.lang;
    const places = PLACE[lang] || PLACE.en;
    params = Object.assign({}, params);
    if (params.place === undefined) params.place = places[rng.int(0, places.length - 1)];
    if (params.weather === undefined) params.weather = WJ.I18n.t('weather.' + (WJ.Weather.current || 'clear'));
    const text = WJ.I18n.tRand(familyKey, rng, params);
    const cat = catOf(kind);
    entries.push({ day: day || 0, kind, cat, icon, text });
    if (entries.length > 400) entries.shift();
    WJ.Bus.emit('chronicle:added', entries[entries.length - 1]);
    return entries[entries.length - 1];
  }
  function catOf(kind) {
    if (kind === 'advice_ok' || kind === 'advice_ignored') return 'advice';
    if (['wedding', 'birth', 'quarrel', 'reconciliation', 'gift', 'move', 'festival'].indexOf(kind) >= 0) return 'bonds';
    if (['harvest', 'drought', 'flood', 'storm', 'miracle', 'discovery'].indexOf(kind) >= 0) return 'nature';
    return 'all';
  }
  function filter(cat) {
    if (cat === 'all') return entries;
    return entries.filter(function (e) { return e.cat === cat; });
  }
  function serialize() { return entries.slice(-200); }
  function deserialize(arr) {
    entries = [];
    (arr || []).forEach(function (e) {
      if (e && typeof e.text === 'string' && e.text.length < 500) {
        entries.push({ day: U.finite(e.day, 0), kind: String(e.kind || '').slice(0, 30), cat: String(e.cat || 'all').slice(0, 20), icon: String(e.icon || 'book').slice(0, 30), text: e.text.slice(0, 300) });
      }
    });
  }
  function clear() { entries = []; }
  return { add, filter, serialize, deserialize, clear, get entries() { return entries; } };
})();
