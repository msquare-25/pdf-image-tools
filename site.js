// site.js — tabs highlight, scroll arrows, auto-center active
(function () {
  // ---- Active tab highlight (supports /, /tool, /tool/index.html) ----
  var cur = location.pathname.replace(/\/index\.html?$/,'/').toLowerCase();
  var links = document.querySelectorAll('.tool-tabs a');

  links.forEach(function (a) {
    var p = new URL(a.getAttribute('href') || '/', location.href)
              .pathname.replace(/\/index\.html?$/,'/').toLowerCase();

    if (p === cur || p + '.html' === cur || p === cur + '.html') {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page'); // also set ARIA

      // Auto-center active tab inside scroller
      var wrapEl = document.querySelector('.tool-tabs');
      if (wrapEl) {
        var dx = a.offsetLeft - (wrapEl.clientWidth/2 - a.clientWidth/2);
        wrapEl.scrollTo({ left: Math.max(0, dx), behavior: 'smooth' });
      }
    }
  });

  // ---- Scroll arrows logic ----
  var wrap    = document.querySelector('.tool-tabs-wrap');
  var scroller= document.querySelector('.tool-tabs');
  var btnL    = document.querySelector('.tool-left');
  var btnR    = document.querySelector('.tool-right');
  if (!wrap || !scroller || !btnL || !btnR) return;

  function updateArrows() {
    var max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    var hasOverflow = max > 1;
    wrap.classList.toggle('no-overflow', !hasOverflow);
    if (!hasOverflow) return;
    btnL.disabled = scroller.scrollLeft <= 2;
    btnR.disabled = scroller.scrollLeft >= max - 2;
  }

  function step(dir) {
    var amount = Math.max(280, Math.round(scroller.clientWidth * 0.6));
    scroller.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  btnL.addEventListener('click', function(){ step(-1); });
  btnR.addEventListener('click', function(){ step(1);  });
  scroller.addEventListener('scroll', updateArrows, { passive: true });

  // Keyboard: arrow left/right scrolls tabs
  scroller.addEventListener('keydown', function(e){
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight'){ e.preventDefault(); step(1);  }
  });

  // Convert vertical wheel to horizontal (desktop)
  scroller.addEventListener('wheel', function(e){
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scroller.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  // Initial + when layout changes
  updateArrows();
  if ('ResizeObserver' in window) {
    new ResizeObserver(updateArrows).observe(scroller);
  } else {
    window.addEventListener('resize', updateArrows);
  }

  // Mark home for CSS toggles (optional)
  if (location.pathname === "/" || location.pathname.endsWith("/index.html")) {
    document.documentElement.classList.add("is-home");
  }
})();
