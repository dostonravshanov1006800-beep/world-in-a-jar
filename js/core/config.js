// FILE: js/core/config.js
window.WJ = window.WJ || {};
WJ.Config = (function () {
  const CFG = {
    version: 1,
    DAY_SECONDS: 100,          // 1 игровой день = 100 с реального времени
    SIM_HZ: 10,                // фиксированный шаг симуляции
    POP_START: 3, POP_MAX: 24, POP_MIN: 1,
    PLANETS_MAX: 3,
    ENERGY: { max: 100, regenPerSec: 0.5 }, // +1 каждые 2 с
    WEATHER_DURATION: 25,       // сек действия погоды
    CHILD_DAYS: 3, ELDER_DAYS: 25,
    HARMONY: { mood: 0.4, nature: 0.3, bonds: 0.3 },
    SAVE_INTERVAL: 15,
    OFFLINE_DAYS_MAX: 5,
    ADVICE_PER_DAY: 1,
    STARS_DAILY: 10,
  };

  // Погода: цена, коэффициенты (рост растений, влажность, температура, ветер,
  // видимость, настроение). Радуга доступна только после дождя + солнца.
  CFG.weather = {
    clear:  { cost: 0,  growth: 1.0, wet: 0.0, temp: 0,  wind: 0,  vis: 1.0, mood: 0 },
    sun:    { cost: 20, growth: 1.6, wet: -0.4, temp: 1,  wind: 0,  vis: 1.0, mood: +0.35, drought: true },
    rain:   { cost: 25, growth: 1.4, wet: +0.8, temp: -0.3, wind: 0.2, vis: 0.85, mood: -0.05, damp: true },
    wind:   { cost: 20, growth: 0.9, wet: -0.2, temp: 0,  wind: 1,  vis: 0.95, mood: +0.05 },
    snow:   { cost: 30, growth: 0.5, wet: +0.3, temp: -1, wind: 0.3, vis: 0.8, mood: +0.1, cold: true },
    fog:    { cost: 20, growth: 0.7, wet: +0.2, temp: -0.1, wind: -0.5, vis: 0.45, mood: +0.02 },
    storm:  { cost: 40, growth: 1.1, wet: +1.0, temp: -0.5, wind: 0.9, vis: 0.6, mood: -0.15, lightning: true },
    rainbow:{ cost: 35, growth: 1.2, wet: 0.1, temp: 0.2, wind: 0, vis: 1.0, mood: +0.9, miracle: true },
  };
  CFG.weatherOrder = ['sun', 'rain', 'wind', 'snow', 'fog', 'storm', 'rainbow'];

  // 24 совета: теги, влияние на нужды, награда/штраф при успехе и неудаче.
  // needs: food, rest, safety, social, meaning
  CFG.advice = {
    go_home:    { tags: ['safety', 'rest'],  need: 'safety', delta: { safety: +18, rest: +10 }, risk: 0.0, fitBold: -1 },
    talk:      { tags: ['social'],           need: 'social', delta: { social: +16, meaning: +4 }, risk: 0.1, fitBold: 0 },
    risk:      { tags: ['risk'],             need: 'meaning', delta: { meaning: +18 }, risk: 0.6, fitBold: 1 },
    wait:      { tags: ['rest'],             need: 'rest', delta: { rest: +10, meaning: -2 }, risk: 0.0, fitBold: -1 },
    build:     { tags: ['work'],             need: 'meaning', delta: { meaning: +14, rest: -8 }, risk: 0.25, fitBold: 0 },
    plant:     { tags: ['work', 'nature'],   need: 'meaning', delta: { meaning: +10, food: +6 }, risk: 0.15, fitBold: 0 },
    forgive:   { tags: ['emotion', 'social'],need: 'social', delta: { social: +14, meaning: +6 }, risk: 0.2, fitBold: -1 },
    confess:   { tags: ['emotion', 'risk'],  need: 'social', delta: { social: +18 }, risk: 0.5, fitBold: 1 },
    rest:      { tags: ['rest'],             need: 'rest', delta: { rest: +20, food: +4 }, risk: 0.0, fitBold: -1 },
    passion:   { tags: ['emotion', 'work'],  need: 'meaning', delta: { meaning: +20, rest: -6 }, risk: 0.2, fitBold: 0 },
    trust:     { tags: ['emotion'],          need: 'safety', delta: { safety: +12, social: +8 }, risk: 0.3, fitBold: -1 },
    leave:     { tags: ['risk'],             need: 'meaning', delta: { meaning: +16, social: -10 }, risk: 0.7, fitBold: 1 },
    save:      { tags: ['work'],             need: 'food', delta: { food: +14 }, risk: 0.1, fitBold: 0 },
    share:     { tags: ['social'],           need: 'social', delta: { social: +16, food: -4 }, risk: 0.15, fitBold: 0 },
    learn:     { tags: ['work'],             need: 'meaning', delta: { meaning: +16, rest: -6 }, risk: 0.2, fitBold: 0 },
    slow:      { tags: ['rest'],             need: 'rest', delta: { rest: +14, meaning: +4 }, risk: 0.0, fitBold: -1 },
    help:      { tags: ['social', 'work'],   need: 'social', delta: { social: +12, meaning: +8, rest: -5 }, risk: 0.15, fitBold: 0 },
    fish:      { tags: ['work'],             need: 'food', delta: { food: +16, rest: -4 }, risk: 0.3, fitBold: 0 },
    dance:     { tags: ['emotion'],          need: 'social', delta: { social: +14, meaning: +8, rest: -4 }, risk: 0.1, fitBold: 0 },
    look_sky:  { tags: ['rest', 'emotion'],  need: 'meaning', delta: { meaning: +12, rest: +6 }, risk: 0.0, fitBold: 0 },
    make_peace:{ tags: ['emotion', 'social'],need: 'social', delta: { social: +20 }, risk: 0.3, fitBold: -1 },
    be_brave:  { tags: ['risk'],            need: 'meaning', delta: { meaning: +12, safety: -4 }, risk: 0.4, fitBold: 1 },
    be_careful:{ tags: ['safety'],          need: 'safety', delta: { safety: +16, meaning: -3 }, risk: 0.0, fitBold: -1 },
    celebrate: { tags: ['emotion', 'social'],need: 'social', delta: { social: +18, meaning: +10 }, risk: 0.2, fitBold: 0 },
  };
  CFG.adviceOrder = Object.keys(CFG.advice);

  // Главы
  CFG.chapters = [
    { id: 'ch1', name: 'chapter.1', goal: { pop: 3, buildings: { campfire: 1 } } },
    { id: 'ch2', name: 'chapter.2', goal: { pop: 8, homes: 5, fields: 1 } },
    { id: 'ch3', name: 'chapter.3', goal: { festival: 1 } },
    { id: 'ch4', name: 'chapter.4', goal: { pop: 14, harmonyDays: 3, harmony: 70 } },
    { id: 'ch5', name: 'chapter.5', goal: { pop: 20, school: 1, market: 1, lighthouse: 1 } },
    { id: 'ch6', name: 'chapter.6', goal: { stories: 12 } },
  ];

  // 25 достижений
  CFG.achievements = [
    { id: 'first_fire',   icon: 'fire' },
    { id: 'first_home',   icon: 'home' },
    { id: 'first_wedding',icon: 'heart' },
    { id: 'first_birth',  icon: 'baby' },
    { id: 'rainbow_seen', icon: 'rainbow' },
    { id: 'no_quarrel_5', icon: 'dove' },
    { id: 'wise_advice',  icon: 'star' },
    { id: 'ignored_advice',icon: 'wind' },
    { id: 'storm_survived', icon: 'storm' },
    { id: 'harvest_10',   icon: 'wheat' },
    { id: 'pop_12',       icon: 'pop' },
    { id: 'pop_24',       icon: 'pop' },
    { id: 'elder_first',  icon: 'cane' },
    { id: 'stars_3',      icon: 'star' },
    { id: 'love_story',   icon: 'heart' },
    { id: 'reconciliation', icon: 'hands' },
    { id: 'festival_held', icon: 'confetti' },
    { id: 'lighthouse',   icon: 'lighthouse' },
    { id: 'school_built', icon: 'book' },
    { id: 'full_shelf',   icon: 'shelf' },
    { id: 'chronicle_50', icon: 'book' },
    { id: 'discovery_shell', icon: 'shell' },
    { id: 'discovery_star', icon: 'star' },
    { id: 'three_plants',  icon: 'tree' },
    { id: 'day_30',       icon: 'sun' },
  ];

  // Косметика за звёздную пыль
  CFG.cosmetics = {
    lid:    { gold: 0, copper: 40, silver: 60 },
    tag:    { paper: 0, heart: 25, star: 25 },
    window: { warm: 0, forest: 40, dusk: 40 },
  };

  // Тиры качества
  CFG.tiers = {
    high:   { glass: 'transmission', shadow: 2048, post: 2, icoSub: 7, instances: 600, particles: 250, pixelRatio: 2.75 },
    medium: { glass: 'transmission', shadow: 1024, post: 1,  icoSub: 6, instances: 350, particles: 150, pixelRatio: 2.5 },
    low:    { glass: 'fake',         shadow: 0,    post: 0,  icoSub: 5, instances: 150, particles: 60,  pixelRatio: 1.5 },
  };

  return CFG;
})();
