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

  // AJIO V2: make final PDF dependencies resilient across CDN/cache failures.
  if (location.pathname.replace(/\/$/, '') === '/ajio-label-invoice-sorter-v2') {
    var ajioLibLoading = false;
    var ajioLibLoadedOnce = false;

    function loadScriptOnce(src, globalName) {
      return new Promise(function (resolve, reject) {
        if (globalName && window[globalName]) return resolve();
        var existing = document.querySelector('script[data-ajio-lib="' + globalName + '"]');
        if (existing) {
          existing.addEventListener('load', function () { resolve(); }, { once: true });
          existing.addEventListener('error', function () { reject(new Error('Failed: ' + src)); }, { once: true });
          return;
        }
        var s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.defer = false;
        s.setAttribute('data-ajio-lib', globalName || src);
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error('Failed: ' + src)); };
        document.head.appendChild(s);
      });
    }

    async function ensureAjioV2Libraries() {
      if (!window.PDFLib) {
        try { await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'PDFLib'); }
        catch (e1) { await loadScriptOnce('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'PDFLib'); }
      }
      if (!window.XLSX) {
        try { await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX'); }
        catch (e2) { await loadScriptOnce('https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js', 'XLSX'); }
      }
      ajioLibLoadedOnce = !!(window.PDFLib && window.XLSX);
      return ajioLibLoadedOnce;
    }

    document.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.id === 'runBtn' ? ev.target : null;
      if (!btn || ajioLibLoadedOnce || (window.PDFLib && window.XLSX)) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      if (ajioLibLoading) return;
      ajioLibLoading = true;
      var statusEl = document.getElementById('status');
      if (statusEl) statusEl.textContent = 'Loading PDF/Excel libraries...';
      ensureAjioV2Libraries().then(function () {
        ajioLibLoading = false;
        if (statusEl) statusEl.textContent = 'Libraries loaded. Starting generation...';
        setTimeout(function () { btn.click(); }, 60);
      }).catch(function (err) {
        ajioLibLoading = false;
        if (statusEl) statusEl.textContent = 'Library load failed. Check internet/CDN access and refresh.';
        alert('PDF/Excel libraries could not load. Please hard refresh, or try another browser/network.');
        console.error(err);
      });
    }, true);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { ensureAjioV2Libraries().catch(function () {}); });
    } else {
      ensureAjioV2Libraries().catch(function () {});
    }
  }
})();
