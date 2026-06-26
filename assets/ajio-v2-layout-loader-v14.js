(async function(){
  'use strict';
  window.AJIO_V2_LAYOUT_VERSION='v15-public-packing-check-live';
  const source='/assets/ajio-v2-final-v5.js?v=20260626-5';

  const lineGroups=`function lineGroups(items){
    const p=(items||[]).map(i=>sanitizeSku(i.sku)+(qty(i.qty)>1?' ('+qty(i.qty)+')':'')).filter(Boolean);
    const n=p.length;
    if(n<=1)return p.length?[p]:[];
    if(n===2)return[[p[0]],[p[1]]];
    if(n===3)return[[p[0],p[1]],[p[2]]];
    if(n===4)return[[p[0],p[1]],[p[2],p[3]]];
    if(n<=6)return[p.slice(0,3),p.slice(3)];
    if(n<=9)return[p.slice(0,3),p.slice(3,6),p.slice(6)];
    return[p.slice(0,4),p.slice(4,7),p.slice(7,10)];
  }`;

  const stampLabel=`function stampLabel(page,row,font){
    const {width,height}=page.getSize();
    let groups=[];
    let orderLine='';
    if(row.stampData&&row.confidence!=='UNSAFE'){
      groups=lineGroups(row.stampData.skuItems).map(g=>g.map(cleanLine).filter(Boolean)).filter(g=>g.length);
      orderLine=cleanLine(row.bagBarcode || '');
    }else{
      groups=[['MANUAL CHECK']];
      orderLine='';
    }

    const rightAnchor=width*.935;
    const minX=width*.30;
    const bottomBase=height*.052;
    const topLimit=height*.185;
    const maxW=rightAnchor-minX;
    const measure=(t,s)=>font.widthOfTextAtSize(t,s);
    const lines=groups.map(g=>cleanLine(g.join(' + '))).filter(Boolean).concat(orderLine?[orderLine]:[]).filter(Boolean);
    let fit=null;
    for(let size=7.8;size>=3.35;size-=.15){
      const lh=size+2.7;
      const w=Math.max(25,...lines.map(t=>measure(t,size)));
      const h=(lines.length-1)*lh+size;
      if(w<=maxW && bottomBase+h<=topLimit){fit={lines,size,lh,w,h};break;}
    }
    if(!fit){
      const size=3.3,lh=5.75;
      fit={lines,size,lh,w:Math.min(maxW,Math.max(25,...lines.map(t=>measure(t,size)))),h:(lines.length-1)*lh+size};
    }
    const x=Math.max(minX,rightAnchor-fit.w);
    const yb=bottomBase;
    page.drawRectangle({x:x-3,y:yb-2,width:Math.min(maxW,fit.w)+6,height:fit.h+5,color:PDFLib.rgb(1,1,1),opacity:.97});
    fit.lines.forEach((t,i)=>page.drawText(t,{x,y:yb+(fit.lines.length-1-i)*fit.lh,size:fit.size,font,color:PDFLib.rgb(0,0,0)}));
  }`;

  const showPublic=`function actionNeeded(r){
    if(r.confidence==='UNSAFE')return'Manual check required before packing.';
    if(r.skuSource==='missing'||!r.sku)return'SKU not found. Check Excel or invoice.';
    if(!r.invoice)return'Invoice missing. Check label-invoice pair.';
    if(!clean(r.bagBarcode||''))return'Bag barcode missing in Excel. Label generated with SKU only.';
    if(r.status==='WARN')return'Check once before packing.';
    return'';
  }
  function issueRows(rows){
    return rows.filter(r=>r.confidence==='UNSAFE'||r.skuSource==='missing'||!r.sku||!r.invoice||!clean(r.bagBarcode||''));
  }
  function show(rows,invoices){
    const debug=new URLSearchParams(location.search).get('debug')==='1';
    const heading=reportBox.querySelector('h2.title');
    if(heading)heading.textContent=debug?'Validation Report - Debug':'Packing Check';
    const total=rows.length;
    const manual=rows.filter(r=>r.confidence==='UNSAFE').length;
    const matched=rows.filter(r=>r.confidence!=='UNSAFE').length;
    const missingBag=rows.filter(r=>r.stampData&&r.confidence!=='UNSAFE'&&!clean(r.bagBarcode||'')).length;
    const excelSku=rows.filter(r=>r.skuSource==='excel').length;
    const issues=issueRows(rows);
    statGrid.innerHTML='';
    [['Labels',total],['Invoices',invoices.length],['Matched',matched],['Manual Check',manual],['Missing Bag Barcode',missingBag],['Excel SKU',excelSku]].forEach(([l,v])=>{const d=document.createElement('div');d.className='v2-stat';d.innerHTML=\`<strong>${v}</strong><span>${l}</span>\`;statGrid.appendChild(d)});
    const thead=reportBox.querySelector('thead');
    reportRows.innerHTML='';
    if(debug){
      if(thead)thead.innerHTML='<tr><th>Status</th><th>Confidence</th><th>Order</th><th>SKU Source</th><th>SKU</th><th>Bag Barcode</th><th>Label File</th><th>Label Page</th><th>Invoice</th><th>Score</th><th>Second</th><th>Common</th><th>Reason</th><th>Label Customer Text</th></tr>';
      rows.forEach(r=>{const cls=r.status==='OK'?'ok':r.status==='WARN'?'warn':'bad',tr=document.createElement('tr');tr.innerHTML=\`<td class="${cls}">${r.status}</td><td class="mono">${r.confidence}</td><td class="mono">${esc(r.matchedOrder||'-')}</td><td>${esc(r.skuSource||'-')}</td><td>${esc(r.sku||'-')}</td><td class="mono">${esc(r.bagBarcode||'-')}</td><td>${esc(r.label.file)}</td><td>${r.label.page}</td><td>${r.invoice?'Page '+r.invoice.page+' · '+esc(r.invoice.file):'-'}</td><td>${r.score}</td><td>${r.second}</td><td>${esc(r.common||'-')}</td><td>${esc(r.notes||r.reason)}</td><td class="snippet">${esc(r.label.profile.snippet||'-')}</td>\`;reportRows.appendChild(tr)});
      reportNote.textContent='Debug mode is visible only with ?debug=1.';
      reportBox.style.display='block';
      return;
    }
    if(thead)thead.innerHTML='<tr><th>Status</th><th>Order</th><th>SKU</th><th>Bag Barcode</th><th>Label Page</th><th>Invoice Page</th><th>Action Needed</th></tr>';
    issues.forEach(r=>{const need=actionNeeded(r),cls=r.confidence==='UNSAFE'||r.skuSource==='missing'?'bad':'warn',tr=document.createElement('tr');tr.innerHTML=\`<td class="${cls}">${r.confidence==='UNSAFE'?'MANUAL CHECK':'CHECK'}</td><td class="mono">${esc(r.matchedOrder||'-')}</td><td>${esc(r.sku||'-')}</td><td class="mono">${esc(r.bagBarcode||'-')}</td><td>${r.label.page}</td><td>${r.invoice?r.invoice.page:'-'}</td><td>${esc(need)}</td>\`;reportRows.appendChild(tr)});
    if(issues.length){reportNote.textContent='Only rows that need attention are shown. Matching details are hidden for privacy and simplicity.';}
    else{reportNote.textContent='All labels matched successfully. Final PDF is ready.';}
    const tableWrap=reportBox.querySelector('.v2-table-wrap');
    if(tableWrap)tableWrap.style.display=issues.length?'block':'none';
    reportBox.style.display='block';
  }
  function csv(rows){
    const debug=new URLSearchParams(location.search).get('debug')==='1';
    const e=v=>/[",\n]/.test(clean(v))?'"'+clean(v).replace(/"/g,'""')+'"':clean(v);
    if(debug){const h=['Status','Confidence','Order','SKU Source','SKU','Bag Barcode','Label File','Label Page','Invoice File','Invoice Page','Score','Second','Common','Reason'];return[h.join(','),...rows.map(r=>[r.status,r.confidence,r.matchedOrder,r.skuSource,r.sku,r.bagBarcode,r.label.file,r.label.page,r.invoice?r.invoice.file:'',r.invoice?r.invoice.page:'',r.score,r.second,r.common,r.notes||r.reason].map(e).join(','))].join('\n')}
    const rows2=issueRows(rows);
    const h=['Status','Order','SKU','Bag Barcode','Label Page','Invoice Page','Action Needed'];
    if(!rows2.length)return h.join(',')+'\nOK,,,,,,All labels matched successfully';
    return[h.join(','),...rows2.map(r=>[(r.confidence==='UNSAFE'?'MANUAL CHECK':'CHECK'),r.matchedOrder,r.sku,r.bagBarcode,r.label.page,r.invoice?r.invoice.page:'',actionNeeded(r)].map(e).join(','))].join('\n');
  }`;

  try{
    const res=await fetch(source,{cache:'no-store'});
    if(!res.ok)throw new Error('Cannot load AJIO V2 base engine');
    let code=await res.text();
    code=code.replace("invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: optional / not selected';","invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: not selected';");
    code=code.replace(/runBtn\.disabled=!\(labelFiles\.length&&excelFiles\.length\)/g,"runBtn.disabled=!(labelFiles.length&&invoiceFiles.length&&excelFiles.length)");
    code=code.replace("setStatus('Upload Label and Excel files. Invoice is optional but recommended.',0);","setStatus('Upload Label, Invoice and Excel files.',0);");
    code=code.replace("else setStatus('No invoice PDFs uploaded. Using label + Excel only…',8);","else throw new Error('Invoice PDF is required.');");
    code=code.replace(/qc=col\(h,\[[^\]]*Confirm Quantity[^\]]*\],17\)/,"qc=col(h,['*Confirm Quantity','Confirm Quantity'],20)");
    code=code.replace(/function lineGroups\(items\)\{[\s\S]*?\}\nfunction cleanLine/,lineGroups+'\nfunction cleanLine');
    const beforeStamp=code;
    code=code.replace(/function stampLabel\(page,row,font\)\{[\s\S]*?\}\nasync function createFinalPdf/,stampLabel+'\nasync function createFinalPdf');
    if(code===beforeStamp)throw new Error('Stamp layout patch did not apply');
    const beforeShow=code;
    code=code.replace(/function show\(rows,invoices\)\{[\s\S]*?\}\nfunction csv\(rows\)\{[\s\S]*?\}\nfunction download/,showPublic+'\nfunction download');
    if(code===beforeShow)throw new Error('Public report patch did not apply');
    const s=document.createElement('script');
    s.textContent=code+'\n//# sourceURL=/assets/ajio-v2-final-v15-live-runtime.js';
    document.body.appendChild(s);
    const st=document.getElementById('status');
    if(st)st.textContent='V15 packing check loaded. Upload Label, Invoice and Excel files.';
  }catch(err){
    console.error(err);
    alert('AJIO V2 v15 engine failed to load. Please hard refresh and try again.');
  }
})();