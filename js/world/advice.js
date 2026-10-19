// FILE: js/world/advice.js
// Советы-стикеры: контекстные подсказки (3 подходящих), применение результата,
// доверие, тексты для «Письма дня» и Летописи.
WJ.Advice = (function () {
  const U = WJ.Util, C = WJ.Config;
  const rng = WJ.Rng.create(20241019);

  // Три «подходящих» стикера по контексту жителя и мира
  function fitList(r, ws) {
    const low = WJ.Brain.lowestNeed(r);
    const P = r.personality;
    const scores = {};
    for (const id of C.adviceOrder) {
      const adv = C.advice[id];
      let s = 0.5;
      if (adv.need === low) s += 0.45;
      if (adv.tags.indexOf('risk') >= 0) s += (P.brave - 0.5) * 0.5;
      if (adv.tags.indexOf('social') >= 0) s += (P.social - 0.5) * 0.5;
      if (adv.tags.indexOf('work') >= 0) s += (P.hard - 0.5) * 0.5;
      if (ws.stormK > 0.4 && (id === 'go_home' || id === 'be_careful')) s += 0.4;
      if (ws.dry > 0.5 && (id === 'plant' || id === 'save')) s += 0.2;
      if (r.needs.social < 40 && (id === 'talk' || id === 'make_peace' || id === 'forgive')) s += 0.25;
      if (r.mood < 35 && (id === 'dance' || id === 'look_sky' || id === 'celebrate')) s += 0.3;
      if (r.ageStage === 'child' && (id === 'dance' || id === 'learn' || id === 'look_sky')) s += 0.2;
      scores[id] = s;
    }
    const sorted = C.adviceOrder.slice().sort(function (a, b) { return scores[b] - scores[a]; });
    return sorted.slice(0, 3);
  }

  // Дать совет: решает житель (мозг), возвращает результат
  function give(r, adviceId, ws) {
    const adv = C.advice[adviceId];
    if (!adv) return null;
    const score = WJ.Brain.evaluateAdvice(r, adviceId, ws);
    const followed = score >= 0.5;
    const rec = { adviceId, followed, ok: followed };
    r.adviceToday = rec;
    if (followed) {
      // действие выполняется; исход зависит от состояния мира
      let ok = true;
      const skill = 0.35 + r.trust * 0.3 + (ws.growth > 1 ? 0.15 : 0);
      if (adv.risk > 0.4 && Math.random() > skill + 0.25) ok = false;
      if (ws.stormK > 0.5 && adv.risk > 0.3) ok = Math.random() > 0.4;
      rec.ok = ok;
      // применяем эффекты к нуждам
      for (const k in adv.delta) {
        r.needs[k] = U.clamp(r.needs[k] + (adv.delta[k] * (ok ? 1 : 0.4)), 0, 100);
      }
      // доверие
      const dTrust = ok ? U.lerp(0.03, 0.08, score) : -U.lerp(0.02, 0.06, 1 - score);
      r.trust = U.clamp(r.trust + dTrust, 0, 1);
      WJ.Brain.remember(r, ok ? 6 : -4);
      r.mood = U.clamp(r.mood + (ok ? 8 : -5), 0, 100);
    } else {
      // не послушался: доверие чуть падает
      r.trust = U.clamp(r.trust - 0.02, 0, 1);
      WJ.Brain.remember(r, -2);
    }
    return rec;
  }

  // Абзац для Письма дня по каждому совету
  function letterLine(r) {
    if (!r.adviceToday) return null;
    const a = r.adviceToday;
    const t = WJ.I18n;
    const adviceName = t.t('advice.' + a.adviceId);
    const params = { name: r.name, a: adviceName, gender: r.gender };
    if (a.followed && a.ok) {
      return { text: t.tRand('ev.advice_ok', rng, params), kind: 'good', name: r.name };
    } else if (a.followed && !a.ok) {
      return { text: t.tRand('ev.advice_ok', rng, params) + ' ' + t.t('ui.ignored'), kind: 'bad', name: r.name };
    }
    return { text: t.tRand('ev.advice_ignored', rng, params), kind: 'own', name: r.name };
  }

  return { fitList, give, letterLine };
})();
