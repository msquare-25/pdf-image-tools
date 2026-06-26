(function () {
  const ORIGIN = 'https://pdfimagelab.com';
  const OG_IMAGE = ORIGIN + '/og/default.png';
  const path = (location.pathname || '/').replace(/\/$/, '') || '/';
  const PAGES = {
    '/': { title: 'PDF & Image Tools — Fast, Private, Free', desc: 'All-in-one PDF & image utilities that run entirely in your browser. No uploads.' },
    '/ajio-label-invoice-sorter': { title: 'AJIO Label Invoice Sorter — SKU & Bag Barcode', desc: 'Sort AJIO labels and invoices by bag barcode, print SKU and bag barcode on labels, and generate one packing-ready PDF in your browser.' }
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
      const s = document.createElement('script');
      s.src = '/assets/ajio-engine-v3.js?v=20260626-2';
      document.body.appendChild(s);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }
})();
