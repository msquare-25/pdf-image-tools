(function(){
  'use strict';
  if ((location.pathname || '').replace(/\/$/, '') !== '/ajio-label-invoice-sorter') return;
  if (window.__ajioMainEnginePatchV1) return;
  window.__ajioMainEnginePatchV1 = true;

  function boot(){
    const srcScript = Array.from(document.scripts).find(function(s){
      return s.textContent && s.textContent.includes('async function analyzeLabels') && s.textContent.includes('async function createFinalPdf(rows)') && s.textContent.includes('processBtn.addEventListener');
    });
    if (!srcScript) { setTimeout(boot, 100); return; }

    ['excelFile','labelPdf','invoicePdf','clearBtn','processBtn','reportBtn'].forEach(function(id){
      const el = document.getElementById(id);
      if (!el || !el.parentNode) return;
      const n = el.cloneNode(true);
      if (n.type === 'file') n.multiple = true;
      el.parentNode.replaceChild(n, el);
    });

    const only = document.getElementById('onlyMatched');
    if (only) {
      only.checked = false;
      const row = only.closest('label');
      if (row) row.style.display = 'none';
    }

    let code = srcScript.textContent;

    const newAnalyze = `async function analyzeLabels(pdf, invoiceByAwb){
    const labels = [], byOrder = new Map(), byAwb = new Map(), duplicates = [];
    const orderRegex = /^FN\\d{8,}$/i;
    const awbRegex = /^(SF\\d{6,}AJI|\\d{10,16})$/i;
    const orderZones = [
      {x:0.22,y:0.385,w:0.75,h:0.19},
      {x:0.16,y:0.400,w:0.82,h:0.17},
      {x:0.28,y:0.420,w:0.68,h:0.15},
      {x:0.00,y:0.365,w:1.00,h:0.23},
      {x:0.18,y:0.445,w:0.80,h:0.12}
    ];
    const awbZones = [
      {x:0.00,y:0.185,w:0.95,h:0.22},
      {x:0.00,y:0.220,w:0.95,h:0.18},
      {x:0.00,y:0.145,w:1.00,h:0.28}
    ];
    async function readZones(canvas, zones, regex){
      for (const z of zones) {
        const v = await decodeBarcodeCanvas(cropCanvas(canvas, z), regex);
        if (v) return clean(v).toUpperCase();
      }
      return '';
    }
    for (let i=1; i<=pdf.numPages; i++){
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const text = tc.items.map(item => item.str || '').join(' ').replace(/\\s+/g,' ').trim();
      let orderId = extractOrderId(text), awb = extractAwb(text);
      const canvas = await renderPdfPageToCanvas(page, 4.4);
      if (!orderId) orderId = await readZones(canvas, orderZones, orderRegex);
      if (!awb) awb = await readZones(canvas, awbZones, awbRegex);
      if (!orderId && awb && invoiceByAwb.has(awb)) orderId = invoiceByAwb.get(awb).orderId;
      const info = { pageIndex:i-1, pageNumber:i, orderId, awb };
      labels.push(info);
      addToIndex(byOrder, orderId, info, duplicates, 'Duplicate label order');
      addToIndex(byAwb, awb, info, duplicates, 'Duplicate label AWB');
    }
    return { labels, byOrder, byAwb, duplicates };
  }`;

    const aStart = code.indexOf('async function analyzeLabels(pdf, invoiceByAwb){');
    const aEnd = code.indexOf('\n  async function analyzeAllLabels', aStart);
    if (aStart >= 0 && aEnd > aStart) code = code.slice(0, aStart) + newAnalyze + code.slice(aEnd);

    code = code.replace(
      "if (!rec.label || !rec.invoice) { if (onlyMatched.checked) continue; else continue; }\n      const [labelPage] = await out.copyPages(labelDocs[rec.label.sourceIndex], [rec.label.pageIndex]);\n      out.addPage(labelPage);\n      stampLabel(labelPage, rec, fontBold, fontRegular);\n      const [invoicePage] = await out.copyPages(invoiceDocs[rec.invoice.sourceIndex], [rec.invoice.pageIndex]);\n      out.addPage(invoicePage);",
      "if (!rec.label) continue;\n      const [labelPage] = await out.copyPages(labelDocs[rec.label.sourceIndex], [rec.label.pageIndex]);\n      out.addPage(labelPage);\n      stampLabel(labelPage, rec, fontBold, fontRegular);\n      if (rec.invoice) {\n        const [invoicePage] = await out.copyPages(invoiceDocs[rec.invoice.sourceIndex], [rec.invoice.pageIndex]);\n        out.addPage(invoicePage);\n      }"
    );

    code = code.replace(
      "text: cleanLocal(rec.bagBarcode || '-'),",
      "text: cleanLocal(rec.bagBarcode || rec.orderId || (rec.label && rec.label.awb) || '-'),"
    );

    code = code.replace(
      "      const sorted = sortRows(rows);",
      "      const usedLabelKeys = new Set(rows.filter(r => r.label).map(r => r.label.sourceIndex + ':' + r.label.pageIndex));\n      labelIndex.labels.forEach((label, idx) => {\n        const key = label.sourceIndex + ':' + label.pageIndex;\n        if (usedLabelKeys.has(key)) return;\n        let invoice = null;\n        if (label.orderId) invoice = invoiceIndex.byOrder.get(label.orderId) || null;\n        if (!invoice && label.awb) invoice = invoiceIndex.byAwb.get(label.awb) || null;\n        const orderId = label.orderId || (invoice && invoice.orderId) || '';\n        const notes = ['Label included even though Excel match was not found'];\n        if (!invoice) notes.push('Invoice page not found');\n        rows.push({ orderId: orderId || ('LABEL ' + label.pageNumber), bagBarcode: '', sku: '', confirmQty: '', sequence: 999000 + idx, label, invoice, notes, status: invoice ? 'WARN' : 'ERROR' });\n      });\n\n      const sorted = sortRows(rows);"
    );

    code = code.replace(
      "setStatus(`Done. ${matchedRows.length} matched orders exported.`, 100);",
      "setStatus(`Done. ${sorted.filter(r => r.label).length} label(s) exported.`, 100);"
    );

    const tag = document.createElement('script');
    tag.textContent = code;
    document.body.appendChild(tag);
    const st = document.getElementById('status');
    if (st) st.textContent = 'Upload all files to start.';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
