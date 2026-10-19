// FILE: js/render/env.js
// Процедурное окружение: деревянный стол, комната у окна с боке, свет,
// PMREM-окружение, суточный цикл освещения, дешёвое отражение на столе.
WJ.Env = (function () {
  const U = WJ.Util;
  let scene, group, sunLight, fillLight, hemi, backdrop, bokeh, tableMesh, reflection, windowGlow;
  let envRT = null;

  // ---- Процедурные текстуры (Canvas 2D) ----
  function maxAniso() {
    try { return (WJ.Render.renderer && WJ.Render.renderer.capabilities.getMaxAnisotropy()) || 1; } catch (e) { return 1; }
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso();
    return t;
  }
  function noiseNormalMap(size, strength, seed) {
    const rng = WJ.Rng.create(seed);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const hmap = new Float32Array(size * size);
    const n = WJ.Noise.create(rng.int(1, 1e9));
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      hmap[y * size + x] = n.fbm3(x / 24, y / 24, 0, 4, 2, 0.55);
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const xl = hmap[y * size + ((x - 1 + size) % size)], xr = hmap[y * size + ((x + 1) % size)];
      const yu = hmap[((y - 1 + size) % size) * size + x], yd = hmap[((y + 1) % size) * size + x];
      const nx = U.clamp((xl - xr) * strength * 8, -1, 1), ny = U.clamp((yu - yd) * strength * 8, -1, 1);
      const nz = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      img.data[i * 4 + 0] = (nx * nz * 0.5 + 0.5) * 255;
      img.data[i * 4 + 1] = (ny * nz * 0.5 + 0.5) * 255;
      img.data[i * 4 + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso();
    return t;
  }
  function woodTexture(seed) {
    const rng = WJ.Rng.create(seed + 7);
    return canvasTex(1024, 1024, function (ctx, w, h) {
      ctx.fillStyle = '#6b4a2e'; ctx.fillRect(0, 0, w, h);
      // волокна
      for (let i = 0; i < 130; i++) {
        const y = rng.next() * h;
        ctx.strokeStyle = 'rgba(' + (rng.chance(.5) ? '52,34,20' : '122,88,55') + ',' + rng.range(.08, .3).toFixed(2) + ')';
        ctx.lineWidth = rng.range(.5, 2.4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 24) ctx.lineTo(x, y + Math.sin(x / rng.range(40, 160) + i) * rng.range(1, 5));
        ctx.stroke();
      }
      // сучки
      for (let i = 0; i < 5; i++) {
        const x = rng.next() * w, y = rng.next() * h, r = rng.range(6, 16);
        for (let k = r; k > 0; k -= 2) {
          ctx.strokeStyle = 'rgba(40,26,14,' + (0.5 - k / r * 0.4).toFixed(2) + ')';
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.ellipse(x, y, k, k * 0.6, rng.next() * Math.PI, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // лёгкие царапины
      for (let i = 0; i < 24; i++) {
        ctx.strokeStyle = 'rgba(200,170,130,' + rng.range(.03, .1).toFixed(2) + ')';
        ctx.lineWidth = .8;
        const x = rng.next() * w, y = rng.next() * h;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng.range(-70, 70), y + rng.range(-14, 14)); ctx.stroke();
      }
    });
  }
  function bokehTexture() {
    return canvasTex(64, 64, function (ctx) {
      const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(.55, 'rgba(255,255,255,.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
  }

  // ---- Суточный цикл ----
  const PHASES = {
    dawn:  { key: '#ffd2b0', fill: '#9fbfff', hemiS: '#ffc9a3', hemiG: '#4a3a2a', amb: 0.55, bgA: [0.32, 0.18, 0.12], bgB: [0.55, 0.42, 0.35], sunI: 1.5, back: 0.9 },
    day:   { key: '#fff0d6', fill: '#a8c8ff', hemiS: '#ffe8c8', hemiG: '#5a4a36', amb: 0.85, bgA: [0.38, 0.32, 0.28], bgB: [0.62, 0.58, 0.52], sunI: 2.1, back: 1.0 },
    sunset:{ key: '#ffb26b', fill: '#8fb0e8', hemiS: '#ff9e63', hemiG: '#3a2a20', amb: 0.6, bgA: [0.3, 0.16, 0.12], bgB: [0.62, 0.34, 0.22], sunI: 1.7, back: 1.05 },
    night: { key: '#4a6a9f', fill: '#31456e', hemiS: '#2a3a5a', hemiG: '#141418', amb: 0.3, bgA: [0.05, 0.06, 0.1], bgB: [0.12, 0.14, 0.22], sunI: 0.25, back: 0.35 },
  };
  function phaseMix(t) { // t: 0..1 дня; рассвет 0..0.08, день, закат 0.42..0.5, ночь 0.5..1 (примерно)
    const p = [PHASES.dawn, PHASES.day, PHASES.sunset, PHASES.night];
    let a, b, k;
    if (t < 0.07)      { a = 3; b = 0; k = U.invLerp(0, 0.07, t) * .5 + .5; }
    else if (t < 0.40) { a = 0; b = 1; k = U.invLerp(0.07, 0.22, t); if (t < 0.22 && k >= 1) k = 1; }
    else if (t < 0.50) { a = 1; b = 2; k = U.invLerp(0.40, 0.47, t); }
    else if (t < 0.58) { a = 2; b = 3; k = U.invLerp(0.50, 0.58, t); }
    else              { a = 3; b = 3; k = 0; }
    if (t >= 0.22 && t < 0.40) { a = 1; b = 1; k = 0; }
    if (t < 0.07) { a = 3; b = 0; k = U.invLerp(0, 0.07, t); }
    return { a: p[a], b: p[b], k: U.sat(k) };
  }

  function init(sc, rng) {
    scene = sc;
    group = new THREE.Group();
    scene.add(group);

    // --- Стол ---
    const wood = woodTexture(rng.int(1, 1e9));
    const woodN = noiseNormalMap(512, 1.2, rng.int(1, 1e9));
    const tableGeo = new THREE.BoxGeometry(14, 0.5, 9);
    const tableMat = new THREE.MeshStandardMaterial({
      map: wood, roughness: 0.55, metalness: 0.02,
      normalMap: woodN, normalScale: new THREE.Vector2(0.35, 0.35),
    });
    wood.repeat.set(2.2, 1.4); woodN.repeat.set(2.2, 1.4);
    tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.set(0, -0.26, 0);
    tableMesh.receiveShadow = true;
    group.add(tableMesh);

    // --- Фон-комната: большой бэкдроп + боке ---
    backdrop = new THREE.Mesh(
      new THREE.SphereGeometry(30, 24, 16),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0xffffff, fog: false })
    );
    backdrop.material.onBeforeCompile = function (sh) {
      sh.uniforms.bgA = bgUniformA; sh.uniforms.bgB = bgUniformB;
      sh.vertexShader = 'varying vec3 vPosW;\n' + sh.vertexShader.replace('void main() {', 'void main() {\n vPosW = position;');
      sh.fragmentShader = 'uniform vec3 bgA; uniform vec3 bgB; varying vec3 vPosW;\n' + sh.fragmentShader.replace(
        'void main() {',
        'void main() {\n float k = clamp(vPosW.y / 30.0 * 0.5 + 0.5, 0.0, 1.0);\n gl_FragColor = vec4(mix(bgA, bgB, k), 1.0);'
      );
    };
    group.add(backdrop);

    const bt = bokehTexture();
    bokeh = new THREE.Group();
    const bokehMat = new THREE.SpriteMaterial({ map: bt, transparent: true, depthWrite: false, opacity: 0.55 });
    const N = WJ.Quality.cfg().particles > 150 ? 36 : 22;
    const sprites = [];
    for (let i = 0; i < N; i++) {
      const s = new THREE.Sprite(bokehMat.clone());
      const warm = rng.chance(0.78);
      const col = warm ? (rng.chance(0.8) ? 0xffd24a : 0xffa050) : 0x9fc8ff;
      s.material.color = new THREE.Color(col);
      const size = rng.range(0.5, 2.6);
      s.scale.set(size, size, 1);
      s.userData = { baseY: rng.range(-3, 8), r: rng.range(6, 16), ang: rng.next() * Math.PI * 2, spd: rng.range(0.02, 0.08), ph: rng.next() * 10 };
      s.position.set(Math.cos(s.userData.ang) * s.userData.r, s.userData.baseY, Math.sin(s.userData.ang) * s.userData.r);
      bokeh.add(s); sprites.push(s);
    }
    group.add(bokeh);

    // --- Свет ---
    sunLight = new THREE.DirectionalLight(0xffd9a8, 2.3);
    sunLight.position.set(4.5, 5.5, 3.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 20;
    sunLight.shadow.camera.left = -5; sunLight.shadow.camera.right = 5;
    sunLight.shadow.camera.top = 5; sunLight.shadow.camera.bottom = -5;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);
    scene.add(sunLight.target);

    fillLight = new THREE.DirectionalLight(0x9fbfff, 0.75);
    fillLight.position.set(-4.5, 3, -3);
    scene.add(fillLight);

    hemi = new THREE.HemisphereLight(0xffe8c8, 0x5a4a36, 0.7);
    scene.add(hemi);

    // Окно-софтбокс: светящаяся плоскость за спиной сцены (источник «из окна»)
    windowGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 7),
      new THREE.MeshBasicMaterial({ color: 0xffe9c0, transparent: true, opacity: 0.9 })
    );
    windowGlow.position.set(6.5, 4.5, -4);
    windowGlow.lookAt(0, 1.2, 0);
    group.add(windowGlow);

    // --- PMREM окружение ---
    buildEnvMap();

    // --- Отражение на столе (fake) ---
    reflection = new THREE.Group();
    reflection.scale.y = -1;
    reflection.position.y = -0.02;
    group.add(reflection);

    applyTime(0.3, 0);
    return api;
  }

  const bgUniformA = { value: new THREE.Color(0.38, 0.32, 0.28) };
  const bgUniformB = { value: new THREE.Color(0.62, 0.58, 0.52) };

  function buildEnvMap() {
    try {
      if (envRT) envRT.dispose();
      const pm = new THREE.PMREMGenerator(WJ.Render.renderer);
      const envScene = new THREE.Scene();
      // градиентная сфера
      const sph = new THREE.Mesh(
        new THREE.SphereGeometry(10, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x777788, side: THREE.BackSide })
      );
      envScene.add(sph);
      // софтбоксы
      const boxGeo = new THREE.PlaneGeometry(3, 4);
      const boxes = [
        [new THREE.Color(0xffd9a8), 6, 5, 4],
        [new THREE.Color(0x9fbfff), -6, 3, 4],
        [new THREE.Color(0xfff4e0), 0, 7, -6],
      ];
      for (let i = 0; i < boxes.length; i++) {
        const m = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: boxes[i][0] }));
        m.position.set(boxes[i][1], boxes[i][2], boxes[i][3]);
        m.lookAt(0, 0, 0);
        envScene.add(m);
      }
      envRT = pm.fromScene(envScene, 0.04);
      WJ.Render.scene.environment = envRT.texture;
      pm.dispose();
    } catch (e) { WJ.Errors.logTag('env.pmrem', e); }
  }

  function applyShadowTier(size) {
    if (!sunLight) return; // мир ещё не построен — тиры применятся при buildWorld
    if (size === 0) { sunLight.castShadow = false; return; }
    sunLight.castShadow = true;
    if (sunLight.shadow.mapSize.x !== size) {
      sunLight.shadow.mapSize.set(size, size);
      if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; }
    }
  }

  // t: 0..1 внутри дня, weatherDark: 0..1 (тучи)
  function applyTime(t, weatherDark) {
    const { a, b, k } = phaseMix(t);
    const mix = function (ca, cb) {
      const col = new THREE.Color(ca).lerp(new THREE.Color(cb), k);
      return col;
    };
    const dark = 1 - weatherDark * 0.45;
    sunLight.color.copy(mix(a.key, b.key));
    sunLight.intensity = U.lerp(a.sunI, b.sunI, k) * dark;
    fillLight.color.copy(mix(a.fill, b.fill));
    fillLight.intensity = U.lerp(0.5, 0.62, k) * dark;
    hemi.color.copy(mix(a.hemiS, b.hemiS));
    hemi.groundColor.copy(mix(a.hemiG, b.hemiG));
    hemi.intensity = U.lerp(a.amb, a.amb, 0) * 0.55 * dark + 0.12;

    bgUniformA.value.setRGB(U.lerp(a.bgA[0], b.bgA[0], k), U.lerp(a.bgA[1], b.bgA[1], k), U.lerp(a.bgA[2], b.bgA[2], k));
    bgUniformB.value.setRGB(U.lerp(a.bgB[0], b.bgB[0], k), U.lerp(a.bgB[1], b.bgB[1], k), U.lerp(a.bgB[2], b.bgB[2], k));
    const backOp = U.lerp(a.back, b.back, k) * (0.35 + 0.65 * dark);
    windowGlow.material.opacity = 0.9 * U.lerp(a.back, b.back, k) * dark;
    windowGlow.material.color.copy(mix(a.key, b.key));
    // солнце по дуге
    const ang = t * Math.PI * 2 - Math.PI * 0.5;
    sunLight.position.set(Math.cos(ang) * 5.2, U.lerp(1.2, 6.2, Math.sin(t * Math.PI * 2 * 0.5 + 0.6) * 0.5 + 0.5) * (t < 0.5 ? 1 : 0.4) + 0.8, Math.sin(ang * 0.5) * 2 + 1.5);
  }

  let timeAcc = 0;
  function frame(dt, dayT, weatherDark) {
    applyTime(dayT, weatherDark);
    // боке медленно плавает
    timeAcc += dt;
    const ch = bokeh.children;
    for (let i = 0; i < ch.length; i++) {
      const s = ch[i], d = s.userData;
      d.ang += d.spd * dt * 0.1;
      s.position.set(
        Math.cos(d.ang) * d.r,
        d.baseY + Math.sin(timeAcc * 0.3 + d.ph) * 0.25,
        Math.sin(d.ang) * d.r
      );
    }
  }

  const api = {
    init, frame, applyTime,
    get reflectionGroup() { return reflection; },
    get sunLight() { return sunLight; },
    get tableMesh() { return tableMesh; },
    applyShadowTier, buildEnvMap, bokehSprites: function(){ return bokeh.children; },
  };
  return api;
})();
