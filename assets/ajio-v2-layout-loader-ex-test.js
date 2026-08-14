(async function(){
'use strict';
window.AJIO_V2_LAYOUT_VERSION='v2-test-manual-leftover-retry';
const source='/assets/ajio-v2-final-v5.js?v=20260814-manual-leftover-retry';
const extractFnPatch=`function extractFn(t){
  const fix=v=>{let s=clean(v).toUpperCase().replace(/[\\u2013\\u2014]/g,'-').replace(/[^A-Z0-9]/g,'');s=s.replace(/^(ORDERNUMBER|ORDERNO|ORDER)/,'');const m=s.match(/^([A-Z]{1,8})([0-9O]{4,})/);if(!m)return'';if(m[1]==='AWB'||m[1]==='SF')return'';return m[1]+m[2].replace(/O/g,'0')};
  const raw=clean(t).toUpperCase().replace(/[\\u2013\\u2014]/g,'-');
  let m=raw.match(/\\bORDER\\s*(?:NUMBER|NO|#)?\\s*[:\\-]?\\s*([A-Z]{1,8}\\s*[0-9O]{4,})/i);if(m){const id=fix(m[1]);if(id)return id;}
  const c=compact(t).replace(/EXO/g,'EX0').replace(/FNO/g,'FN0');m=c.match(/(?:FN|EX)[0-9O]{6,}/);if(m)return fix(m[0]);m=c.match(/(?!SF)[A-Z]{2,4}[0-9O]{6,}/);return m?fix(m[0]):'';
}`;
const collectAmountPatch=`function collectAmount(t){
  const u=normalize(t);let m=u.match(/COLLECT\\s*(?:RS)?\\s*(\\d+(?:\\.\\d+)?)/);if(m)return m[1];
  m=u.match(/COLLECT[\\s\\S]{0,90}\\b(?:COD|NONCOD)\\b\\s*(?:RS)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:RS)?/);if(m)return m[1];
  m=u.match(/TOTAL\\s+INVOICE\\s+VALUE\\s+(\\d+(?:\\.\\d+)?)/);if(m)return m[1];
  m=u.match(/TOTAL\\s*:?\\s*\\d+\\s+[\\d.]+\\s+[\\d.]+\\s+[\\d.]+\\s+(\\d+(?:\\.\\d+)?)/);return m?m[1]:'';
}`;
const invoiceRecordsPatch=`async function invoiceRecords(files){
  const pages=await pageTexts(files,'Invoice',8,30);
  const out=[];
  const isStart=p=>/Tax\\s*Invoice\\s*No\\s*:/i.test(p.text)||(/GSTIN\\s*:/i.test(p.text)&&/Original\\s+for\\s+Recipient/i.test(p.text));
  for(let i=0;i<pages.length;i++){
    const pg=pages[i];
    if(!isStart(pg))continue;
    const group=[pg];
    for(let j=i+1;j<pages.length&&pages[j].source===pg.source&&!isStart(pages[j]);j++)group.push(pages[j]);
    const text=group.map(p=>p.text).join(' ');
    const fn=extractFn(text),awb=extractAwbStrict(text)||extractAwbCandidate(text),skuItems=invoiceSkuItems(text);
    out.push({file:pg.file,source:pg.source,page:pg.page,pageIndex:pg.pageIndex,invoicePages:group.map(p=>({file:p.file,source:p.source,page:p.page,pageIndex:p.pageIndex})),text,fn,awb,skuItems,sku:skuText(skuItems),profile:profile(text,'invoice')});
  }
  return out;
}`;
const retryManualMatchesPatch=`function retryCourierText(t){const u=normalize(t);if(/SHADOWFAX/.test(u)||/SHIPMENT\\s*#\\s*S\\b/.test(u))return'S';if(/XPRESSBEES|XPRESS/.test(u)||/SHIPMENT\\s*#\\s*X\\b/.test(u))return'X';if(/DELHIVERY/.test(u)||/SHIPMENT\\s*#\\s*D\\b/.test(u))return'D';if(/BLUEDART|BLUE\\s*DART/.test(u)||/SHIPMENT\\s*#\\s*B\\b/.test(u))return'B';return''}
function retryInvoiceKey(inv){return (inv.source||0)+':'+(inv.pageIndex||0)}
function retryNum(v){const n=Number(String(v||'').replace(/[^0-9.]/g,''));return Number.isFinite(n)?n:0}
function retryManualMatches(matches,invoices,excelData){
  const used=new Set();
  matches.forEach(m=>{if(m.invoice&&m.confidence!=='UNSAFE')used.add(retryInvoiceKey(m.invoice))});
  return matches.map(m=>{
    if(m.confidence!=='UNSAFE'||m.invoice)return m;
    const label=m.label, lp=label.profile||{}, lPins=lp.pins||[], lCourier=retryCourierText(label.text||''), lPay=lp.pay||'', lAmt=retryNum(lp.amount);
    const ranked=invoices.filter(inv=>!used.has(retryInvoiceKey(inv))).map(inv=>{
      const ip=inv.profile||{}, pinOk=(ip.pins||[]).some(p=>lPins.includes(p));
      const nameOk=!!(lp.name&&ip.full&&ip.full.includes(lp.name));
      const cov=coverage(lp.tokens||new Set(),ip.fullTokens||new Set());
      const commonUseful=cov.list.filter(x=>!/^\\d{6}$/.test(x)&&x!==lp.name).length;
      const iCourier=retryCourierText(inv.text||''), courierOk=!!(lCourier&&iCourier&&lCourier===iCourier);
      const payOk=!!(lPay&&ip.pay&&lPay===ip.pay);
      const iAmt=retryNum(ip.amount), amountOk=!!(lAmt>0&&iAmt>0&&Math.abs(lAmt-iAmt)<=0.75);
      let score=0;if(pinOk)score+=35;if(nameOk)score+=25;score+=Math.min(32,cov.count*8);if(commonUseful>=2)score+=10;if(courierOk)score+=12;if(payOk)score+=6;if(amountOk)score+=22;if(label.awb&&inv.awb&&label.awb===inv.awb)score+=45;
      const safe=pinOk&&nameOk&&cov.count>=3&&(commonUseful>=2||amountOk)&&(courierOk||payOk||amountOk);
      const parts=[];if(pinOk)parts.push('pincode');if(nameOk)parts.push('name');parts.push('common '+cov.count);if(courierOk)parts.push('courier');if(payOk)parts.push('payment');if(amountOk)parts.push('amount');
      return{inv,score,safe,common:cov.list.slice(0,16).join(' '),parts:parts.join(' + ')}
    }).sort((a,b)=>b.score-a.score);
    const best=ranked[0],second=ranked[1];
    const safeCount=ranked.filter(x=>x.safe&&x.score>=70).length;
    if(best&&best.safe&&best.score>=70&&((best.score-(second?second.score:0))>=12||safeCount===1)){
      used.add(retryInvoiceKey(best.inv));
      return{...m,invoice:best.inv,matchedOrder:best.inv.fn||m.matchedOrder,confidence:'MANUAL_RETRY_VERIFIED',status:'WARN',score:best.score,second:second?second.score:0,common:best.common,reason:'Manual-check leftover matched unused invoice: '+best.parts};
    }
    return m;
  })
}`;
const enrichRowsPatch=`function excelByInvoiceSku(invItems,excelData){
  const inv=(invItems||[]).map(i=>skuKey(i.sku)).filter(Boolean);if(!inv.length)return null;
  const recs=(excelData.records||[]).filter(r=>{const ex=(r.skuItems||[]).map(i=>skuKey(i.sku)).filter(Boolean);return ex.length===inv.length&&inv.every(k=>ex.includes(k))});
  return recs.length===1?recs[0]:null;
}
function enrichRows(matches,excelData){return matches.map(m=>{
  const invItems=m.invoice?(m.invoice.skuItems||[]):[];let matchedOrder=m.matchedOrder||'';let ex=matchedOrder?excelData.byOrder.get(matchedOrder):null;
  if(!ex&&m.invoice&&m.invoice.fn){matchedOrder=m.invoice.fn;ex=excelData.byOrder.get(matchedOrder)||null;}
  if(!ex&&invItems.length){const bySku=excelByInvoiceSku(invItems,excelData);if(bySku){ex=bySku;matchedOrder=bySku.orderId;}}
  const fallback=(!ex&&invItems.length&&m.confidence!=='UNSAFE')?{skuItems:invItems,sku:skuText(invItems),bagBarcode:'',source:'invoice'}:null;
  let status=m.status,notes=[m.reason],skuSource='excel';
  if(ex){if(m.confidence==='UNSAFE'){m.confidence='EXACT_EXCEL';status='WARN';notes.push('Label/order matched Excel; invoice/customer match missing')}if(m.invoice&&m.invoice.fn&&matchedOrder===m.invoice.fn&&!m.matchedOrder)notes.push('Order number recovered from invoice ORDER NUMBER');if(!m.matchedOrder&&matchedOrder)notes.push('Order number recovered from unique Excel SKU match');if(m.confidence==='MANUAL_RETRY_VERIFIED')notes.push('Manual-check leftover matched by name + address + pincode against unused invoice');if(!ex.bagBarcode)notes.push('Bag barcode missing')}
  else if(fallback){status='WARN';notes.push('Excel order not found; SKU used from invoice, bag barcode missing');skuSource='invoice'}
  else{status=m.confidence==='UNSAFE'?'ERROR':'WARN';notes.push('Excel order not found; invoice SKU not found');skuSource='missing'}
  const data=ex||fallback;return{...m,matchedOrder,excel:ex,stampData:data,status,sku:data?data.sku:'',skuItems:data?data.skuItems:[],bagBarcode:data?data.bagBarcode:'',skuSource,notes:notes.join(' | ')}
})}`;
const sortRowsPatch=`function courierCode(row){const t=normalize(((row.label&&row.label.text)||'')+' '+((row.invoice&&row.invoice.text)||''));if(/SHADOWFAX/.test(t)||/SHIPMENT\\s*#\\s*S\\b/.test(t))return'S';if(/XPRESSBEES|XPRESS/.test(t)||/SHIPMENT\\s*#\\s*X\\b/.test(t))return'X';if(/DELHIVERY/.test(t)||/SHIPMENT\\s*#\\s*D\\b/.test(t))return'D';if(/BLUEDART|BLUE\\s*DART/.test(t)||/SHIPMENT\\s*#\\s*B\\b/.test(t))return'B';return'Z'}
function courierRank(row){return {S:0,X:1,D:2,B:3}[courierCode(row)]??9}
function totalRowQty(row){const items=row.skuItems||[];return Math.max(1,items.reduce((s,i)=>s+qty(i.qty),0))}
function isComboRow(row){const items=row.skuItems||[];return items.length>1||totalRowQty(row)>1}
function sortSkuText(row){return(row.skuItems||[]).map(i=>sanitizeSku(i.sku)).filter(Boolean).join(' + ')||sanitizeSku(row.sku||'')}
function sortRows(rows){return rows.slice().sort((a,b)=>{
  const ga=!a.sku?3:(isComboRow(a)?2:0),gb=!b.sku?3:(isComboRow(b)?2:0);if(ga!==gb)return ga-gb;
  if(ga===2){const qa=totalRowQty(a),qb=totalRowQty(b);if(qa!==qb)return qa-qb;}
  const skuCmp=coll.compare(sortSkuText(a),sortSkuText(b));if(skuCmp)return skuCmp;
  const ca=courierRank(a),cb=courierRank(b);if(ca!==cb)return ca-cb;
  const bagCmp=coll.compare(a.bagBarcode||'',b.bagBarcode||'');if(bagCmp)return bagCmp;
  return coll.compare(a.matchedOrder||'',b.matchedOrder||'')
})}`;
const createFinalPdfPatch=`async function createFinalPdf(rows){
  const labelDocs=[];for(const f of labelFiles)labelDocs.push(await PDFLib.PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:false}));
  const invDocs=[];for(const f of invoiceFiles)invDocs.push(await PDFLib.PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:false}));
  const out=await PDFLib.PDFDocument.create(),font=await out.embedFont(PDFLib.StandardFonts.Helvetica);
  for(let i=0;i<rows.length;i++){setStatus('Creating PDF '+(i+1)+'/'+rows.length,85+(i/Math.max(1,rows.length))*12);const r=rows[i];const[lp]=await out.copyPages(labelDocs[r.label.source],[r.label.pageIndex]);out.addPage(lp);stampLabel(lp,r,font);if(r.invoice){const pages=(r.invoice.invoicePages&&r.invoice.invoicePages.length)?r.invoice.invoicePages:[r.invoice];for(const pg of pages){const[ip]=await out.copyPages(invDocs[pg.source],[pg.pageIndex]);out.addPage(ip)}}}
  return await out.save()
}`;
const lineGroupsPatch=`function lineGroups(items){const p=(items||[]).map(i=>sanitizeSku(i.sku)+(qty(i.qty)>1?' ('+qty(i.qty)+')':'')).filter(Boolean);const n=p.length;if(n<=1)return p.length?[p]:[];if(n===2)return[[p[0]],[p[1]]];if(n===3)return[[p[0],p[1]],[p[2]]];if(n===4)return[[p[0],p[1]],[p[2],p[3]]];if(n<=6)return[p.slice(0,3),p.slice(3)];if(n<=9)return[p.slice(0,3),p.slice(3,6),p.slice(6)];return[p.slice(0,4),p.slice(4,7),p.slice(7,10)]}`;
try{
 const res=await fetch(source,{cache:'no-store'});if(!res.ok)throw new Error('Cannot load AJIO V2 base engine');let code=await res.text();
 code=code.replace("function extractFn(t){const m=compact(t).match(/FN\\d{8,}/);return m?m[0]:''}",extractFnPatch);
 code=code.replace(/function collectAmount\(t\)\{[\s\S]*?\}\nfunction paymentType/,collectAmountPatch+'\nfunction paymentType');
 code=code.replace(/async function invoiceRecords\(files\)\{[\s\S]*?\}\nasync function labelRecords/,invoiceRecordsPatch+'\nasync function labelRecords');
 code=code.replace(/function findHeaderIndex/,retryManualMatchesPatch+'\nfunction findHeaderIndex');
 code=code.replace(/function enrichRows\(matches,excelData\)\{[\s\S]*?\}\nfunction sortRows/,enrichRowsPatch+'\nfunction sortRows');
 code=code.replace(/function sortRows\(rows\)\{[\s\S]*?\}\nfunction lineGroups/,sortRowsPatch+'\nfunction lineGroups');
 code=code.replace(/function lineGroups\(items\)\{[\s\S]*?\}\nfunction cleanLine/,lineGroupsPatch+'\nfunction cleanLine');
 code=code.replace("if(!/^FN\\d{6,}$/i.test(id))continue;","if(!id||id==='-'||id==='NA'||id==='N/A'||!/^[A-Z0-9]{6,}$/i.test(id)||!/[A-Z]/.test(id)||!/\\d/.test(id))continue;");
 code=code.replace("invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: optional / not selected';","invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: not selected';");
 code=code.replace(/runBtn\.disabled=!\(labelFiles\.length&&excelFiles\.length\)/g,"runBtn.disabled=!(labelFiles.length&&invoiceFiles.length&&excelFiles.length)");
 code=code.replace("setStatus('Upload Label and Excel files. Invoice is optional but recommended.',0);","setStatus('Upload Label, Invoice and Excel files.',0);");
 code=code.replace("else setStatus('No invoice PDFs uploaded. Using label + Excel only…',8);","else throw new Error('Invoice PDF is required.');");
 code=code.replace(/qc=col\(h,\[[^\]]*Confirm Quantity[^\]]*\],17\)/,"qc=col(h,['*Confirm Quantity','Confirm Quantity'],20)");
 code=code.replace("const sorted=sortRows(enrichRows(matchLabels(labels,invoices,excelData),excelData));","const sorted=sortRows(enrichRows(retryManualMatches(matchLabels(labels,invoices,excelData),invoices,excelData),excelData));");
 const stamp=`function stampLabel(page,row,font){const {width,height}=page.getSize();let groups=[],orderLine='';if(row.stampData&&row.confidence!=='UNSAFE'){groups=lineGroups(row.stampData.skuItems).map(g=>g.map(cleanLine).filter(Boolean)).filter(g=>g.length);orderLine=cleanLine(row.bagBarcode||'')}else{groups=[['MANUAL CHECK']];orderLine=''}const rightAnchor=width*.935,minX=width*.30,bottomBase=height*.052,topLimit=height*.185,maxW=rightAnchor-minX,measure=(t,s)=>font.widthOfTextAtSize(t,s);const lines=groups.map(g=>cleanLine(g.join(' + '))).filter(Boolean).concat(orderLine?[orderLine]:[]).filter(Boolean);let fit=null;for(let size=7.8;size>=3.35;size-=.15){const lh=size+2.7,w=Math.max(25,...lines.map(t=>measure(t,size))),h=(lines.length-1)*lh+size;if(w<=maxW&&bottomBase+h<=topLimit){fit={lines,size,lh,w,h};break}}if(!fit){const size=3.3,lh=5.75;fit={lines,size,lh,w:Math.min(maxW,Math.max(25,...lines.map(t=>measure(t,size)))),h:(lines.length-1)*lh+size}}const x=Math.max(minX,rightAnchor-fit.w),yb=bottomBase;page.drawRectangle({x:x-3,y:yb-2,width:Math.min(maxW,fit.w)+6,height:fit.h+5,color:PDFLib.rgb(1,1,1),opacity:.97});fit.lines.forEach((t,i)=>page.drawText(t,{x,y:yb+(fit.lines.length-1-i)*fit.lh,size:fit.size,font,color:PDFLib.rgb(0,0,0)}))}`;
 code=code.replace(/function stampLabel\(page,row,font\)\{[\s\S]*?\}\nasync function createFinalPdf/,stamp+'\nasync function createFinalPdf');
 code=code.replace(/async function createFinalPdf\(rows\)\{[\s\S]*?\}\nfunction show/,createFinalPdfPatch+'\nfunction show');
 const s=document.createElement('script');s.textContent=code+'\n//# sourceURL=/assets/ajio-v2-final-v2-test-manual-leftover-retry-runtime.js';document.body.appendChild(s);const st=document.getElementById('status');if(st)st.textContent='V2 manual leftover retry test loaded. Upload Label, Invoice and Excel files.';
}catch(err){console.error(err);alert('AJIO V2 test engine failed to load.');}
})();