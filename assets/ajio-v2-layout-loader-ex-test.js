(async function(){
  'use strict';
  window.AJIO_V2_LAYOUT_VERSION='ex-test-excel-sku-order-infer';
  const source='/assets/ajio-v2-final-v5.js?v=20260626-5-ex-test-sku-infer';
  const extractFnPatch=`function extractFn(t){
    let c=compact(t).replace(/EXO/g,'EX0').replace(/FNO/g,'FN0');
    const m=c.match(/(?:FN|EX)[0-9O]{6,}[A-Z0-9]*/);
    if(!m)return'';
    const v=m[0];
    return v.slice(0,2)+v.slice(2).replace(/O/g,'0');
  }`;
  const ocrLabelFnPatch=`async function ocrLabelFn(page){
    try{
      const worker=await getOcrWorker();
      const canvas=await renderPage(page,5.5);
      const zones=[
        {x:.43,y:.525,w:.34,h:.055},
        {x:.38,y:.505,w:.45,h:.08},
        {x:.14,y:.455,w:.82,h:.13},
        {x:.25,y:.49,w:.62,h:.07},
        {x:.22,y:.515,w:.70,h:.055}
      ];
      for(const z of zones){
        const c=prepOcrCanvas(cropCanvas(canvas,z));
        const res=await worker.recognize(c);
        const fn=extractFn(res.data.text||'');
        if(fn)return fn;
      }
    }catch(e){console.warn('OCR label FN failed',e)}
    return'';
  }`;
  const enrichRowsPatch=`function excelByInvoiceSku(invItems,excelData){
    const invKeys=(invItems||[]).map(i=>skuKey(i.sku)).filter(Boolean);
    if(!invKeys.length)return null;
    const recs=(excelData.records||[]).filter(r=>{
      const exKeys=(r.skuItems||[]).map(i=>skuKey(i.sku)).filter(Boolean);
      if(exKeys.length!==invKeys.length)return false;
      return invKeys.every(k=>exKeys.includes(k));
    });
    return recs.length===1?recs[0]:null;
  }
  function enrichRows(matches,excelData){return matches.map(m=>{
    const invItems=m.invoice?(m.invoice.skuItems||[]):[];
    let matchedOrder=m.matchedOrder||'';
    let ex=matchedOrder?excelData.byOrder.get(matchedOrder):null;
    if(!ex&&invItems.length){
      const bySku=excelByInvoiceSku(invItems,excelData);
      if(bySku){ex=bySku;matchedOrder=bySku.orderId;}
    }
    const fallback=(!ex&&invItems.length&&m.confidence!=='UNSAFE')?{skuItems:invItems,sku:skuText(invItems),bagBarcode:'',source:'invoice'}:null;
    let status=m.status,notes=[m.reason],skuSource='excel';
    if(ex){
      if(m.confidence==='UNSAFE'){m.confidence='EXACT_EXCEL';status='WARN';notes.push('Label/order matched Excel; invoice/customer match missing')}
      if(!m.matchedOrder&&matchedOrder)notes.push('Order number recovered from unique Excel SKU match');
      if(!ex.bagBarcode)notes.push('Bag barcode missing; order number will print in barcode line')
    }else if(fallback){
      status='WARN';notes.push('Excel order not found; SKU used from invoice, bag barcode missing');skuSource='invoice'
    }else{
      status=m.confidence==='UNSAFE'?'ERROR':'WARN';notes.push('Excel order not found; invoice SKU not found');skuSource='missing'
    }
    const data=ex||fallback;
    return{...m,matchedOrder,excel:ex,stampData:data,status,sku:data?data.sku:'',skuItems:data?data.skuItems:[],bagBarcode:data?data.bagBarcode:'',skuSource,notes:notes.join(' | ')}
  })}`;
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
  try{
    const res=await fetch(source,{cache:'no-store'});
    if(!res.ok)throw new Error('Cannot load AJIO V2 base engine');
    let code=await res.text();
    code=code.replace("function extractFn(t){const m=compact(t).match(/FN\\d{8,}/);return m?m[0]:''}",extractFnPatch);
    code=code.replace(/async function ocrLabelFn\(page\)\{[\s\S]*?\}\nasync function invoiceRecords/,ocrLabelFnPatch+'\nasync function invoiceRecords');
    code=code.replace(/function enrichRows\(matches,excelData\)\{[\s\S]*?\}\nfunction sortRows/,enrichRowsPatch+'\nfunction sortRows');
    code=code.replace("if(!/^FN\\d{6,}$/i.test(id))continue;","if(!/^(?:FN|EX)\\d{6,}$/i.test(id))continue;");
    code=code.replace("invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: optional / not selected';","invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: not selected';");
    code=code.replace(/runBtn\.disabled=!\(labelFiles\.length&&excelFiles\.length\)/g,"runBtn.disabled=!(labelFiles.length&&invoiceFiles.length&&excelFiles.length)");
    code=code.replace("setStatus('Upload Label and Excel files. Invoice is optional but recommended.',0);","setStatus('Upload Label, Invoice and Excel files.',0);");
    code=code.replace("else setStatus('No invoice PDFs uploaded. Using label + Excel only…',8);","else throw new Error('Invoice PDF is required.');");
    code=code.replace(/qc=col\(h,\[[^\]]*Confirm Quantity[^\]]*\],17\)/,"qc=col(h,['*Confirm Quantity','Confirm Quantity'],20)");
    code=code.replace(/function lineGroups\(items\)\{[\s\S]*?\}\nfunction cleanLine/,lineGroups+'\nfunction cleanLine');
    const before=code;
    code=code.replace(/function stampLabel\(page,row,font\)\{[\s\S]*?\}\nasync function createFinalPdf/,stampLabel+'\nasync function createFinalPdf');
    if(code===before)throw new Error('Stamp layout patch did not apply');
    const s=document.createElement('script');
    s.textContent=code+'\n//# sourceURL=/assets/ajio-v2-final-ex-test-sku-infer-runtime.js';
    document.body.appendChild(s);
    const st=document.getElementById('status');
    if(st)st.textContent='EX Excel-SKU test loader loaded. Upload Label, Invoice and Excel files.';
  }catch(err){
    console.error(err);
    alert('AJIO EX test engine failed to load.');
  }
})();