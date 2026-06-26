(function () {
  const ORIGIN = 'https://pdfimagelab.com';
  const OG_IMAGE = ORIGIN + '/og/default.png';
  const path = (location.pathname || '/').replace(/\/$/, '') || '/';
  const PAGES = {
    '/': { title: 'PDF & Image Tools — Fast, Private, Free', desc: 'All-in-one PDF & image utilities that run entirely in your browser. No uploads.' },
    '/ajio-label-invoice-sorter': { title: 'AJIO Label Invoice Sorter — PDFImageLab', desc: 'Arrange AJIO labels and invoices into a packing-ready PDF with Excel SKU, quantity and forward bag barcode marking.' }
  };
  const data = PAGES[path] || PAGES['/'];
  const canonicalUrl = ORIGIN + (path === '/' ? '/' : path);
  function metaName(name, content) { let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); } el.content = content; }
  function metaProp(prop, content) { let el = document.querySelector(`meta[property="${prop}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); } el.content = content; }
  function canonical(href) { let el = document.querySelector('link[rel="canonical"]'); if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); } el.href = href; }
  if (data.title) document.title = data.title;
  canonical(canonicalUrl); metaName('description', data.desc); metaProp('og:title', data.title); metaProp('og:description', data.desc); metaProp('og:url', canonicalUrl); metaProp('og:type', 'website'); metaProp('og:image', OG_IMAGE); metaName('twitter:card', 'summary_large_image'); metaName('twitter:title', data.title); metaName('twitter:description', data.desc); metaName('twitter:image', OG_IMAGE);

  if (path !== '/ajio-label-invoice-sorter') return;

  function uiFix(){
    const only = document.getElementById('onlyMatched');
    if (only) { only.checked = false; const row = only.closest('label'); if (row) row.style.display = 'none'; }
    const note = document.querySelector('.action-box .small.mt-2');
    if (note) note.textContent = 'Output: label → invoice → label → invoice. Labels without bag barcode are generated without bag barcode marking and a warning is shown before download.';
  }

  function installPdfSafety(){
    if (!window.PDFLib || !PDFLib.PDFDocument || PDFLib.PDFDocument.__ajioDirectNoGuessPatch) {
      if (!window.PDFLib) setTimeout(installPdfSafety, 150);
      return;
    }
    PDFLib.PDFDocument.__ajioDirectNoGuessPatch = true;
    const state = { active:false, loadSeq:0, labelFileCount:0, labelDocs:[], copied:new Set(), appending:false };

    document.addEventListener('click', function(ev){
      if (!ev.target || ev.target.id !== 'processBtn') return;
      const inp = document.getElementById('labelPdf');
      state.active = true; state.loadSeq = 0; state.labelDocs = []; state.copied = new Set(); state.appending = false;
      state.labelFileCount = inp && inp.files ? inp.files.length : 0;
    }, true);

    const origLoad = PDFLib.PDFDocument.load;
    PDFLib.PDFDocument.load = async function(){
      const doc = await origLoad.apply(this, arguments);
      if (state.active && !state.appending) {
        const seq = state.loadSeq++;
        if (seq < state.labelFileCount) { doc.__ajioLabelSourceIndex = seq; state.labelDocs[seq] = doc; }
      }
      return doc;
    };

    const proto = PDFLib.PDFDocument.prototype;
    const origCopyPages = proto.copyPages;
    proto.copyPages = async function(srcDoc, pages){
      if (state.active && !state.appending && srcDoc && srcDoc.__ajioLabelSourceIndex != null) {
        const src = srcDoc.__ajioLabelSourceIndex;
        (pages || []).forEach(p => state.copied.add(src + ':' + p));
      }
      return origCopyPages.apply(this, arguments);
    };

    const origSave = proto.save;
    proto.save = async function(){
      if (state.active && !state.appending && state.labelDocs.length) {
        state.appending = true;
        try {
          for (let src=0; src<state.labelDocs.length; src++) {
            const doc = state.labelDocs[src];
            if (!doc || !doc.getPageCount) continue;
            for (let p=0; p<doc.getPageCount(); p++) {
              const key = src + ':' + p;
              if (state.copied.has(key)) continue;
              const copied = await origCopyPages.call(this, doc, [p]);
              this.addPage(copied[0]);
              state.copied.add(key);
            }
          }
        } finally { state.active = false; state.appending = false; }
      }
      return origSave.apply(this, arguments);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { uiFix(); installPdfSafety(); });
  else { uiFix(); installPdfSafety(); }
})();