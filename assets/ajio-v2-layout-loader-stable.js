(async function(){
  'use strict';
  window.AJIO_V2_LAYOUT_VERSION='stable-backup';
  const res=await fetch('/assets/ajio-v2-final-v5.js?v=stable-backup',{cache:'no-store'});
  let code=await res.text();
  code=code.replace("invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: optional / not selected';","invoiceName.textContent=invoiceFiles.length?`Invoice PDF: ${invoiceFiles.length} file(s) selected`:'Invoice PDF: not selected';");
  code=code.replace(/runBtn\.disabled=!\(labelFiles\.length&&excelFiles\.length\)/g,"runBtn.disabled=!(labelFiles.length&&invoiceFiles.length&&excelFiles.length)");
  code=code.replace("setStatus('Upload Label and Excel files. Invoice is optional but recommended.',0);","setStatus('Upload Label, Invoice and Excel files.',0);");
  code=code.replace("else setStatus('No invoice PDFs uploaded. Using label + Excel only…',8);","else throw new Error('Invoice PDF is required.');");
  code=code.replace(/qc=col\(h,\[[^\]]*Confirm Quantity[^\]]*\],17\)/,"qc=col(h,['*Confirm Quantity','Confirm Quantity'],20)");
  const s=document.createElement('script');
  s.textContent=code;
  document.body.appendChild(s);
  const st=document.getElementById('status');
  if(st)st.textContent='Stable backup loaded. Upload Label, Invoice and Excel files.';
})();