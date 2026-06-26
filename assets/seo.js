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
      if (proto.__ajioPlainStampPatchV5) { clearInterval(timer); return; }
      proto.__ajioPlainStampPatchV5 = true;
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

  function rebootAjioSorterWithSafeValidation(){
    if (path !== "/ajio-label-invoice-sorter") return;
    if (window.__ajioSafeValidationRebootV5) return;
    window.__ajioSafeValidationRebootV5 = true;

    const stampReplacement = `  function stampLabel(page, rec, fontBold, fontRegular){
    const { width, height } = page.getSize();
    const cleanLocal = v => String(v == null ? '' : v).replace(/\\s+/g,' ').trim();
    const measure = (font, text, size) => font && font.widthOfTextAtSize ? font.widthOfTextAtSize(text, size) : text.length * size * 0.55;
    function splitSkus(text){ return cleanLocal(text || '-').split(/\\s+\\+\\s+/).map(s => cleanLocal(s)).filter(Boolean); }
    function groupSkus(parts){
      const n = parts.length;
      if (n <= 0) return [];
      if (n === 1) return [[parts[0]]];
      if (n === 2) return [[parts[0]],[parts[1]]];
      if (n === 3) return [[parts[0],parts[1]],[parts[2]]];
      if (n === 4) return [[parts[0],parts[1]],[parts[2],parts[3]]];
      if (n === 5) return [[parts[0],parts[1],parts[2]],[parts[3],parts[4]]];
      if (n === 6) return [[parts[0],parts[1],parts[2]],[parts[3],parts[4],parts[5]]];
      if (n === 7) return [[parts[0],parts[1],parts[2]],[parts[3],parts[4],parts[5]],[parts[6]]];
      if (n === 8) return [[parts[0],parts[1],parts[2]],[parts[3],parts[4],parts[5]],[parts[6],parts[7]]];
      if (n === 9) return [[parts[0],parts[1],parts[2]],[parts[3],parts[4],parts[5]],[parts[6],parts[7],parts[8]]];
      if (n === 10) return [[parts[0],parts[1],parts[2],parts[3]],[parts[4],parts[5],parts[6]],[parts[7],parts[8],parts[9]]];
      const out = [parts.slice(0,4), parts.slice(4,7), parts.slice(7,10)];
      for (let i=10; i<n; i+=3) out.push(parts.slice(i,i+3));
      return out.filter(a => a.length);
    }
    function buildLines(){
      const lines = [];
      if (stampSku.checked) groupSkus(splitSkus(rec.sku || '-')).forEach(group => lines.push({ text:group.join(' + '), font:fontRegular }));
      if (stampBag.checked) lines.push({ text:cleanLocal(rec.bagBarcode || '-'), font:fontRegular, bag:true });
      return lines.length ? lines : [{ text:'-', font:fontRegular }];
    }
    const bottom = height * 0.030, right = width * 0.965, maxW = width * 0.68, maxH = height * 0.20;
    let chosen = null;
    for (let size = 7.4; size >= 5.0; size -= 0.3){
      const lineH = size + 3.2;
      const lines = buildLines();
      const widest = Math.max(28, ...lines.map(l => measure(l.font, l.text, size)));
      const blockH = (lines.length - 1) * lineH + size;
      const bagLine = lines.find(l => l.bag);
      const bagFits = !bagLine || measure(bagLine.font, bagLine.text, size) <= maxW;
      if (blockH <= maxH && widest <= maxW && bagFits){ chosen = { size, lineH, lines, blockW:widest }; break; }
    }
    if (!chosen){ const size = 5.0, lineH = size + 3.0, lines = buildLines(); chosen = { size, lineH, lines, blockW:Math.min(maxW, Math.max(28, ...lines.map(l => measure(l.font, l.text, size)))) }; }
    const blockH = (chosen.lines.length - 1) * chosen.lineH + chosen.size;
    const x = Math.max(width * 0.05, right - chosen.blockW);
    const yBottom = Math.max(height * 0.012, bottom);
    page.drawRectangle({ x:Math.max(0,x-4), y:Math.max(0,yBottom-3), width:Math.min(width*0.93, chosen.blockW+8), height:Math.min(height*0.96, blockH+8), color:PDFLib.rgb(1,1,1), opacity:0.97 });
    for (let i=0; i<chosen.lines.length; i++){
      const line = chosen.lines[i];
      const y = yBottom + (chosen.lines.length - 1 - i) * chosen.lineH;
      page.drawText(line.text, { x, y, size:chosen.size, font:line.font, color:PDFLib.rgb(0,0,0) });
    }
  }
`;

    function patchScriptSource(src){
      let patched = src;
      const start = patched.indexOf('  function stampLabel(page, rec, fontBold, fontRegular){');
      const end = patched.indexOf('\n  async function createFinalPdf', start);
      if (start >= 0 && end >= 0) patched = patched.slice(0,start) + stampReplacement + patched.slice(end);

      patched = patched.replace(
        /function extractAwb\(text\)\{[\s\S]*?\}\n\s*function addToIndex/,
        `function extractAwb(text){
    const u = clean(text).toUpperCase();
    const m = u.match(/\bAWB(?:\s+NUMBER)?\s*[:\-]?\s*((?:SF\d{6,}AJI)|(?:\d{10,16}))\b/i);
    if (!m) return '';
    const awb = clean(m[1]).toUpperCase();
    if (!awb || /^0+$/.test(awb)) return '';
    return awb;
  }
  function addToIndex`
      );

      patched = patched.replace(
        /if \(invoice && label && invoice\.awb && label\.awb && invoice\.awb !== label\.awb\) notes\.push\('AWB mismatch between label and invoice'\);/,
        `if (invoice && label && invoice.awb && label.awb && invoice.awb !== label.awb) notes.push('AWB mismatch between label and invoice');
        if (label && !label.awb && invoice && invoice.awb) notes.push('Label AWB unreadable; matched by order ID');
        if (invoice && !invoice.awb) notes.push('Invoice AWB unreadable')`
      );
      return patched;
    }

    function install(){
      const scripts = Array.from(document.scripts);
      const srcScript = scripts.find(s => s.textContent && s.textContent.includes('function stampLabel(page, rec, fontBold, fontRegular)') && s.textContent.includes('processBtn.addEventListener'));
      if (!srcScript) return;
      ['excelFile','labelPdf','invoicePdf','clearBtn','processBtn','reportBtn'].forEach(id => { const el=document.getElementById(id); if(el && el.parentNode){ const n=el.cloneNode(true); if(n.type==='file') n.multiple=true; el.parentNode.replaceChild(n,el); } });
      const tag = document.createElement('script');
      tag.textContent = patchScriptSource(srcScript.textContent);
      document.body.appendChild(tag);
      const st = document.getElementById('status'); if(st) st.textContent = 'Upload all files to start.';
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    else setTimeout(install, 0);
  }

  patchPdfLibStampHighlight();
  rebootAjioSorterWithSafeValidation();

  (function addLd(){
    try{
      const ld={"@context":"https://schema.org","@type":"WebSite","name":"PDF & Image Tools","url":ORIGIN,"inLanguage":"en","potentialAction":{"@type":"SearchAction","target":ORIGIN+"/?q={search_term_string}","query-input":"required name=search_term_string"}};
      const s=document.createElement("script"); s.type="application/ld+json"; s.textContent=JSON.stringify(ld); document.head.appendChild(s);
    }catch(e){}
  })();
})();