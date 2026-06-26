(function () {
  const ORIGIN = 'https://pdfimagelab.com';
  const OG_IMAGE = ORIGIN + '/og/default.png';
  const path = (location.pathname || '/').replace(/\/$/, '') || '/';
  const PAGES = {
    '/': { title: 'PDF & Image Tools — Fast, Private, Free', desc: 'All-in-one PDF & image utilities that run entirely in your browser. No uploads.' },
    '/ajio-label-invoice-sorter': { title: 'AJIO Label Invoice Sorter — Direct Barcode Match', desc: 'AJIO label and invoice matching using label AWB and order barcodes only.' }
  };
  const data = PAGES[path] || PAGES['/'];
  const canonicalUrl = ORIGIN + (path === '/' ? '/' : path);
  function metaName(name, content) { let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); } el.content = content; }
  function metaProp(prop, content) { let el = document.querySelector(`meta[property="${prop}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); } el.content = content; }
  function canonical(href) { let el = document.querySelector('link[rel="canonical"]'); if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); } el.href = href; }
  if (data.title) document.title = data.title;
  canonical(canonicalUrl);
  metaName('description', data.desc);
  metaProp('og:title', data.title);
  metaProp('og:description', data.desc);
  metaProp('og:url', canonicalUrl);
  metaProp('og:type', 'website');
  metaProp('og:image', OG_IMAGE);
  metaName('twitter:card', 'summary_large_image');
  metaName('twitter:title', data.title);
  metaName('twitter:description', data.desc);
  metaName('twitter:image', OG_IMAGE);
  if (path === '/ajio-label-invoice-sorter') {
    const run = () => {
      const only = document.getElementById('onlyMatched');
      if (only) {
        only.checked = false;
        const row = only.closest('label');
        if (row) row.style.display = 'none';
      }
      const note = document.querySelector('.action-box .small.mt-2');
      if (note) note.textContent = 'Output uses direct label AWB / order barcode matching only. No sequence guessing.';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }
})();
