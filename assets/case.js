/* Shared case study behaviour: lightbox for [data-gallery] figures, render/photo toggles */
(function () {
  if (!document.getElementById('lb')) return;
  /* Lightbox across all galleries */
  var items = [], lb = document.getElementById('lb'), lbImg = document.getElementById('lb-img'), lbCap = document.getElementById('lb-cap'), at = 0;
  document.querySelectorAll('[data-gallery] figure').forEach(function (fig, i) {
    var img = fig.querySelector('img'), c = fig.querySelector('figcaption');
    items.push({ src: img.getAttribute('src'), alt: img.alt, cap: c ? c.textContent : '' });
    fig.querySelector('button').addEventListener('click', function () { open(i); });
  });
  function open(i) { at = (i + items.length) % items.length; lbImg.src = items[at].src; lbImg.alt = items[at].alt; lbCap.textContent = items[at].cap; if (!lb.open) lb.showModal(); }
  document.getElementById('lb-close').addEventListener('click', function () { lb.close(); });
  document.getElementById('lb-prev').addEventListener('click', function () { open(at - 1); });
  document.getElementById('lb-next').addEventListener('click', function () { open(at + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') open(at - 1); if (e.key === 'ArrowRight') open(at + 1); });
})();

/* Generic render/photo toggle: buttons [data-show="imgId"] inside a .showcase */
(function () {
  document.querySelectorAll('.showcase').forEach(function (sc) {
    var btns = sc.querySelectorAll('[data-show]'); if (!btns.length) return;
    var lab = sc.querySelector('[data-show-label]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) {
          var img = document.getElementById(o.getAttribute('data-show')), on = o === b;
          o.setAttribute('aria-pressed', on ? 'true' : 'false');
          img.hidden = !on; img.style.opacity = on ? 1 : 0;
        });
        if (lab) lab.textContent = b.getAttribute('data-label') || '';
      });
    });
  });
})();
