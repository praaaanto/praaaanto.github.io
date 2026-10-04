/* Hero specimen: atoms settle from random substitution into discrete precipitates */
(function () {
  var SITE = window.SITE, reduce = SITE.reduce, pointer = SITE.pointer;
  var canvas = document.getElementById('atoms'), ctx = canvas.getContext('2d');
  var btnR = document.getElementById('btn-random'), btnC = document.getElementById('btn-cluster'), readout = document.getElementById('readout');
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function inCube() { return [rnd() * 1.7 - 0.85, rnd() * 1.7 - 0.85, rnd() * 1.7 - 0.85]; }
  function inBall(c, r) {
    var x, y, z;
    do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + y * y + z * z > 1);
    var k = r * Math.cbrt(rnd()), n = Math.sqrt(x * x + y * y + z * z) || 1;
    return [c[0] + x / n * k, c[1] + y / n * k, c[2] + z / n * k];
  }
  var small = innerWidth < 640, atoms = [];
  for (var i = 0, nT = small ? 140 : 230; i < nT; i++) { var p0 = inCube(); atoms.push({ t: 0, a: p0, b: p0 }); }
  var per = small ? 16 : 22;
  [[-0.45, -0.35, 0.3], [0.4, -0.5, -0.35], [0.1, 0.45, 0.45]].forEach(function (c) { for (var j = 0; j < per; j++) atoms.push({ t: 1, a: inCube(), b: inBall(c, 0.2) }); });
  [[-0.5, 0.4, -0.4], [0.5, 0.25, 0.1]].forEach(function (c) { for (var j = 0; j < per; j++) atoms.push({ t: 2, a: inCube(), b: inBall(c, 0.2) }); });
  var corners = [], edges = [];
  [-0.95, 0.95].forEach(function (x) { [-0.95, 0.95].forEach(function (y) { [-0.95, 0.95].forEach(function (z) { corners.push([x, y, z]); }); }); });
  for (var a1 = 0; a1 < 8; a1++) for (var a2 = a1 + 1; a2 < 8; a2++) {
    var diff = 0; for (var k = 0; k < 3; k++) if (corners[a1][k] !== corners[a2][k]) diff++;
    if (diff === 1) edges.push([corners[a1], corners[a2]]);
  }
  var colors, edgeStyle, tinAlpha;
  function setColors() { var t = SITE.tokens(); colors = [t.tin, t.silver, t.copper]; edgeStyle = 'rgba(' + t.line + ',' + (t.dark ? 0.5 : 0.9) + ')'; tinAlpha = t.dark ? 0.7 : 0.85; }
  var radii = [2.1, 4.6, 4.6], mix = reduce ? 1 : 0, target = 1, angle = 0.6, w = 0, h = 0, running = true, visible = true, tiltX = 0, tiltY = 0;
  function resize() {
    var dpr = Math.min(devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
    w = r.width; h = r.height; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  }
  function project(p) {
    var ang = angle + tiltY, ca = Math.cos(ang), sa = Math.sin(ang);
    var x = p[0] * ca + p[2] * sa, z = -p[0] * sa + p[2] * ca, y = p[1];
    var tl = 0.38 + tiltX, ct = Math.cos(tl), st = Math.sin(tl), y2 = y * ct - z * st, z2 = y * st + z * ct;
    var s = 4.6 / (4.6 + z2), scale = Math.min(w, h) * 0.26;
    return { x: w / 2 + x * scale * s, y: h / 2 + 18 + y2 * scale * s, z: z2, s: s };
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function draw() {
    ctx.clearRect(0, 0, w, h); ctx.lineWidth = 1; ctx.strokeStyle = edgeStyle;
    edges.forEach(function (e) { var a = project(e[0]), b = project(e[1]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    var kk = ease(mix);
    var list = atoms.map(function (at) { var q = project([at.a[0] + (at.b[0] - at.a[0]) * kk, at.a[1] + (at.b[1] - at.a[1]) * kk, at.a[2] + (at.b[2] - at.a[2]) * kk]); q.t = at.t; return q; });
    list.sort(function (a, b) { return b.z - a.z; });
    list.forEach(function (q) {
      var depth = Math.max(0.35, Math.min(1, 0.75 - q.z * 0.35));
      ctx.beginPath(); ctx.arc(q.x, q.y, radii[q.t] * q.s, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + colors[q.t] + ',' + (q.t === 0 ? depth * tinAlpha : depth) + ')'; ctx.fill();
    });
  }
  var last = 0;
  function frame(ts) {
    if (!running) return;
    var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0; last = ts;
    angle += dt * 0.12;
    if (pointer.active) {
      var r = canvas.getBoundingClientRect();
      var nx = Math.max(-1, Math.min(1, (pointer.x - r.left) / r.width - 0.5)), ny = Math.max(-1, Math.min(1, (pointer.y - r.top) / r.height - 0.5));
      tiltY += (nx * 0.5 - tiltY) * 0.05; tiltX += (ny * 0.25 - tiltX) * 0.05;
    }
    if (mix !== target) { var step = dt / 2.2; mix = target > mix ? Math.min(target, mix + step) : Math.max(target, mix - step); }
    draw(); requestAnimationFrame(frame);
  }
  function setTarget(t) {
    target = t;
    btnR.setAttribute('aria-pressed', t === 0 ? 'true' : 'false'); btnC.setAttribute('aria-pressed', t === 1 ? 'true' : 'false');
    readout.textContent = t === 1 ? 'Model: precipitates' : 'Model: random';
    if (reduce) { mix = t; draw(); }
  }
  btnR.addEventListener('click', function () { setTarget(0); });
  btnC.addEventListener('click', function () { setTarget(1); });
  function start() { if (reduce) return; if (!running && visible && !document.hidden) { running = true; last = 0; requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', function () { document.hidden ? (running = false) : start(); });
  document.addEventListener('themechange', function () { setColors(); draw(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? start() : (running = false); }).observe(canvas);
  addEventListener('resize', resize);
  setColors(); resize();
  if (reduce) { running = false; draw(); }
  else { target = 0; requestAnimationFrame(frame); setTimeout(function () { setTarget(1); }, 900); }
})();
