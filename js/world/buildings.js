// FILE: js/world/buildings.js
// 8 типов построек: процедурные меши (vertex colors, merge), окна светятся ночью,
// дым из труб (частицы), стройка поэтапно (каркас -> стены -> крыша).
WJ.Buildings = (function () {
  const U = WJ.Util;
  let group, lightsGroup, smokeGeo, smokePoints, smokeSeeds = [];
  const buildings = []; // {id, type, node, dir, stage, mesh, windows}
  let nightMat, dayMat;
  let time = 0;

  function mergeParts(parts) {
    // parts: [{geo, color, matrix}]
    let total = 0;
    const geos = parts.map(function (p) {
      let g = p.geo.clone();
      if (p.matrix) g.applyMatrix4(p.matrix);
      g = g.index ? g.toNonIndexed() : g;
      total += g.attributes.position.count;
      return { g, color: p.color };
    });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
    let off = 0;
    for (let k = 0; k < geos.length; k++) {
      const g = geos[k].g, p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        pos[(off + i) * 3] = p.getX(i); pos[(off + i) * 3 + 1] = p.getY(i); pos[(off + i) * 3 + 2] = p.getZ(i);
        nor[(off + i) * 3] = n.getX(i); nor[(off + i) * 3 + 1] = n.getY(i); nor[(off + i) * 3 + 2] = n.getZ(i);
        const c = geos[k].color;
        col[(off + i) * 3] = c.r; col[(off + i) * 3 + 1] = c.g; col[(off + i) * 3 + 2] = c.b;
      }
      off += p.count;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }
  const M = new THREE.Matrix4();
  function trs(x, y, z, rx, ry, rz, s) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)),
      new THREE.Vector3(s || 1, s || 1, s || 1)
    );
  }

  // Конструкторы деталей по типам (в локальных координатах, y — вверх от поверхности)
  function partsFor(type, stage, rng) {
    const wood = new THREE.Color(0x7a5a3a), woodD = new THREE.Color(0x5a4028);
    const roof = new THREE.Color(0xa5502e), roof2 = new THREE.Color(0xc07a4a);
    const stone = new THREE.Color(0x8a8a88), cloth = new THREE.Color(0xd8c8a8);
    const glassWarm = new THREE.Color(0xffd98a);
    const parts = [];
    const S = 0.028; // базовый масштаб
    if (type === 'campfire') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        parts.push({ geo: new THREE.CylinderGeometry(0.0022, 0.0022, 0.03, 4), color: woodD, matrix: trs(Math.cos(a) * 0.008, 0.004, Math.sin(a) * 0.008, Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2) });
      }
      parts.push({ geo: new THREE.ConeGeometry(0.01, 0.016, 6), color: new THREE.Color(0xff7a28), matrix: trs(0, 0.012, 0) });
      parts.push({ geo: new THREE.SphereGeometry(0.008, 6, 5), color: new THREE.Color(0xffb84a), matrix: trs(0, 0.007, 0) });
      parts.push({ geo: new THREE.SphereGeometry(0.014, 8, 6), color: new THREE.Color(0x2a2a2a), matrix: trs(0, -0.003, 0) });
    } else if (type === 'hut' || type === 'house' || type === 'cozy_house') {
      const lvl = type === 'hut' ? 1 : (type === 'house' ? 2 : 3);
      const w = S * (1.2 + lvl * 0.14), h = S * (0.9 + lvl * 0.22);
      // stage 0: каркас; 1: + стены; 2: + крыша
      if (stage === 0) {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          parts.push({ geo: new THREE.CylinderGeometry(0.0018, 0.0018, h, 4), color: woodD, matrix: trs(sx * w, h / 2, sz * w) });
        }
        parts.push({ geo: new THREE.BoxGeometry(w * 2, 0.002, 0.006), color: woodD, matrix: trs(0, h, -w, 0, 0, 0) });
      } else {
        parts.push({ geo: new THREE.BoxGeometry(w * 2, h, w * 2), color: wood, matrix: trs(0, h / 2, 0) });
        if (stage >= 2) {
          parts.push({ geo: new THREE.ConeGeometry(w * 2.5, h * 0.7, 4), color: lvl === 3 ? roof2 : roof, matrix: trs(0, h + h * 0.35, 0, 0, Math.PI / 4, 0) });
          // труба
          parts.push({ geo: new THREE.BoxGeometry(0.008, 0.02, 0.008), color: stone, matrix: trs(w * 0.5, h + h * 0.5, 0) });
          // окна (ночью светятся — добавим отдельные меши)
          for (const wx of [-0.5, 0.5]) {
            parts.push({ geo: new THREE.BoxGeometry(0.012, 0.012, 0.002), color: glassWarm, matrix: trs(wx * w, h * 0.55, w * 2 + 0.001, 0, 0, 0), win: true });
          }
        }
      }
    } else if (type === 'field') {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
        const g = new THREE.Color(0x9aa532).lerp(new THREE.Color(0xc8b545), rng.next() * 0.6);
        parts.push({ geo: new THREE.BoxGeometry(0.004, 0.016, 0.004), color: g, matrix: trs((c - 2) * 0.008, 0.008, (r - 1.5) * 0.009) });
      }
      parts.push({ geo: new THREE.BoxGeometry(0.05, 0.001, 0.04), color: new THREE.Color(0x4a3620), matrix: trs(0, 0.0005, 0) });
    } else if (type === 'well') {
      parts.push({ geo: new THREE.CylinderGeometry(0.01, 0.011, 0.008, 8), color: stone, matrix: trs(0, 0.004, 0) });
      parts.push({ geo: new THREE.BoxGeometry(0.016, 0.024, 0.002), color: woodD, matrix: trs(-0.008, 0.016, 0) });
      parts.push({ geo: new THREE.BoxGeometry(0.016, 0.024, 0.002), color: woodD, matrix: trs(0.008, 0.016, 0) });
      parts.push({ geo: new THREE.BoxGeometry(0.024, 0.002, 0.02), color: roof, matrix: trs(0, 0.03, 0, 0, 0, 0.2) });
      parts.push({ geo: new THREE.CylinderGeometry(0.0015, 0.0015, 0.014, 6), color: new THREE.Color(0xb8a284), matrix: trs(0, 0.02, 0) });
    } else if (type === 'workshop') {
      parts.push({ geo: new THREE.BoxGeometry(0.04, 0.014, 0.03), color: wood, matrix: trs(0, 0.007, 0) });
      parts.push({ geo: new THREE.BoxGeometry(0.012, 0.012, 0.012), color: new THREE.Color(0x9a8a7a), matrix: trs(0.018, 0.02, 0) });
      parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.006, 0.006, 6), color: new THREE.Color(0x6a6a72), matrix: trs(-0.014, 0.02, 0.006) });
      parts.push({ geo: new THREE.ConeGeometry(0.02, 0.012, 4), color: roof, matrix: trs(0, 0.032, 0, 0, Math.PI / 4, 0) });
      parts.push({ geo: new THREE.BoxGeometry(0.01, 0.008, 0.002), color: glassWarm, matrix: trs(0, 0.01, 0.0155), win: true });
    } else if (type === 'school') {
      parts.push({ geo: new THREE.BoxGeometry(0.05, 0.026, 0.034), color: new THREE.Color(0xcfc0a0), matrix: trs(0, 0.013, 0) });
      parts.push({ geo: new THREE.BoxGeometry(0.056, 0.006, 0.04), color: roof2, matrix: trs(0, 0.029, 0) });
      parts.push({ geo: new THREE.CylinderGeometry(0.002, 0.002, 0.02, 6), color: new THREE.Color(0xd8c8a8), matrix: trs(0, 0.042, 0) });
      parts.push({ geo: new THREE.ConeGeometry(0.006, 0.012, 4), color: new THREE.Color(0x5fd1c0), matrix: trs(0, 0.056, 0) });
      for (const wx of [-0.015, 0.015]) {
        parts.push({ geo: new THREE.BoxGeometry(0.008, 0.01, 0.002), color: glassWarm, matrix: trs(wx, 0.013, 0.0171), win: true });
      }
    } else if (type === 'market') {
      for (const px of [-0.014, 0.014]) {
        parts.push({ geo: new THREE.CylinderGeometry(0.0015, 0.0015, 0.024, 5), color: woodD, matrix: trs(px, 0.012, 0) });
      }
      parts.push({ geo: new THREE.BoxGeometry(0.044, 0.004, 0.03), color: cloth, matrix: trs(0, 0.024, 0, 0.12, 0, 0) });
      parts.push({ geo: new THREE.BoxGeometry(0.03, 0.008, 0.016), color: wood, matrix: trs(0, 0.004, 0) });
      parts.push({ geo: new THREE.SphereGeometry(0.005, 6, 5), color: new THREE.Color(0xd85a4a), matrix: trs(-0.008, 0.01, 0) });
      parts.push({ geo: new THREE.SphereGeometry(0.005, 6, 5), color: new THREE.Color(0x9a7a3a), matrix: trs(0.006, 0.01, 0.004) });
    } else if (type === 'lighthouse') {
      parts.push({ geo: new THREE.CylinderGeometry(0.011, 0.016, 0.05, 10), color: new THREE.Color(0xf2f2ea), matrix: trs(0, 0.025, 0) });
      for (let i = 0; i < 3; i++) {
        parts.push({ geo: new THREE.CylinderGeometry(0.0125, 0.0135, 0.007, 10, 1, true), color: new THREE.Color(0xd84a3a), matrix: trs(0, 0.012 + i * 0.015, 0) });
      }
      parts.push({ geo: new THREE.CylinderGeometry(0.007, 0.009, 0.012, 8), color: new THREE.Color(0x3a4a5a), matrix: trs(0, 0.058, 0) });
      parts.push({ geo: new THREE.SphereGeometry(0.006, 8, 6), color: new THREE.Color(0xffe9a0), matrix: trs(0, 0.058, 0), win: true, lamp: true });
      parts.push({ geo: new THREE.ConeGeometry(0.01, 0.01, 8), color: new THREE.Color(0xd84a3a), matrix: trs(0, 0.07, 0) });
    }
    return parts;
  }

  const matShared = null;
  function build(parentGroup, type, node, stage, rng, existing) {
    let b = existing;
    const parts = partsFor(type, stage, rng);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
    const geo = mergeParts(parts.filter(function (p) { return !p.win; }));
    if (b && b.mesh) {
      b.mesh.geometry.dispose();
      b.mesh.geometry = geo;
      b.stage = stage;
      return b;
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    // ориентация на сферу: «вверх» = нормаль
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), node.dir);
    mesh.quaternion.copy(q);
    mesh.position.copy(node.dir).multiplyScalar(1 + Math.max(node.h, 0));
    parentGroup.add(mesh);
    // окна: отдельные emissive-плоскости
    const wins = parts.filter(function (p) { return p.win; });
    const winGroup = new THREE.Group();
    winGroup.quaternion.copy(q);
    winGroup.position.copy(mesh.position);
    const wmat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0 });
    for (let i = 0; i < wins.length; i++) {
      const w = new THREE.Mesh(wins[i].geo.clone(), wmat);
      w.position.setFromMatrixPosition(wins[i].matrix);
      if (wins[i].lamp) w.userData.lamp = true;
      winGroup.add(w);
    }
    parentGroup.add(winGroup);
    b = b || { id: 'b' + Math.floor(rng.next() * 1e9).toString(36), type, nodeIdx: node.i, dir: node.dir.clone(), stage, windows: null };
    b.mesh = mesh; b.winGroup = winGroup; b.winMat = wmat;
    buildings.push(b);
    // дым для домов/мастерских
    if ((type === 'house' || type === 'cozy_house' || type === 'workshop') && stage >= 2) addSmokeSource(mesh.position, node.dir);
    return b;
  }

  function addSmokeSource(pos, dir) {
    smokeSeeds.push({ pos: pos.clone().addScaledVector(dir, 0.028), seed: Math.random() * 10 });
    rebuildSmoke();
  }
  function rebuildSmoke() {
    if (smokePoints && smokePoints.parent) smokePoints.parent.remove(smokePoints);
    const n = smokeSeeds.length * 6;
    if (n === 0) return;
    const pos = new Float32Array(n * 3);
    smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    smokePoints = new THREE.Points(smokeGeo, new THREE.PointsMaterial({ color: 0xcfc8c0, size: 0.008, transparent: true, opacity: 0.35, depthWrite: false }));
    smokePoints.frustumCulled = false;
    group.add(smokePoints);
  }

  function init(parentGroup) {
    group = parentGroup;
    return api;
  }

  function frame(dt, nightK) {
    time += dt;
    // окна светятся ночью
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (b.winMat) b.winMat.opacity = nightK * 0.95;
    }
    // дым поднимается
    if (smokePoints) {
      const pos = smokeGeo.attributes.position.array;
      for (let i = 0; i < pos.length / 3; i++) {
        const src = smokeSeeds[Math.floor(i / 6)];
        if (!src) continue;
        const k = (i % 6) / 6 + (time * 0.05) % (1 / 6);
        const t = ((time * 0.07 + src.seed) % 1 + (i % 6) / 6) % 1;
        pos[i * 3] = src.pos.x + Math.sin(time * 0.8 + src.seed + i) * 0.004 * t;
        pos[i * 3 + 1] = src.pos.y + t * 0.02;
        pos[i * 3 + 2] = src.pos.z + Math.cos(time * 0.6 + src.seed) * 0.004 * t;
      }
      smokeGeo.attributes.position.needsUpdate = true;
    }
  }

  function clear() {
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (b.mesh) { b.mesh.geometry.dispose(); b.mesh.material.dispose(); if (b.mesh.parent) b.mesh.parent.remove(b.mesh); }
      if (b.winGroup) { b.winGroup.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); if (b.winMat) b.winMat.dispose(); if (b.winGroup.parent) b.winGroup.parent.remove(b.winGroup); }
    }
    buildings.length = 0;
    smokeSeeds.length = 0;
    if (smokePoints && smokePoints.parent) { smokePoints.parent.remove(smokePoints); }
    smokePoints = null;
  }
  function serialize() {
    return buildings.map(function (b) { return { id: b.id, type: b.type, nodeIdx: b.nodeIdx, stage: b.stage }; });
  }
  function deserialize(arr, parentGroup, rng, nodeAt) {
    clear();
    for (let i = 0; i < (arr || []).length; i++) {
      const s = arr[i];
      const node = nodeAt(s.nodeIdx);
      if (!node || !node.passable) continue;
      build(parentGroup, s.type, node, U.finite(s.stage, 2), rng);
    }
    return buildings;
  }

  const api = {
    init, build, frame, clear, serialize, deserialize,
    get list() { return buildings; },
    get smokePoints() { return smokePoints; },
    partsFor, mergeParts,
  };
  return api;
})();
