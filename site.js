// site.js — active tab, scrollable tabs, arrows, mobile polish
(function () {
  // ------------------------------
  // 1) Active tab highlight
  // ------------------------------
  var curPath = location.pathname.replace(/\/index\.html?$/i, '/').toLowerCase();
  var tabLinks = document.querySelectorAll('.tool-tabs a');

  tabLinks.forEach(function (a) {
    var href = a.getAttribute('href') || '/';
    var p = new URL(href, location.href).pathname
              .replace(/\/index\.html?$/i, '/')
              .toLowerCase();

    // match /tool, /tool/ and /tool.html patterns
    if (p === curPath || p + '.html' === curPath || p === curPath + '.html') {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');

      // auto-center the active tab when available
      var scrollerEl = document.querySelector('.tool-tabs');
      if (scrollerEl) {
        var box = a.getBoundingClientRect();
        var wrapBox = scrollerEl.getBoundingClientRect();
        var delta = (box.left + box.width / 2) - (wrapBox.left + wrapBox.width / 2);
        scrollerEl.scrollLeft += delta;
      }
    }
  });

  // ------------------------------
  // 2) Elements
  // ------------------------------
  var wrap    = document.querySelector('.tool-tabs-wrap');
  var scroller= document.querySelector('.tool-tabs');
  var btnL    = document.querySelector('.tool-left');
  var btnR    = document.querySelector('.tool-right');

  // if not present on this page, nothing to do
  if (!wrap || !scroller) {
    // Mark home for CSS toggles (optional)
    if (location.pathname === '/' || /\/index\.html?$/i.test(location.pathname)) {
      document.documentElement.classList.add('is-home');
    }
    return;
  }

  // ------------------------------
  // 3) Ensure last tab never gets clipped
  // ------------------------------
  if (!scroller.querySelector('.end-spacer')) {
    var spacer = document.createElement('span');
    spacer.className = 'end-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.display = 'inline-block';
    spacer.style.width = '24px';
    spacer.style.height = '1px';
    scroller.appendChild(spacer);
  }

  // ------------------------------
  // 4) Arrow visibility on mobile
  // ------------------------------
  function toggleArrowsForMobile() {
    var small = window.matchMedia('(max-width: 540px)').matches;
    if (btnL) btnL.style.display = small ? 'none' : '';
    if (btnR) btnR.style.display = small ? 'none' : '';
  }
  toggleArrowsForMobile();
  window.addEventListener('resize', toggleArrowsForMobile);

  // ------------------------------
  // 5) Arrow enable/disable state
  // ------------------------------
  function updateArrows() {
    if (!btnL || !btnR) return;
    var max = scroller.scrollWidth - scroller.clientWidth - 1; // fudge for subpixels
    var x = scroller.scrollLeft;

    btnL.disabled = x <= 0;
    btnR.disabled = x >= max;

    // optional: subtle opacity when disabled
    btnL.style.opacity = btnL.disabled ? '0.4' : '1';
    btnR.style.opacity = btnR.disabled ? '0.4' : '1';
  }

  // ------------------------------
  // 6) Arrow click handlers (desktop)
  // ------------------------------
  function step(dir) {
    // scroll ~ one card width or 60% of viewport
    var card = scroller.querySelector('a');
    var stepBy = Math.max(scroller.clientWidth * 0.6, (card ? card.getBoundingClientRect().width : 160) * 2);
    scroller.scrollBy({ left: dir * stepBy, behavior: 'smooth' });
  }

  if (btnL) btnL.addEventListener('click', function () { step(-1); });
  if (btnR) btnR.addEventListener('click', function () { step(1); });

  // keyboard support (focus on scroller area)
  scroller.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight'){ e.preventDefault(); step(1);  }
  });

  // ------------------------------
  // 7) Keep arrows updated
  // ------------------------------
  scroller.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);

  if ('ResizeObserver' in window) {
    new ResizeObserver(updateArrows).observe(scroller);
  }
  // initial state
  updateArrows();

  // ------------------------------
  // 8) Mark home for CSS toggles (optional)
  // ------------------------------
  if (location.pathname === '/' || /\/index\.html?$/i.test(location.pathname)) {
    document.documentElement.classList.add('is-home');
  }
})();

