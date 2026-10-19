// FILE: js/render/post.js
// Пост-обработка без EffectComposer: RT -> полноэкранный квад.
// Bloom: bright-pass (порог) -> downsample -> blur -> композит (безумного
// оверэкспоуна нет, gain умеренный). Виньетка, зерно, слабая CA, контраст.
WJ.Post = (function () {
  let renderer, scene, camera, quad;
  let matBright, matBlur, matComp;
  let rtScene, rtA, rtB;
  let level = 1; // 2=high(bloom+grain+CA), 1=medium(bloom+vignette), 0=off
  let w = 2, h = 2;

  const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }';

  const BRIGHT_FRAG = [
    'varying vec2 vUv;',
    'uniform sampler2D tDiffuse; uniform float uThreshold; uniform float uKnee;',
    'void main(){',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
    '  float br = max(c.r, max(c.g, c.b));',
    '  float soft = clamp((br - uThreshold + uKnee) / (2.0 * uKnee), 0.0, 1.0);',
    '  float contrib = max(soft, br > uThreshold ? 1.0 : 0.0);',
    '  gl_FragColor = vec4(c * contrib, 1.0);',
    '}'
  ].join('\n');

  const BLUR_FRAG = [
    'varying vec2 vUv;',
    'uniform sampler2D tDiffuse; uniform vec2 uDir; uniform vec2 uRes;',
    'void main(){',
    '  vec2 px = uDir / uRes;',
    '  vec4 c = texture2D(tDiffuse, vUv) * 0.227;',
    '  c += (texture2D(tDiffuse, vUv + px * 1.384) + texture2D(tDiffuse, vUv - px * 1.384)) * 0.316;',
    '  c += (texture2D(tDiffuse, vUv + px * 3.230) + texture2D(tDiffuse, vUv - px * 3.230)) * 0.070;',
    '  gl_FragColor = c;',
    '}'
  ].join('\n');

  const COMP_FRAG = [
    'varying vec2 vUv;',
    'uniform sampler2D tScene; uniform sampler2D tBloom;',
    'uniform float uTime; uniform float uVig; uniform float uGrain; uniform float uCA; uniform float uContrast;',
    'void main(){',
    '  vec2 uv = vUv;',
    '  vec2 d = uv - 0.5;',
    '  float r2 = dot(d, d);',
    '  vec3 col;',
    '  if (uCA > 0.5) {',
    '    float off = 0.014 * r2;',
    '    col.r = texture2D(tScene, uv - d * off).r;',
    '    col.g = texture2D(tScene, uv).g;',
    '    col.b = texture2D(tScene, uv + d * off).b;',
    '  } else col = texture2D(tScene, uv).rgb;',
    '  col += texture2D(tBloom, uv).rgb * 0.55;',
    '  col = (col - 0.5) * uContrast + 0.5;',
    '  col *= 1.0 - uVig * smoothstep(0.15, 0.62, r2);',
    '  if (uGrain > 0.5) {',
    '    float g = fract(sin(dot(uv * vec2(1234.5, 987.3) + uTime, vec2(12.9898, 78.233))) * 43758.5453);',
    '    col += (g - 0.5) * 0.028;',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function mkMat(frag, uniforms) {
    return new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: frag,
      depthTest: false, depthWrite: false,
    });
  }
  function init(rend) {
    renderer = rend;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    matBright = mkMat(BRIGHT_FRAG, { tDiffuse: { value: null }, uThreshold: { value: 0.72 }, uKnee: { value: 0.18 } });
    matBlur = mkMat(BLUR_FRAG, { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(256, 256) } });
    matComp = mkMat(COMP_FRAG, {
      tScene: { value: null }, tBloom: { value: null },
      uTime: { value: 0 }, uVig: { value: 0.32 }, uGrain: { value: 0 }, uCA: { value: 0 }, uContrast: { value: 1.05 },
    });
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matComp);
    quad.frustumCulled = false;
    scene.add(quad);
    const size = renderer.getSize(new THREE.Vector2());
    w = Math.max(2, Math.floor(size.x)); h = Math.max(2, Math.floor(size.y));
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    rtScene = new THREE.WebGLRenderTarget(w, h, opts);
    rtA = new THREE.WebGLRenderTarget(Math.max(2, Math.floor(w / 2)), Math.max(2, Math.floor(h / 2)), opts);
    rtB = new THREE.WebGLRenderTarget(Math.max(2, Math.floor(w / 2)), Math.max(2, Math.floor(h / 2)), opts);
    matBlur.uniforms.uRes.value.set(Math.max(2, Math.floor(w / 2)), Math.max(2, Math.floor(h / 2)));
  }
  function resize() {
    if (!renderer || !rtScene) return;
    const size = renderer.getSize(new THREE.Vector2());
    w = Math.max(2, Math.floor(size.x)); h = Math.max(2, Math.floor(size.height !== undefined ? size.height : size.y));
    disposeRTs();
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    rtScene = new THREE.WebGLRenderTarget(w, h, opts);
    rtA = new THREE.WebGLRenderTarget(Math.max(2, Math.floor(w / 2)), Math.max(2, Math.floor(h / 2)), opts);
    rtB = new THREE.WebGLRenderTarget(Math.max(2, Math.floor(w / 2)), Math.max(2, Math.floor(h / 2)), opts);
    matBlur.uniforms.uRes.value.set(Math.floor(w / 2), Math.floor(h / 2));
  }
  function disposeRTs() {
    if (rtScene) rtScene.dispose(); if (rtA) rtA.dispose(); if (rtB) rtB.dispose();
  }
  function setLevel(l) { level = l; }
  function setTime(t) { matComp.uniforms.uTime.value = t % 100; }

  function render(mainScene, mainCamera, focusBlur) {
    if (level <= 0) {
      renderer.setRenderTarget(null);
      renderer.render(mainScene, mainCamera);
      return;
    }
    // 1) сцена в RT
    renderer.setRenderTarget(rtScene);
    renderer.render(mainScene, mainCamera);
    if (api.onSceneRendered) { try { api.onSceneRendered(renderer.info.render.calls); } catch (e) {} }
    // 2) bright-pass -> rtA
    quad.material = matBright;
    matBright.uniforms.tDiffuse.value = rtScene.texture;
    renderer.setRenderTarget(rtA);
    renderer.render(scene, camera);
    // 3) blur rtA <-> rtB (двойной проход)
    quad.material = matBlur;
    matBlur.uniforms.tDiffuse.value = rtA.texture; matBlur.uniforms.uDir.value.set(1, 0);
    renderer.setRenderTarget(rtB);
    renderer.render(scene, camera);
    matBlur.uniforms.tDiffuse.value = rtB.texture; matBlur.uniforms.uDir.value.set(0, 1);
    renderer.setRenderTarget(rtA);
    renderer.render(scene, camera);
    matBlur.uniforms.tDiffuse.value = rtA.texture; matBlur.uniforms.uDir.value.set(1, 0);
    renderer.setRenderTarget(rtB);
    renderer.render(scene, camera);
    // 4) композит
    quad.material = matComp;
    matComp.uniforms.tScene.value = rtScene.texture;
    matComp.uniforms.tBloom.value = rtB.texture;
    matComp.uniforms.uVig.value = 0.32 + (focusBlur || 0) * 0.25;
    matComp.uniforms.uGrain.value = level >= 2 ? 1 : 0;
    matComp.uniforms.uCA.value = level >= 2 ? 1 : 0;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }
  const api = { init, resize, render, setLevel, setTime, onSceneRendered: null, get level() { return level; } };
  return api;
})();
