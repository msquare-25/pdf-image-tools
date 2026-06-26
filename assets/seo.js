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
      if (proto.__ajioPlainStampPatchV4) { clearInterval(timer); return; }
      proto.__ajioPlainStampPatchV4 = true;
      const originalRectangle = proto.drawRectangle;
      const originalText = proto.drawText;
      proto.drawRectangle = function(opts){
        try { const s=this.getSize?this.getSize():null; if(s && opts && opts.y<s.height*0.09 && opts.height<=55 && opts.width>s.width*0.38 && opts.width<s.width*0.60 && opts.x>s.width*0.40){ return this; } } catch(e) {}
        return originalRectangle.apply(this, arguments);
      };
      function drawTextHighlight(page, text, opts){
        try{
          const s=page.getSize?page.getSize():null; if(!s || !opts || typeof text!=="string") return;
          const x=Number(opts.x||0), y=Number(opts.y||0), size=Number(opts.size||8);
          const isStampArea=x>s.width*0.24 && y<s.height*0.26;
          const looks=/^[A-Z0-9][A-Z0-9_\-\/,. +]{2,70}$/i.test(text) || /^D?B?\d{8,16}$/i.test(text);
          if(!isStampArea || !looks || /^QTY\b/i.test(text)) return;
          let textW=Math.min(s.width*0.70, Math.max(32, text.length*size*0.56));
          if(opts.font && opts.font.widthOfTextAtSize) textW=Math.min(s.width*0.70, Math.max(32, opts.font.widthOfTextAtSize(text,size)));
          originalRectangle.call(page,{x:Math.max(0,x-3),y:Math.max(0,y-2),width:textW+6,height:size+5,color:PDFLib.rgb(1,1,1),opacity:0.97});
        }catch(e){}
      }
      proto.drawText = function(text, opts){
        try{
          if(typeof text==="string" && /^QTY\b/i.test(text)) return this;
          if(typeof text==="string" && (text.indexOf("SKU: ")===0 || text.indexOf("BAG: ")===0)){
            const s=this.getSize?this.getSize():{width:595,height:842};
            const isSku=text.indexOf("SKU: ")===0;
            const cleanText=text.replace(/^SKU:\s*/,"").replace(/^BAG:\s*/,"");
            const o=Object.assign({},opts||{}); const size=o.size||8;
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

  function rebootAjioSorterWithSkuGroups(){
    if (path !== "/ajio-label-invoice-sorter") return;
    if (window.__ajioSkuGroupRebootV4) return;
    window.__ajioSkuGroupRebootV4 = true;
    const replacement = `  function stampLabel(page, rec, fontBold, fontRegular){
    const { width, height } = page.getSize();
    const cleanLocal = v => String(v == null ? '' : v).replace(/\\s+/g,' ').trim();
    const measure = (font, text, size) => font && font.widthOfTextAtSize ? font.widthOfTextAtSize(text, size) : text.length * size * 0.56;
    function splitSkus(text){ return cleanLocal(text || '-').split(/\\s+\\+\\s+/).map(s => cleanLocal(s)).filter(Boolean); }
    function chunkSkus(parts){
      const n = parts.length;
      if (n <= 2) return [parts];
      if (n <= 5) return [parts.slice(0, Math.min(3,n)), parts.slice(Math.min(3,n))].filter(a => a.length);
      const chunks = [parts.slice(0,4), parts.slice(4,7), parts.slice(7,10)];
      for (let i=10; i<n; i+=3) chunks.push(parts.slice(i,i+3));
      return chunks.filter(a => a.length);
    }
    function makeLines(size, maxW){
      const skuParts = stampSku.checked ? splitSkus(rec.sku || '-') : [];
      let lines = chunkSkus(skuParts).map(group => ({ text:group.join(' + '), font:fontRegular }));
      if (stampBag.checked) lines.push({ text:cleanLocal(rec.bagBarcode || '-'), font:fontRegular, bag:true });
      lines = lines.filter(l => l.text);
      if (!lines.length) lines = [{ text:'-', font:fontRegular }];
      const tooWide = lines.some(l => measure(l.font, l.text, size) > maxW);
      if (!tooWide) return lines;
      if (skuParts.length > 1){
        lines = skuParts.map(s => ({ text:s, font:fontRegular }));
        if (stampBag.checked) lines.push({ text:cleanLocal(rec.bagBarcode || '-'), font:fontRegular, bag:true });
      }
      return lines;
    }
    const bottom = height * 0.028;
    const right = width * 0.965;
    const maxW = width * 0.68;
    const maxH = height * 0.18;
    let chosen = null;
    for (let size = 8.2; size >= 5.2; size -= 0.4){
      const lineH = size + 2.2;
      const lines = makeLines(size, maxW);
      const blockH = (lines.length - 1) * lineH + size;
      const widest = Math.max(28, ...lines.map(l => measure(l.font, l.text, size)));
      if (blockH <= maxH && widest <= maxW){ chosen = { size, lineH, lines, blockW:widest }; break; }
    }
    if (!chosen){
      const size = 5.2;
      const lines = makeLines(size, maxW).slice(-6);
      chosen = { size, lineH:size+2.1, lines, blockW:Math.min(maxW, Math.max(28, ...lines.map(l => measure(l.font, l.text, size)))) };
    }
    const blockH = (chosen.lines.length - 1) * chosen.lineH + chosen.size;
    const x = Math.max(width * 0.055, right - chosen.blockW);
    const yBottom = Math.max(height * 0.012, bottom);
    page.drawRectangle({ x:Math.max(0,x-4), y:Math.max(0,yBottom-3), width:Math.min(width*0.93, chosen.blockW+8), height:Math.min(height*0.96, blockH+7), color:PDFLib.rgb(1,1,1), opacity:0.97 });
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
      const tag = document.createElement('script');
      tag.textContent = src.slice(0,start) + replacement + src.slice(end);
      document.body.appendChild(tag);
      const st = document.getElementById('status'); if(st) st.textContent = 'Upload all files to start.';
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    else setTimeout(install, 0);
  }

  patchPdfLibStampHighlight();
  rebootAjioSorterWithSkuGroups();

  (function addLd(){
    try{
      const ld={"@context":"https://schema.org","@type":"WebSite","name":"PDF & Image Tools","url":ORIGIN,"inLanguage":"en","potentialAction":{"@type":"SearchAction","target":ORIGIN+"/?q={search_term_string}","query-input":"required name=search_term_string"}};
      const s=document.createElement("script"); s.type="application/ld+json"; s.textContent=JSON.stringify(ld); document.head.appendChild(s);
    }catch(e){}
  })();
})();