// FILE: js/core/util.js
WJ.Util = (function () {
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function sat(v) { return clamp(v, 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function invLerp(a, b, v) { return b === a ? 0 : clamp((v - a) / (b - a), 0, 1); }
  function smoothstep(t) { t = sat(t); return t * t * (3 - 2 * t); }
  function finite(v, def) { return (typeof v === 'number' && isFinite(v)) ? v : def; }
  function move(current, target, maxDelta) {
    if (Math.abs(target - current) <= maxDelta) return target;
    return current + Math.sign(target - current) * maxDelta;
  }
  function angleLerp(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  function safeNormalize(x, y, z, out) {
    out = out || { x: 0, y: 0, z: 0 };
    const l2 = x * x + y * y + z * z;
    if (l2 < 1e-12) { out.x = 0; out.y = 1; out.z = 0; return out; }
    const l = Math.sqrt(l2);
    out.x = x / l; out.y = y / l; out.z = z / l;
    return out;
  }
  function fmtNum(n) { n = Math.round(finite(n, 0)); return String(n); }
  function hashString(s) {
    let h = 2166136261 >>> 0;
    s = String(s);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function deepClone(obj) { return obj == null ? obj : JSON.parse(JSON.stringify(obj)); }
  // Смешивание цветов [r,g,b] 0..1
  function mixCol(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function throttle(fn, ms) {
    let last = 0, timer = null, lastArgs = null, pending = false;
    function wrap() {
      lastArgs = arguments;
      const now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(null, lastArgs); pending = false; }
      else if (!pending) {
        pending = true;
        timer = setTimeout(function () { last = Date.now(); pending = false; fn.apply(null, lastArgs); }, ms - (now - last));
      }
    }
    wrap.cancel = function () { if (timer) clearTimeout(timer); timer = null; pending = false; };
    return wrap;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  return { clamp, sat, lerp, invLerp, smoothstep, finite, move, angleLerp, safeNormalize, fmtNum, hashString, deepClone, mixCol, throttle, esc };
})();
