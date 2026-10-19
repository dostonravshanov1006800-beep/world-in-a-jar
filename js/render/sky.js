// FILE: js/render/sky.js
// Погода на планете: дождь (линии), снег, молнии, туман, жара-мерцание,
// северное сияние. Частицы пулятся, никаких аллокаций в кадре.
WJ.Sky = (function () {
  const U = WJ.Util;
  let group, rain, rainGeo, rainCount, snow, snowGeo, snowCount;
  let fogMesh, fogMat, lightning, lightningTimer = 0, flashLight, aurora, auroraMat;
  let time = 0;
  const _v = new THREE.Vector3();

  function create(parent, tier) {
    group = new THREE.Group();
    parent.add(group);
    rainCount = tier === 'low' ? 120 : 400;
    snowCount = tier === 'low' ? 80 : 260;

    // Дождь — LineSegments (пары точек), падают вдоль локальной «вниз» упрощённо
    const rpos = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) {
      seedRain(i, rpos, true);
    }
    rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
    rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.55 }));
    rain.visible = false;
    rain.frustumCulled = false;
    group.add(rain);

    // Снег — Points
    const spos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) seedSnow(i, spos, true);
    snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
    snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.012, transparent: true, opacity: 0.9, depthWrite: false }));
    snow.visible = false;
    snow.frustumCulled = false;
    group.add(snow);

    // Туман — полупрозрачный слой у поверхности
    fogMat = new THREE.MeshBasicMaterial({ color: 0xd8e2ea, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    fogMesh = new THREE.Mesh(new THREE.SphereGeometry(1.06, 24, 16), fogMat);
    fogMesh.visible = false;
    group.add(fogMesh);

    // Молния — ветка (линии) + вспышка света
    const lpos = new Float32Array(40 * 3);
    lightning = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(lpos, 3)), new THREE.LineBasicMaterial({ color: 0xeaffff }));
    lightning.visible = false;
    group.add(lightning);
    flashLight = new THREE.PointLight(0xcfe8ff, 0, 4, 2);
    group.add(flashLight);

    // Северное сияние — кольцо-шейдер
    auroraMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uInt: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'uniform float uTime; uniform float uInt; varying vec2 vUv;',
        'void main(){',
        '  float w = sin(vUv.x*24.0 + uTime*1.4)*0.5 + sin(vUv.x*13.0 - uTime*0.7)*0.5;',
        '  float band = smoothstep(0.1, 0.5, vUv.y + w*0.18) * smoothstep(1.0, 0.55, vUv.y);',
        '  vec3 col = mix(vec3(0.2,0.9,0.5), vec3(0.4,0.3,0.9), vUv.x + sin(uTime*0.3)*0.3);',
        '  gl_FragColor = vec4(col * band * uInt, band * uInt);',
        '}'
      ].join('\n'),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    aurora = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), auroraMat);
    aurora.visible = false;
    group.add(aurora);

    return api;
  }

  function seedRain(i, arr, full) {
    const ang = Math.random() * Math.PI * 2;
    const rr = 0.4 + Math.random() * 0.75;
    const y = full ? Math.random() * 1.6 : 1.4 + Math.random() * 0.3;
    arr[i * 6] = Math.cos(ang) * rr; arr[i * 6 + 1] = y; arr[i * 6 + 2] = Math.sin(ang) * rr;
    arr[i * 6 + 3] = arr[i * 6] + (Math.random() - 0.5) * 0.02; arr[i * 6 + 4] = y - 0.09; arr[i * 6 + 5] = arr[i * 6 + 2] + (Math.random() - 0.5) * 0.02;
  }
  function seedSnow(i, arr, full) {
    const ang = Math.random() * Math.PI * 2;
    const rr = 0.2 + Math.random() * 0.9;
    arr[i * 3] = Math.cos(ang) * rr;
    arr[i * 3 + 1] = full ? Math.random() * 1.6 : 1.3 + Math.random() * 0.4;
    arr[i * 3 + 2] = Math.sin(ang) * rr;
  }

  // state: { rainK, snowK, fogK, stormK, heatK, auroraK, nightK }
  function frame(dt, state) {
    time += dt;
    const rpos = rainGeo.attributes.position.array;
    if (state.rainK > 0) {
      rain.visible = true;
      rain.material.opacity = 0.55 * state.rainK;
      const speed = 1.4 + state.stormK * 1.2;
      for (let i = 0; i < rainCount; i++) {
        let y = rpos[i * 6 + 1] - speed * dt;
        if (y < 0.05) { seedRain(i, rpos, false); y = rpos[i * 6 + 1]; }
        const dy = y - rpos[i * 6 + 1];
        rpos[i * 6 + 1] = y;
        rpos[i * 6 + 4] += dy;
      }
      rainGeo.attributes.position.needsUpdate = true;
    } else rain.visible = false;

    const spos = snowGeo.attributes.position.array;
    if (state.snowK > 0) {
      snow.visible = true;
      snow.material.opacity = 0.9 * state.snowK;
      for (let i = 0; i < snowCount; i++) {
        let y = spos[i * 3 + 1] - 0.16 * dt;
        spos[i * 3] += Math.sin(time * 1.5 + i) * 0.004 * dt * 60;
        spos[i * 3 + 2] += Math.cos(time * 1.2 + i * 0.7) * 0.003 * dt * 60;
        if (y < 0.06) { seedSnow(i, spos, false); y = spos[i * 3 + 1]; }
        spos[i * 3 + 1] = y;
      }
      snowGeo.attributes.position.needsUpdate = true;
    } else snow.visible = false;

    fogMesh.visible = state.fogK > 0.02;
    fogMat.opacity = state.fogK * 0.38;

    // Молния при грозе
    if (state.stormK > 0.3) {
      lightningTimer -= dt;
      if (lightningTimer <= 0) {
        lightningTimer = 3 + Math.random() * 9;
        makeLightningBolt();
        flashLight.intensity = 2.6;
        WJ.Bus.emit('sfx:thunder', { delay: 0.3 + Math.random() * 1.2 });
      }
    }
    if (flashLight.intensity > 0) {
      flashLight.intensity *= Math.pow(0.02, dt);
      if (flashLight.intensity < 0.02) { flashLight.intensity = 0; lightning.visible = false; }
    }

    aurora.visible = state.auroraK > 0.01;
    if (aurora.visible) {
      auroraMat.uniforms.uTime.value = time;
      auroraMat.uniforms.uInt.value = state.auroraK * state.nightK;
    }
  }

  function makeLightningBolt() {
    const arr = lightning.geometry.attributes.position.array;
    let x = (Math.random() - 0.5) * 1.4, y = 1.55, z = (Math.random() - 0.5) * 1.4;
    let idx = 0;
    const n = arr.length / 3;
    for (let i = 0; i < n; i++) {
      arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
      y -= 1.55 / n;
      x += (Math.random() - 0.5) * 0.12; z += (Math.random() - 0.5) * 0.12;
    }
    lightning.geometry.attributes.position.needsUpdate = true;
    lightning.visible = true;
    flashLight.position.set(x, 1.2, z);
  }

  const api = { create, frame };
  return api;
})();
