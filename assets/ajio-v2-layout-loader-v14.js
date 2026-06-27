(async function(){
  'use strict';
  window.AJIO_V2_LAYOUT_VERSION='v14-customer-order-id-parent-bag-merge';
  const source='/assets/ajio-v2-final-v5.js?v=20260627-parent-bag-merge';
  const extractOrderId=`function extractFn(t){
    const u=normalize(t);
    const byLabel=(u.match(/ORDER\s*(?:#|NO|NUMBER)?\s*[:\-]?\s*([A-Z0-9]{6,30})/)||[])[1];
    if(byLabel&&/[A-Z]/.test(byLabel)&&/\d/.test(byLabel))return byLabel;
    const c=compact(t);
    const preferred=c.match(/(?:FN|EX)\d{6,}[A-Z0-9]*/);
    if(preferred)return preferred[0];
    const any=c.match(/[A-Z]{2,4}\d{6,}[A-Z0-9]*/);
    return any?any[0]:'';
  }`;
  const parseExcel=`async function parseExcel(file){
    const validId=v=>{const id=clean(v).toUpperCase().replace(/\s+/g,'');return id&&id!=='-'&&id!=='NA'&&id!=='N/A'&&id.length>=6&&id.length<=40&&/[A-Z]/.test(id)&&/\d/.test(id)?id:''};
    const validBag=v=>{const b=clean(v).toUpperCase().replace(/\s+/g,'');return b&&b!=='-'&&b!=='NA'&&b!=='N/A'?b:''};
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
    let found=null;
    for(const name of wb.SheetNames){
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:false,defval:''});
      const hi=findHeaderIndex(rows,['Customer Order Id','Seller SKU ID','Forward Consignment Bar Code']);
      if(hi>=0){found={rows,hi};break}
    }
    if(!found)throw new Error('AJIO Order Details header not found in '+file.name);
    const h=found.rows[found.hi],oc=col(h,['Customer Order Id'],1),sc=col(h,['Seller SKU ID'],13),qc=col(h,['*Confirm Quantity','Confirm Quantity'],20),bc=col(h,['Forward Consignment Bar Code'],26),map=new Map();
    let seq=0;
    for(let r=found.hi+1;r<found.rows.length;r++){
      const row=found.rows[r]||[],id=validId(row[oc]);
      if(!id)continue;
      if(!map.has(id))map.set(id,{orderId:id,sequence:seq++,skuMap:new Map(),bagBarcode:''});
      const rec=map.get(id);
      addSku(rec.skuMap,row[sc],row[qc]);
      const bag=validBag(row[bc]);
      if(bag&&!rec.bagBarcode)rec.bagBarcode=bag;
    }
    return Array.from(map.values()).map(r=>{const items=skuItemsFromMap(r.skuMap);return{orderId:r.orderId,sequence:r.sequence,skuItems:items,sku:skuText(items),bagBarcode:r.bagBarcode}});
  }`;
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
    const beforeOrder=code;
    code=code.replace(/function extractFn\(t\)\{const m=compact\(t\)\.match\(\/FN\\d\{8,\}\/\);return m\?m\[0\]:''\}/,extractOrderId);
    if(code===beforeOrder)throw new Error('Customer Order ID patch did not apply');
    const beforeExcel=code;
    code=code.replace(/async function parseExcel\(file\)\{[\s\S]*?\}\nasync function allExcel/,parseExcel+'\nasync function allExcel');
    if(code===beforeExcel)throw new Error('Excel parent bag merge patch did not apply');
    code=code.replace("invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: optional / not selected';","invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: not selected';");
    code=code.replace(/runBtn\.disabled=!\(labelFiles\.length&&excelFiles\.length\)/g,"runBtn.disabled=!(labelFiles.length&&invoiceFiles.length&&excelFiles.length)");
    code=code.replace("setStatus('Upload Label and Excel files. Invoice is optional but recommended.',0);","setStatus('Upload Label, Invoice and Excel files.',0);");
    code=code.replace("else setStatus('No invoice PDFs uploaded. Using label + Excel only…',8);","else throw new Error('Invoice PDF is required.');");
    code=code.replace("notes.push('Bag barcode missing; order number will print in barcode line')","notes.push('Bag barcode missing')");
    code=code.replace(/function lineGroups\(items\)\{[\s\S]*?\}\nfunction cleanLine/,lineGroups+'\nfunction cleanLine');
    const before=code;
    code=code.replace(/function stampLabel\(page,row,font\)\{[\s\S]*?\}\nasync function createFinalPdf/,stampLabel+'\nasync function createFinalPdf');
    if(code===before)throw new Error('Stamp layout patch did not apply');
    const s=document.createElement('script');
    s.textContent=code+'\n//# sourceURL=/assets/ajio-v2-final-v14-parent-bag-merge-runtime.js';
    document.body.appendChild(s);
    const st=document.getElementById('status');
    if(st)st.textContent='V14 parent bag merge loaded. Upload Label, Invoice and Excel files.';
  }catch(err){
    console.error(err);
    alert('AJIO V2 engine failed to load. Please hard refresh and try again.');
  }
})();