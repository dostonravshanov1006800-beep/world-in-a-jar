// FILE: js/world/world.js
// Главное состояние и симуляция мира: планета, жители, постройки, погода,
// гармония, главы, события, советы, день/ночь, сериализация.
WJ.World = (function () {
  const U = WJ.Util, C = WJ.Config;

  function create(seed, opts) {
    const rng = WJ.Rng.create(seed);
    const w = {
      seed,
      rng,
      day: 1,
      dayT: 0.28, // утро
      speed: 1,
      paused: false,
      residents: [],
      harmony: 50,
      avgMood: 60,
      chapter: 0, // индекс текущей главы (0 = гл.1 открыта)
      openStories: [],
      quarrelDays: 0,
      nightSeen: false,
      lastCelebrationTrigger: false,
      newHomesQueue: [],
      achCount: { harvest: 0, planted: 0 },
      flags: {},
      lastSeenTs: Date.now(),
      planetName: opts && opts.name ? opts.name : genPlanetName(rng),
      _advIdx: 0,
      byId: function (id) { return this.residents.find(function (r) { return r.id === id; }) || null; },
      hasBuilding: function (type) { return WJ.Buildings.list.some(function (b) { return b.type === type; }); },
      flag: function (f) { this.flags[f] = true; },
      openStory: function (id) {
        if (this.openStories.indexOf(id) < 0) {
          this.openStories.push(id);
          WJ.Bus.emit('story:opened', { id });
          this.chronicle.add('discovery', 'ev.discovery', { name: this.planetName, gender: 'f' }, 'book', this.day);
        }
      },
      spawnResident: function (stage, parents) {
        const id = 'r' + (this._advIdx++) + '_' + Math.floor(this.rng.next() * 1e6).toString(36);
        const r = WJ.Brain.createResident(this.rng, id, stage || 'adult');
        r.name = WJ.Residents.genName(this.rng);
        const app = WJ.Residents.genAppearance(this.rng, parents);
        r.app = app;
        if (parents && parents.length) {
          r.parentIds = parents.map(function (p) { return p.id; });
          r.personality = WJ.Brain.inheritPersonality(this.rng, parents);
          parents.forEach(function (p) { WJ.Brain.relate(r, p.id, 45); WJ.Brain.relate(p, r.id, 45); });
        }
        // ставим на проходимую точку рядом с центром деревни
        const nodeIdx = pickSpawnNode(this);
        r.nodeIdx = nodeIdx;
        r.dir = WJ.Nav.node(nodeIdx).dir.clone();
        r.path = null; r.pathT = 0; r.moveSpeed = 0.45 + this.rng.next() * 0.2; // доля дуги в сек
        const rec = WJ.Residents.buildMesh(id, app, r.ageStage);
        rec.root.position.copy(r.dir).multiplyScalar(1 + Math.max(WJ.Planet.heightAt(r.dir.x, r.dir.y, r.dir.z), WJ.Planet.seaLevel + 0.001));
        orientToSphere(rec.root, r.dir);
        this.residents.push(r);
        return r;
      },
      departResident: function (id) {
        const i = this.residents.findIndex(function (r) { return r.id === id; });
        if (i >= 0) {
          const r = this.residents[i];
          // мягкий уход: огонёк — просто запись; наследие черты партнёрам/детям
          this.residents.splice(i, 1);
          WJ.Residents.removeMesh(id);
          this.residents.forEach(function (o) { delete o.relations[id]; if (o.partnerId === id) o.partnerId = null; });
        }
      },
      serialize: function () {
        return {
          seed: this.seed, name: this.planetName, day: this.day, dayT: this.dayT,
          chapter: this.chapter, openStories: this.openStories, flags: this.flags,
          quarrelDays: this.quarrelDays, achCount: this.achCount,
          weather: WJ.Weather.serialize(),
          chronicle: this.chronicle.serialize(),
          buildings: WJ.Buildings.serialize(),
          residents: this.residents.map(function (r) {
            const s = WJ.Brain.serialize(r);
            s.app = r.app; s.dir = { x: r.dir.x, y: r.dir.y, z: r.dir.z };
            return s;
          }),
          lastSeenTs: Date.now(),
        };
      },
    };
    w.chronicle = WJ.Chronicle;

    // ---- Построение сцены планеты ----
    WJ.Render.buildWorld(seed, w.planetName);
    // граф навигации по рельефу этой планеты
    WJ.Nav.build(seed, WJ.Planet.heightAt, WJ.Planet.seaLevel, WJ.Quality.tier === 'low' ? 900 : 1400);
    WJ.Residents.init(WJ.Planet.group);
    WJ.Buildings.init(WJ.Planet.group);

    // стартовая деревня: костёр + 3 жителя
    if (!opts || !opts.deserialize) {
      const villageNode = pickSpawnNode(w, true);
      const node = WJ.Nav.node(villageNode);
      WJ.Buildings.build(WJ.Planet.group, 'campfire', node, 2, w.rng);
      for (let i = 0; i < C.POP_START; i++) w.spawnResident('adult', null);
      // пара полей травы для уюта не нужна; островок деревни готов
    }
    return w;
  }

  function genPlanetName(rng) {
    const a = ['Ар', 'Бел', 'Ве', 'Ге', 'Но', 'Ори', 'Ли', 'Те', 'Ма', 'Си', 'Эо', 'Ю'];
    const b = ['я', 'ра', 'на', 'лида', 'тис', 'мора', 'вия', 'нель', 'са', 'лон'];
    return rng.pick(a) + rng.pick(b);
  }
  function pickSpawnNode(w, villageCenter) {
    // ищем проходимый узел в «тёплой» зоне (не полюс)
    for (let tries = 0; tries < 400; tries++) {
      const i = w.rng.int(0, WJ.Nav.count - 1);
      const n = WJ.Nav.node(i);
      if (n.passable && Math.abs(n.dir.y) < 0.6) {
        if (villageCenter) return i;
        return WJ.Nav.nearestPassable(n.dir.clone().add(new THREE.Vector3(U.lerp(-0.06, 0.06, w.rng.next()), U.lerp(-0.06, 0.06, w.rng.next()), U.lerp(-0.06, 0.06, w.rng.next())).normalize())) || i;
      }
    }
    return WJ.Nav.nearestPassable(new THREE.Vector3(0, 0.2, 1).normalize()) || 0;
  }

  const _v1 = new THREE.Vector3();
  function orientToSphere(obj, dir) {
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }

  // ---------- Погода и визуальное состояние ----------
  function weatherVisual() {
    return {
      rainK: WJ.Weather.rainK, snowK: WJ.Weather.snowK, fogK: WJ.Weather.fogK,
      stormK: WJ.Weather.stormK, windK: WJ.Weather.windK, heatK: WJ.Weather.heatK,
      auroraK: WJ.Weather.auroraK, weatherDark: WJ.Weather.dark, dayT: w_ref ? w_ref.dayT : 0.3,
    };
  }
  let w_ref = null;

  // ---------- Симуляция (фиксированный шаг) ----------
  function update(w, dt) {
    w_ref = w;
    dt = Math.min(dt, 0.1);
    if (w.paused) { WJ.Weather.update(0); return; }
    const scaled = dt * w.speed;
    WJ.Weather.update(scaled);
    const ws = WJ.Weather.sim();

    // время суток
    const prevT = w.dayT;
    w.dayT += scaled / C.DAY_SECONDS;
    if (w.dayT >= 1) {
      w.dayT -= 1;
      onNewDay(w, ws);
    }
    if (w.dayT > 0.55 && prevT <= 0.55) w.nightSeen = true;
    if (WJ.Weather.current === 'wind') w.flags.windDay = true;
    if (WJ.Weather.current === 'snow') w.flags.snowDay = true;

    // жители
    for (let i = 0; i < w.residents.length; i++) {
      const r = w.residents[i];
      WJ.Brain.updateResident(r, scaled, { mood: ws.mood });
      // решения каждые 2-5 игровых часов
      r.actionTimer -= scaled / (C.DAY_SECONDS / 24);
      if (r.actionTimer <= 0) {
        r.actionTimer = 2 + w.rng.next() * 3;
        decideAction(w, r, ws);
      }
      moveResident(w, r, scaled);
      applyActionEffects(w, r, ws, scaled);
    }
    // излишняя сырость -> ссоры «дома сидим»
    if (ws.damp > 0.85) { /* ссоры через события */ }
    // день без ссор
    w.quarrelDays += scaled / C.DAY_SECONDS;

    // гармония
    updateHarmony(w, ws);
    // рост растительности от погоды
    const growth = U.clamp(0.75 + (ws.growth - 1) * 0.35 - ws.drought * 0.3, 0.45, 1.6);
    WJ.Planet.setGrowth(growth, Math.abs(ws.wind));
    WJ.Buildings.frame(dt, nightK(w));

    // события: раз в четверть дня с шансом
    w._evAcc = (w._evAcc || 0) + scaled;
    if (w._evAcc > C.DAY_SECONDS / 4) {
      w._evAcc = 0;
      if (w.rng.chance(0.55)) WJ.Events.tick(w);
    }
    // главы/сюжеты/достижения — проверяем раз в игровой час
    w._chapterCheck = (w._chapterCheck || 0) + scaled;
    if (w._chapterCheck > C.DAY_SECONDS / 24) {
      w._chapterCheck = 0;
      checkChapter(w);
      WJ.Events.checkStories(w);
      WJ.Bus.emit('ach:check', w);
    }
  }

  function nightK(w) {
    if (!w) return 0;
    return w.dayT > 0.55 ? U.invLerp(0.55, 0.65, w.dayT) * (1 - U.invLerp(0.96, 1.0, w.dayT)) : 0;
  }

  function decideAction(w, r, ws) {
    const near = w.residents.filter(function (o) { return o !== r && o.dir && r.dir && o.dir.dot(r.dir) > 0.995; });
    const someoneNeeds = w.residents.some(function (o) { return o.needs.food < 25 || o.needs.rest < 20; });
    let bestFriendNear = false;
    for (const oid in r.relations) {
      if (r.relations[oid].type === 'friend' || r.relations[oid].type === 'best') {
        const o = w.byId(oid);
        if (o && o.dir && r.dir && o.dir.dot(r.dir) > 0.995) bestFriendNear = true;
      }
    }
    const act = WJ.Brain.decide(r, {
      ws: { stormK: ws.wind > 0.7 ? 1 : 0, rainK: WJ.Weather.rainK },
      nearOthers: near, dayT: w.dayT, someoneNeeds, bestFriendNear,
    });
    r.action = act;
    // цель движения
    if (act === 'walk' || act === 'talk' || act === 'fish' || act === 'go_home' || act === 'help') {
      const target = pickTarget(w, r, act);
      if (target !== null) {
        const from = WJ.Nav.nearestPassable(r.dir) || 0;
        const path = WJ.Nav.findPath(from, target);
        if (path) { r.path = path; r.pathT = 0; r.moving = true; }
        else { r.path = null; r.moving = false; r.action = 'idle'; }
      } else r.moving = false;
    } else {
      r.moving = false;
      if (act === 'sleep') r.needs.rest = U.clamp(r.needs.rest + 2, 0, 100);
    }
    // анимация
    const rec = WJ.Residents.byId.get(r.id);
    if (rec) {
      const animMap = {
        eat: 'idle', sleep: 'sleep', work: 'work', talk: 'talk', walk: 'walk',
        go_home: 'walk', fish: 'fish', help: 'walk', idle: 'idle',
      };
      WJ.Residents.setAnim(rec, animMap[act] || 'idle');
    }
    // пузыри потребностей
    if (r.bubble) WJ.Residents.setBubble(rec, r.bubble);
    else if (rec) WJ.Residents.hideBubble(rec);
  }
  function pickTarget(w, r, act) {
    if (act === 'fish') {
      // к берегу: ищем проходимый узел рядом с водой
      for (let tries = 0; tries < 40; tries++) {
        const i = w.rng.int(0, WJ.Nav.count - 1);
        const n = WJ.Nav.node(i);
        if (n.passable && n.h < WJ.Planet.seaLevel + 0.01) return i;
      }
      return null;
    }
    if (act === 'go_home') {
      const home = WJ.Buildings.list.find(function (b) { return b.id === r.homeId; });
      if (home) return home.nodeIdx;
      const any = WJ.Buildings.list.find(function (b) { return b.type === 'hut' || b.type === 'house' || b.type === 'cozy_house'; });
      return any ? any.nodeIdx : null;
    }
    if (act === 'talk' || act === 'help') {
      const other = w.residents.find(function (o) { return o !== r && o.dir && r.dir && o.dir.dot(o.dir) > 0.98; });
      if (other) return WJ.Nav.nearestPassable(other.dir);
      return w.rng.int(0, WJ.Nav.count - 1);
    }
    // прогулка
    for (let tries = 0; tries < 10; tries++) {
      const i = w.rng.int(0, WJ.Nav.count - 1);
      if (WJ.Nav.node(i).passable) return i;
    }
    return null;
  }

  const _dirTmp = new THREE.Vector3();
  function moveResident(w, r, dt) {
    const rec = WJ.Residents.byId.get(r.id);
    if (!r.moving || !r.path || r.path.length < 2) {
      if (r.moving) { r.moving = false; }
      return;
    }
    const from = WJ.Nav.node(r.path[0]), to = WJ.Nav.node(r.path[1]);
    const arc = Math.acos(U.clamp(from.dir.dot(to.dir), -1, 1));
    const speedArc = r.moveSpeed * (r.action === 'go_home' ? 1.4 : 1); // долей дуги за сек... фактически arc-length
    r.pathT += (dt * r.moveSpeed) / Math.max(arc, 1e-4);
    if (r.pathT >= 1) {
      r.path.shift();
      r.pathT = 0;
      r.nodeIdx = r.path[0] !== undefined ? r.path[0] : r.nodeIdx;
      if (r.path.length < 2) { r.path = null; r.moving = false; onArrive(w, r); }
      return;
    }
    WJ.Nav.slerpDir(from.dir, to.dir, r.pathT, _dirTmp);
    r.dir.copy(_dirTmp);
    const h = Math.max(WJ.Planet.heightAt(r.dir.x, r.dir.y, r.dir.z), WJ.Planet.seaLevel + 0.001);
    rec.root.position.copy(r.dir).multiplyScalar(1 + h);
    // ориентация: вверх = нормаль; поворот в сторону движения
    orientToSphere(rec.root, r.dir);
    // сепарация: не наезжать на соседей — небольшой поперечный сдвиг
    for (let i = 0; i < w.residents.length; i++) {
      const o = w.residents[i];
      if (o === r || !o.dir) continue;
      const d = o.dir.dot(r.dir);
      if (d > 0.99985) {
        rec.root.position.addScaledVector(_dirTmp.crossVectors(r.dir, o.dir).normalize(), 0.003);
        break;
      }
    }
  }
  function onArrive(w, r) {
    const rec = WJ.Residents.byId.get(r.id);
    if (!rec) return;
    if (r.action === 'talk') { WJ.Residents.setAnim(rec, 'talk'); }
    else if (r.action === 'fish') { WJ.Residents.setAnim(rec, 'fish'); r.skills.fish = U.clamp(r.skills.fish + 0.05, 0, 1); r.needs.food = U.clamp(r.needs.food + 8, 0, 100); }
    else if (r.action === 'go_home') { WJ.Residents.setAnim(rec, 'idle'); r.needs.safety = U.clamp(r.needs.safety + 6, 0, 100); }
    else WJ.Residents.setAnim(rec, 'idle');
  }

  function applyActionEffects(w, r, ws, dt) {
    const hours = dt / (C.DAY_SECONDS / 24);
    switch (r.action) {
      case 'eat': r.needs.food = U.clamp(r.needs.food + 12 * hours * 10, 0, 100); break;
      case 'sleep': r.needs.rest = U.clamp(r.needs.rest + 10 * hours * 10, 0, 100); break;
      case 'work': r.needs.meaning = U.clamp(r.needs.meaning + 3 * hours * 10, 0, 100); r.needs.rest = U.clamp(r.needs.rest - 2 * hours * 5, 0, 100); break;
      case 'talk': r.needs.social = U.clamp(r.needs.social + 6 * hours * 10, 0, 100); break;
      case 'help': r.needs.social = U.clamp(r.needs.social + 3 * hours * 10, 0, 100); r.needs.meaning = U.clamp(r.needs.meaning + 4 * hours * 10, 0, 100); break;
    }
    // холод: нужен костёр/дом
    if (ws.cold > 0.3 && r.needs.safety < 35) {
      r.needs.safety = U.clamp(r.needs.safety - 3 * hours, 0, 100);
    }
    // жара сушит
    if (WJ.Weather.current === 'sun' && WJ.Weather.dry > 0.7) {
      r.needs.food = U.clamp(r.needs.food - 1.5 * hours, 0, 100);
    }
  }

  // ---------- Новый день ----------
  function onNewDay(w, ws) {
    w.day++;
    WJ.Events.tick(w);
    // старение
    w.residents.forEach(function (r) {
      const before = r.ageStage;
      WJ.Brain.advanceAge(r, 1);
      if (r.ageStage !== before) {
        const rec = WJ.Residents.byId.get(r.id);
        if (rec) WJ.Residents.setAgeStage(rec, r.ageStage);
        w.chronicle.add('aging', 'ev.aging', { name: r.name, gender: r.gender }, 'cane', w.day);
        w.flags.elder = w.flags.elder || r.ageStage === 'elder';
      }
    });
    // рождение по главе 2+ с шансом, если гармония высокая
    if (w.residents.length < C.POP_MAX && w.harmony > 52 && w.residents.length >= 2 && w.rng.chance(0.3)) {
      const pair = w.residents.filter(function (r) { return r.partnerId; });
      if (pair.length >= 2) {
        const a = pair[0];
        const b = w.byId(a.partnerId);
        if (b && w.residents.length < C.POP_MAX) {
          w.spawnResident('child', [a, b]);
          w.chronicle.add('birth', 'ev.birth', { name: a.name, gender: a.gender }, 'baby', w.day);
          w.flags.birth = true;
        }
      }
    }
    // советы обновляются
    w.residents.forEach(function (r) {
      r.adviceToday = null;
      r.bubble = null;
    });
    // письмо дня
    WJ.Bus.emit('day:new', { day: w.day });
    // сброс «день без ссор»
    WJ.Bus.emit('ach:check', w);
  }

  // ---------- Гармония ----------
  function updateHarmony(w, ws) {
    if (!w.residents.length) { w.harmony = U.move(w.harmony, 40, 0.1); return; }
    let mood = 0;
    w.residents.forEach(function (r) { mood += r.mood; });
    w.avgMood = mood / w.residents.length;
    // природа: рост - засуха
    const nature = U.clamp(50 + (ws.growth - 1) * 30 - ws.drought * 45 + ws.damp * -5, 0, 100);
    // отношения: среднее положительных связей
    let bonds = 0, cnt = 0;
    w.residents.forEach(function (r) {
      for (const oid in r.relations) { bonds += r.relations[oid].v; cnt++; }
    });
    bonds = cnt ? U.clamp(bonds / cnt / 2 + 50, 0, 100) : 50;
    const target = w.avgMood * C.HARMONY.mood + nature * C.HARMONY.nature + bonds * C.HARMONY.bonds;
    w.harmony = U.move(w.harmony, U.clamp(target, 0, 100), 0.08);
  }

  // ---------- Главы ----------
  function checkChapter(w) {
    const ch = C.chapters[w.chapter];
    if (!ch) return;
    const g = ch.goal;
    let done = false;
    if (w.chapter === 0) done = w.hasBuilding('campfire');
    else if (w.chapter === 1) done = w.residents.length >= 8 && countHomes(w) >= 5 && w.hasBuilding('field');
    else if (w.chapter === 2) done = w.flags.festivalHeld;
    else if (w.chapter === 3) {
      if (w.harmony >= 70) w._harmDays = (w._harmDays || 0) + 1; else w._harmDays = 0;
      done = w.residents.length >= 14 && (w._harmDays || 0) >= 3 * 24; // 3 игровых дня = счётчик часов сима
    } else if (w.chapter === 4) done = w.residents.length >= 20 && w.hasBuilding('school') && w.hasBuilding('market') && w.hasBuilding('lighthouse');
    else if (w.chapter === 5) done = w.openStories.length >= 12;
    if (done) {
      w.chapter++;
      w._harmDays = 0;
      WJ.Bus.emit('chapter:done', { n: w.chapter });
      // награда: звёздная пыль
      WJ.Bus.emit('stars:add', { n: 15 });
      checkChapter(w); // сразу проверить следующую
    }
  }
  function countHomes(w) {
    return WJ.Buildings.list.filter(function (b) { return b.type === 'hut' || b.type === 'house' || b.type === 'cozy_house'; }).length;
  }

  // ---------- Погода/советы наружу ----------
  function applyWeather(w, type) {
    const res = WJ.Weather.apply(type);
    if (res.ok) {
      if (type === 'rain' && WJ.Weather.current === 'clear') w.flags.rainDay = true;
    }
    return res;
  }
  function giveAdvice(w, residentId, adviceId) {
    const r = w.byId(residentId);
    if (!r || r.adviceToday) return { ok: false, reason: 'already' };
    const ws = WJ.Weather.sim();
    const res = WJ.Advice.give(r, adviceId, ws);
    if (!res) return { ok: false, reason: 'unknown' };
    // хронометраж результата в Летопись
    const kind = res.followed ? 'advice_ok' : 'advice_ignored';
    w.chronicle.add(kind, 'ev.' + kind, { name: r.name, a: WJ.I18n.t('advice.' + adviceId), gender: r.gender }, 'star', w.day);
    // мгновенная реакция: радость/грусть
    const rec = WJ.Residents.byId.get(r.id);
    if (rec) WJ.Residents.setAnim(rec, res.followed ? 'joy' : 'shiver');
    // особые советы
    if (res.followed) {
      if (adviceId === 'build') tryBuildHome(w);
      if (adviceId === 'plant') { w.achCount.planted++; }
      if (adviceId === 'celebrate') w.lastCelebrationTrigger = true;
      if (adviceId === 'fish') { r.action = 'fish'; r.moving = true; r.path = null; decideAction(w, r, ws); }
    }
    return { ok: true, followed: res.followed, result: res.ok };
  }
  function tryBuildHome(w) {
    if (countHomes(w) >= 6) return;
    const nodeIdx = pickSpawnNode(w, true);
    const node = WJ.Nav.node(nodeIdx);
    const type = w.residents.length > 6 ? 'cozy_house' : 'house';
    // поэтапная стройка: сначала каркас
    const b = WJ.Buildings.build(WJ.Planet.group, type, node, 0, w.rng);
    w._buildingStages = w._buildingStages || [];
    w._buildingStages.push({ b, t: 0 });
    // назначим строителя
    const worker = w.residents.find(function (r) { return r.ageStage !== 'child'; });
    if (worker) { worker.action = 'build'; worker.moving = false; }
  }
  function advanceConstruction(w, dt) {
    (w._buildingStages || []).forEach(function (s) {
      s.t += dt;
      if (s.b.stage === 0 && s.t > 8) {
        WJ.Buildings.build(WJ.Planet.group, s.b.type, WJ.Nav.node(s.b.nodeIdx), 1, w.rng, s.b);
        w.chronicle.add('built', 'ev.built', {}, 'home', w.day);
      } else if (s.b.stage === 1 && s.t > 16) {
        WJ.Buildings.build(WJ.Planet.group, s.b.type, WJ.Nav.node(s.b.nodeIdx), 2, w.rng, s.b);
        w.newHomesQueue.push(s.b);
        w.flags.homeBuilt = true;
      }
    });
    w._buildingStages = (w._buildingStages || []).filter(function (s) { return s.b.stage < 2; });
  }

  // оффлайн-прогресс до 5 дней
  function offlineProgress(w, days, meta) {
    days = Math.min(Math.floor(days), C.OFFLINE_DAYS_MAX);
    if (days <= 0) return 0;
    for (let d = 0; d < days; d++) {
      w.day++;
      WJ.Events.tick(w);
      w.residents.forEach(function (r) {
        WJ.Brain.advanceAge(r, 1);
        for (const k in r.needs) r.needs[k] = U.clamp(r.needs[k] - 4, 30, 100);
      });
    }
    return days;
  }

  function deserialize(w, data) {
    data = data || {};
    w.day = U.finite(data.day, 1, 1, 99999);
    w.dayT = U.finite(data.dayT, 0.28, 0, 1);
    w.chapter = U.finite(data.chapter, 0, 0, 6);
    w.openStories = Array.isArray(data.openStories) ? data.openStories.filter(function (s) { return typeof s === 'string'; }).slice(0, 30) : [];
    w.flags = (data.flags && typeof data.flags === 'object') ? data.flags : {};
    w.quarrelDays = U.finite(data.quarrelDays, 0, 0, 99999);
    w.achCount = (data.achCount && typeof data.achCount === 'object') ? data.achCount : { harvest: 0, planted: 0 };
    WJ.Weather.deserialize(data.weather);
    WJ.Chronicle.deserialize(data.chronicle);
    WJ.Buildings.deserialize(data.buildings, WJ.Planet.group, w.rng, function (i) { return WJ.Nav.node(U.finite(i, 0, 0, 50000)); });
    (data.residents || []).forEach(function (d) {
      const stage = ['child', 'adult', 'elder'].indexOf(d.ageStage) >= 0 ? d.ageStage : 'adult';
      const r = WJ.Brain.createResident(w.rng, String(d.id || '').slice(0, 30) || ('r' + Math.random().toString(36).slice(2)), stage);
      r.name = String(d.name || '').slice(0, 20) || WJ.Residents.genName(w.rng);
      WJ.Brain.deserialize(r, d);
      r.app = d.app && d.app.skin !== undefined ? d.app : WJ.Residents.genAppearance(w.rng, null);
      r.dir = d.dir ? new THREE.Vector3(U.finite(d.dir.x, 0, -1, 1), U.finite(d.dir.y, 1, -1, 1), U.finite(d.dir.z, 0, -1, 1)).normalize() : new THREE.Vector3(0, 0.3, 1).normalize();
      r.path = null; r.moving = false;
      r.moveSpeed = 0.45 + w.rng.next() * 0.2;
      const rec = WJ.Residents.buildMesh(r.id, r.app, r.ageStage);
      rec.root.position.copy(r.dir).multiplyScalar(1 + Math.max(WJ.Planet.heightAt(r.dir.x, r.dir.y, r.dir.z), WJ.Planet.seaLevel + 0.001));
      orientToSphere(rec.root, r.dir);
      w.residents.push(r);
    });
    if (!w.residents.length) {
      for (let i = 0; i < C.POP_START; i++) w.spawnResident('adult', null);
    }
    return w;
  }

  return {
    create, update, applyWeather, giveAdvice, weatherVisual, offlineProgress,
    deserializeWorld: deserialize, advanceConstruction, nightK, countHomes,
    _updateHarmony: updateHarmony,
  };
})();
