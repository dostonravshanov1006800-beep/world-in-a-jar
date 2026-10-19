// FILE: js/render/jar.js
// Стеклянная банка: LatheGeometry, MeshPhysicalMaterial transmission, капли
// конденсата, пыль-светлячки, крышка, бирка с именем планеты. Тир low — fake-glass.
WJ.Jar = (function () {
  const U = WJ.Util;
  let group, glassMesh, glassMat, lid, lidMat, tag, tagCanvas, tagCtx, tagTex;
  let drops, dropSpeeds, dust, dustGeo, innerGroup;
  const JAR_H = 3.2, JAR_R = 1.42, NECK_R = 0.62, NECK_H = 0.42;

  function latheProfile() {
    const pts = [];
    const bodyH = JAR_H - NECK_H;
    // от дна (y=0) вверх
    pts.push(new THREE.Vector2(0.001, 0));
    pts.push(new THREE.Vector2(JAR_R * 0.55, 0));
    pts.push(new THREE.Vector2(JAR_R * 0.94, 0.05));
    pts.push(new THREE.Vector2(JAR_R, 0.22));
    pts.push(new THREE.Vector2(JAR_R * 0.995, bodyH * 0.55));
    // плавные плечи
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector2(
        U.lerp(JAR_R, NECK_R, U.smoothstep(t * 0.9 + 0.05)),
        U.lerp(bodyH * 0.55, bodyH, t)
      ));
    }
    // горлышко
    pts.push(new THREE.Vector2(NECK_R, JAR_H - NECK_H));
    pts.push(new THREE.Vector2(NECK_R * 1.02, JAR_H - NECK_H * 0.15));
    pts.push(new THREE.Vector2(NECK_R * 0.99, JAR_H));
    pts.push(new THREE.Vector2(NECK_R * 0.94, JAR_H));
    return pts;
  }

  function scratchAlphaTex(rng) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d');
    ctx.setTransform(2, 0, 0, 2, 0, 0); // рисуем в координатах 256, храним 512
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = 'rgba(0,0,0,' + rng.range(0.05, 0.2).toFixed(2) + ')';
      ctx.lineWidth = rng.range(0.4, 1.1);
      const x = rng.next() * 256, y = rng.next() * 256, a = rng.next() * Math.PI;
      const len = rng.range(20, 90);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    try { t.anisotropy = WJ.Render.renderer.capabilities.getMaxAnisotropy(); } catch (e) {}
    return t;
  }

  function buildGlass(tier, rng) {
    const geo = new THREE.LatheGeometry(latheProfile(), 64);
    geo.computeVertexNormals();
    if (tier === 'low') {
      // Запасной режим: fake-glass с fresnel через onBeforeCompile
      glassMat = new THREE.MeshStandardMaterial({
        color: 0xdff2ee, transparent: true, opacity: 0.18, roughness: 0.12,
        metalness: 0, side: THREE.DoubleSide, envMapIntensity: 1.4, depthWrite: false,
      });
      glassMat.onBeforeCompile = function (sh) {
        sh.fragmentShader = 'varying vec3 vFres;\n' + sh.fragmentShader.replace(
          'void main() {',
          'varying vec3 vNormalW2; varying vec3 vViewDir;\nvoid main() {\n float fr = pow(1.0 - abs(dot(normalize(vNormalW2), normalize(vViewDir))), 2.2);\n gl_FragColor.a += fr * 0.35;'
        );
        sh.vertexShader = 'varying vec3 vNormalW2; varying vec3 vViewDir;\n' + sh.vertexShader.replace(
          '#include <fog_vertex>',
          '#include <fog_vertex>\n vNormalW2 = normalize(mat3(modelMatrix) * normal);\n vViewDir = normalize(cameraPosition - (modelMatrix * vec4(transformed,1.0)).xyz);'
        );
      };
    } else {
      glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, transmission: 1, thickness: 0.35, ior: 1.5,
        roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
        envMapIntensity: 1.2, side: THREE.DoubleSide,
        attenuationColor: new THREE.Color(0.62, 0.78, 0.72), attenuationDistance: 2.2,
        transparent: true,
        alphaMap: scratchAlphaTex(rng),
      });
    }
    glassMesh = new THREE.Mesh(geo, glassMat);
    glassMesh.castShadow = false;
    glassMesh.renderOrder = 5;
    group.add(glassMesh);

    // Дно банки — чуть толще стекло
    const bottom = new THREE.Mesh(
      new THREE.CylinderGeometry(JAR_R * 0.95, JAR_R * 0.95, 0.09, 48),
      glassMat
    );
    bottom.position.y = 0.045;
    group.add(bottom);
  }

  function buildLid(rng, lidColor) {
    const col = lidColor || 0x8a7a52;
    lidMat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.9, roughness: 0.35 });
    // металлическая крышка стоит рядом на столе, приоткрытая
    lid = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(NECK_R * 1.14, NECK_R * 1.14, 0.16, 48), lidMat);
    cap.position.y = 0.08;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(NECK_R * 1.14, 0.045, 12, 48), lidMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.02;
    // резьба — тонкая спираль из тора-сегментов
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.TorusGeometry(NECK_R * 1.16, 0.012, 6, 32, Math.PI * 1.2), lidMat);
      seg.rotation.x = Math.PI / 2; seg.rotation.z = i * Math.PI * 0.66;
      seg.position.y = 0.06 + i * 0.012;
      lid.add(seg);
    }
    lid.add(cap); lid.add(rim);
    // патина
    lidMat.onBeforeCompile = function (sh) {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <dither_fragment>',
        '#include <dither_fragment>\n float pat = fract(sin(dot(vUv * 40.0, vec2(12.98,78.23))) * 43758.5); if (pat > 0.93) gl_FragColor.rgb *= 0.82;'
      );
    };
    // крышка стоит на горлышке банки — банка «закрыта», читается однозначно
    lid.position.set(0, JAR_H + 0.055, 0);
    lid.rotation.set(0.015, 0, 0.01);
    group.add(lid);
  }

  function buildTag(planetName) {
    tagCanvas = document.createElement('canvas');
    tagCanvas.width = 512; tagCanvas.height = 256; // 4x плотность пикселей бирки
    tagCtx = tagCanvas.getContext('2d');
    tagTex = new THREE.CanvasTexture(tagCanvas);
    tagTex.encoding = THREE.sRGBEncoding;
    try { tagTex.anisotropy = WJ.Render.renderer.capabilities.getMaxAnisotropy(); } catch (e) {}
    const mat = new THREE.MeshStandardMaterial({ map: tagTex, transparent: true, side: THREE.DoubleSide, roughness: 0.9 });
    tag = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.33), mat);
    tag.position.set(-JAR_R - 0.32, 1.15, 0.55);
    tag.rotation.set(-0.12, -0.5, -0.22);
    group.add(tag);
    // верёвочка
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xb8a284, roughness: 0.95 });
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.05, 5), ropeMat);
    rope.position.set(-JAR_R - 0.05, 1.45, 0.32);
    rope.rotation.z = 0.62;
    group.add(rope);
    setTagName(planetName || 'Aria');
  }
  function setTagName(name) {
    const ctx = tagCtx;
    ctx.setTransform(2, 0, 0, 2, 0, 0); // рисуем в координатах 256x128 на холсте 512x256
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = '#f2e6ce';
    ctx.beginPath();
    ctx.moveTo(8, 14); ctx.lineTo(250, 8); ctx.lineTo(246, 118); ctx.lineTo(4, 122);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,50,.35)'; ctx.lineWidth = 3; ctx.stroke();
    // дырочка
    ctx.fillStyle = '#6b4a2e'; ctx.beginPath(); ctx.arc(16, 18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3520';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(name).slice(0, 14), 128, 68);
    tagTex.needsUpdate = true;
  }

  function buildCondensation(tier, rng) {
    const count = tier === 'low' ? 30 : 60;
    drops = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.028, 8, 6),
      new THREE.MeshPhysicalMaterial({ color: 0xeafcff, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.85, ior: 1.33 }),
      count
    );
    dropSpeeds = new Float32Array(count);
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const ang = rng.next() * Math.PI * 2;
      const y = rng.range(0.25, JAR_H - 0.3);
      const rr = JAR_R * 0.995;
      p.set(Math.cos(ang) * rr, y, Math.sin(ang) * rr);
      const sc = rng.range(0.7, 1.5);
      s.set(sc, sc * rng.range(0.9, 1.7), sc);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang);
      m.compose(p, q, s);
      drops.setMatrixAt(i, m);
      dropSpeeds[i] = rng.chance(0.4) ? rng.range(0.004, 0.02) : 0;
    }
    drops.instanceMatrix.needsUpdate = true;
    drops.userData = { pos: [], dropSpeeds, baseR: JAR_R * 0.995 };
    group.add(drops);
  }

  function buildDust(tier, rng) {
    const count = tier === 'low' ? 60 : 220;
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ang = rng.next() * Math.PI * 2;
      const rr = rng.range(0.2, JAR_R * 0.9);
      pos[i * 3] = Math.cos(ang) * rr;
      pos[i * 3 + 1] = rng.range(0.15, JAR_H - 0.35);
      pos[i * 3 + 2] = Math.sin(ang) * rr;
      seeds[i] = rng.next() * 100;
    }
    dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfff2c8, size: 0.016, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    dust = new THREE.Points(dustGeo, mat);
    dust.userData = { seeds };
    group.add(dust);
  }

  let time = 0;
  function frame(dt, nightK) {
    time += dt;
    // капли стекают
    const arr = drops.instanceMatrix.array;
    for (let i = 0; i < drops.count; i++) {
      if (dropSpeeds[i] <= 0) continue;
      let y = arr[i * 16 + 13];
      y -= dropSpeeds[i] * dt;
      if (y < 0.2) { y = WJ.Jar.JAR_H - 0.3; }
      arr[i * 16 + 13] = y;
    }
    drops.instanceMatrix.needsUpdate = true;
    // пыль плывёт, ночью светится
    const pos = dustGeo.attributes.position.array;
    const seeds = dust.userData.seeds;
    for (let i = 0; i < seeds.length; i++) {
      pos[i * 3 + 1] += Math.sin(time * 0.5 + seeds[i]) * 0.0006;
      pos[i * 3] += Math.cos(time * 0.22 + seeds[i]) * 0.0004;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.material.opacity = 0.35 + nightK * 0.5;
    dust.material.size = 0.014 + nightK * 0.012;
  }

  function init(scene, tier, rng, planetName) {
    group = new THREE.Group();
    innerGroup = new THREE.Group(); // контейнер для планеты
    group.add(innerGroup);
    scene.add(group);
    buildGlass(tier, rng);
    buildLid(rng);
    buildTag(planetName);
    buildCondensation(tier, rng);
    buildDust(tier, rng);
    return api;
  }
  function setQuality(tier) {
    if (tier === 'low') { glassMat.opacity = 0.18; glassMat.transparent = true; }
  }
  function dispose() {
    group.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); }); }
    });
    if (group.parent) group.parent.remove(group);
  }

  const api = {
    init, frame, setTagName, setQuality, dispose,
    get group() { return group; },
    get innerGroup() { return innerGroup; },
    get JAR_H() { return JAR_H; },
    get JAR_R() { return JAR_R; },
    get glassMesh() { return glassMesh; },
    JAR_H, JAR_R,
  };
  return api;
})();
