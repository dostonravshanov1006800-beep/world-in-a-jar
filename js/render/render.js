// FILE: js/render/render.js
// Главный рендер-модуль: init, resize, frame, setQuality, focusOn, pickResident.
WJ.Render = (function () {
  const U = WJ.Util;
  let canvas, renderer, scene, cam;
  let inited = false, running = false, built = false;
  let lastDrawCalls = 0, nightK = 0;

  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function init(cv) {
    canvas = cv;
    if (!webglAvailable()) return false;
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true, alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    WJ.Render.renderer = renderer;
    WJ.Render.scene = scene;
    inited = true;
    return true;
  }

  function buildWorld(seed, planetName, onReady) {
    // построение сцены: окружение, банка, планета, небо, камера, пост
    const tier = WJ.Quality.tier;
    const rng = WJ.Rng.create(seed + 5);
    WJ.Env.init(scene, rng);
    WJ.Jar.init(scene, tier, rng, planetName);
    WJ.Planet.create(seed, tier, WJ.Jar.innerGroup);
    WJ.Sky.create(WJ.Jar.innerGroup, tier);
    cam = WJ.CameraRig.init(renderer, canvas);
    WJ.Post.init(renderer);
    applyTier(tier);
    resize();
    built = true;
    if (onReady) onReady();
    return true;
  }

  function applyTier(tier) {
    const t = WJ.Config.tiers[tier];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, t.pixelRatio));
    if (!built) return; // до buildWorld тиры применятся там же
    renderer.shadowMap.enabled = t.shadow > 0;
    WJ.Env.applyShadowTier(t.shadow);
    WJ.Post.setLevel(t.post);
    WJ.Jar.setQuality(tier);
    resize();
  }

  function resize() {
    if (!inited || !built) { if (inited) renderer.setSize(window.innerWidth, window.innerHeight, false); return; }
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (cam) cam.resize(w, h);
    WJ.Post.resize();
  }

  // Пикинг жителей: рейкаст по сферам-хитбоксам
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickResident(x, y, hitboxes) {
    ndc.x = (x / window.innerWidth) * 2 - 1;
    ndc.y = -(y / window.innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, cam.camera);
    const hits = ray.intersectObjects(hitboxes, false);
    for (let i = 0; i < hits.length; i++) {
      if (hits[i].object.userData.residentId !== undefined) return hits[i].object.userData.residentId;
    }
    return null;
  }

  // Кадр: dt (сек), worldState — состояние мира для подкраски
  function frame(dt, ws) {
    if (!inited || !built) return;
    const dayT = ws ? ws.dayT : 0.3;
    nightK = U.sat(Math.abs(dayT - 0.75) < 0.25 ? U.invLerp(0.5, 0.62, dayT) : (dayT > 0.62 ? 1 - U.invLerp(0.95, 1.0, dayT) * 0 : 0));
    // ночью: 0.5..1 -> всё темнее
    const night = dayT > 0.5 ? U.invLerp(0.5, 0.58, dayT) * (1 - U.invLerp(0.98, 1.0, dayT) * 0.9) : 0;
    nightK = night;
    const dark = ws ? ws.weatherDark : 0;
    WJ.Env.frame(dt, dayT, dark);
    WJ.Jar.frame(dt, nightK);
    WJ.Planet.frame(dt, {
      dayT, nightK: nightK, weatherDark: dark, stormK: ws ? ws.stormK : 0, fogK: ws ? ws.fogK : 0,
      windK: ws ? ws.windK : 0,
      sunDirWorld: WJ.Env.sunLight.position.clone().normalize(),
    });
    WJ.Sky.frame(dt, {
      rainK: ws ? ws.rainK : 0, snowK: ws ? ws.snowK : 0, fogK: ws ? ws.fogK : 0,
      stormK: ws ? ws.stormK : 0, auroraK: ws ? ws.auroraK : 0, nightK,
    });
    cam.frame(dt);
    WJ.Quality.frame(dt);
    // пост
    WJ.Post.setTime(performance.now() / 1000);
    WJ.Post.onSceneRendered = function (calls) { lastDrawCalls = calls; };
    WJ.Post.render(scene, cam.camera, cam.focusK);
  }

  function focusOn(worldPos) { cam.focusOn(worldPos); }
  function focusOff() { cam.focusOff(); }
  function onContextLost(e) {
    e.preventDefault && e.preventDefault();
    WJ.Errors.record('webgl', 'context lost');
    WJ.Bus.emit('webgl:lost');
  }
  function onContextRestored() {
    WJ.Errors.record('webgl', 'context restored');
    WJ.Bus.emit('webgl:restored');
    applyTier(WJ.Quality.tier);
  }
  function bindContext(canvasEl) {
    canvasEl.addEventListener('webglcontextlost', onContextLost);
    canvasEl.addEventListener('webglcontextrestored', onContextRestored);
  }

  return {
    init, resize, frame, applyTier, focusOn, focusOff, pickResident, buildWorld, bindContext,
    get inited() { return inited; },
    get scene() { return scene; },
    get renderer() { return renderer; },
    get drawCalls() { return lastDrawCalls; },
    _cam: function () { return cam; },
  };
})();
