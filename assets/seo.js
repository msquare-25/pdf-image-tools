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
  ensureCanonical(canonicalUrl); ensureMetaName("description", data.desc); ensureMetaName("color-scheme", "light dark");
  ensureMetaProp("og:title", data.title); ensureMetaProp("og:description", data.desc); ensureMetaProp("og:url", canonicalUrl); ensureMetaProp("og:type", "website"); ensureMetaProp("og:image", OG_IMAGE);
  ensureMetaName("twitter:card", "summary_large_image"); ensureMetaName("twitter:title", data.title); ensureMetaName("twitter:description", data.desc); ensureMetaName("twitter:image", OG_IMAGE);

  function rebootAjioSorterV6(){
    if (path !== "/ajio-label-invoice-sorter") return;
    if (window.__ajioSorterRebootV6) return;
    window.__ajioSorterRebootV6 = true;

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

    const analyzeReplacement = `  async function analyzeLabels(pdf, invoiceByAwb){
    const labels = [], byOrder = new Map(), byAwb = new Map(), duplicates = [];
    const orderRegex = /^FN\\d{8,}$/i;
    const awbRegex = /^(?:SF\\d{6,}AJI|\\d{10,16})$/i;
    function validAwb(v){ v = clean(v).toUpperCase(); return awbRegex.test(v) && !/^0+$/.test(v); }
    async function detectorValues(canvas){
      if (!('BarcodeDetector' in window)) return [];
      try{
        const formats = await BarcodeDetector.getSupportedFormats();
        const use = formats.includes('code_128') ? ['code_128'] : formats;
        const detector = new BarcodeDetector({ formats: use });
        return (await detector.detect(canvas)).map(c => clean(c.rawValue).toUpperCase()).filter(Boolean);
      }catch(e){ return []; }
    }
    async function tryZones(canvas, zones, regex){
      for (const z of zones){
        const v = await decodeBarcodeCanvas(cropCanvas(canvas, z), regex);
        if (v) return clean(v).toUpperCase();
      }
      return '';
    }
    const orderZones = [
      {x:0.18,y:0.405,w:0.78,h:0.135}, {x:0.25,y:0.390,w:0.72,h:0.170},
      {x:0.00,y:0.370,w:1.00,h:0.210}, {x:0.30,y:0.420,w:0.65,h:0.145},
      {x:0.10,y:0.385,w:0.86,h:0.190}
    ];
    const awbZones = [
      {x:0.00,y:0.195,w:0.78,h:0.185}, {x:0.00,y:0.220,w:0.93,h:0.175},
      {x:0.00,y:0.170,w:1.00,h:0.230}
    ];
    for (let i=1; i<=pdf.numPages; i++){
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const text = tc.items.map(item => item.str || '').join(' ').replace(/\\s+/g,' ').trim();
      let orderId = extractOrderId(text);
      let awb = extractAwb(text);
      const canvas = await renderPdfPageToCanvas(page, 4.2);
      const codes = await detectorValues(canvas);
      if (!orderId) orderId = codes.find(v => orderRegex.test(v)) || '';
      if (!awb) awb = codes.find(v => validAwb(v) && !orderRegex.test(v)) || '';
      if (!orderId) orderId = await tryZones(canvas, orderZones, orderRegex);
      if (!awb) awb = await tryZones(canvas, awbZones, awbRegex);
      if (awb && !validAwb(awb)) awb = '';
      if (!orderId && awb && invoiceByAwb.has(awb)) orderId = invoiceByAwb.get(awb).orderId;
      const info = { pageIndex:i-1, pageNumber:i, orderId, awb };
      labels.push(info);
      addToIndex(byOrder, orderId, info, duplicates, 'Duplicate label order');
      addToIndex(byAwb, awb, info, duplicates, 'Duplicate label AWB');
    }
    return { labels, byOrder, byAwb, duplicates };
  }
`;

    function patchScriptSource(src){
      let patched = src;
      let start = patched.indexOf('  function stampLabel(page, rec, fontBold, fontRegular){');
      let end = patched.indexOf('\n  async function createFinalPdf', start);
      if (start >= 0 && end >= 0) patched = patched.slice(0,start) + stampReplacement + patched.slice(end);
      start = patched.indexOf('  async function analyzeLabels(pdf, invoiceByAwb){');
      end = patched.indexOf('\n  async function analyzeAllLabels', start);
      if (start >= 0 && end >= 0) patched = patched.slice(0,start) + analyzeReplacement + patched.slice(end);
      patched = patched.replace(
        /function extractAwb\(text\)\{[\s\S]*?\}\n\s*function addToIndex/,
        `function extractAwb(text){
    const u = clean(text).toUpperCase();
    const m = u.match(/\\bAWB(?:\\s*(?:NUMBER|NO|#))?\\s*[:\\-]?\\s*((?:SF\\d{6,}AJI)|(?:\\d{10,16}))\\b/i);
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

  rebootAjioSorterV6();

  (function addLd(){
    try{
      const ld={"@context":"https://schema.org","@type":"WebSite","name":"PDF & Image Tools","url":ORIGIN,"inLanguage":"en","potentialAction":{"@type":"SearchAction","target":ORIGIN+"/?q={search_term_string}","query-input":"required name=search_term_string"}};
      const s=document.createElement("script"); s.type="application/ld+json"; s.textContent=JSON.stringify(ld); document.head.appendChild(s);
    }catch(e){}
  })();
})();