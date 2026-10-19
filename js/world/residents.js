// FILE: js/world/residents.js
// Жители: процедурная внешность (кожа, причёски, одежда, головные уборы),
// иерархия суставов, процедурные анимации, пузыри мыслей, подсветка выбора.
WJ.Residents = (function () {
  const U = WJ.Util;
  const H = 0.035; // рост взрослого
  const meshes = new Map(); // id -> {root, parts...}
  let group, time = 0;
  const hitboxes = [];

  const SKIN = [0xf7d7c2, 0xefc4a5, 0xe0ab88, 0xc98d63, 0xa96e4c, 0x8d5a3c, 0x6e4429, 0x54331f];
  const CLOTH = [0xc05a4a, 0x4a7ac0, 0x5aa06a, 0xd8a848, 0x8a5ac0, 0xd06a9a, 0x4aa8a0, 0x8a6a4a, 0xb0b0b8, 0x58703a, 0xc08a5a, 0x7a4a6a];
  const HAIR = [0x2a1c12, 0x4a3018, 0x7a4a22, 0xb08a4a, 0xd8c8a8, 0x8a8a8a, 0x3a3a3a, 0xa05a30, 0x5a2818, 0xc8b088];

  function genName(rng) {
    const a = ['А', 'Бо', 'Ви', 'Га', 'Ди', 'Е', 'Жу', 'За', 'Ка', 'Лу', 'Ми', 'Но', 'О', 'Па', 'Ра', 'Са', 'То', 'У', 'Фа', 'Ча', 'Ша', 'Э'];
    const b = ['ра', 'ли', 'на', 'то', 'ся', 'ми', 'ня', 'та', 'ло', 'ви', 'ка', 'ша', 'на', 'ра'];
    const c = ['', 'н', 'к', 'с', 'м', 'т', 'л'];
    let n = rng.pick(a) + rng.pick(b) + rng.pick(c);
    return n;
  }
  function genAppearance(rng, parents) {
    const app = {
      skin: rng.int(0, SKIN.length - 1),
      hairColor: rng.int(0, HAIR.length - 1),
      hairStyle: rng.int(0, 9),
      clothA: rng.int(0, CLOTH.length - 1),
      clothB: rng.int(0, CLOTH.length - 1),
      hat: rng.chance(0.35) ? rng.int(0, 5) : -1,
      build: rng.int(0, 3),
      name: genName(rng),
    };
    if (parents && parents.length) {
      // наследование внешности от родителей
      const p = parents[rng.int(0, parents.length - 1)];
      app.skin = U.clamp(Math.round((p.skin + rng.gauss() * 1.6) / 2), 0, SKIN.length - 1);
      app.hairColor = U.clamp(Math.round((p.hairColor + rng.gauss() * 2) / 2), 0, HAIR.length - 1);
      app.clothA = p.clothA;
      app.name = genName(rng);
    }
    return app;
  }

  function hairGeo(style, color) {
    // 10 причёсок из примитивов
    const c = new THREE.Color(HAIR[color]);
    let g;
    switch (style % 10) {
      case 0: g = new THREE.SphereGeometry(0.0034, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55); break;
      case 1: g = new THREE.SphereGeometry(0.0036, 8, 6); g.scale(1, 0.85, 1); g.translate(0, 0.0004, -0.0004); break;
      case 2: { g = new THREE.SphereGeometry(0.0035, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6); const bun = new THREE.SphereGeometry(0.0016, 6, 5); bun.translate(0, 0.001, -0.0028); g = mergeTwo(g, bun, c, c); break; }
      case 3: { g = new THREE.CylinderGeometry(0.004, 0.004, 0.002, 8); g.translate(0, -0.001, 0); break; }
      case 4: { g = new THREE.SphereGeometry(0.0032, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62); const tail = new THREE.CylinderGeometry(0.0012, 0.0018, 0.006, 6); tail.translate(0, -0.002, -0.003); g = mergeTwo(g, tail, c, c); break; }
      case 5: g = new THREE.SphereGeometry(0.0033, 8, 6); g.scale(1.15, 0.7, 1.15); break;
      case 6: { g = new THREE.SphereGeometry(0.0034, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5); const tuft = new THREE.ConeGeometry(0.0012, 0.003, 5); tuft.translate(0, 0.004, 0); g = mergeTwo(g, tuft, c, c); break; }
      case 7: { g = new THREE.SphereGeometry(0.0036, 8, 6); g.scale(1, 0.6, 1.2); break; }
      case 8: { g = new THREE.SphereGeometry(0.0034, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55); const side = new THREE.SphereGeometry(0.0018, 6, 5); side.translate(0.003, -0.001, 0); const side2 = new THREE.SphereGeometry(0.0018, 6, 5); side2.translate(-0.003, -0.001, 0); g = mergeTwo(mergeTwo(g, side, c, c), side2, c, c); break; }
      default: g = new THREE.SphereGeometry(0.0034, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
    }
    return g;
  }
  function mergeTwo(g1, g2, c1, c2) {
    const a = g1.index ? g1.toNonIndexed() : g1, b = g2.index ? g2.toNonIndexed() : g2;
    const n = a.attributes.position.count + b.attributes.position.count;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let off = 0;
    [ [a, c1], [b, c2] ].forEach(function (pair) {
      const g = pair[0], c = pair[1], p = g.attributes.position, nn = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        pos[(off + i) * 3] = p.getX(i); pos[(off + i) * 3 + 1] = p.getY(i); pos[(off + i) * 3 + 2] = p.getZ(i);
        nor[(off + i) * 3] = nn.getX(i); nor[(off + i) * 3 + 1] = nn.getY(i); nor[(off + i) * 3 + 2] = nn.getZ(i);
        col[(off + i) * 3] = c.r; col[(off + i) * 3 + 1] = c.g; col[(off + i) * 3 + 2] = c.b;
      }
      off += p.count;
      g.dispose();
    });
    g1.dispose(); g2.dispose();
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }

  function buildMesh(id, app, ageStage) {
    const rng = WJ.Rng.create(id);
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const ageK = ageStage === 'child' ? 0.55 : (ageStage === 'elder' ? 0.92 : 1);
    const slouch = ageStage === 'elder' ? 0.18 : 0;

    const skinMat = new THREE.MeshStandardMaterial({ color: SKIN[app.skin], roughness: 0.62, metalness: 0 });
    const clothMat = new THREE.MeshStandardMaterial({ color: CLOTH[app.clothA], roughness: 0.78 });
    const clothMat2 = new THREE.MeshStandardMaterial({ color: CLOTH[app.clothB], roughness: 0.78 });
    const hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });

    const s = H * ageK;

    // торс (капсула-цилиндр) + бёдра
    const torsoGeo = new THREE.CylinderGeometry(s * 0.14, s * 0.16, s * 0.34, 7);
    torsoGeo.translate(0, s * 0.5, 0);
    const torso = new THREE.Mesh(torsoGeo, clothMat);
    // ноги: pivot вверху
    const legGeo = new THREE.CylinderGeometry(s * 0.055, s * 0.045, s * 0.42, 5);
    legGeo.translate(0, -s * 0.21, 0);
    const legL = new THREE.Mesh(legGeo, clothMat2);
    legL.position.set(-s * 0.07, s * 0.34, 0);
    const legR = new THREE.Mesh(legGeo.clone(), clothMat2);
    legR.position.set(s * 0.07, s * 0.34, 0);
    // стопы
    const footGeo = new THREE.BoxGeometry(s * 0.07, s * 0.04, s * 0.12);
    // руки: pivot у плеча
    const armGeo = new THREE.CylinderGeometry(s * 0.04, s * 0.032, s * 0.36, 5);
    armGeo.translate(0, -s * 0.18, 0);
    const armL = new THREE.Mesh(armGeo, clothMat);
    armL.position.set(-s * 0.2, s * 0.78, 0);
    const armR = new THREE.Mesh(armGeo.clone(), clothMat);
    armR.position.set(s * 0.2, s * 0.78, 0);
    // кисти
    const handGeo = new THREE.SphereGeometry(s * 0.045, 6, 5);
    const handL = new THREE.Mesh(handGeo, skinMat); handL.position.set(0, -s * 0.36, 0); armL.add(handL);
    const handR = new THREE.Mesh(handGeo.clone(), skinMat); handR.position.set(0, -s * 0.36, 0); armR.add(handR);
    // голова
    const headGrp = new THREE.Group();
    headGrp.position.set(0, s * 0.92, 0);
    const headGeo = new THREE.SphereGeometry(s * 0.155, 10, 8);
    headGeo.scale(0.92, 1.05, 0.95);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = s * 0.1;
    headGrp.add(head);
    // лицо: глаза + рот — маленькие меши
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.35 });
    const eyeGeo = new THREE.SphereGeometry(s * 0.02, 5, 4);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-s * 0.055, s * 0.12, s * 0.135); headGrp.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo.clone(), eyeMat); eyeR.position.set(s * 0.055, s * 0.12, s * 0.135); headGrp.add(eyeR);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(s * 0.05, s * 0.008, s * 0.01), eyeMat);
    mouth.position.set(0, s * 0.04, s * 0.148); headGrp.add(mouth);
    const hair = new THREE.Mesh(hairGeo(app.hairStyle, app.hairColor), hairMat);
    hair.position.y = s * 0.12;
    headGrp.add(hair);
    // головной убор
    if (app.hat >= 0) {
      const hatMat = new THREE.MeshStandardMaterial({ color: [0x8a5a3a, 0xd8c8a8, 0x4a6a8a, 0xc05a4a, 0x5a7a4a, 0x3a3a3a][app.hat % 6], roughness: 0.9 });
      let hatMesh;
      if (app.hat === 0) hatMesh = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.17, s * 0.17, s * 0.1, 8), hatMat);
      else if (app.hat === 1) hatMesh = new THREE.Mesh(new THREE.SphereGeometry(s * 0.17, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), hatMat);
      else if (app.hat === 2) { hatMesh = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.02, s * 0.19, s * 0.12, 7), hatMat); }
      else if (app.hat === 3) hatMesh = new THREE.Mesh(new THREE.ConeGeometry(s * 0.16, s * 0.24, 6), hatMat);
      else if (app.hat === 4) hatMesh = new THREE.Mesh(new THREE.TorusGeometry(s * 0.16, s * 0.04, 6, 10), hatMat);
      else hatMesh = new THREE.Mesh(new THREE.SphereGeometry(s * 0.13, 6, 5), hatMat);
      hatMesh.position.y = s * 0.2;
      headGrp.add(hatMesh);
    }
    // морщинки у пожилых — чуть темнее кожа
    if (ageStage === 'elder') skinMat.color.multiplyScalar(0.88);

    torso.castShadow = true; head.castShadow = true;
    body.add(torso); body.add(legL); body.add(legR); body.add(armL); body.add(armR); body.add(headGrp);
    // blob-AO под жителем
    const aoMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
    const ao = new THREE.Mesh(new THREE.CircleGeometry(s * 0.22, 10), aoMat);
    ao.rotation.x = -Math.PI / 2;
    ao.position.y = 0.002;
    root.add(ao);

    // хитбокс для пикинга
    const hbMat = new THREE.MeshBasicMaterial({ visible: false });
    const hb = new THREE.Mesh(new THREE.SphereGeometry(s * 1.4, 6, 4), hbMat);
    hb.position.y = s * 0.5;
    hb.userData.residentId = id;
    root.add(hb);
    hitboxes.push(hb);

    // пузырь мысли
    const bubCanvas = document.createElement('canvas'); bubCanvas.width = 64; bubCanvas.height = 64;
    const bubTex = new THREE.CanvasTexture(bubCanvas);
    const bubMat = new THREE.SpriteMaterial({ map: bubTex, transparent: true, depthTest: false, opacity: 0 });
    const bubble = new THREE.Sprite(bubMat);
    bubble.scale.set(0.05, 0.05, 1);
    bubble.position.set(0, s * 1.5, 0);
    root.add(bubble);

    // подсветка выбора
    const hiMat = new THREE.MeshBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0, depthWrite: false });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(s * 0.95, 10, 8), hiMat);
    halo.position.y = s * 0.55;
    root.add(halo);

    const rec = {
      id, root, body, torso, head: headGrp, armL, armR, legL, legR, bubble, bubMat, bubCanvas, bubTex,
      halo, hiMat, haloMesh: halo, hb, app, ageStage, anim: 'idle', animT: Math.random() * 10, phase: rng.next() * 10,
      mouth,
    };
    root.userData.rec = rec;
    group.add(root);
    meshes.set(id, rec);
    return rec;
  }

  const BUBBLES = {
    food:    { color: '#e8765f', draw: function (c) { c.beginPath(); c.arc(32, 38, 13, 0.2, Math.PI * 1.9); c.lineTo(32, 48); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(26, 32, 2.5, 0, 7); c.fill(); c.beginPath(); c.arc(36, 30, 2.5, 0, 7); c.fill(); } },
    rest:    { color: '#8fb0e8', draw: function (c) { c.font = 'bold 26px sans-serif'; c.fillStyle = '#fff'; c.fillText('z', 18, 40); c.font = 'bold 18px sans-serif'; c.fillText('z', 34, 30); } },
    safety:  { color: '#e8765f', draw: function (c) { c.fillStyle = '#fff'; c.fillRect(29, 16, 6, 24); c.fillRect(29, 44, 6, 6); } },
    social:  { color: '#e8765f', draw: function (c) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(32, 18); c.bezierCurveTo(20, 30, 24, 44, 32, 48); c.bezierCurveTo(40, 44, 44, 30, 32, 18); c.fill(); } },
    meaning: { color: '#5fd1c0', draw: function (c) { c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; c.lineTo(32 + Math.cos(a) * 15, 34 + Math.sin(a) * 15); const a2 = a + Math.PI / 5; c.lineTo(32 + Math.cos(a2) * 6.5, 34 + Math.sin(a2) * 6.5); } c.closePath(); c.fill(); } },
  };
  function setBubble(rec, need) {
    const def = BUBBLES[need];
    const ctx = rec.bubCanvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    if (def) {
      ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fillStyle = def.color; ctx.globalAlpha = 0.9; ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(24, 55); ctx.lineTo(28, 64); ctx.lineTo(34, 56); ctx.closePath(); ctx.fillStyle = def.color; ctx.fill();
      def.draw(ctx);
    }
    rec.bubTex.needsUpdate = true;
    rec.bubMat.opacity = def ? 1 : 0;
  }
  function hideBubble(rec) { rec.bubMat.opacity = 0; }

  // Процедурные анимации на синусах
  function frame(dt) {
    time += dt;
    meshes.forEach(function (rec) {
      rec.animT += dt;
      const t = rec.animT, ph = rec.phase, s = H * (rec.ageStage === 'child' ? 0.55 : (rec.ageStage === 'elder' ? 0.92 : 1));
      const a = rec.anim;
      const walking = a === 'walk' || a === 'run';
      const speed = a === 'run' ? 14 : 8;
      if (walking) {
        const w = Math.sin(t * speed + ph);
        rec.legL.rotation.x = w * 0.7;
        rec.legR.rotation.x = -w * 0.7;
        rec.armL.rotation.x = -w * 0.55;
        rec.armR.rotation.x = w * 0.55;
        rec.body.position.y = Math.abs(Math.sin(t * speed + ph)) * s * 0.03;
      } else if (a === 'idle') {
        const b = Math.sin(t * 1.8 + ph);
        rec.torso.scale.set(1, 1 + b * 0.02, 1);
        rec.armL.rotation.x = Math.sin(t * 1.1 + ph) * 0.06;
        rec.armR.rotation.x = Math.sin(t * 1.3 + ph + 2) * 0.06;
        rec.legL.rotation.x = 0; rec.legR.rotation.x = 0;
        rec.head.rotation.y = Math.sin(t * 0.5 + ph) * 0.4;
        rec.body.position.y = 0;
      } else if (a === 'sleep') {
        rec.body.rotation.x = 1.4;
        rec.body.position.y = -s * 0.1;
        rec.head.rotation.y = 0;
      } else if (a === 'sit') {
        rec.body.position.y = -s * 0.16;
        rec.legL.rotation.x = -1.5; rec.legR.rotation.x = -1.5;
        rec.armL.rotation.x = -0.3; rec.armR.rotation.x = -0.3;
      } else if (a === 'work') {
        const w = Math.sin(t * 5 + ph);
        rec.armL.rotation.x = -0.9 + w * 0.5;
        rec.armR.rotation.x = -0.9 - w * 0.5;
        rec.legL.rotation.x = 0; rec.legR.rotation.x = 0;
      } else if (a === 'talk') {
        const w = Math.sin(t * 3 + ph);
        rec.armL.rotation.x = -0.4 + w * 0.25;
        rec.armR.rotation.x = -0.4 - w * 0.25;
        rec.head.rotation.y = Math.sin(t * 1.2) * 0.25;
        rec.head.rotation.z = Math.sin(t * 2.2) * 0.06;
      } else if (a === 'dance') {
        const w = Math.sin(t * 6 + ph);
        rec.body.position.y = Math.abs(Math.sin(t * 6)) * s * 0.06;
        rec.body.rotation.z = w * 0.18;
        rec.armL.rotation.z = 1 + w * 0.6;
        rec.armR.rotation.z = -1 - w * 0.6;
        rec.head.rotation.y = Math.sin(t * 3) * 0.3;
      } else if (a === 'wave') {
        const w = Math.sin(t * 7);
        rec.armR.rotation.z = -2.2 + w * 0.3;
        rec.armL.rotation.x = 0;
      } else if (a === 'sad') {
        rec.body.rotation.x = 0.15;
        rec.head.rotation.x = 0.3;
        rec.armL.rotation.x = 0.1; rec.armR.rotation.x = 0.1;
      } else if (a === 'joy') {
        const w = Math.abs(Math.sin(t * 5 + ph));
        rec.body.position.y = w * s * 0.08;
        rec.armL.rotation.z = 0.6 + w * 0.5; rec.armR.rotation.z = -0.6 - w * 0.5;
      } else if (a === 'fish') {
        rec.armR.rotation.x = -1.2 + Math.sin(t * 0.8) * 0.1;
        rec.head.rotation.x = 0.15;
      } else if (a === 'shiver') {
        const w = Math.sin(t * 16) * 0.04;
        rec.body.rotation.z = w;
      } else if (a === 'build') {
        const w = Math.sin(t * 4 + ph);
        rec.armL.rotation.x = -1.1 + w * 0.4;
        rec.armR.rotation.x = -1.1 - w * 0.4;
        rec.body.rotation.x = 0.2;
      }
      // не идёт — выравниваем наклон тела (кроме sleep/sad)
      if (a !== 'sleep' && a !== 'sad' && a !== 'build') rec.body.rotation.x = U.move(rec.body.rotation.x, 0, dt * 5);
      if (a !== 'dance' && a !== 'shiver') rec.body.rotation.z = U.move(rec.body.rotation.z, 0, dt * 5);
      // пузырь подпрыгивает
      if (rec.bubMat.opacity > 0) rec.bubble.position.y = s * 1.5 + Math.sin(time * 2 + ph) * 0.004;
    });
  }

  function setHalo(rec, on) { rec.hiMat.opacity = on ? 0.22 : 0; }
  function setAnim(rec, anim) { if (rec.anim !== anim) { rec.anim = anim; rec.animT = 0; } }
  function setAgeStage(rec, stage) { rec.ageStage = stage; }

  function removeMesh(id) {
    const rec = meshes.get(id);
    if (!rec) return;
    const i = hitboxes.indexOf(rec.hb);
    if (i >= 0) hitboxes.splice(i, 1);
    if (rec.root.parent) rec.root.parent.remove(rec.root);
    rec.root.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(function (m) { m.dispose(); }); }
    });
    meshes.delete(id);
  }
  function clearAll() {
    Array.from(meshes.keys()).forEach(removeMesh);
    hitboxes.length = 0;
  }
  function init(parentGroup) { group = parentGroup; return api; }

  const api = {
    init, buildMesh, frame, setBubble, hideBubble, setHalo, setAnim, removeMesh, clearAll, setAgeStage,
    get byId() { return meshes; },
    get hitboxes() { return hitboxes; },
    genAppearance, genName, H,
  };
  return api;
})();
