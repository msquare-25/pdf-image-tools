(function () {
  const ORIGIN = 'https://pdfimagelab.com';
  const OG_IMAGE = ORIGIN + '/og/default.png';
  const path = (location.pathname || '/').replace(/\/$/, '') || '/';
  const PAGES = {
    '/': { title: 'PDF & Image Tools — Fast, Private, Free', desc: 'All-in-one PDF & image utilities that run entirely in your browser: merge, crop, compress, convert, and more. No uploads. Fast and private.' },
    '/image-to-pdf': { title: 'Image → PDF — JPG/PNG/WebP/AVIF/HEIC to PDF', desc: 'Convert JPG/PNG/WebP/AVIF/HEIC to PDF locally in your browser.' },
    '/pdf-to-images': { title: 'PDF → Images — Export PDF pages to PNG/JPG', desc: 'Export PDF pages to PNG or JPG at custom DPI. Nothing leaves your device.' },
    '/compress': { title: 'Compress PDF — Reduce Size, Keep Quality', desc: 'Shrink large PDFs from scans or photos with smart presets.' },
    '/crop': { title: 'Crop PDF — Select Area & Apply to Pages', desc: 'Crop PDF pages by dragging a box; apply to one or all pages.' },
    '/merge': { title: 'Merge PDF — Combine & Reorder Easily', desc: 'Combine multiple PDFs, reorder pages, and download in one click.' },
    '/delete-pages': { title: 'Delete PDF Pages — Remove & Save', desc: 'Remove selected PDF pages and save a clean file.' },
    '/reorder-pages': { title: 'Reorder PDF Pages — Drag, Drop, Export', desc: 'Rearrange PDF pages visually by drag and drop.' },
    '/rotate-pages': { title: 'Rotate PDF Pages — Single or All', desc: 'Rotate specific pages or the entire PDF, then save a new file.' },
    '/png-to-jpg': { title: 'PNG → JPG — Quick Converter', desc: 'Convert PNG to JPG with adjustable quality.' },
    '/jpg-to-png': { title: 'JPG → PNG — Lossless Converter', desc: 'Convert JPG to PNG. Everything stays on your device.' },
    '/ajio-label-invoice-sorter': { title: 'AJIO Label Invoice Sorter — SKU & Bag Barcode', desc: 'Sort AJIO labels and invoices by bag barcode, print SKU and bag barcode on labels, and generate one packing-ready PDF in your browser.' },
    '/privacy': { title: 'Privacy — No Uploads. No Retention.', desc: 'We process your files locally in your browser. No servers, no document retention.' },
    '/terms': { title: 'Terms — Simple & Human-Readable', desc: 'Plain-language terms for using our client-side PDF and image tools.' }
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
    function applyAjioUiFix() {
      const only = document.getElementById('onlyMatched');
      if (only) {
        only.checked = false;
        const row = only.closest('label');
        if (row) row.style.display = 'none';
      }
      const note = document.querySelector('.action-box .small.mt-2');
      if (note) note.textContent = 'Output: matched orders become label → invoice. Unreadable label pages need the next engine update.';
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyAjioUiFix);
    else applyAjioUiFix();
  }
})();
