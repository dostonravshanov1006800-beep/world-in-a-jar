// FILE: js/world/nav.js
// Навигация по сфере: ~2000 точек Фибоначчи, связи с соседями, проходимость,
// A* + сглаживание, движение по поверхности (кватернионы), «вверх» = нормаль.
WJ.Nav = (function () {
  const U = WJ.Util;
  let nodes = [], neighbors = [], count = 0;

  function build(seed, heightFn, seaLevel, n) {
    n = n || 1400;
    count = n;
    nodes = new Array(n);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      const dir = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize();
      let h = 0;
      try { h = U.finite(heightFn(dir.x, dir.y, dir.z), -1); } catch (e) { h = -1; }
      nodes[i] = { i, dir, h, passable: h > seaLevel + 0.0035, walkable: h > seaLevel + 0.0035 };
    }
    // связи с k ближайшими (по углу)
    const K = 6;
    neighbors = new Array(n);
    for (let i = 0; i < n; i++) {
      const dists = [];
      const di = nodes[i].dir;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const d = di.distanceToSquared(nodes[j].dir);
        if (dists.length < K) { dists.push({ j, d }); dists.sort(function (a, b) { return a.d - b.d; }); }
        else if (d < dists[K - 1].d) { dists[K - 1] = { j, d }; dists.sort(function (a, b) { return a.d - b.d; }); }
      }
      neighbors[i] = dists.map(function (x) { return x.j; });
    }
    return api;
  }

  function nearestNode(dir) {
    let best = 0, bd = 2;
    for (let i = 0; i < count; i++) {
      const d = nodes[i].dir.dot(dir);
      if (d > bd) { bd = d; best = i; }
    }
    return best;
  }
  function nearestPassable(dir) {
    const start = nearestNode(dir);
    if (nodes[start].passable) return start;
    // BFS к ближайшей проходимой
    const q = [start], seen = new Set([start]);
    while (q.length) {
      const c = q.shift();
      if (nodes[c].passable) return c;
      const nb = neighbors[c];
      for (let k = 0; k < nb.length; k++) if (!seen.has(nb[k])) { seen.add(nb[k]); q.push(nb[k]); }
    }
    return null;
  }

  // A*: поиск пути по узлам
  function findPath(fromIdx, toIdx) {
    if (fromIdx == null || toIdx == null) return null;
    if (fromIdx === toIdx) return [fromIdx];
    const open = new MinHeap();
    const gScore = new Float64Array(count).fill(Infinity);
    const fScore = new Float64Array(count).fill(Infinity);
    const cameFrom = new Int32Array(count).fill(-1);
    const closed = new Uint8Array(count);
    const hFn = function (i) { return (1 - nodes[i].dir.dot(nodes[toIdx].dir)); };
    gScore[fromIdx] = 0; fScore[fromIdx] = hFn(fromIdx);
    open.push(fromIdx, fScore[fromIdx]);
    const MAX = 4000;
    let iter = 0;
    while (open.size > 0 && iter++ < MAX) {
      const cur = open.pop();
      if (cur === toIdx) return rebuild(cameFrom, cur);
      if (closed[cur]) continue;
      closed[cur] = 1;
      const nb = neighbors[cur];
      for (let k = 0; k < nb.length; k++) {
        const j = nb[k];
        if (closed[j] || !nodes[j].passable) continue;
        const cost = (1 - nodes[cur].dir.dot(nodes[j].dir)) + (nodes[j].passable ? 0 : 1);
        const t = gScore[cur] + Math.max(cost, 1e-5);
        if (t < gScore[j]) {
          cameFrom[j] = cur; gScore[j] = t; fScore[j] = t + hFn(j);
          open.push(j, fScore[j]);
        }
      }
    }
    return null;
  }
  function rebuild(cameFrom, node) {
    const path = [];
    let c = node;
    while (c !== -1 && path.length < count) { path.push(c); c = cameFrom[c]; }
    path.reverse();
    return path.length > 1 ? smooth(path) : path;
  }
  function smooth(path) {
    // сглаживание: убираем промежуточные точки, если прямая достижима
    if (path.length <= 2) return path;
    const out = [path[0]];
    let i = 0;
    while (i < path.length - 1) {
      let j = path.length - 1;
      for (; j > i + 1; j--) {
        if (lineWalkable(path[i], path[j])) break;
      }
      out.push(path[j]);
      i = j;
    }
    return out;
  }
  function lineWalkable(a, b) {
    const n = 6;
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const dir = new THREE.Vector3().lerpVectors(nodes[a].dir, nodes[b].dir, t).normalize();
      const idx = nearestNode(dir);
      if (!nodes[idx].passable) return false;
    }
    return true;
  }

  // Движение: позиция на дуге между узлами
  function slerpDir(a, b, t, out) {
    const d = U.finite(a.dot(b), 0);
    const clamped = U.clamp(d, -1, 1);
    const om = Math.acos(clamped);
    if (om < 1e-6) { out.copy(a); return out; }
    const s = Math.sin(om);
    out.copy(a).multiplyScalar(Math.sin((1 - t) * om) / s).addScaledVector(b, Math.sin(t * om) / s);
    return out.normalize();
  }

  // маленькая двоичная куча для A*
  function MinHeap() {
    this.items = []; this.scores = []; this.size = 0;
  }
  MinHeap.prototype.push = function (v, s) {
    let i = this.size++;
    this.items[i] = v; this.scores[i] = s;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.scores[p] <= this.scores[i]) break;
      const ti = this.items[i], ts = this.scores[i];
      this.items[i] = this.items[p]; this.scores[i] = this.scores[p];
      this.items[p] = ti; this.scores[p] = ts;
      i = p;
    }
  };
  MinHeap.prototype.pop = function () {
    const top = this.items[0];
    this.size--;
    if (this.size > 0) {
      this.items[0] = this.items[this.size]; this.scores[0] = this.scores[this.size];
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = i * 2 + 2;
        let m = i;
        if (l < this.size && this.scores[l] < this.scores[m]) m = l;
        if (r < this.size && this.scores[r] < this.scores[m]) m = r;
        if (m === i) break;
        const ti = this.items[i], ts = this.scores[i];
        this.items[i] = this.items[m]; this.scores[i] = this.scores[m];
        this.items[m] = ti; this.scores[m] = ts;
        i = m;
      }
    }
    return top;
  };
  const api = {
    build, nearestNode, nearestPassable, findPath, slerpDir,
    get nodes() { return nodes; },
    get neighbors() { return neighbors; },
    get count() { return count; },
    node: function (i) { return nodes[i]; },
  };
  return api;

})();
