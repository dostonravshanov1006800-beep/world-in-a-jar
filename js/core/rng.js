// FILE: js/core/rng.js
// Детерминированный ГПСЧ mulberry32. Один seed -> одна и та же последовательность.
WJ.Rng = (function () {
  function create(seed) {
    let s = (typeof seed === 'string' ? WJ.Util.hashString(seed) : (seed >>> 0)) >>> 0;
    if (s === 0) s = 0x9e3779b9;
    function next() { // [0,1)
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function range(a, b) { return a + next() * (b - a); }
    function int(a, b) { return Math.floor(range(a, b + 1 - 1e-9)); } // включительно
    function pick(arr) { return arr[Math.floor(next() * arr.length)]; }
    function chance(p) { return next() < p; }
    function gauss() { // Бокс-Мюллер
      let u = 0, v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    return { next, range, int, pick, chance, gauss, seed: s };
  }
  return { create };
})();
