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

  // AJIO sorter: make final PDF dependencies resilient across CDN/cache failures.
  var ajioPath = location.pathname.replace(/\/$/, '');
  if (ajioPath === '/ajio-label-invoice-sorter' || ajioPath === '/ajio-label-invoice-sorter-v2') {
    var ajioLibLoading = false;
    var ajioLibLoadedOnce = false;
    var ajioReportTransforming = false;

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

    function tableIndex(headers, label) {
      label = label.toLowerCase();
      for (var i = 0; i < headers.length; i++) {
        if (headers[i].toLowerCase() === label) return i;
      }
      return -1;
    }

    function escHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"]/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
      });
    }

    function cleanText(value) {
      return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    }

    function csvEsc(value) {
      var s = cleanText(value);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function makeStat(label, value) {
      var d = document.createElement('div');
      d.className = 'v2-stat';
      d.innerHTML = '<strong>' + escHtml(value) + '</strong><span>' + escHtml(label) + '</span>';
      return d;
    }

    function transformAjioReport() {
      if (new URLSearchParams(location.search).get('debug') === '1') return;
      if (ajioReportTransforming) return;

      var reportBox = document.getElementById('reportBox');
      var statGrid = document.getElementById('statGrid');
      var reportRows = document.getElementById('reportRows');
      var reportNote = document.getElementById('reportNote');
      if (!reportBox || !statGrid || !reportRows || !reportNote) return;

      var table = reportRows.closest ? reportRows.closest('table') : null;
      if (!table) return;
      var ths = Array.prototype.slice.call(table.querySelectorAll('thead th'));
      if (!ths.length) return;
      var headers = ths.map(function (th) { return cleanText(th.textContent); });
      if (tableIndex(headers, 'Confidence') < 0 || tableIndex(headers, 'Label Customer Text') < 0) return;

      var rows = Array.prototype.slice.call(reportRows.querySelectorAll('tr'));
      if (!rows.length) return;

      ajioReportTransforming = true;
      try {
        var data = rows.map(function (tr) {
          var cells = tr.querySelectorAll('td');
          var get = function (i) { return cells[i] ? cleanText(cells[i].textContent) : ''; };
          return {
            status: get(0),
            confidence: get(1),
            order: get(2),
            skuSource: get(3),
            sku: get(4),
            bag: get(5),
            labelPage: get(7),
            invoice: get(8)
          };
        });

        var labels = data.length;
        var invoices = data.filter(function (r) { return r.invoice && r.invoice !== '-'; }).length;
        var manual = data.filter(function (r) { return r.confidence === 'UNSAFE'; }).length;
        var matched = labels - manual;
        var missingBag = data.filter(function (r) { return r.confidence !== 'UNSAFE' && r.sku && r.sku !== '-' && (!r.bag || r.bag === '-'); }).length;
        var excelSku = data.filter(function (r) { return String(r.skuSource).toLowerCase() === 'excel'; }).length;

        var issues = data.filter(function (r) {
          return r.confidence === 'UNSAFE' || !r.sku || r.sku === '-' || !r.invoice || r.invoice === '-' || !r.bag || r.bag === '-';
        });

        var heading = reportBox.querySelector('h2.title');
        if (heading) heading.textContent = 'Packing Check';

        statGrid.innerHTML = '';
        [
          ['Labels', labels],
          ['Invoices', invoices],
          ['Matched', matched],
          ['Manual Check', manual],
          ['Missing Bag Barcode', missingBag],
          ['Excel SKU', excelSku]
        ].forEach(function (pair) { statGrid.appendChild(makeStat(pair[0], pair[1])); });

        var thead = table.querySelector('thead');
        if (thead) thead.innerHTML = '<tr><th>Status</th><th>Order</th><th>SKU</th><th>Bag Barcode</th><th>Label Page</th><th>Invoice Page</th><th>Action Needed</th></tr>';

        reportRows.innerHTML = '';
        var csvRows = [['Status', 'Order', 'SKU', 'Bag Barcode', 'Label Page', 'Invoice Page', 'Action Needed']];

        issues.forEach(function (r) {
          var action = '';
          var label = 'CHECK';
          var cls = 'warn';
          if (r.confidence === 'UNSAFE') { action = 'Manual check required before packing.'; label = 'MANUAL CHECK'; cls = 'bad'; }
          else if (!r.sku || r.sku === '-') { action = 'SKU not found. Check Excel or invoice.'; cls = 'bad'; }
          else if (!r.invoice || r.invoice === '-') { action = 'Invoice missing. Check label-invoice pair.'; cls = 'bad'; }
          else if (!r.bag || r.bag === '-') { action = 'Bag barcode missing in Excel. Label generated with SKU only.'; }
          else { action = 'Check once before packing.'; }

          var invPage = '-';
          var m = String(r.invoice || '').match(/Page\s+\d+/i);
          if (m) invPage = m[0].replace(/Page\s+/i, '');

          var tr = document.createElement('tr');
          tr.innerHTML = '<td class="' + cls + '">' + escHtml(label) + '</td>' +
            '<td class="mono">' + escHtml(r.order || '-') + '</td>' +
            '<td>' + escHtml(r.sku || '-') + '</td>' +
            '<td class="mono">' + escHtml(r.bag || '-') + '</td>' +
            '<td>' + escHtml(r.labelPage || '-') + '</td>' +
            '<td>' + escHtml(invPage) + '</td>' +
            '<td>' + escHtml(action) + '</td>';
          reportRows.appendChild(tr);
          csvRows.push([label, r.order || '-', r.sku || '-', r.bag || '-', r.labelPage || '-', invPage, action]);
        });

        var tableWrap = reportBox.querySelector('.v2-table-wrap');
        if (tableWrap) tableWrap.style.display = issues.length ? 'block' : 'none';
        reportNote.textContent = issues.length ? 'Only rows that need attention are shown. Matching details are hidden for privacy and simplicity.' : 'All labels matched successfully. Final PDF is ready.';
        window.__AJIO_PUBLIC_CSV = csvRows.map(function (row) { return row.map(csvEsc).join(','); }).join('\n');
      } finally {
        setTimeout(function () { ajioReportTransforming = false; }, 0);
      }
    }

    function installAjioReportObserver() {
      if (window.__AJIO_REPORT_OBSERVER_INSTALLED) return;
      window.__AJIO_REPORT_OBSERVER_INSTALLED = true;
      var run = function () { setTimeout(transformAjioReport, 30); };
      document.addEventListener('click', function (ev) {
        if (ev.target && ev.target.id === 'runBtn') window.__AJIO_PUBLIC_CSV = '';
      }, true);
      if (document.body) {
        new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
      }
      run();
    }

    function countMissingBagRowsFromReport() {
      var tbody = document.getElementById('reportRows');
      var table = tbody && tbody.closest ? tbody.closest('table') : null;
      if (!tbody || !table) return 0;
      var headers = Array.prototype.slice.call(table.querySelectorAll('thead th')).map(function (th) {
        return (th.textContent || '').trim();
      });
      var actionIdx = tableIndex(headers, 'Action Needed');
      var statusIdx = tableIndex(headers, 'Status');
      var skuIdx = tableIndex(headers, 'SKU');
      var bagIdx = tableIndex(headers, 'Bag Barcode');
      var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
      var count = 0;
      rows.forEach(function (tr) {
        var cells = tr.querySelectorAll('td');
        if (!cells || !cells.length) return;
        if (actionIdx >= 0 && cells[actionIdx]) {
          var action = (cells[actionIdx].textContent || '').trim().toLowerCase();
          if (action.indexOf('bag barcode missing') >= 0) count++;
          return;
        }
        if (statusIdx < 0 || skuIdx < 0 || bagIdx < 0) return;
        var status = (cells[statusIdx].textContent || '').trim().toUpperCase();
        var sku = (cells[skuIdx].textContent || '').trim();
        var bag = (cells[bagIdx].textContent || '').trim();
        if (status !== 'ERROR' && sku && sku !== '-' && (!bag || bag === '-')) count++;
      });
      return count;
    }

    function installAjioNoOrderFallbackPatch() {
      if (!window.PDFLib || !PDFLib.PDFPage || !PDFLib.PDFPage.prototype || PDFLib.PDFPage.prototype.__ajioNoOrderFallbackPatch) return;

      window.__AJIO_MISSING_BAG_MARKS = window.__AJIO_MISSING_BAG_MARKS || 0;
      window.__AJIO_MISSING_BAG_WARNED = false;

      var originalDrawText = PDFLib.PDFPage.prototype.drawText;
      PDFLib.PDFPage.prototype.drawText = function (text) {
        var value = String(text == null ? '' : text).trim().toUpperCase();
        if (/^FN\d{8,}$/.test(value)) {
          window.__AJIO_MISSING_BAG_MARKS = (window.__AJIO_MISSING_BAG_MARKS || 0) + 1;
          return this;
        }
        return originalDrawText.apply(this, arguments);
      };
      PDFLib.PDFPage.prototype.__ajioNoOrderFallbackPatch = true;

      if (window.URL && !window.URL.__ajioMissingBagWarningPatch) {
        var originalCreateObjectURL = window.URL.createObjectURL.bind(window.URL);
        window.URL.createObjectURL = function (obj) {
          if (obj && String(obj.type || '').indexOf('text/csv') >= 0 && window.__AJIO_PUBLIC_CSV) {
            obj = new Blob([window.__AJIO_PUBLIC_CSV], { type: 'text/csv;charset=utf-8' });
          }
          if (obj && obj.type === 'application/pdf') {
            var count = Math.max(window.__AJIO_MISSING_BAG_MARKS || 0, countMissingBagRowsFromReport());
            if (count > 0 && !window.__AJIO_MISSING_BAG_WARNED) {
              window.__AJIO_MISSING_BAG_WARNED = true;
              alert('Warning: ' + count + ' order(s) do not have Forward Consignment Bag Barcode in Excel. These labels are generated without bag barcode marking.');
            }
            window.__AJIO_MISSING_BAG_MARKS = 0;
          }
          return originalCreateObjectURL(obj);
        };
        window.URL.__ajioMissingBagWarningPatch = true;
      }
    }

    async function ensureAjioLibraries() {
      if (!window.PDFLib) {
        try { await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'PDFLib'); }
        catch (e1) { await loadScriptOnce('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'PDFLib'); }
      }
      if (!window.XLSX) {
        try { await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX'); }
        catch (e2) { await loadScriptOnce('https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js', 'XLSX'); }
      }
      if (!window.Tesseract) {
        try { await loadScriptOnce('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'Tesseract'); }
        catch (e3) { /* OCR is optional; barcode/text/customer matching can still run. */ }
      }
      installAjioNoOrderFallbackPatch();
      installAjioReportObserver();
      ajioLibLoadedOnce = !!(window.PDFLib && window.XLSX);
      return ajioLibLoadedOnce;
    }

    document.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.id === 'runBtn' ? ev.target : null;
      if (!btn) return;
      window.__AJIO_MISSING_BAG_MARKS = 0;
      window.__AJIO_MISSING_BAG_WARNED = false;
      window.__AJIO_PUBLIC_CSV = '';
      installAjioNoOrderFallbackPatch();
      installAjioReportObserver();
      if (ajioLibLoadedOnce || (window.PDFLib && window.XLSX)) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      if (ajioLibLoading) return;
      ajioLibLoading = true;
      var statusEl = document.getElementById('status');
      if (statusEl) statusEl.textContent = 'Loading PDF/Excel libraries...';
      ensureAjioLibraries().then(function () {
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
      document.addEventListener('DOMContentLoaded', function () { ensureAjioLibraries().catch(function () {}); installAjioReportObserver(); });
    } else {
      ensureAjioLibraries().catch(function () {});
      installAjioReportObserver();
    }
  }
})();
