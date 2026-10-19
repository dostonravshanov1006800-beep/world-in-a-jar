// FILE: js/world/events.js
// События мира (условия, вес, кулдаун, эффекты) + 20 сюжетов-историй.
WJ.Events = (function () {
  const U = WJ.Util, C = WJ.Config;
  const cooldowns = {};
  const COOLDOWN_DAYS = {
    harvest: 0.5, drought: 2, flood: 2, storm: 1.2, festival: 3, wedding: 4,
    birth: 2, discovery: 1, quarrel: 0.6, reconciliation: 0.8, move: 2, gift: 0.8,
    miracle: 1.5, aging: 1.5, departure: 5, new_resident: 1,
  };

  // Возможные события по состоянию мира; возвращает список кандидатов
  function candidates(world) {
    const ws = WJ.Weather.sim();
    const pop = world.residents.length;
    const list = [];
    const day = world.day;
    // Урожай: поле есть, рост высокий
    if (world.hasBuilding('field') && ws.growth > 1.2 && cdOk('harvest', day)) list.push({ id: 'harvest', w: ws.growth * 8 });
    // Засуха: dry накопился
    if (ws.drought > 0.75 && cdOk('drought', day)) list.push({ id: 'drought', w: ws.drought * 20 });
    // Наводнение: сырость высокая
    if (ws.damp > 0.9 && cdOk('flood', day)) list.push({ id: 'flood', w: ws.damp * 14 });
    // Шторм с последствиями
    if (ws.wind > 0.7 && WJ.Weather.current === 'storm' && cdOk('storm', day)) list.push({ id: 'storm', w: 10 });
    // Праздник: совет celebrate или радуга
    if (world.lastCelebrationTrigger && cdOk('festival', day)) list.push({ id: 'festival', w: 12 });
    // Свадьба: есть пара с высокими отношениями и дом
    if (pop >= 6 && cdOk('wedding', day)) {
      const pair = findPair(world, 88);
      if (pair) list.push({ id: 'wedding', w: 6, pair });
    }
    // Рождение: пара + дом + гармония
    if (pop >= 2 && pop < C.POP_MAX && world.harmony > 50 && cdOk('birth', day)) {
      const pair = findPair(world, 75);
      if (pair) list.push({ id: 'birth', w: world.harmony / 12, pair });
    }
    // Открытие
    if (cdOk('discovery', day)) list.push({ id: 'discovery', w: 4 + ws.vis * 3 });
    // Ссора: двое с низким настроением
    if (cdOk('quarrel', day) && pop >= 3) {
      const q = findQuarrel(world);
      if (q) list.push({ id: 'quarrel', w: (100 - world.avgMood) / 14 + (ws.damp > 0.6 ? 3 : 0), pair: q });
    }
    // Примирение: есть ссора в памяти
    if (cdOk('reconciliation', day)) {
      const p = findEstranged(world);
      if (p) list.push({ id: 'reconciliation', w: 6, pair: p });
    }
    // Переезд: новый дом построен
    if (world.newHomesQueue.length && cdOk('move', day)) list.push({ id: 'move', w: 14, home: world.newHomesQueue.shift() });
    // Подарок: хорошее настроение
    if (world.avgMood > 65 && cdOk('gift', day) && pop >= 2) list.push({ id: 'gift', w: 5, pair: pickTwo(world) });
    // Чудо: радуга активна
    if (WJ.Weather.current === 'rainbow' && cdOk('miracle', day)) list.push({ id: 'miracle', w: 30 });
    // Уход к звёздам: пожилой с возрастом
    const elder = world.residents.find(function (r) { return r.ageStage === 'elder' && r.age > C.ELDER_DAYS + 6; });
    if (elder && cdOk('departure', day)) list.push({ id: 'departure', w: 5, who: elder });
    // Новый житель: гармония высокая, есть дома
    if (pop >= 2 && pop < C.POP_MAX && world.harmony > 50 && cdOk('new_resident', day)) list.push({ id: 'new_resident', w: world.harmony / 10 + 4 });
    return list.filter(function (e) { return e.w > 0; });
  }
  function cdOk(id, day) {
    return (cooldowns[id] === undefined) || (day - cooldowns[id] >= COOLDOWN_DAYS[id]);
  }
  function setCd(id, day) { cooldowns[id] = day; }

  function findPair(world, minRel) {
    const rs = world.residents;
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i];
      if (r.ageStage === 'child') continue;
      for (const oid in r.relations) {
        if (r.relations[oid].v >= minRel && r.partnerId !== oid) {
          const o = world.byId(oid);
          if (o && o.ageStage !== 'child') return [r, o];
        }
      }
    }
    return null;
  }
  function findQuarrel(world) {
    const rs = world.residents.filter(function (r) { return r.ageStage !== 'child'; });
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      if (rs[i].mood < 50 && rs[j].mood < 50 && Math.random() < 0.4) return [rs[i], rs[j]];
    }
    return null;
  }
  function findEstranged(world) {
    const rs = world.residents;
    for (let i = 0; i < rs.length; i++) {
      const rels = rs[i].relations;
      for (const oid in rels) if (rels[oid].v < -20) {
        const o = world.byId(oid);
        if (o) return [rs[i], o];
      }
    }
    return null;
  }
  function pickTwo(world) {
    const rs = world.residents.filter(function (r) { return r.ageStage !== 'child'; });
    if (rs.length < 2) return null;
    const a = rs[Math.floor(Math.random() * rs.length)];
    let b = a;
    while (b === a) b = rs[Math.floor(Math.random() * rs.length)];
    return [a, b];
  }

  // Исполнение события: эффекты + запись в Летопись
  function execute(world, ev) {
    const day = world.day;
    setCd(ev.id, day);
    const chron = world.chronicle;
    const P = function (names) { return { name: names[0] ? names[0].name : '', other: names[1] ? names[1].name : '', gender: names[0] ? names[0].gender : 'm' }; };
    switch (ev.id) {
      case 'harvest': {
        world.residents.forEach(function (r) { r.needs.food = U.clamp(r.needs.food + 30, 0, 100); WJ.Brain.remember(r, 4); });
        chron.add('harvest', 'ev.harvest', {}, 'wheat');
        world.achCount.harvest++;
        break;
      }
      case 'drought': {
        world.residents.forEach(function (r) { r.needs.food = U.clamp(r.needs.food - 12, 0, 100); WJ.Brain.remember(r, -3); });
        chron.add('drought', 'ev.drought', { name: pickName(world), gender: pickGender(world) }, 'sun');
        break;
      }
      case 'flood': {
        world.residents.forEach(function (r) { WJ.Brain.remember(r, -2); });
        chron.add('flood', 'ev.flood', { name: pickName(world), gender: pickGender(world) }, 'rain');
        break;
      }
      case 'storm': {
        // молния может зажечь костёр или повредить крышу
        if (Math.random() < 0.4) { world.flag('storm_fire'); }
        chron.add('storm', 'ev.storm', { name: pickName(world), gender: pickGender(world) }, 'storm');
        world.flags.stormSurvived = true;
        break;
      }
      case 'festival': {
        world.residents.forEach(function (r) { r.needs.social = U.clamp(r.needs.social + 25, 0, 100); r.needs.meaning = U.clamp(r.needs.meaning + 10, 0, 100); WJ.Brain.remember(r, 5); });
        chron.add('festival', 'ev.festival', { name: pickName(world), gender: pickGender(world) }, 'confetti');
        world.lastCelebrationTrigger = false;
        world.flags.festivalHeld = true;
        break;
      }
      case 'wedding': {
        const [a, b] = ev.pair;
        a.partnerId = b.id; b.partnerId = a.id;
        WJ.Brain.relate(a, b.id, 40); WJ.Brain.relate(b, a.id, 40);
        WJ.Brain.remember(a, 8); WJ.Brain.remember(b, 8);
        chron.add('wedding', 'ev.wedding', P(ev.pair), 'heart');
        world.flags.wedding = true;
        break;
      }
      case 'birth': {
        const [a, b] = ev.pair;
        world.spawnResident('child', [a, b]);
        chron.add('birth', 'ev.birth', { name: a.name, gender: a.gender }, 'baby');
        world.flags.birth = true;
        break;
      }
      case 'discovery': {
        const who = pickResident(world);
        WJ.Brain.remember(who, 5);
        chron.add('discovery', 'ev.discovery', { name: who.name, gender: who.gender }, 'shell');
        if (Math.random() < 0.5) world.flags.discoveryShell = true; else world.flags.discoveryStar = true;
        break;
      }
      case 'quarrel': {
        const [a, b] = ev.pair;
        WJ.Brain.relate(a, b.id, -25); WJ.Brain.relate(b, a.id, -25);
        WJ.Brain.remember(a, -4); WJ.Brain.remember(b, -4);
        chron.add('quarrel', 'ev.quarrel', P(ev.pair), 'wind');
        world.quarrelDays = 0;
        break;
      }
      case 'reconciliation': {
        const [a, b] = ev.pair;
        WJ.Brain.relate(a, b.id, 35); WJ.Brain.relate(b, a.id, 35);
        WJ.Brain.remember(a, 6); WJ.Brain.remember(b, 6);
        chron.add('reconciliation', 'ev.reconciliation', P(ev.pair), 'hands');
        world.flags.reconciliation = true;
        break;
      }
      case 'move': {
        const home = ev.home;
        const who = pickResident(world);
        who.homeId = home.id;
        chron.add('move', 'ev.move', { name: who.name, gender: who.gender }, 'home');
        break;
      }
      case 'gift': {
        const [a, b] = ev.pair;
        WJ.Brain.relate(a, b.id, 12); WJ.Brain.relate(b, a.id, 10);
        chron.add('gift', 'ev.gift', P(ev.pair), 'heart');
        break;
      }
      case 'miracle': {
        world.residents.forEach(function (r) { r.mood = U.clamp(r.mood + 15, 0, 100); r.trust = U.clamp(r.trust + 0.05, 0, 1); WJ.Brain.remember(r, 6); });
        chron.add('miracle', 'ev.miracle', { name: pickName(world), gender: pickGender(world) }, 'rainbow');
        world.flags.rainbowSeen = true;
        break;
      }
      case 'aging': {
        const who = ev.who;
        chron.add('aging', 'ev.aging', { name: who.name, gender: who.gender }, 'cane');
        world.flags.elder = true;
        break;
      }
      case 'departure': {
        const who = ev.who;
        chron.add('departure', 'ev.departure', { name: who.name, gender: who.gender }, 'star');
        world.departResident(who.id);
        world.flags.departure = true;
        break;
      }
      case 'new_resident': {
        const r = world.spawnResident('adult', null);
        chron.add('new_resident', 'ev.new_resident', { name: r.name, gender: r.gender }, 'pop');
        break;
      }
    }
  }
  function pickResident(world) {
    const rs = world.residents;
    return rs[Math.floor(Math.random() * rs.length)] || null;
  }
  function pickName(world) { const r = pickResident(world); return r ? r.name : ''; }
  function pickGender(world) { const r = pickResident(world); return r ? r.gender : 'm'; }

  // Один вызов в игровой день: выбрать по весу и исполнить (максимум 1-2 события)
  function tick(world) {
    const cands = candidates(world);
    if (!cands.length) return;
    // взвешенный выбор одного
    const total = cands.reduce(function (s, c) { return s + c.w; }, 0);
    let roll = Math.random() * total;
    for (const c of cands) {
      roll -= c.w;
      if (roll <= 0) { execute(world, c); break; }
    }
  }

  // ---- 20 сюжетов (открываются по условиям, для главы 6) ----
  const STORIES = [
    { id: 'secret_love',   icon: 'heart',     cond: function (w) { return findPair(w, 60) && w.flags.wedding !== true; } },
    { id: 'wise_elder',   icon: 'cane',      cond: function (w) { return w.residents.some(function (r) { return r.ageStage === 'elder'; }); } },
    { id: 'first_lighthouse', icon: 'lighthouse', cond: function (w) { return w.hasBuilding('lighthouse'); } },
    { id: 'neighbors_peace', icon: 'hands',   cond: function (w) { return w.flags.reconciliation; } },
    { id: 'child_stars',  icon: 'star',      cond: function (w) { return w.residents.some(function (r) { return r.ageStage === 'child'; }) && w.nightSeen; } },
    { id: 'great_harvest', icon: 'wheat',    cond: function (w) { return (w.achCount.harvest || 0) >= 3; } },
    { id: 'fisherman_luck', icon: 'shell',   cond: function (w) { return w.residents.some(function (r) { return r.skills.fish > 0.6; }); } },
    { id: 'storm_hero',   icon: 'storm',     cond: function (w) { return w.flags.stormSurvived; } },
    { id: 'rainbow_wish', icon: 'rainbow',   cond: function (w) { return w.flags.rainbowSeen; } },
    { id: 'festival_founder', icon: 'confetti', cond: function (w) { return w.flags.festivalHeld; } },
    { id: 'shy_singer',   icon: 'music',     cond: function (w) { return w.residents.some(function (r) { return r.mood > 80 && r.personality.social < 0.35; }); } },
    { id: 'seed_keeper',  icon: 'tree',      cond: function (w) { return (w.achCount.planted || 0) >= 3; } },
    { id: 'night_watcher', icon: 'moon',     cond: function (w) { return w.nightSeen && w.residents.some(function (r) { return r.needs.meaning > 70; }); } },
    { id: 'well_digger',  icon: 'drop',     cond: function (w) { return w.hasBuilding('well'); } },
    { id: 'cloud_dreamer', icon: 'cloud',   cond: function (w) { return w.residents.some(function (r) { return r.personality.curious > 0.75; }); } },
    { id: 'two_brothers', icon: 'pop',      cond: function (w) { return w.residents.filter(function (r) { return r.parentIds.length === 2; }).length >= 2; } },
    { id: 'lost_hat',     icon: 'wind',     cond: function (w) { return w.flags.windDay; } },
    { id: 'warm_winter',  icon: 'snow',     cond: function (w) { return w.flags.snowDay && w.residents.every(function (r) { return r.needs.safety > 40; }); } },
    { id: 'moon_walkers', icon: 'moon',     cond: function (w) { return w.nightSeen && w.harmony > 65; } },
    { id: 'tiny_garden',  icon: 'tree',     cond: function (w) { return (w.achCount.planted || 0) >= 1 && w.hasBuilding('field'); } },
  ];
  function checkStories(world) {
    for (let i = 0; i < STORIES.length; i++) {
      const s = STORIES[i];
      if (world.openStories.indexOf(s.id) >= 0) continue;
      let ok = false;
      try { ok = s.cond(world); } catch (e) { ok = false; }
      if (ok) world.openStory(s.id);
    }
  }

  return { tick, checkStories, STORIES, _cooldowns: cooldowns };
})();
