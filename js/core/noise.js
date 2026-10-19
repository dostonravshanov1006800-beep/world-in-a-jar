// FILE: js/core/noise.js
// 3D simplex-шум + fbm, детерминированный по seed.
WJ.Noise = (function () {
  const F3 = 1 / 3, G3 = 1 / 6;
  const grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];
  function create(seed) {
    const rng = WJ.Rng.create(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = rng.int(0, i);
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const perm = new Uint8Array(512), permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }

    function simplex3(xin, yin, zin) {
      let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0)      { i1=1;j1=0;k1=0; i2=1;j2=1;k2=0; }
        else if (x0 >= z0) { i1=1;j1=0;k1=0; i2=1;j2=0;k2=1; }
        else               { i1=0;j1=0;k1=1; i2=1;j2=0;k2=1; }
      } else {
        if (y0 < z0)       { i1=0;j1=0;k1=1; i2=0;j2=1;k2=1; }
        else if (x0 < z0)  { i1=0;j1=1;k1=0; i2=0;j2=1;k2=1; }
        else               { i1=0;j1=1;k1=0; i2=1;j2=1;k2=0; }
      }
      const x1 = x0 - i1 + G3,   y1 = y0 - j1 + G3,   z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
      const x3 = x0 - 1 + 3*G3,  y3 = y0 - 1 + 3*G3,  z3 = z0 - 1 + 3*G3;
      const ii = i & 255, jj = j & 255, kk = k & 255;
      let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
      if (t0 > 0) { const gi = permMod12[ii + perm[jj + perm[kk]]]; t0 *= t0; n0 = t0 * t0 * dot(grad3[gi], x0, y0, z0); }
      let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
      if (t1 > 0) { const gi = permMod12[ii+i1 + perm[jj+j1 + perm[kk+k1]]]; t1 *= t1; n1 = t1 * t1 * dot(grad3[gi], x1, y1, z1); }
      let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
      if (t2 > 0) { const gi = permMod12[ii+i2 + perm[jj+j2 + perm[kk+k2]]]; t2 *= t2; n2 = t2 * t2 * dot(grad3[gi], x2, y2, z2); }
      let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
      if (t3 > 0) { const gi = permMod12[ii+1 + perm[jj+1 + perm[kk+1]]]; t3 *= t3; n3 = t3 * t3 * dot(grad3[gi], x3, y3, z3); }
      return 32 * (n0 + n1 + n2 + n3);
    }
    function dot(g, x, y, z) { return g[0]*x + g[1]*y + g[2]*z; }
    function fbm3(x, y, z, oct, lac, gain) {
      oct = oct || 4; lac = lac || 2; gain = gain || 0.5;
      let amp = 0.5, freq = 1, sum = 0, norm = 0;
      for (let o = 0; o < oct; o++) {
        sum += amp * simplex3(x * freq, y * freq, z * freq);
        norm += amp; amp *= gain; freq *= lac;
      }
      return sum / norm;
    }
    return { simplex3, fbm3 };
  }
  return { create };
})();
