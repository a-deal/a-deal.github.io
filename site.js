/* Scroll choreography. No dependencies beyond optional Lenis (smooth scroll). */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    document.documentElement.classList.add('static-page');
    return;
  }
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* split words and chars once */
  document.querySelectorAll('[data-words]').forEach(function (el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
  });
  document.querySelectorAll('[data-chars]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w) {
      return '<span style="display:inline-block;white-space:nowrap">' + w.split('').map(function (c) { return '<span class="c" aria-hidden="true">' + c + '</span>'; }).join('') + '</span>';
    }).join('<span class="sp"></span>');
  });

  /* rise-in on entry */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  document.querySelectorAll('.rise').forEach(function (el) { io.observe(el); });

  /* elements */
  var stats = Array.prototype.slice.call(document.querySelectorAll('.stat'));
  var pin = document.querySelector('.pin');
  var plate = document.querySelector('.plate');
  var plateGlow = document.querySelector('.plate-glow');
  var plateScan = document.querySelector('.plate-scan');
  var arm = document.querySelector('.plate-arm');
  var words = Array.prototype.slice.call(document.querySelectorAll('.plate-text .w'));
  var solve = document.querySelector('.solve');
  var chars = Array.prototype.slice.call(document.querySelectorAll('.chars .c'));
  var navEl = document.getElementById('pillnav');
  var navBtns = Array.prototype.slice.call(document.querySelectorAll('.pill button'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  var sandBlocks = Array.prototype.slice.call(document.querySelectorAll('.theme--sand'));
  var isMobile = function () { return window.innerWidth <= 900; };
  var work = document.querySelector('.work');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.stack .card'));
  var docLinks = Array.prototype.slice.call(document.querySelectorAll('.doc-link'));
  var rots = [-3, 2.5, -2, 3, -2.5];

  var fmt = function (n) { return n.toLocaleString('en-US'); };

  function frame() {
    var vh = window.innerHeight;
    var y = window.scrollY;

    /* stat bars: grow as the grid enters, staggered by index */
    stats.forEach(function (s) {
      var r = s.getBoundingClientRect();
      var start = vh * 0.9, end = vh * 0.35;
      var p = clamp((start - r.top) / (start - end), 0, 1);
      var idx = +s.getAttribute('data-index') || 0;
      p = clamp((p - idx * 0.12) / (1 - idx * 0.12), 0, 1);
      var e = ease(p);
      var bar = s.querySelector('.bar');
      var maxH = +s.getAttribute('data-h') || 100;
      if (isMobile()) { s.querySelector('.bar-wrap').style.setProperty('--w', (maxH * e) + '%'); }
      else { bar.style.height = (maxH * e * 0.8) + '%'; }
      s.querySelector('.num').style.opacity = e > 0.18 ? '1' : '0';
      var target = +s.getAttribute('data-target') || 0;
      s.querySelector('.n').textContent = fmt(Math.round(target * e));
    });

    /* Assembly sequence: reveal the scene, sweep the work area, reach, then settle. */
    if (pin && plate) {
      if (!isMobile() && vh >= 700) {
        var pr = pin.getBoundingClientRect();
        var total = Math.max(1, pr.height - vh);
        var p2 = clamp(-pr.top / total, 0, 1);
        var reveal = ease(clamp((p2 + 0.08) / 0.48, 0, 1));
        var approach = ease(clamp(p2 / 0.75, 0, 1));
        plate.style.clipPath = 'inset(0 ' + ((1 - reveal) * 72) + '% 0 0 round 18px)';
        plate.style.transform = 'translate3d(0,' + ((1 - reveal) * 36) + 'px,0) scale(' + (0.94 + 0.06 * approach) + ')';
        plate.style.opacity = String(0.45 + 0.55 * reveal);
        plateGlow.style.opacity = String(0.25 + 0.65 * approach);
        if (arm) {
          var reach = ease(clamp((p2 - 0.12) / 0.4, 0, 1));
          var settle = ease(clamp((p2 - 0.57) / 0.32, 0, 1));
          var ang = -14 + 22 * reach - 8 * settle;
          arm.style.transform = 'rotate(' + ang + 'deg)';
        }
        if (plateScan) {
          var scan = clamp((p2 - 0.12) / 0.65, 0, 1);
          plateScan.style.left = (scan * 100) + '%';
          plateScan.style.opacity = String(Math.sin(scan * Math.PI) * 0.7);
        }
        var lit = Math.floor((0.24 + 0.81 * clamp(p2 / 0.65, 0, 1)) * words.length);
        words.forEach(function (w, i) { w.classList.toggle('on', i < lit); });
      } else {
        plate.style.clipPath = 'none';
        plate.style.transform = 'none';
        plate.style.opacity = '1';
        plateGlow.style.opacity = '0.45';
        if (arm) arm.style.transform = 'none';
        if (plateScan) plateScan.style.opacity = '0';
        words.forEach(function (w) { w.classList.add('on'); });
      }
    }

    /* char reveal */
    if (solve) {
      var sr = solve.getBoundingClientRect();
      var p3 = clamp((vh * 0.85 - sr.top) / (vh * 0.6), 0, 1);
      var litC = Math.floor(p3 * chars.length);
      chars.forEach(function (c, i) { c.classList.toggle('on', i < litC); });
    }

    /* card stack: vertical scroll drives each card in from the right onto the pile */
    if (work && !isMobile()) {
      var wr = work.getBoundingClientRect();
      var total = wr.height - vh;
      var pw = clamp(-wr.top / total, 0, 1);
      var n = cards.length;
      var active = -1;
      cards.forEach(function (c, i) {
        var s0 = (i) / (n + 0.6), s1 = (i + 1) / (n + 0.6);
        var t = clamp((pw - s0) / (s1 - s0), 0, 1);
        var e = ease(t);
        var x = (1 - e) * 110, yv = (1 - e) * 14, r = 10 * (1 - e) + rots[i % rots.length] * e;
        var settle = clamp((pw - s1) / 0.06, 0, 1);
        c.style.transform = 'translate(' + x + 'vw,' + yv + 'vh) rotate(' + r + 'deg) scale(' + (1 - settle * 0.02 * ((n - 1 - i))) + ')';
        c.classList.toggle('landed', t > 0.85);
        if (t > 0.5) active = i;
      });
      docLinks.forEach(function (l, i) { l.classList.toggle('on', i === active); });
    }

    /* pill nav: show after hero, highlight current, invert on sand */
    navEl.classList.toggle('show', y > vh * 0.6);
    var cur = 0;
    sections.forEach(function (sec) { if (sec.getBoundingClientRect().top <= vh * 0.4) cur = +sec.getAttribute('data-nav'); });
    navBtns.forEach(function (b, i) { b.setAttribute('aria-current', i === cur ? 'true' : 'false'); });
    var onSand = sandBlocks.some(function (b) { var r = b.getBoundingClientRect(); return r.top <= 60 && r.bottom > 60; });
    document.body.classList.toggle('is-sand', onSand);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* doc links: jump to the scroll position where that card lands */
  docLinks.forEach(function (l) {
    l.addEventListener('click', function () {
      if (!work) return;
      var i = +l.getAttribute('data-i'), n = cards.length;
      var top = work.getBoundingClientRect().top + window.scrollY;
      var y = top + ((i + 1) / (n + 0.6)) * (work.offsetHeight - window.innerHeight) + 4;
      if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  /* pill nav clicks */
  navBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var t = document.querySelector(b.getAttribute('data-target'));
      if (!t) return;
      if (lenis) lenis.scrollTo(t, { offset: 0, duration: 1.2 });
      else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  document.documentElement.classList.add('enhanced');
})();
