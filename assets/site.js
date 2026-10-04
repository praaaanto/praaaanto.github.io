/* Usman Gani Pranto, shared site behaviour */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var SITE = window.SITE = { reduce: reduce, pointer: { x: window.innerWidth * 0.7, y: window.innerHeight * 0.35, active: false } };

  /* Colour tokens, read from CSS so canvases follow the theme */
  function hexToRgb(h) {
    h = h.trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
  }
  SITE.tokens = function () {
    var cs = getComputedStyle(root);
    return {
      copper: hexToRgb(cs.getPropertyValue('--copper')),
      silver: hexToRgb(cs.getPropertyValue('--silver')),
      tin: hexToRgb(cs.getPropertyValue('--tin')),
      line: hexToRgb(cs.getPropertyValue('--line-2')),
      dark: root.getAttribute('data-theme') === 'dark'
    };
  };

  /* 1. Theme toggle: light is primary, choice is remembered, change reveals as a circle from the button */
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      if (reduce) { applyTheme(next); return; }
      if (document.startViewTransition) {
        var r = btn.getBoundingClientRect();
        var x = r.left + r.width / 2, y = r.top + r.height / 2;
        var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        var vt = document.startViewTransition(function () { applyTheme(next); });
        vt.ready.then(function () {
          root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 700, easing: 'cubic-bezier(.2,.7,.1,1)', pseudoElement: '::view-transition-new(root)' });
        });
      } else {
        root.classList.add('theme-fade');
        applyTheme(next);
        setTimeout(function () { root.classList.remove('theme-fade'); }, 600);
      }
    });
  });

  /* 2. Split headings into words for the rising reveal */
  document.querySelectorAll('[data-split]').forEach(function (el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map(function (w, i) {
      return '<span class="w" aria-hidden="true"><span style="transition-delay:' + (i * 70) + 'ms">' + w + '</span></span>';
    }).join(' ');
  });

  /* 3. Reveal on scroll with a gentle stagger */
  var revealables = document.querySelectorAll('[data-reveal],[data-split],.giant');
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.hasAttribute('data-reveal') && el.parentElement) {
          var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.hasAttribute('data-reveal'); });
          el.style.transitionDelay = Math.min(Math.max(0, sibs.indexOf(el)), 4) * 80 + 'ms';
        }
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* 4. Scroll spy for in-page navigation */
  var links = {};
  document.querySelectorAll('.nav a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if (Object.keys(links).length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && links[e.target.id]) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          links[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* 5. Scroll progress */
  var bar = document.querySelector('.progress'), ticking = false;
  function onScroll() {
    if (ticking || !bar) return; ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')';
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* 6. Cursor ring, soft glow */
  var pointer = SITE.pointer;
  var ring = document.querySelector('.cursor-ring'), dot = document.querySelector('.cursor-dot'), glow = document.querySelector('.glow');
  var rx = pointer.x, ry = pointer.y, gx = pointer.x, gy = pointer.y;
  addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    if (finePointer && !reduce) document.body.classList.add('has-cursor');
  }, { passive: true });
  document.addEventListener('mouseleave', function () { pointer.active = false; document.body.classList.remove('has-cursor'); });
  addEventListener('pointerdown', function () { document.body.classList.add('cursor-down'); });
  addEventListener('pointerup', function () { document.body.classList.remove('cursor-down'); });
  document.addEventListener('mouseover', function (e) {
    var hit = e.target.closest && e.target.closest('a,button,summary,input,[data-hover]');
    document.body.classList.toggle('cursor-hover', !!hit);
  });
  function cursorLoop() {
    rx += (pointer.x - rx) * 0.18; ry += (pointer.y - ry) * 0.18;
    gx += (pointer.x - gx) * 0.06; gy += (pointer.y - gy) * 0.06;
    if (dot) dot.style.transform = 'translate(' + pointer.x + 'px,' + pointer.y + 'px)';
    if (ring) ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
    if (glow) glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';
    requestAnimationFrame(cursorLoop);
  }
  if (!reduce) requestAnimationFrame(cursorLoop);

  /* 7. Background lattice: atoms vibrate and bulge away from the pointer like the strain field of a precipitate */
  var field = document.getElementById('field');
  if (field) {
    var fctx = field.getContext('2d'), pts = [], fw = 0, fh = 0, fRunning = true, styles = [];
    function setStyles() {
      var t = SITE.tokens(), k = t.dark ? 1 : 1.25;
      styles = ['rgba(' + t.tin + ',' + (0.20 * k) + ')', 'rgba(' + t.tin + ',' + (0.36 * k) + ')', 'rgba(' + t.silver + ',' + (t.dark ? 0.40 : 0.45) + ')', 'rgba(' + t.copper + ',' + (t.dark ? 0.52 : 0.6) + ')'];
    }
    function build() {
      var dpr = Math.min(devicePixelRatio || 1, 1.5);
      fw = innerWidth; fh = innerHeight;
      field.width = Math.round(fw * dpr); field.height = Math.round(fh * dpr);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var s = fw < 640 ? 26 : 30, rowH = s * 0.866; pts = [];
      for (var j = -1, y = -rowH; y < fh + rowH; j++, y += rowH)
        for (var x = (j % 2 ? s / 2 : 0) - s; x < fw + s; x += s) pts.push({ x: x, y: y, p: Math.random() * 6.28, q: Math.random() * 6.28 });
    }
    var bins = [[], [], [], []];
    function draw(t) {
      fctx.clearRect(0, 0, fw, fh);
      var px, py;
      if (pointer.active) { px = pointer.x; py = pointer.y; }
      else { px = fw * (0.62 + 0.22 * Math.sin(t * 0.00011)); py = fh * (0.42 + 0.2 * Math.sin(t * 0.00017 + 1)); }
      var R2 = 2 * 120 * 120, amp = 22, jit = reduce ? 0 : 0.7, tt = t * 0.0016;
      bins[0].length = bins[1].length = bins[2].length = bins[3].length = 0;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy, f = Math.exp(-d2 / R2), d = Math.sqrt(d2) || 1;
        var b = f > 0.55 ? 3 : f > 0.25 ? 2 : f > 0.06 ? 1 : 0;
        bins[b].push(p.x + dx / d * amp * f + jit * Math.sin(tt + p.p), p.y + dy / d * amp * f + jit * Math.cos(tt * 1.1 + p.q));
      }
      for (var k = 0; k < 4; k++) {
        var arr = bins[k], sz = k === 3 ? 2.6 : k === 2 ? 2.2 : 1.6;
        fctx.fillStyle = styles[k]; fctx.beginPath();
        for (var m = 0; m < arr.length; m += 2) fctx.rect(arr[m] - sz / 2, arr[m + 1] - sz / 2, sz, sz);
        fctx.fill();
      }
    }
    function loop(t) { if (!fRunning) return; draw(t); requestAnimationFrame(loop); }
    setStyles(); build();
    if (reduce) { draw(0); fRunning = false; } else requestAnimationFrame(loop);
    var lastW = innerWidth, lastH = innerHeight, rt;
    addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        /* Phones resize the viewport as the address bar slides; only rebuild on a real change */
        if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 160) return;
        lastW = innerWidth; lastH = innerHeight; build(); if (reduce) draw(0);
      }, 180);
    });
    document.addEventListener('themechange', function () { setStyles(); if (reduce) draw(0); });
    document.addEventListener('visibilitychange', function () {
      if (reduce) return;
      if (document.hidden) fRunning = false; else if (!fRunning) { fRunning = true; requestAnimationFrame(loop); }
    });
  }

  /* 8. Small utilities */
  var copyBtn = document.getElementById('copy');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var email = copyBtn.getAttribute('data-email');
    if (navigator.clipboard) navigator.clipboard.writeText(email).then(function () {
      copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1800);
    }, function () {});
  });
  var totop = document.getElementById('totop');
  if (totop) totop.addEventListener('click', function () { scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* 9. Mobile menu: a full-screen sheet built from the page's own navigation */
  var navEl = document.querySelector('.top .nav'), toggleEl = document.querySelector('.top .theme-toggle');
  if (navEl && toggleEl) {
    var mb = document.createElement('button');
    mb.type = 'button'; mb.className = 'menu-btn'; mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-controls', 'menu-sheet');
    mb.innerHTML = '<i aria-hidden="true"></i>Menu';
    toggleEl.insertAdjacentElement('afterend', mb);
    var sheet = document.createElement('div');
    sheet.className = 'menu-sheet'; sheet.id = 'menu-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Site menu');
    var list = document.createElement('nav'); list.setAttribute('aria-label', 'Menu');
    Array.prototype.forEach.call(navEl.querySelectorAll('a'), function (a, i) {
      var l = document.createElement('a'); l.href = a.getAttribute('href');
      l.innerHTML = '<small>' + String(i + 1).padStart(2, '0') + '</small>' + a.textContent;
      l.style.transitionDelay = (60 + i * 45) + 'ms';
      list.appendChild(l);
    });
    sheet.appendChild(list);
    var foot = document.createElement('div'); foot.className = 'sheet-foot';
    var cssLink = document.querySelector('link[href$="site.css"]'), cvBase = cssLink ? cssLink.getAttribute('href').replace('site.css', '') : 'assets/';
    foot.innerHTML = '<a href="' + cvBase + 'Usman_Gani_Pranto_CV.pdf" target="_blank" rel="noopener">CV (PDF)</a><a href="mailto:praanto17@gmail.com">Email</a><a href="https://www.linkedin.com/in/praaaanto/" rel="noopener">LinkedIn</a><a href="https://orcid.org/0009-0005-6870-2118" rel="noopener">ORCID</a>';
    sheet.appendChild(foot);
    document.body.appendChild(sheet);
    function setMenu(open) {
      sheet.classList.toggle('open', open); document.body.classList.toggle('menu-open', open);
      mb.setAttribute('aria-expanded', open ? 'true' : 'false');
      mb.lastChild.textContent = open ? 'Close' : 'Menu';
      if (open) { var cur = list.querySelector('a'); if (cur) cur.focus({ preventScroll: true }); }
    }
    mb.addEventListener('click', function () { setMenu(!sheet.classList.contains('open')); });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet.classList.contains('open')) { setMenu(false); mb.focus(); } });
    addEventListener('resize', function () { if (innerWidth > 1100 && sheet.classList.contains('open')) setMenu(false); });
  }
})();
