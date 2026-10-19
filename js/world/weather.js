// FILE: js/world/weather.js
// Погода: энергия неба, 7 типов + ясно, плавные переходы, засуха/сырость,
// радуга только после дождя+солнца. Вся таблица коэффициентов в WJ.Config.weather.
WJ.Weather = (function () {
  const U = WJ.Util, C = WJ.Config;
  let energy = C.ENERGY.max;
  let current = 'clear', prev = 'clear';
  let timer = 0, transition = 1; // 0..1 нарастание текущей погоды
  let sunAfterRain = false; // флаг: был дождь, затем солнце -> радуга доступна
  let rainK = 0, snowK = 0, fogK = 0, stormK = 0, windK = 0, heatK = 0, auroraK = 0, dark = 0;
  // накопители последствий
  let wet = 0, dry = 0; // 0..1 сырость/засуха
  let moodBias = 0;
  let timeAcc = 0;

  function apply(type) {
    const w = C.weather[type];
    if (!w) return { ok: false, reason: 'unknown' };
    if (type === 'rainbow' && !sunAfterRain) return { ok: false, reason: 'rainbow_locked' };
    if (type === current) return { ok: true };
    if (energy < w.cost) return { ok: false, reason: 'energy' };
    energy -= w.cost;
    prev = current;
    current = type;
    timer = C.WEATHER_DURATION;
    transition = 0;
    if (type === 'rain' || type === 'storm') sunAfterRain = false;
    if ((prev === 'rain' || prev === 'storm') && type === 'sun') sunAfterRain = true;
    WJ.Bus.emit('weather:changed', { type });
    return { ok: true };
  }

  function update(dt) {
    energy = U.clamp(energy + C.ENERGY.regenPerSec * dt, 0, C.ENERGY.max);
    if (current !== 'clear') {
      timer -= dt;
      if (timer <= 0) {
        prev = current;
        if (prev === 'rain' || prev === 'storm') sunAfterRain = true;
        if (prev === 'sun' || prev === 'rainbow') sunAfterRain = false; // шанс упущен
        current = 'clear';
        transition = 0;
        WJ.Bus.emit('weather:changed', { type: 'clear' });
      }
    }
    transition = U.move(transition, 1, dt * 0.7);
    const w = C.weather[current];
    const k = transition;
    // визуальные коэффициенты
    const target = {
      rain: current === 'rain' ? 1 : 0,
      snow: current === 'snow' ? 1 : 0,
      fog: current === 'fog' ? 1 : 0,
      storm: current === 'storm' ? 1 : 0,
      wind: Math.abs(w.wind) * (current === 'clear' ? 0.2 : 1),
      heat: current === 'sun' ? 1 : 0,
    };
    rainK = U.move(rainK, target.rain * k, dt * 0.8);
    snowK = U.move(snowK, target.snow * k, dt * 0.8);
    fogK = U.move(fogK, target.fog * k, dt * 0.8);
    stormK = U.move(stormK, target.storm * k, dt * 0.8);
    windK = U.move(windK, Math.abs(w.wind) * (current === 'clear' ? 0.15 : k), dt * 0.6);
    heatK = U.move(heatK, target.heat * k, dt * 0.5);
    dark = U.move(dark, (current === 'storm' ? 0.55 : current === 'rain' ? 0.3 : current === 'fog' ? 0.35 : current === 'snow' ? 0.25 : 0), dt * 0.5);
    // северное сияние: редкое, ночью при снеге/ясно
    timeAcc += dt;
    if (current === 'snow' || (current === 'clear' && Math.floor(timeAcc) % 97 < 6)) auroraK = U.move(auroraK, 0.8, dt * 0.3);
    else auroraK = U.move(auroraK, 0, dt * 0.3);
    // накопители: сырость и засуха
    if (current === 'rain' || current === 'storm') wet = U.sat(wet + w.wet * dt * 0.02);
    else wet = U.sat(wet - dt * 0.006 * (1 + Math.max(w.wind, 0)));
    if (current === 'sun') dry = U.sat(dry + dt * 0.008);
    else dry = U.sat(dry - dt * 0.006);
    moodBias = w.mood * k;
  }

  // коэффициенты для симуляции мира
  function sim() {
    const w = C.weather[current];
    const k = transition;
    return {
      growth: U.lerp(1, w.growth, k),
      wet: U.lerp(0, w.wet, k),
      temp: U.lerp(0, w.temp, k),
      wind: U.lerp(0, w.wind, k),
      vis: U.lerp(1, w.vis, k),
      mood: moodBias,
      drought: dry, damp: wet,
      cold: w.cold ? k : 0,
    };
  }

  function serialize() {
    return { energy, current, timer, sunAfterRain, wet, dry, transition };
  }
  function deserialize(s) {
    s = s || {};
    energy = U.finite(s.energy, C.ENERGY.max, 0, C.ENERGY.max);
    current = C.weather[s.current] ? s.current : 'clear';
    timer = U.finite(s.timer, 0, 0, 600);
    sunAfterRain = !!s.sunAfterRain;
    wet = U.finite(s.wet, 0, 0, 1); dry = U.finite(s.dry, 0, 0, 1);
    transition = 1;
  }

  const api = {
    apply, update, sim, serialize, deserialize,
    addEnergy: function (n) { energy = U.clamp(energy + n, 0, C.ENERGY.max); },
    get energy() { return energy; },
    get current() { return current; },
    get rainK() { return rainK; },
    get snowK() { return snowK; },
    get fogK() { return fogK; },
    get stormK() { return stormK; },
    get windK() { return windK; },
    get heatK() { return heatK; },
    get auroraK() { return auroraK; },
    get dark() { return dark; },
    get wet() { return wet; },
    get dry() { return dry; },
  };
  return api;
})();
