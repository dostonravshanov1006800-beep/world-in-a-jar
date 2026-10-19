// FILE: js/render/planet.js
// Планета: икосфера с fbm-рельефом, биомы по вершинам, вода с волнами и пеной,
// облака, атмосфера, растительность InstancedMesh. Всё детерминировано по seed.
WJ.Planet = (function () {
  const U = WJ.Util;
  let noise, rng, seaLevel, group, terrain, terrainGeo, water, waterMat, clouds, cloudMat, atmo, atmoMat;
  let vegGroup, vegMeshes = {}, growth = 1, windK = 0, time = 0;
  const TILT = 23 * Math.PI / 180;
  let tiltQuat = null, rotQuat = new THREE.Quaternion(), spinAngle = 0;
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  // Палитры биомов (r,g,b)
  const C = {
    deep:   [0.05, 0.19, 0.32],
    shore:  [0.13, 0.42, 0.50],
    sand:   [0.87, 0.78, 0.55],
    grass:  [0.34, 0.52, 0.22],
    forest: [0.16, 0.36, 0.15],
    rock:   [0.42, 0.40, 0.38],
    snow:   [0.93, 0.95, 0.97],
  };

  // Высота рельефа в направлении dir (единичный вектор): -1..1 примерно
  function heightAt(x, y, z) {
    const n = noise.fbm3(x * 1.35, y * 1.35, z * 1.35, 5, 2.15, 0.52);
    const n2 = noise.fbm3(x * 3.4 + 17.3, y * 3.4 - 8.2, z * 3.4 + 41.7, 3, 2, 0.5);
    let h = n * 0.075 + n2 * 0.02;
    // континенты: крупный шум задаёт сушу/океан (сдвиг = доля суши)
    const cont = noise.fbm3(x * 0.72 - 30.5, y * 0.72 + 12.4, z * 0.72 + 5.1, 2, 2, 0.5);
    const landMask = U.sat((cont + 0.42) / 0.36); // 0 = океан, 1 = континент (~45% суши)
    h = h * (0.25 + landMask * 0.75) + landMask * 0.038 - 0.022;
    return h;
  }
  function biomeColor(h, dir, moisture) {
    // h относительно seaLevel, dir для широты
    const lat = Math.abs(dir.y);
    let col;
    const d = h - seaLevel;
    if (d < -0.014) col = C.deep;
    else if (d < 0) col = U.mixCol(C.deep, C.shore, (d + 0.014) / 0.014);
    else if (d < 0.006) col = U.mixCol(C.shore, C.sand, d / 0.006);
    else if (d < 0.016) col = U.mixCol(C.sand, C.grass, (d - 0.006) / 0.01);
    else if (d < 0.05) {
      const wet = 0.35 + moisture * 0.65;
      col = U.mixCol(C.grass, C.forest, U.sat((d - 0.022) / 0.028) * wet);
    } else if (d < 0.062) col = U.mixCol(C.forest, C.rock, (d - 0.05) / 0.012);
    else col = U.mixCol(C.rock, C.snow, (d - 0.062) / 0.012);
    // снеговые шапки на полюсах
    if (lat > 0.82) col = U.mixCol(col, C.snow, U.invLerp(0.82, 0.93, lat));
    return col;
  }

  function buildTerrain(tier) {
    // сфера с UV (нужны для попиксельной текстуры), рельеф — тем же heightAt
    const segA = tier === 'low' ? 96 : 160, segB = tier === 'low' ? 64 : 112;
    terrainGeo = new THREE.SphereGeometry(1, segA, segB);
    const pos = terrainGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const h = heightAt(v.x, v.y, v.z);
      const r = 1 + h;
      pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
    }
    terrainGeo.computeVertexNormals();
    const maps = buildTerrainMaps(tier);
    const mat = new THREE.MeshStandardMaterial({
      map: maps.color, normalMap: maps.normal,
      roughness: 0.82, metalness: 0.0,
    });
    mat.normalScale = new THREE.Vector2(0.65, 0.65);
    terrain = new THREE.Mesh(terrainGeo, mat);
    terrain.castShadow = true; terrain.receiveShadow = true;
    group.add(terrain);
    if (maps.refine) maps.refine(); // фоновое уточнение текстуры до 1024x512
  }

  // Попиксельная карта цвета (equirect) + нормал-карта из того же рельефа.
  // Функции те же, что для смещения вершин, поэтому текстура совпадает с геометрией.
  // Двухфазно: быстрый черновик (512x256) сразу, полные 1024x512 — чанками в фоне.
  let refineState = null;
  function genPass(W, H, texFromCanvas) {
    let maxAniso = 1;
    try { maxAniso = WJ.Render.renderer.capabilities.getMaxAnisotropy(); } catch (e) {}
    const grain = refineState && refineState.grain ? refineState.grain : WJ.Noise.create(rng.int(1, 1e9) + 777);
    const cnv = document.createElement('canvas'); cnv.width = W; cnv.height = H;
    const ctx = cnv.getContext('2d');
    const img = ctx.createImageData(W, H);
    const hBuf = new Float32Array(W * H);
    const gBuf = new Float32Array(W * H);
    const rowF = genRowFunction(W, H, grain, img, hBuf, gBuf);
    return { W, H, cnv, ctx, img, hBuf, gBuf, rowF, maxAniso };
  }
  function genRowFunction(W, H, grain, img, hBuf, gBuf) {
    return function (y) {
      const theta = (y / H) * Math.PI;
      const st = Math.sin(theta), ct = Math.cos(theta);
      for (let x = 0; x < W; x++) {
        const phi = (x / W) * Math.PI * 2;
        const dx = -Math.cos(phi) * st, dy = ct, dz = Math.sin(phi) * st;
        const h = heightAt(dx, dy, dz);
        const g = grain.fbm3(dx * 16, dy * 16, dz * 16, 2, 2, 0.5);
        const i = y * W + x;
        hBuf[i] = h; gBuf[i] = g;
        // влага нужна только суше — экономим октавы на океане
        const moisture = (h > seaLevel + 0.008)
          ? noise.fbm3(dx * 2.2 + 9, dy * 2.2 - 3, dz * 2.2 + 2, 3, 2, 0.5) * 0.5 + 0.5
          : 0.5;
        const col = biomeColor(h, { x: dx, y: dy, z: dz }, moisture);
        const shade = 1 + g * 0.12;
        const px = i * 4;
        img.data[px] = U.sat(col[0] * shade) * 255;
        img.data[px + 1] = U.sat(col[1] * shade) * 255;
        img.data[px + 2] = U.sat(col[2] * shade) * 255;
        img.data[px + 3] = 255;
      }
    };
  }
  function finishNormal(p) {
    const W = p.W, H = p.H;
    const ncnv = document.createElement('canvas'); ncnv.width = W; ncnv.height = H;
    const nctx = ncnv.getContext('2d');
    const nimg = nctx.createImageData(W, H);
    const kU = (W / (Math.PI * 2)) * 10, kV = (H / Math.PI) * 10;
    const f = function (xx, yy) { const i = yy * W + xx; return p.hBuf[i] + p.gBuf[i] * 0.006; };
    for (let y = 0; y < H; y++) {
      const yU = (y - 1 + H) % H, yD = (y + 1) % H;
      for (let x = 0; x < W; x++) {
        const xL = (x - 1 + W) % W, xR = (x + 1) % W;
        let nx = -(f(xR, y) - f(xL, y)) * 0.5 * kU;
        let ny = -(f(x, yU) - f(x, yD)) * 0.5 * kV;
        const nz = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        const px = (y * W + x) * 4;
        nimg.data[px] = (nx * nz * 0.5 + 0.5) * 255;
        nimg.data[px + 1] = (ny * nz * 0.5 + 0.5) * 255;
        nimg.data[px + 2] = (nz * 0.5 + 0.5) * 255;
        nimg.data[px + 3] = 255;
      }
    }
    nctx.putImageData(nimg, 0, 0);
    const normalTex = new THREE.CanvasTexture(ncnv);
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.anisotropy = p.maxAniso;
    return normalTex;
  }
  function buildTerrainMaps(tier) {
    const draftW = 512, draftH = 256;
    const p = genPass(draftW, draftH);
    for (let y = 0; y < draftH; y++) p.rowF(y);
    p.ctx.putImageData(p.img, 0, 0);
    const colorTex = new THREE.CanvasTexture(p.cnv);
    colorTex.encoding = THREE.sRGBEncoding;
    colorTex.wrapS = THREE.RepeatWrapping;
    colorTex.anisotropy = p.maxAniso;
    const normalTex = finishNormal(p);
    const maps = { color: colorTex, normal: normalTex };
    if (tier === 'low') return maps;
    // фоновое уточнение до 1024x512: чанки по 24 строки, без фриза
    maps.refine = function () { startRefine(1024, 512, maps); };
    return maps;
  }
  let refineToken = 0;
  function startRefine(W, H, maps) {
    const token = refineToken;
    const p = genPass(W, H);
    let row = 0;
    const step = function () {
      if (token !== refineToken) return; // мир пересоздан
      if (!terrain || !terrain.material) return;
      const end = Math.min(H, row + 24);
      for (; row < end; row++) p.rowF(row);
      if (row < H) { setTimeout(step, 0); return; }
      p.ctx.putImageData(p.img, 0, 0);
      const colorTex = new THREE.CanvasTexture(p.cnv);
      colorTex.encoding = THREE.sRGBEncoding;
      colorTex.wrapS = THREE.RepeatWrapping;
      colorTex.anisotropy = p.maxAniso;
      const normalTex = finishNormal(p);
      if (token !== refineToken || !terrain || !terrain.material) { colorTex.dispose(); normalTex.dispose(); return; }
      const oldC = terrain.material.map, oldN = terrain.material.normalMap;
      terrain.material.map = colorTex;
      terrain.material.normalMap = normalTex;
      terrain.material.needsUpdate = true;
      if (oldC) oldC.dispose();
      if (oldN) oldN.dispose();
    };
    setTimeout(step, 0);
  }

  function buildWater() {
    const geo = new THREE.SphereGeometry(1 + seaLevel, 48, 32);
    // пена: атрибут близости к берегу
    const pos = geo.attributes.position;
    const foam = new Float32Array(pos.count);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const d = heightAt(v.x, v.y, v.z) - seaLevel;
      foam[i] = U.sat(1 - U.invLerp(0.0, 0.014, Math.max(d, 0))); // 1 у самого берега
    }
    geo.setAttribute('foam', new THREE.BufferAttribute(foam, 1));
    waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSun: { value: new THREE.Vector3(1, 1, 1) },
        uDeep: { value: new THREE.Color(0.04, 0.16, 0.30) },
        uShallow: { value: new THREE.Color(0.13, 0.42, 0.50) },
        uFoam: { value: new THREE.Color(0.92, 0.96, 0.97) },
        uNight: { value: 0 },
        uDark: { value: 0 },
      },
      vertexShader: [
        'attribute float foam;',
        'varying float vFoam; varying vec3 vNormal; varying vec3 vPos; varying vec3 vWorld;',
        'void main(){',
        '  vFoam = foam; vNormal = normalize(normalMatrix * normal);',
        '  vec4 wp = modelMatrix * vec4(position,1.0);',
        '  vWorld = wp.xyz; vPos = position;',
        '  gl_Position = projectionMatrix * viewMatrix * wp;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform vec3 uSun; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam;',
        'uniform float uNight; uniform float uDark;',
        'varying float vFoam; varying vec3 vNormal; varying vec3 vPos; varying vec3 vWorld;',
        'float wnoise(vec3 p){ return sin(p.x*9.0+uTime*1.7)*sin(p.y*11.0-uTime*2.3)*sin(p.z*8.0+uTime*1.1)*0.5+0.5; }',
        'void main(){',
        '  vec3 viewDir = normalize(cameraPosition - vWorld);',
        '  float fres = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);',
        '  float w1 = wnoise(vPos*6.0); float w2 = wnoise(vPos*13.0 + 4.0);',
        '  float fo = vFoam * smoothstep(0.25, 0.9, w1*0.6 + w2*0.6);',
        '  vec3 base = mix(uDeep, uShallow, 0.35 + w1*0.25);',
        '  base = mix(base, uFoam, fo*0.85);',
        '  vec3 nrm = normalize(vNormal + vec3(w1-0.5, w2-0.5, 0.0)*0.25);',
        '  vec3 lightDir = normalize(uSun);',
        '  float spec = pow(max(dot(reflect(-lightDir, nrm), viewDir), 0.0), 48.0);',
        '  vec3 col = base * (0.55 + 0.45*max(dot(nrm, lightDir),0.0));',
        '  col += vec3(0.9,0.85,0.7) * spec * 0.8;',
        '  col += uShallow * fres * 0.6;',
        '  col *= (1.0 - uDark*0.5);',
        '  col *= (1.0 - uNight*0.62);',
        '  gl_FragColor = vec4(col, 0.92);',
        '}'
      ].join('\n'),
      transparent: true,
    });
    water = new THREE.Mesh(geo, waterMat);
    water.renderOrder = 1;
    group.add(water);
  }

  function cloudCanvas(seed) {
    const r = WJ.Rng.create(seed + 91);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d');
    const n = WJ.Noise.create(seed + 91);
    const img = ctx.createImageData(1024, 512);
    // рисуем по сфере-развёртке (equirect) с 3D-шумом, чтобы не было швов
    for (let y = 0; y < 512; y++) {
      const theta = (y / 512) * Math.PI;
      for (let x = 0; x < 1024; x++) {
        const phi = (x / 1024) * Math.PI * 2;
        const dx = Math.sin(theta) * Math.cos(phi), dy = Math.cos(theta), dz = Math.sin(theta) * Math.sin(phi);
        let a = n.fbm3(dx * 2.4, dy * 2.4, dz * 2.4, 4, 2.2, 0.55) * 0.5 + 0.5;
        a = U.sat((a - 0.52) * 3.4);
        const i = (y * 1024 + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
        img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    try { t.anisotropy = WJ.Render.renderer.capabilities.getMaxAnisotropy(); } catch (e) {}
    return t;
  }
  function buildClouds() {
    const geo = new THREE.SphereGeometry(1.045, 48, 32);
    const alpha = cloudCanvas(rng.int(1, 1e9));
    cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, alphaMap: alpha, transparent: true, opacity: 0.85,
      depthWrite: false, roughness: 1, metalness: 0,
    });
    clouds = new THREE.Mesh(geo, cloudMat);
    clouds.renderOrder = 3;
    group.add(clouds);
  }

  function buildAtmosphere() {
    const geo = new THREE.SphereGeometry(1.085, 32, 24);
    atmoMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0.35, 0.6, 1.0) }, uPower: { value: 3.2 }, uInt: { value: 0.9 } },
      vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix*normal); vec4 wp = modelMatrix*vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uPower; uniform float uInt; varying vec3 vN; varying vec3 vW; void main(){ vec3 vd = normalize(cameraPosition - vW); float f = pow(1.0 - abs(dot(normalize(vN), vd)), uPower); gl_FragColor = vec4(uColor * f * uInt, f * uInt); }',
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    atmo = new THREE.Mesh(geo, atmoMat);
    group.add(atmo);
  }

  // ---- Растительность ----
  function treeGeo(kind) {
    // kind 0: ель, 1: лиственное, 2: пальма-кустик
    if (kind === 0) {
      const g = new THREE.ConeGeometry(0.02, 0.055, 6);
      g.translate(0, 0.028, 0);
      return g;
    } else if (kind === 1) {
      const trunk = new THREE.CylinderGeometry(0.004, 0.006, 0.03, 5); trunk.translate(0, 0.015, 0);
      const crown = new THREE.SphereGeometry(0.021, 7, 5); crown.translate(0, 0.04, 0);
      return mergeGeos([trunk, crown], [{ r: 0.36, g: 0.24, b: 0.14 }, { r: 0.22, g: 0.42, b: 0.16 }]);
    } else {
      const g = new THREE.SphereGeometry(0.017, 6, 4); g.scale(1, 0.7, 1); g.translate(0, 0.012, 0);
      return mergeGeos([g], [{ r: 0.30, g: 0.48, b: 0.20 }]);
    }
  }
  function mergeGeos(list, cols) {
    // Простое слияние (позиции + нормали + цвет); BufferGeometryUtils недоступен в ядре.
    let vCount = 0;
    const geos = list.map(function (g) { return g.index ? g.toNonIndexed() : g; });
    geos.forEach(function (g) { vCount += g.attributes.position.count; });
    const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), col = new Float32Array(vCount * 3);
    let off = 0;
    for (let gi = 0; gi < geos.length; gi++) {
      const g = geos[gi], p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        pos[(off + i) * 3] = p.getX(i); pos[(off + i) * 3 + 1] = p.getY(i); pos[(off + i) * 3 + 2] = p.getZ(i);
        nor[(off + i) * 3] = n.getX(i); nor[(off + i) * 3 + 1] = n.getY(i); nor[(off + i) * 3 + 2] = n.getZ(i);
        const c = cols[gi];
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
  function rockGeo() {
    const g = new THREE.DodecahedronGeometry(0.014, 0);
    g.scale(1, 0.75, 1);
    return mergeGeos([g], [{ r: 0.45, g: 0.44, b: 0.42 }]);
  }
  function grassGeo() {
    const g = new THREE.ConeGeometry(0.005, 0.014, 4);
    g.translate(0, 0.007, 0);
    return mergeGeos([g], [{ r: 0.4, g: 0.55, b: 0.22 }]);
  }

  function placeOnSphere(count, kinds) {
    // точки Фибоначчи, проходимые (выше воды, не слишком круто)
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const attempts = count * 12;
    let i = 0, placed = 0;
    const v = new THREE.Vector3();
    while (placed < count && i < attempts) {
      i++;
      const y = 1 - (i / attempts) * 2;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      const jitter = 0.94 + rng.next() * 0.12;
      v.set(Math.cos(th) * rr * jitter, y, Math.sin(th) * rr * jitter).normalize();
      const h = heightAt(v.x, v.y, v.z);
      if (h < seaLevel + 0.004) continue;
      const kind = kinds ? kinds(placed) : 0;
      pts.push({ dir: v.clone(), h, kind });
      placed++;
    }
    return pts;
  }

  function buildVegetation(tier) {
    vegGroup = new THREE.Group();
    group.add(vegGroup);
    const budgets = {
      trees: tier === 'low' ? 60 : (tier === 'medium' ? 140 : 240),
      rocks: tier === 'low' ? 30 : (tier === 'medium' ? 60 : 110),
      grass: tier === 'low' ? 60 : (tier === 'medium' ? 150 : 250),
    };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    // деревья: 3 вида -> отдельные InstancedMesh
    for (let k = 0; k < 3; k++) {
      const per = Math.floor(budgets.trees / 3);
      const im = new THREE.InstancedMesh(treeGeo(k), mat, per);
      im.castShadow = true;
      fillInstances(im, per, function () { return 1 + rng.next() * 1.6; });
      vegMeshes['tree' + k] = im;
      vegGroup.add(im);
    }
    const rocks = new THREE.InstancedMesh(rockGeo(), mat, budgets.rocks);
    rocks.castShadow = true;
    fillInstances(rocks, budgets.rocks, function () { return 0.7 + rng.next() * 1.4; });
    vegMeshes.rock = rocks; vegGroup.add(rocks);

    const grass = new THREE.InstancedMesh(grassGeo(), mat, budgets.grass);
    fillInstances(grass, budgets.grass, function () { return 0.8 + rng.next() * 1.2; });
    vegMeshes.grass = grass; vegGroup.add(grass);
  }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3();
  function fillInstances(im, count, scaleFn) {
    const pts = placeOnSphere(count);
    for (let i = 0; i < count; i++) {
      const pt = pts[i] || pts[pts.length - 1] || { dir: new THREE.Vector3(0, 1, 0), h: 0.05 };
      const r = 1 + Math.max(pt.h, seaLevel + 0.002) - (pt.h > seaLevel ? 0 : 0.002);
      _p.copy(pt.dir).multiplyScalar(r);
      _up.copy(pt.dir);
      _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _up);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_up, rng.next() * Math.PI * 2));
      const sc = scaleFn();
      _s.set(sc, sc * (0.85 + rng.next() * 0.4), sc);
      _m4.compose(_p, _q, _s);
      im.setMatrixAt(i, _m4);
    }
    im.instanceMatrix.needsUpdate = true;
    im.userData.baseMatrix = im.instanceMatrix.array.slice();
  }

  function setGrowth(g, wind) {
    growth = g; windK = wind;
    // масштабируем деревья по росту (только когда меняется — не каждый кадр)
    for (const key in vegMeshes) {
      const im = vegMeshes[key];
      const base = im.userData.baseMatrix;
      if (!base) continue;
      const arr = im.instanceMatrix.array;
      for (let i = 0; i < im.count; i++) {
        const bx = base[i * 16], by = base[i * 16 + 1], bz = base[i * 16 + 2];
        const m = key.indexOf('tree') === 0 ? growth : 1;
        arr[i * 16 + 0] = bx * m; arr[i * 16 + 1] = by * m; arr[i * 16 + 2] = bz * m;
        arr[i * 16 + 5] = by * m; arr[i * 16 + 6] = bz * m;
        // наклон от ветра (малый сдвиг верхних компонентов)
        if (key.indexOf('tree') === 0 && windK > 0) {
          arr[i * 16 + 4] = Math.sin(i * 1.7) * 0.05 * windK;
        }
      }
      im.instanceMatrix.needsUpdate = true;
    }
  }

  function create(seed, tier, parentGroup) {
    rng = WJ.Rng.create(seed);
    noise = WJ.Noise.create(seed);
    seaLevel = 0.004 + (rng.next() - 0.5) * 0.004;
    group = new THREE.Group();
    group.position.y = 1.62; // парит внутри банки
    tiltQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), TILT);
    group.quaternion.copy(tiltQuat);
    buildTerrain(tier);
    buildWater();
    buildClouds();
    buildAtmosphere();
    buildVegetation(tier);
    parentGroup.add(group);
    return api;
  }

  function frame(dt, state) {
    // state: { dayT, weatherDark, nightK, windK, wetK, sunDirWorld }
    time += dt;
    // парение: покачивание вверх-вниз
    group.position.y = 1.62 + Math.sin(time * Math.PI / 3) * 0.02;
    // вращение вокруг наклонной оси (медленное): quat = tilt * rotY(spin)
    spinAngle += dt * 0.05;
    rotQuat.setFromAxisAngle(Y_AXIS, spinAngle);
    group.quaternion.copy(tiltQuat).multiply(rotQuat);
    // вода
    waterMat.uniforms.uTime.value = time;
    waterMat.uniforms.uNight.value = state.nightK;
    waterMat.uniforms.uDark.value = state.weatherDark;
    if (state.sunDirWorld) waterMat.uniforms.uSun.value.copy(state.sunDirWorld);
    // атмосфера: от погоды и времени
    atmoMat.uniforms.uInt.value = 0.9 - state.nightK * 0.55 - state.weatherDark * 0.3;
    atmoMat.uniforms.uColor.value.setRGB(0.35 + state.weatherDark * 0.1, 0.6 - state.weatherDark * 0.2, 1.0 - state.weatherDark * 0.3);
    // облака темнеют в шторм
    const stormK = state.stormK || 0;
    cloudMat.color.setRGB(1 - stormK * 0.45, 1 - stormK * 0.45, 1 - stormK * 0.4);
    cloudMat.opacity = 0.85 + stormK * 0.15;
    // дымка тумана: облака опускаются чуть ниже и плотнее
    if (state.fogK) cloudMat.opacity = 0.85 + state.fogK * 0.1;
  }

  function dispose() {
    refineToken++; // отменить фоновое уточнение текстуры
    group.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(function (m) {
          if (m.map) m.map.dispose();
          if (m.normalMap) m.normalMap.dispose();
          if (m.alphaMap) m.alphaMap.dispose();
          m.dispose();
        });
      }
    });
    if (group.parent) group.parent.remove(group);
  }

  const api = {
    create, frame, heightAt, setGrowth, dispose,
    get group() { return group; },
    get seaLevel() { return seaLevel; },
    get radius() { return 1; },
    get terrain() { return terrain; },
    get water() { return water; },
    get clouds() { return clouds; },
  };
  return api;
})();
