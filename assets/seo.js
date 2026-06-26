(function () {
  const ORIGIN = "https://pdfimagelab.com";
  const OG_IMAGE = ORIGIN + "/og/default.png";
  const PAGES = {
    "/": { title: "PDF & Image Tools — Fast, Private, Free", desc: "All-in-one PDF & image utilities that run entirely in your browser: merge, crop, compress, convert, and more. No uploads. Fast and private." },
    "/image-to-pdf": { title: "Image → PDF — JPG/PNG/WebP/AVIF/HEIC to PDF", desc: "Convert JPG/PNG/WebP/AVIF/HEIC to a single PDF locally in your browser. Private, fast, and free." },
    "/pdf-to-images": { title: "PDF → Images — Export PDF pages to PNG/JPG", desc: "Export PDF pages to PNG or JPG at custom DPI — 100% client-side. Nothing leaves your device." },
    "/compress": { title: "Compress PDF — Reduce Size, Keep Quality", desc: "Shrink large PDFs from scans or photos with smart presets. Runs fully offline in your browser." },
    "/crop": { title: "Crop PDF — Select Area & Apply to Pages", desc: "Crop PDF pages by dragging a box; apply to one or all pages. Private and fast." },
    "/merge": { title: "Merge PDF — Combine & Reorder Easily", desc: "Combine multiple PDFs, reorder pages, and download in one click — no uploads required." },
    "/delete-pages": { title: "Delete PDF Pages — Remove & Save", desc: "Remove selected PDF pages and save a clean file — private, local processing only." },
    "/reorder-pages": { title: "Reorder PDF Pages — Drag, Drop, Export", desc: "Rearrange PDF pages visually by drag & drop, then export. Everything stays on your device." },
    "/rotate-pages": { title: "Rotate PDF Pages — Single or All", desc: "Rotate specific pages or the entire PDF, then save a new file — client-side only." },
    "/png-to-jpg": { title: "PNG → JPG — Quick Converter", desc: "Convert PNG to JPG with adjustable quality. Batch-friendly and private." },
    "/heic-to-jpg-png": { title: "HEIC → JPG/PNG — HEIC Converter", desc: "Convert HEIC photos from iPhone or iPad to JPG or PNG directly in your browser. No uploads, fully private." },
    "/jpg-to-png": { title: "JPG → PNG — Lossless Converter", desc: "Convert JPG to lossless PNG (ZIP). Everything stays on your device." },
    "/ajio-label-invoice-sorter": { title: "AJIO Label Invoice Sorter — SKU & Bag Barcode", desc: "Sort AJIO labels and invoices by bag barcode, stamp SKU and bag barcode on labels, and generate one packing-ready PDF in your browser." },
    "/privacy": { title: "Privacy — No Uploads. No Retention.", desc: "We process your files locally in your browser. No servers, no tracking of your documents." },
    "/terms": { title: "Terms — Simple & Human-Readable", desc: "Plain-language terms for using our client-side PDF & image tools." },
    "/404": { title: "Page Not Found — PDF & Image Tools", desc: "This page doesn’t exist. Head back to our PDF & image tools home." }
  };

  const cleanPath = p => (p || "/").replace(/\/$/, "") || "/";
  const path = cleanPath(location.pathname);
  const data = PAGES[path] || PAGES["/"];
  const canonicalUrl = ORIGIN + (path === "/" ? "/" : path);
  function ensureMetaName(name, content){ if(!content)return; let el=document.querySelector(`meta[name="${name}"]`); if(!el){el=document.createElement("meta"); el.setAttribute("name",name); document.head.appendChild(el);} el.setAttribute("content",content); }
  function ensureMetaProp(prop, content){ if(!content)return; let el=document.querySelector(`meta[property="${prop}"]`); if(!el){el=document.createElement("meta"); el.setAttribute("property",prop); document.head.appendChild(el);} el.setAttribute("content",content); }
  function ensureCanonical(href){ let link=document.querySelector('link[rel="canonical"]'); if(!link){link=document.createElement("link"); link.setAttribute("rel","canonical"); document.head.appendChild(link);} link.setAttribute("href",href); }

  if (data.title && document.title.trim() !== data.title) document.title = data.title;
  ensureCanonical(canonicalUrl);
  ensureMetaName("description", data.desc);
  ensureMetaName("color-scheme", "light dark");
  ensureMetaProp("og:title", data.title);
  ensureMetaProp("og:description", data.desc);
  ensureMetaProp("og:url", canonicalUrl);
  ensureMetaProp("og:type", "website");
  ensureMetaProp("og:image", OG_IMAGE);
  ensureMetaName("twitter:card", "summary_large_image");
  ensureMetaName("twitter:title", data.title);
  ensureMetaName("twitter:description", data.desc);
  ensureMetaName("twitter:image", OG_IMAGE);

  function patchPdfLibStampHighlight(){
    if (path !== "/ajio-label-invoice-sorter") return;
    let tries = 0;
    const timer = setInterval(function(){
      tries++;
      if (!window.PDFLib || !PDFLib.PDFPage || !PDFLib.PDFPage.prototype) { if (tries > 80) clearInterval(timer); return; }
      const proto = PDFLib.PDFPage.prototype;
      if (proto.__ajioPlainStampPatchV3) { clearInterval(timer); return; }
      proto.__ajioPlainStampPatchV3 = true;
      const originalRectangle = proto.drawRectangle;
      const originalText = proto.drawText;
      proto.drawRectangle = function(opts){
        try { const s=this.getSize?this.getSize():null; if(s && opts && opts.y<s.height*0.09 && opts.height<=55 && opts.width>s.width*0.38 && opts.width<s.width*0.60 && opts.x>s.width*0.40){ return this; } } catch(e) {}
        return originalRectangle.apply(this, arguments);
      };
      function drawTextHighlight(page, text, opts){
        try{
          const s=page.getSize?page.getSize():null; if(!s || !opts || typeof text!=="string") return;
          const x=Number(opts.x||0), y=Number(opts.y||0), size=Number(opts.size||9);
          const isStampArea=x>s.width*0.50 && y<s.height*0.28;
          const looksLikeSkuOrBag=/^[A-Z0-9][A-Z0-9_\-\/,. +]{2,55}$/i.test(text) || /^D?B?\d{8,16}$/i.test(text) || /^QTY\s+/i.test(text);
          if(!isStampArea || !looksLikeSkuOrBag) return;
          let textW=Math.min(s.width*0.55, Math.max(32, text.length*size*0.58));
          if(opts.font && opts.font.widthOfTextAtSize) textW=Math.min(s.width*0.55, Math.max(32, opts.font.widthOfTextAtSize(text,size)));
          originalRectangle.call(page,{x:Math.max(0,x-3),y:Math.max(0,y-2),width:textW+6,height:size+5,color:PDFLib.rgb(1,1,1),opacity:0.97});
        }catch(e){}
      }
      proto.drawText = function(text, opts){
        try{
          if(typeof text==="string" && (text.indexOf("SKU: ")===0 || text.indexOf("BAG: ")===0)){
            const s=this.getSize?this.getSize():{width:595,height:842};
            const isSku=text.indexOf("SKU: ")===0;
            const cleanText=text.replace(/^SKU:\s*/,"").replace(/^BAG:\s*/,"");
            const o=Object.assign({},opts||{}); const size=o.size||9;
            o.x=s.width*0.79; o.y=s.height*0.022+(isSku?size+4:0);
            drawTextHighlight(this,cleanText,o);
            return originalText.call(this,cleanText,o);
          }
          drawTextHighlight(this,text,opts||{});
        }catch(e){}
        return originalText.apply(this,arguments);
      };
      clearInterval(timer);
    },100);
  }

  function rebootAjioSorterWithWrappedStamp(){
    if (path !== "/ajio-label-invoice-sorter") return;
    if (window.__ajioWrappedStampReboot) return;
    window.__ajioWrappedStampReboot = true;
    const replacement = `  function stampLabel(page, rec, fontBold, fontRegular){
    const { width, height } = page.getSize();
    const cleanLocal = v => String(v == null ? '' : v).replace(/\\s+/g,' ').trim();
    const measure = (font, text, size) => font && font.widthOfTextAtSize ? font.widthOfTextAtSize(text, size) : text.length * size * 0.58;
    function wrapOne(text, font, size, maxW){
      text = cleanLocal(text);
      if (!text) return [];
      const lines = [];
      let line = '';
      for (const ch of Array.from(text)){
        const test = line + ch;
        if (line && measure(font, test, size) > maxW){ lines.push(line); line = ch; }
        else line = test;
      }
      if (line) lines.push(line);
      return lines;
    }
    function buildLines(size, maxW){
      const lines = [];
      if (stampSku.checked){
        const skuParts = cleanLocal(rec.sku || '-').split(/\\s+\\+\\s+/).filter(Boolean);
        skuParts.forEach(part => wrapOne(part, fontBold, size, maxW).forEach(t => lines.push({ text:t, font:fontBold })));
      }
      const qty = cleanLocal(rec.confirmQty || '');
      if (qty && qty !== '1') wrapOne('QTY ' + qty, fontRegular, size, maxW).forEach(t => lines.push({ text:t, font:fontRegular }));
      if (stampBag.checked) wrapOne(rec.bagBarcode || '-', fontRegular, size, maxW).forEach(t => lines.push({ text:t, font:fontRegular }));
      return lines.length ? lines : [{ text:'-', font:fontRegular }];
    }
    const bottom = height * 0.028;
    const right = width * 0.965;
    const normalCellX = width * 0.72;
    const normalCellW = width * 0.24;
    const maxW = width * 0.46;
    const maxH = height * 0.22;
    let chosen = null;
    for (let size = 10; size >= 6; size -= 0.5){
      const lineH = size + 2.6;
      const widths = [normalCellW, width*0.30, width*0.36, width*0.42, maxW];
      for (const w of widths){
        const lines = buildLines(size, w);
        const blockH = (lines.length - 1) * lineH + size;
        if (blockH <= maxH){ chosen = { size, lineH, lines, wrapW:w }; break; }
      }
      if (chosen) break;
    }
    if (!chosen){ const size = 6; chosen = { size, lineH:size+2.4, lines:buildLines(size, maxW), wrapW:maxW }; }
    const lineWidths = chosen.lines.map(l => measure(l.font, l.text, chosen.size));
    const blockW = Math.min(maxW, Math.max(28, ...lineWidths));
    const blockH = (chosen.lines.length - 1) * chosen.lineH + chosen.size;
    let x = blockW <= normalCellW ? normalCellX + Math.max(0, (normalCellW - blockW) / 2) : Math.max(width * 0.03, right - blockW);
    const yBottom = Math.max(height * 0.012, bottom);
    page.drawRectangle({ x:Math.max(0,x-4), y:Math.max(0,yBottom-3), width:Math.min(width*0.94, blockW+8), height:Math.min(height*0.96, blockH+7), color:PDFLib.rgb(1,1,1), opacity:0.97 });
    for (let i=0; i<chosen.lines.length; i++){
      const line = chosen.lines[i];
      const y = yBottom + (chosen.lines.length - 1 - i) * chosen.lineH;
      page.drawText(line.text, { x, y, size:chosen.size, font:line.font, color:PDFLib.rgb(0,0,0) });
    }
  }
`;
    function install(){
      const scripts = Array.from(document.scripts);
      const srcScript = scripts.find(s => s.textContent && s.textContent.includes('function stampLabel(page, rec, fontBold, fontRegular)') && s.textContent.includes('processBtn.addEventListener'));
      if (!srcScript) return;
      const src = srcScript.textContent;
      const start = src.indexOf('  function stampLabel(page, rec, fontBold, fontRegular){');
      const end = src.indexOf('\n  async function createFinalPdf', start);
      if (start < 0 || end < 0) return;
      ['excelFile','labelPdf','invoicePdf','clearBtn','processBtn','reportBtn'].forEach(id => { const el=document.getElementById(id); if(el && el.parentNode){ const n=el.cloneNode(true); if(n.type==='file') n.multiple=true; el.parentNode.replaceChild(n,el); } });
      const patched = src.slice(0,start) + replacement + src.slice(end);
      const tag = document.createElement('script');
      tag.textContent = patched;
      document.body.appendChild(tag);
      const st = document.getElementById('status'); if(st) st.textContent = 'Upload all files to start.';
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    else setTimeout(install, 0);
  }

  patchPdfLibStampHighlight();
  rebootAjioSorterWithWrappedStamp();

  (function addLd(){
    try{
      const ld={"@context":"https://schema.org","@type":"WebSite","name":"PDF & Image Tools","url":ORIGIN,"inLanguage":"en","potentialAction":{"@type":"SearchAction","target":ORIGIN+"/?q={search_term_string}","query-input":"required name=search_term_string"}};
      const s=document.createElement("script"); s.type="application/ld+json"; s.textContent=JSON.stringify(ld); document.head.appendChild(s);
    }catch(e){}
  })();
})();