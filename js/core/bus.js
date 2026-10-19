// FILE: js/core/bus.js
WJ.Bus = (function () {
  const map = {};
  function on(name, fn) {
    (map[name] = map[name] || []).push(fn);
    return fn;
  }
  function off(name, fn) {
    const arr = map[name];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  function emit(name, data) {
    const arr = map[name];
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) {
      try { arr[i](data); } catch (e) { WJ.Errors && WJ.Errors.log('bus:' + name, e); }
    }
  }
  function clear() { for (const k in map) delete map[k]; }
  return { on, off, emit, clear };
})();
