// FILE: js/ui/ui.js
// Интерфейс: HUD, карусель погоды, карточка жителя с советами, Летопись,
// Письмо дня, полка банок, достижения, настройки, обучение, тосты, debug.
WJ.UI = (function () {
  const U = WJ.Util, C = WJ.Config;
  const $ = function (id) { return document.getElementById(id); };
  let currentResident = null, chronFilter = 'all', tutStep = -1, tutHints = [];
  let onWeather = null, onAdvice = null, onOpenResident = null;
  let speed = 1;

  function iconSvg(el, name) { if (el) el.innerHTML = WJ.Icons.get(name); }

  function setText() {
    iconSvg($('ic-tod'), 'day');
    iconSvg($('ic-harmony'), 'harmony');
    iconSvg($('ic-energy'), 'energy');
    iconSvg($('ic-pause'), 'pause');
    iconSvg($('ic-speed'), 'speed1');
    iconSvg($('ic-settings'), 'settings');
    iconSvg($('ic-pop'), 'pop');
    $('btn-chronicle').textContent = WJ.I18n.t('ui.chronicle');
    $('btn-shelf').textContent = WJ.I18n.t('ui.shelf');
    $('chron-title').textContent = WJ.I18n.t('ui.chronicle');
    $('letter-title').textContent = WJ.I18n.t('ui.letterTitle');
    $('letter-ok').textContent = WJ.I18n.t('ui.ok');
    $('shelf-title').textContent = WJ.I18n.t('ui.shelfTitle');
    $('ach-title').textContent = WJ.I18n.t('ui.achievements');
    $('settings-title').textContent = WJ.I18n.t('ui.settingsTitle');
    $('menu-title').textContent = WJ.I18n.t('ui.menuTitle');
    $('menu-sub').textContent = WJ.I18n.t('ui.menuSub');
    $('menu-play').textContent = WJ.I18n.t('ui.play');
    $('menu-ach').textContent = WJ.I18n.t('ui.menuAch');
    $('menu-lang').textContent = WJ.I18n.t('ui.sLang') + ': ' + WJ.I18n.lang.toUpperCase();
    $('advice-title').textContent = WJ.I18n.t('ui.adviceTitle');
    $('modal-cancel').textContent = WJ.I18n.t('ui.cancel');
    $('modal-ok').textContent = WJ.I18n.t('ui.yes');
    $('tutorial-skip').textContent = WJ.I18n.t('ui.tutSkip');
    $('tutorial-next').textContent = WJ.I18n.t('ui.tutNext');
    buildWeatherDock();
    buildChronFilters();
    buildSettings();
  }

  // ---------- HUD ----------
  function updateHud(w) {
    const t = w.dayT;
    const part = t < 0.07 ? 'dawn' : (t < 0.42 ? 'day' : (t < 0.52 ? 'dusk' : 'night'));
    iconSvg($('ic-tod'), 'tod_' + part);
    $('day-num').textContent = WJ.I18n.t('ui.day') + ' ' + w.day;
    $('harmony-num').textContent = Math.round(w.harmony);
    const ring = $('harmony-ring');
    ring.style.strokeDashoffset = String(94.2 * (1 - w.harmony / 100));
    const en = Math.round(WJ.Weather.energy);
    $('energy-bar').style.width = en + '%';
    $('energy-num').textContent = en;
    $('pop-num').textContent = w.residents.length;
    $('btn-chronicle').textContent = WJ.I18n.t('ui.chronicle') + ' (' + w.chronicle.entries.length + ')';
    // карусель: цены и доступность
    const dock = $('weather-dock');
    for (let i = 0; i < dock.children.length; i++) {
      const b = dock.children[i];
      const type = b.dataset.type;
      const wc = C.weather[type];
      b.classList.toggle('locked', WJ.Weather.energy < wc.cost);
      b.classList.toggle('on', WJ.Weather.current === type);
    }
  }

  function buildWeatherDock() {
    const dock = $('weather-dock');
    dock.innerHTML = '';
    C.weatherOrder.forEach(function (type) {
      const wc = C.weather[type];
      const b = document.createElement('button');
      b.className = 'wbtn';
      b.dataset.type = type;
      b.innerHTML = '<span class="ic">' + WJ.Icons.get('weather_' + type) + '</span><span class="cost">' + wc.cost + '</span>';
      b.title = WJ.I18n.t('weather.' + type);
      b.addEventListener('click', function () {
        WJ.Audio.click();
        if (onWeather) onWeather(type);
      });
      dock.appendChild(b);
    });
  }

  // ---------- Карточка жителя ----------
  function showResident(w, r) {
    currentResident = r;
    const card = $('resident-card');
    card.classList.remove('hidden');
    $('card-name').textContent = r.name;
    const mood = r.mood > 80 ? 'great' : (r.mood > 60 ? 'good' : (r.mood > 40 ? 'ok' : (r.mood > 20 ? 'low' : 'bad')));
    const moodFace = { great: '◕‿◕', good: '•‿•', ok: '•_•', low: '•︿•', bad: '◕_◕' };
    $('card-mood').textContent = moodFace[mood];
    $('card-mood').title = WJ.I18n.t('ui.mood.' + mood);
    $('card-sub').textContent = WJ.I18n.t('ui.age.' + r.ageStage) + ' · ' + WJ.I18n.t('ui.day') + ' ' + Math.floor(r.age);
    // аватар: мини-рендер канвы с цветами одежды
    const av = $('card-avatar');
    av.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = ['#f7d7c2', '#efc4a5', '#e0ab88', '#c98d63', '#a96e4c', '#8d5a3c', '#6e4429', '#54331f'][r.app.skin % 8];
    ctx.beginPath(); ctx.arc(32, 20, 12, 0, Math.PI * 2); ctx.fill();
    const clothCols = ['#c05a4a', '#4a7ac0', '#5aa06a', '#d8a848', '#8a5ac0', '#d06a9a', '#4aa8a0', '#8a6a4a', '#b0b0b8', '#58703a', '#c08a5a', '#7a4a6a'];
    ctx.fillStyle = clothCols[r.app.clothA % 12];
    ctx.beginPath(); ctx.arc(32, 50, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1c12';
    ctx.beginPath(); ctx.arc(32, 13, 12, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1410';
    ctx.beginPath(); ctx.arc(27, 20, 1.8, 0, 7); ctx.arc(37, 20, 1.8, 0, 7); ctx.fill();
    av.appendChild(cv);
    // нужды
    const needs = $('card-needs');
    needs.innerHTML = '';
    ['food', 'rest', 'safety', 'social', 'meaning'].forEach(function (k) {
      const d = document.createElement('div');
      d.className = 'need';
      const pct = Math.round(r.needs[k]);
      d.innerHTML = '<div class="nlabel"><span class="ic">' + WJ.Icons.get(k) + '</span>' + WJ.I18n.t('needs.' + k) + '</div><div class="bar"><div class="bar-val" style="width:' + pct + '%"></div></div>';
      needs.appendChild(d);
    });
    // черты
    const tr = $('card-traits');
    tr.innerHTML = '';
    const P = r.personality;
    const traits = P.brave > 0.65 ? 'brave' : (P.brave < 0.35 ? null : null);
    [['brave', P.brave], ['social', P.social], ['hard', P.hard], ['trusting', P.trusting], ['curious', P.curious]].forEach(function (p) {
      if (p[1] > 0.6) { const s = document.createElement('span'); s.className = 'trait'; s.textContent = WJ.I18n.t('traits.' + p[0]); tr.appendChild(s); }
    });
    // отношения
    const rel = $('card-relations');
    rel.innerHTML = '';
    Object.keys(r.relations).slice(0, 6).forEach(function (oid) {
      const o = w.byId(oid);
      if (!o) return;
      const rv = r.relations[oid];
      const sp = document.createElement('span');
      sp.className = 'rel';
      const col = rv.v > 30 ? '#5fd1c0' : (rv.v < -20 ? '#e8765f' : '#f2b45a');
      sp.innerHTML = '<span class="dot" style="background:' + col + '"></span>' + U.esc(o.name) + ' <small>' + WJ.I18n.t('ui.relations.' + (rv.type || 'known')) + '</small>';
      rel.appendChild(sp);
    });
    // советы
    const grid = $('advice-grid');
    grid.innerHTML = '';
    $('advice-title').textContent = r.adviceToday ? WJ.I18n.t('ui.adviceGiven') : WJ.I18n.t('ui.adviceTitle');
    const fits = WJ.Advice.fitList(r, WJ.Weather.sim());
    C.adviceOrder.forEach(function (id) {
      const b = document.createElement('button');
      b.className = 'adv' + (fits.indexOf(id) >= 0 ? ' fit' : '') + (r.adviceToday ? ' done' : '');
      b.innerHTML = '<span class="ic">' + WJ.Icons.get('adv_' + (id === 'go_home' ? 'home' : id === 'look_sky' ? 'sky' : id === 'make_peace' ? 'peace' : id === 'be_brave' ? 'brave' : id === 'be_careful' ? 'careful' : id === 'celebrate' ? 'party' : id)) + '</span><span class="alabel">' + WJ.I18n.t('advice.' + id) + '</span>';
      b.addEventListener('click', function () {
        if (r.adviceToday || !onAdvice) return;
        WJ.Audio.sticker();
        onAdvice(r.id, id);
        setTimeout(function () { hideResident(); }, 400);
      });
      grid.appendChild(b);
    });
    // подсветка
    if (WJ.Residents.byId.get(r.id)) WJ.Residents.setHalo(WJ.Residents.byId.get(r.id), true);
  }
  function hideResident() {
    $('resident-card').classList.add('hidden');
    if (currentResident) {
      const rec = WJ.Residents.byId.get(currentResident.id);
      if (rec) WJ.Residents.setHalo(rec, false);
      currentResident = null;
    }
    WJ.Render.focusOff();
  }

  // ---------- Летопись ----------
  function buildChronFilters() {
    const f = $('chron-filters');
    f.innerHTML = '';
    [['all', 'ui.chronAll'], ['advice', 'ui.chronAdvice'], ['bonds', 'ui.chronBonds'], ['nature', 'ui.chronNature']].forEach(function (x) {
      const b = document.createElement('button');
      b.className = 'btn' + (chronFilter === x[0] ? ' on' : '');
      b.textContent = WJ.I18n.t(x[1]);
      b.addEventListener('click', function () { chronFilter = x[0]; buildChronFilters(); renderChronicle(); });
      f.appendChild(b);
    });
  }
  function renderChronicle() {
    const list = $('chron-list');
    list.innerHTML = '';
    const entries = WJ.Chronicle.filter(chronFilter).slice().reverse();
    if (!entries.length) {
      list.innerHTML = '<div class="chron-empty">' + WJ.I18n.t('ui.chronEmpty') + '</div>';
      return;
    }
    entries.forEach(function (e) {
      const d = document.createElement('div');
      d.className = 'chron-entry';
      d.innerHTML = '<span class="ic">' + WJ.Icons.get(e.icon || 'book') + '</span><div><div class="cdate">' + WJ.I18n.t('ui.day') + ' ' + e.day + '</div><div class="ctext">' + U.esc(e.text) + '</div></div>';
      list.appendChild(d);
    });
  }
  function addChronEntry(e) {
    if (chronFilter === 'all' || e.cat === chronFilter) renderChronicle();
  }

  // ---------- Письмо ----------
  function showLetter(lines) {
    const body = $('letter-body');
    let html = '';
    if (!lines.length) {
      html = WJ.I18n.t('letter.noAdvice');
    } else {
      const opener = WJ.I18n.tRand('letter.openers', WJ.Rng.create(Date.now() % 100000), {});
      html = opener + '<br><br>' + lines.map(function (l) { return U.esc(l); }).join('<br><br>');
    }
    body.innerHTML = html + '<div class="sig">' + WJ.I18n.t('ui.letterSig') + '</div>';
    $('letter-panel').classList.remove('hidden');
    WJ.Audio.chime();
  }

  // ---------- Полка ----------
  function showShelf(meta, onOpen, onNew) {
    $('shelf-panel').classList.remove('hidden');
    const grid = $('shelf-grid');
    grid.innerHTML = '';
    const unlockedSlots = 1 + Math.min(2, meta.unlockedChapters || 0);
    for (let i = 0; i < C.PLANETS_MAX; i++) {
      const slot = document.createElement('div');
      const planet = meta.planets[i];
      if (planet && planet.name !== undefined) {
        slot.className = 'jar-slot' + (i === meta.activePlanet ? ' active' : '');
        slot.innerHTML = '<canvas width="80" height="96"></canvas><div class="jname">' + U.esc(planet.name || '—') + '</div><div class="jsub">' + WJ.I18n.t('ui.day') + ' ' + (planet.day || 1) + ' · ' + (planet.pop || 0) + ' ' + WJ.I18n.t('ui.pop') + '</div>';
        drawJarIcon(slot.querySelector('canvas'), planet.seed, planet.name);
        slot.addEventListener('click', function () { $('shelf-panel').classList.add('hidden'); onOpen(i); });
      } else if (i < unlockedSlots) {
        slot.className = 'jar-slot';
        slot.innerHTML = '<canvas width="80" height="96"></canvas><div class="jname">+</div><div class="jsub">' + WJ.I18n.t('ui.newJar') + '</div>';
        drawJarIcon(slot.querySelector('canvas'), Math.floor(Math.random() * 1e9), '');
        slot.addEventListener('click', function () { $('shelf-panel').classList.add('hidden'); onNew(); });
      } else {
        slot.className = 'jar-slot locked';
        slot.innerHTML = '<div class="jname">🔒</div><div class="jsub">' + WJ.I18n.t('ui.jarLocked') + '</div>';
      }
      grid.appendChild(slot);
    }
  }
  function drawJarIcon(cv, seed, name) {
    const ctx = cv.getContext('2d');
    const rng = WJ.Rng.create(seed);
    ctx.clearRect(0, 0, 80, 96);
    // банка
    ctx.strokeStyle = 'rgba(210,235,230,.9)';
    ctx.fillStyle = 'rgba(230,250,248,.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 20); ctx.lineTo(18, 84); ctx.quadraticCurveTo(18, 90, 26, 90);
    ctx.lineTo(54, 90); ctx.quadraticCurveTo(62, 90, 62, 84); ctx.lineTo(62, 20); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // планета
    const px = 40, py = 55, pr = 18;
    const g = ctx.createRadialGradient(px - 6, py - 6, 2, px, py, pr);
    g.addColorStop(0, '#8fd18a'); g.addColorStop(0.6, '#4a8a4a'); g.addColorStop(1, '#2a5a6a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    // пятна
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.beginPath(); ctx.arc(px + rng.range(-12, 12), py + rng.range(-12, 12), rng.range(2, 5), 0, Math.PI * 2); ctx.fill();
    }
    // бирка
    if (name) {
      ctx.fillStyle = '#f2e6ce';
      ctx.fillRect(46, 8, 30, 13);
      ctx.fillStyle = '#4a3520';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(name.slice(0, 6), 48, 17);
    }
  }

  // ---------- Достижения ----------
  function showAchievements(unlocked) {
    $('ach-panel').classList.remove('hidden');
    const list = $('ach-list');
    list.innerHTML = '';
    C.achievements.forEach(function (a) {
      const has = unlocked.indexOf(a.id) >= 0;
      const d = document.createElement('div');
      d.className = 'ach' + (has ? '' : ' locked');
      d.innerHTML = '<span class="ic">' + WJ.Icons.get(a.icon) + '</span><span class="atext"><b>' + WJ.I18n.t('ach.' + a.id) + '</b>' + (has ? '' : ' <small>· ' + WJ.I18n.t('ui.achLocked') + '</small>') + '</span>';
      list.appendChild(d);
    });
  }

  // ---------- Настройки ----------
  let settings = { lang: null, quality: 'auto', sound: true, music: true, vibro: true, textSize: 'normal', reduceMotion: false, tutorialDone: false };
  let onSettings = null;
  function buildSettings() {
    const body = $('settings-body');
    if (!body) return;
    body.innerHTML = '';
    const row = function (label) { const r = document.createElement('div'); r.className = 'set-row'; r.innerHTML = '<span>' + U.esc(label) + '</span>'; body.appendChild(r); return r; };
    // язык
    const rLang = row(WJ.I18n.t('ui.sLang'));
    const segL = seg(['RU', 'UZ', 'EN'], ['ru', 'uz', 'en'], WJ.I18n.lang, function (v) { applySetting('lang', v); });
    rLang.appendChild(segL);
    // качество
    const rQ = row(WJ.I18n.t('ui.sQuality'));
    rQ.appendChild(seg([WJ.I18n.t('ui.qAuto'), WJ.I18n.t('ui.qHigh'), WJ.I18n.t('ui.qMed'), WJ.I18n.t('ui.qLow')], ['auto', 'high', 'medium', 'low'], settings.quality, function (v) { applySetting('quality', v); }));
    // звук
    const rS = row(WJ.I18n.t('ui.sSound'));
    rS.appendChild(toggle(settings.sound, function (v) { applySetting('sound', v); }));
    const rM = row(WJ.I18n.t('ui.sMusic'));
    rM.appendChild(toggle(settings.music, function (v) { applySetting('music', v); }));
    const rV = row(WJ.I18n.t('ui.sVibro'));
    rV.appendChild(toggle(settings.vibro, function (v) { applySetting('vibro', v); }));
    // размер текста
    const rT = row(WJ.I18n.t('ui.sTextSize'));
    rT.appendChild(seg([WJ.I18n.t('ui.tNormal'), WJ.I18n.t('ui.tLarge')], ['normal', 'large'], settings.textSize, function (v) { applySetting('textSize', v); }));
    // обучение
    const rTut = row(WJ.I18n.t('ui.sTutorial'));
    const bTut = document.createElement('button');
    bTut.className = 'btn';
    bTut.textContent = '▶';
    bTut.addEventListener('click', function () { $('settings-panel').classList.add('hidden'); startTutorial(); });
    rTut.appendChild(bTut);
    // сброс
    const rR = row(WJ.I18n.t('ui.sReset'));
    const bR = document.createElement('button');
    bR.className = 'btn';
    bR.textContent = '×';
    bR.addEventListener('click', function () {
      modal(WJ.I18n.t('ui.sResetWarn'), function (ok) { if (ok) onSettings && onSettings('reset', true); });
    });
    rR.appendChild(bR);
  }
  function seg(labels, values, current, cb) {
    const s = document.createElement('div');
    s.className = 'seg';
    labels.forEach(function (l, i) {
      const b = document.createElement('button');
      b.textContent = l;
      if (values[i] === current) b.className = 'on';
      b.addEventListener('click', function () { cb(values[i]); });
      s.appendChild(b);
    });
    return s;
  }
  function toggle(current, cb) {
    const s = document.createElement('div');
    s.className = 'seg';
    const on = document.createElement('button');
    on.textContent = WJ.I18n.t('ui.on');
    if (current) on.className = 'on';
    const off = document.createElement('button');
    off.textContent = WJ.I18n.t('ui.off');
    if (!current) off.className = 'on';
    on.addEventListener('click', function () { cb(true); });
    off.addEventListener('click', function () { cb(false); });
    s.appendChild(on); s.appendChild(off);
    return s;
  }
  function applySetting(key, value) {
    settings[key] = value;
    if (key === 'textSize') document.body.classList.toggle('text-lg', value === 'large');
    if (onSettings) onSettings(key, value);
    if (key === 'lang') setText();
    buildSettings();
  }
  function setSettings(s) {
    Object.assign(settings, s || {});
    document.body.classList.toggle('text-lg', settings.textSize === 'large');
    WJ.Audio.setVolumes(settings);
    buildSettings();
  }

  // ---------- Модал ----------
  let modalCb = null;
  function modal(text, cb) {
    $('modal-text').textContent = text;
    $('modal').classList.remove('hidden');
    modalCb = cb;
  }

  // ---------- Обучение ----------
  function startTutorial() {
    tutStep = 0;
    $('tutorial').classList.remove('hidden');
    renderTutStep();
  }
  function renderTutStep() {
    if (tutStep < 0 || tutStep > 5) { endTutorial(); return; }
    $('tutorial-text').textContent = WJ.I18n.t('ui.tutorial' + (tutStep + 1));
    clearTutHints();
    const hints = [
      null,
      null,
      { sel: '#gl', x: 0.5, y: 0.5 },
      { sel: '#weather-dock', x: 0.5, y: 0.9 },
      { sel: '#btn-chronicle', x: 0.3, y: 0.93 },
      { sel: '#btn-settings', x: 0.93, y: 0.06 },
    ];
    const h = hints[tutStep];
    if (h) {
      const el = document.querySelector(h.sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        const d = document.createElement('div');
        d.className = 'tut-hint';
        d.style.left = (rect.left + rect.width * 0.5 - 7) + 'px';
        d.style.top = (rect.top + rect.height * 0.5 - 7) + 'px';
        document.body.appendChild(d);
        tutHints.push(d);
      }
    }
  }
  function clearTutHints() { tutHints.forEach(function (d) { d.remove(); }); tutHints = []; }
  function endTutorial() {
    tutStep = -1;
    clearTutHints();
    $('tutorial').classList.add('hidden');
    settings.tutorialDone = true;
    if (onSettings) onSettings('tutorialDone', true);
  }

  // ---------- Тосты ----------
  function toast(text, icon) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = (icon ? '<svg class="ic" viewBox="0 0 24 24">' + WJ.Icons.raw[icon] + '</svg>' : '') + U.esc(text);
    $('toasts').appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  // ---------- Отладка ----------
  function updateDebug(text) {
    let el = $('debug');
    if (!el) { el = document.createElement('div'); el.id = 'debug'; document.body.appendChild(el); }
    el.textContent = text;
    el.classList.toggle('hidden', !WJ.Game.debug);
  }

  // ---------- Привязки ----------
  function bind(handlers) {
    onWeather = handlers.onWeather;
    onAdvice = handlers.onAdvice;
    onSettings = handlers.onSettings;
    $('card-close').addEventListener('click', function () { WJ.Audio.click(); hideResident(); });
    $('chron-close').addEventListener('click', function () { WJ.Audio.click(); $('chronicle-panel').classList.add('hidden'); });
    $('btn-chronicle').addEventListener('click', function () { WJ.Audio.click(); $('chronicle-panel').classList.remove('hidden'); buildChronFilters(); renderChronicle(); });
    $('shelf-close').addEventListener('click', function () { $('shelf-panel').classList.add('hidden'); });
    $('ach-close').addEventListener('click', function () { $('ach-panel').classList.add('hidden'); });
    $('settings-close').addEventListener('click', function () { WJ.Audio.click(); $('settings-panel').classList.add('hidden'); });
    $('letter-ok').addEventListener('click', function () { WJ.Audio.click(); $('letter-panel').classList.add('hidden'); });
    $('modal-cancel').addEventListener('click', function () { $('modal').classList.add('hidden'); if (modalCb) modalCb(false); modalCb = null; });
    $('modal-ok').addEventListener('click', function () { $('modal').classList.add('hidden'); if (modalCb) modalCb(true); modalCb = null; });
    $('btn-settings').addEventListener('click', function () { WJ.Audio.click(); $('settings-panel').classList.remove('hidden'); buildSettings(); });
    $('btn-pause').addEventListener('click', function () { WJ.Audio.click(); WJ.Bus.emit('ui:pause'); });
    $('btn-speed').addEventListener('click', function () {
      WJ.Audio.click();
      speed = speed === 1 ? 2 : 1;
      iconSvg($('ic-speed'), speed === 1 ? 'speed1' : 'speed2');
      WJ.Bus.emit('ui:speed', { speed });
    });
    $('tutorial-next').addEventListener('click', function () { WJ.Audio.click(); tutStep++; renderTutStep(); });
    $('tutorial-skip').addEventListener('click', endTutorial);
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  return {
    setText, updateHud, showResident, hideResident, renderChronicle, addChronEntry, showLetter,
    showShelf, showAchievements, modal, startTutorial, toast, updateDebug, bind, setSettings, buildSettings,
    get settings() { return settings; },
    get currentResident() { return currentResident; },
    get speed() { return speed; },
  };
})();
