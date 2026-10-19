// FILE: js/render/camera.js
// CameraRig: орбита вокруг банки, инерция, зум (щипок/колесо), двойной тап —
// общий вид, фокус на жителе, тап-пикинг жителей.
WJ.CameraRig = (function () {
  const U = WJ.Util;
  let camera, renderer, dom;
  let theta = 0.6, phi = 1.25, dist = 6.4;
  let thetaV = 0, phiV = 0; // скорости (инерция)
  let minDist = 2.6, maxDist = 9.5;
  let focusTarget = null; // {obj3d} для макро
  let focusK = 0, focusing = false;
  let pinchStart = 0, dragStart = null, lastTap = 0;
  let idleSpin = 0.02;

  function init(rend, canvas) {
    renderer = rend; dom = canvas;
    camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
    applyPosition();
    bind();
    return api;
  }
  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function applyPosition() {
    const sp = Math.sin(phi), cp = Math.cos(phi);
    camera.position.set(dist * sp * Math.sin(theta), dist * cp + 1.35, dist * sp * Math.cos(theta));
    camera.lookAt(0, 1.45 + focusK * 0.0, 0);
  }
  function bind() {
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('dblclick', resetView);
    // multi-touch pinch
    dom.addEventListener('touchstart', onTouch);
    dom.addEventListener('touchmove', onTouch, { passive: false });
    dom.addEventListener('touchend', onTouchEnd);
  }
  let pointers = {};
  function onDown(e) {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    const n = Object.keys(pointers).length;
    if (n === 1) {
      dragStart = { x: e.clientX, y: e.clientY, moved: 0 };
      thetaV = 0; phiV = 0;
    } else dragStart = null;
    idleSpin = 0;
  }
  function onMove(e) {
    if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    const ids = Object.keys(pointers);
    if (ids.length >= 2) {
      // pinch zoom
      const a = pointers[ids[0]], b = pointers[ids[1]];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart > 0) {
        dist = U.clamp(dist * (pinchStart / Math.max(d, 1)), minDist, maxDist);
      }
      pinchStart = d;
      applyPosition();
      return;
    }
    if (dragStart && pointers[e.pointerId]) {
      const dx = e.clientX - pointers[e.pointerId].x;
      const dy = e.clientY - pointers[e.pointerId].y;
      dragStart.moved += Math.abs(dx) + Math.abs(dy);
      const k = 0.0075 * Math.min(dist / 6, 1.4);
      thetaV = dx * k; phiV = dy * k;
      theta -= thetaV;
      phi = U.clamp(phi - phiV, 0.28, 2.75);
      applyPosition();
    }
  }
  function onUp(e) {
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2) pinchStart = 0;
    if (dragStart && dragStart.moved < 9) {
      // тап: пикинг жителя или сброс фокуса
      const now = performance.now();
      if (now - lastTap < 280) { resetView(); }
      else {
        lastTap = now;
        WJ.Bus.emit('tap', { x: e.clientX, y: e.clientY });
      }
    }
    dragStart = null;
    idleSpin = 0.02;
  }
  function onWheel(e) {
    e.preventDefault();
    dist = U.clamp(dist * (1 + (e.deltaY > 0 ? 0.09 : -0.09)), minDist, maxDist);
    applyPosition();
  }
  function onTouch(e) {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchStart = pinchStart || d;
    }
  }
  function onTouchEnd() { pinchStart = 0; }

  function resetView() {
    focusing = false; focusTarget = null;
    dist = 6.4; theta = 0.6; phi = 1.25;
    applyPosition();
    WJ.Bus.emit('camera:reset');
  }
  // Плавный фокус на жителе: приблизить камеру и повернуть к точке
  function focusOn(worldPos) {
    focusing = true; focusTarget = worldPos ? worldPos.clone ? worldPos.clone() : new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z) : null;
  }
  function focusOff() { focusing = false; focusTarget = null; }

  function frame(dt) {
    // инерция
    if (!dragStart) {
      theta += thetaV; phi = U.clamp(phi + phiV, 0.28, 2.75);
      thetaV *= Math.pow(0.02, dt); phiV *= Math.pow(0.02, dt);
      // ленивое вращение в покое
      theta += idleSpin * dt * 0.4;
    }
    // фокус: летим к точке
    if (focusing && focusTarget) {
      focusK = U.move(focusK, 1, dt * 1.4);
      const target = focusTarget;
      const camTo = new THREE.Vector3().lerpVectors(camera.position, target, focusK * 0.55);
      camera.position.lerp(camTo, Math.min(1, dt * 3));
      camera.lookAt(new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 1.45, 0), target, focusK));
    } else {
      focusK = U.move(focusK, 0, dt * 2);
      applyPosition();
    }
  }

  const api = {
    init, resize, frame, resetView, focusOn, focusOff,
    get camera() { return camera; },
    get focusK() { return focusK; },
    get dist() { return dist; },
    setDist: function (d) { dist = U.clamp(d, minDist, maxDist); applyPosition(); },
  };
  return api;
})();
