// FILE: js/world/brain.js
// Мозг: личность (0..1), нужды (0..100), настроение, память (20 событий),
// граф отношений, утилитарные решения на день, оценка совета, жизненный цикл.
WJ.Brain = (function () {
  const U = WJ.Util, C = WJ.Config;

  function createResident(rng, id, ageStage) {
    const r = {
      id,
      gender: rng.chance(0.5) ? 'm' : 'f',
      name: '',
      age: ageStage === 'child' ? 0 : (ageStage === 'elder' ? C.ELDER_DAYS : 6),
      ageStage: ageStage || 'adult',
      personality: {
        brave: rng.next(), social: rng.next(), hard: rng.next(),
        trusting: rng.next(), curious: rng.next(),
      },
      needs: { food: rng.range(55, 90), rest: rng.range(55, 90), safety: rng.range(55, 90), social: rng.range(45, 90), meaning: rng.range(45, 85) },
      mood: 70,
      trust: rng.range(0.35, 0.6),
      memory: [],          // последние 20 событий {t, impact}
      relations: {},       // id -> {v: -100..100, type}
      action: 'idle',
      actionTimer: rng.range(2, 5),
      adviceToday: null,   // {adviceId, followed, resultPending}
      bubble: null,
      skills: { build: rng.next() * 0.3, farm: rng.next() * 0.3, fish: rng.next() * 0.3 },
      homeId: null,
      partnerId: null,
      parentIds: [],
      thoughtT: 0,
    };
    return r;
  }
  function inheritPersonality(rng, parents) {
    const p = {
      brave: 0, social: 0, hard: 0, trusting: 0, curious: 0,
    };
    if (!parents.length) { for (const k in p) p[k] = rng.next(); return p; }
    const src = parents[rng.int(0, parents.length - 1)];
    for (const k in p) p[k] = U.clamp((src.personality[k] + rng.gauss() * 0.15 + 0.5) / 2, 0, 1);
    return p;
  }

  // Нужды падают с разной скоростью; влияют на настроение
  function updateResident(r, dt, ws) {
    const hours = dt / (C.DAY_SECONDS / 24); // игровые часы
    const decay = {
      food: 1.6, rest: 1.1, safety: 0.5, social: 1.3, meaning: 0.7,
    };
    for (const k in decay) r.needs[k] = U.clamp(r.needs[k] - decay[k] * hours, 0, 100);
    // погода и общее состояние правят настроение
    let m = 0;
    m += (r.needs.food - 50) * 0.14 + (r.needs.rest - 50) * 0.1 + (r.needs.safety - 50) * 0.1
       + (r.needs.social - 50) * 0.12 + (r.needs.meaning - 50) * 0.12;
    m += ws.mood * 18;
    // память: затухающие события
    for (let i = 0; i < r.memory.length; i++) r.memory[i].impact *= Math.pow(0.97, dt / C.DAY_SECONDS * 24);
    let memM = 0;
    for (let i = 0; i < r.memory.length; i++) memM += r.memory[i].impact;
    m += memM;
    r.mood = U.clamp(m + 50, 0, 100);
    // пузырь-вопрос утром: самая низкая нужда
    if (r.thoughtT <= 0) {
      let lowK = null, lowV = 100;
      for (const k in r.needs) if (r.needs[k] < lowV) { lowV = r.needs[k]; lowK = k; }
      if (lowV < 55) r.bubble = lowK; else r.bubble = null;
    }
  }
  function remember(r, impact) {
    r.memory.push({ t: Date.now(), impact: U.clamp(impact, -10, 10) });
    if (r.memory.length > 20) r.memory.shift();
  }

  function relate(r, otherId, delta) {
    if (!r.relations[otherId]) r.relations[otherId] = { v: 0, type: 'known' };
    const rel = r.relations[otherId];
    rel.v = U.clamp(rel.v + delta, -100, 100);
    rel.type = relType(rel.v, r.id, otherId);
  }
  function relType(v) {
    if (v >= 75) return 'best';
    if (v >= 45) return 'friend';
    if (v >= 90 && v > 45) return 'pair';
    if (v <= -40) return 'rival';
    return 'known';
  }

  // Утилитарное решение: выбираем действие по полезности
  function decide(r, ctx) {
    // ctx: {ws, nearOthers: [{id, rel}], buildings, dayT, hasAdvice}
    const ut = {};
    ut.eat = (100 - r.needs.food) * 1.2 + 10;
    ut.sleep = (100 - r.needs.rest) * 1.0 + (ctx.dayT > 0.85 || ctx.dayT < 0.05 ? 40 : 0);
    ut.work = (100 - r.needs.meaning) * 0.7 + r.personality.hard * 40 - 10;
    ut.social = (100 - r.needs.social) * 0.8 + r.personality.social * 30 + (ctx.nearOthers.length ? 10 : -10);
    ut.walk = 15 + r.personality.curious * 25;
    ut.hide = ctx.ws.stormK > 0.4 || ctx.ws.rainK > 0.6 ? (100 - r.needs.safety) * 0.9 + 30 : 5;
    ut.fish = ctx.nearWater && r.skills.fish > 0.3 ? 20 + r.skills.fish * 15 : 8;
    ut.help = ctx.someoneNeeds ? 25 + r.personality.social * 20 : 8;
    ut.visit_friend = ctx.bestFriendNear ? 30 : 5;
    // совет игрока повышает вес соответствующих действий
    if (r.adviceToday && r.adviceToday.followed) {
      const adv = C.advice[r.adviceToday.adviceId];
      if (adv) {
        if (adv.tags.indexOf('social') >= 0) ut.social += 35;
        if (adv.tags.indexOf('rest') >= 0) ut.sleep += 25;
        if (adv.tags.indexOf('work') >= 0) ut.work += 30;
        if (adv.tags.indexOf('risk') >= 0) ut.walk += 30;
      }
    }
    let best = 'idle', bestU = -1;
    for (const k in ut) { const u = ut[k] + (Math.random() * 6 - 3); if (u > bestU) { bestU = u; best = k; } }
    const map = {
      eat: 'eat', sleep: 'sleep', work: 'work', social: 'talk', walk: 'walk',
      hide: 'go_home', fish: 'fish', help: 'help', visit_friend: 'talk', idle: 'idle',
    };
    return map[best] || 'idle';
  }

  // Оценка совета (по формуле из спецификации)
  function evaluateAdvice(r, adviceId, ws, noiseVal) {
    const adv = C.advice[adviceId];
    if (!adv) return 0;
    const P = r.personality;
    // fit: соответствие характеру
    let fit = 0;
    if (adv.tags.indexOf('risk') >= 0) fit += (P.brave - 0.5) * 1.6;
    if (adv.tags.indexOf('social') >= 0) fit += (P.social - 0.5) * 1.4;
    if (adv.tags.indexOf('work') >= 0) fit += (P.hard - 0.5) * 1.4;
    if (adv.tags.indexOf('rest') >= 0) fit += (0.5 - P.brave) * 0.8;
    if (adv.tags.indexOf('emotion') >= 0) fit += (P.trusting - 0.5) * 0.8;
    fit = U.sat(fit * 0.5 + 0.5);
    // needMatch: совет закрывает самую низкую нужду?
    const lowK = lowestNeed(r);
    const needMatch = adv.need === lowK ? 0.9 : (r.needs[adv.need] < 60 ? 0.6 : 0.25);
    // riskPenalty
    let riskPenalty = adv.risk * (1 - P.brave) * 0.8;
    if (ws.stormK > 0.3 && adv.risk > 0.4) riskPenalty += 0.2;
    const noise = noiseVal !== undefined ? noiseVal : (Math.random() * 0.2 - 0.1);
    const score = fit * 0.35 + r.trust * 0.30 + needMatch * 0.20 - riskPenalty * 0.15 + noise;
    return U.clamp(score, 0, 1);
  }
  function lowestNeed(r) {
    let k = 'food', v = 100;
    for (const n in r.needs) if (r.needs[n] < v) { v = r.needs[n]; k = n; }
    return k;
  }

  // Жизненный цикл: старение
  function advanceAge(r, days) {
    r.age += days;
    if (r.ageStage === 'child' && r.age >= C.CHILD_DAYS) r.ageStage = 'adult';
    else if (r.ageStage === 'adult' && r.age >= C.ELDER_DAYS) r.ageStage = 'elder';
  }

  function serialize(r) {
    return {
      id: r.id, gender: r.gender, name: r.name, age: r.age, ageStage: r.ageStage,
      p: r.personality, needs: r.needs, mood: Math.round(r.mood), trust: r.trust,
      relations: r.relations, skills: r.skills, homeId: r.homeId, partnerId: r.partnerId,
      parentIds: r.parentIds, action: r.action, node: r.nodeIdx,
    };
  }
  function deserialize(r, d) {
    d = d || {};
    r.ageStage = ['child', 'adult', 'elder'].indexOf(d.ageStage) >= 0 ? d.ageStage : 'adult';
    r.age = U.finite(d.age, 6, 0, 999);
    r.mood = U.finite(d.mood, 70, 0, 100);
    r.trust = U.finite(d.trust, 0.45, 0, 1);
    r.nodeIdx = U.finite(d.node, 0, 0, 100000);
    r.relations = (d.relations && typeof d.relations === 'object') ? d.relations : {};
    r.skills = (d.skills && typeof d.skills === 'object') ? d.skills : r.skills;
    if (d.p) for (const k in r.personality) r.personality[k] = U.finite(d.p[k], 0.5, 0, 1);
    if (d.needs) for (const k in r.needs) r.needs[k] = U.finite(d.needs[k], 60, 0, 100);
    r.homeId = d.homeId || null; r.partnerId = d.partnerId || null;
    r.parentIds = Array.isArray(d.parentIds) ? d.parentIds.slice(0, 2) : [];
    r.gender = d.gender === 'f' ? 'f' : 'm';
    r.name = String(d.name || '').slice(0, 20);
  }

  return {
    createResident, updateResident, remember, relate, decide, evaluateAdvice, advanceAge,
    serialize, deserialize, lowestNeed,
  };
})();
