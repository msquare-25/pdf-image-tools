(function(){
  'use strict';
  window.AJIO_V2_LAYOUT_VERSION='live-final-multipage-single-before-combo';
  const source='/assets/ajio-v2-layout-loader-ex-test.js?v=20260814-live-final-base-3';
  const oldSort="const ga=!a.sku?3:(isComboRow(a)?2:0),gb=!b.sku?3:(isComboRow(b)?2:0);if(ga!==gb)return ga-gb;";
  const newSort="const group=r=>!r.sku?4:(((r.invoice&&r.invoice.invoicePages&&r.invoice.invoicePages.length>1)?3:(isComboRow(r)?2:0)));const ga=group(a),gb=group(b);if(ga!==gb)return ga-gb;";
  const oldQtySort="if(ga===2){const qa=totalRowQty(a),qb=totalRowQty(b);if(qa!==qb)return qa-qb;}";
  const newQtySort="if(ga===2||ga===3){if(ga===3){const ac=isComboRow(a)?1:0,bc=isComboRow(b)?1:0;if(ac!==bc)return ac-bc;}const qa=totalRowQty(a),qb=totalRowQty(b);if(qa!==qb)return qa-qb;}";
  (async function(){
    try{
      const res=await fetch(source,{cache:'no-store'});
      if(!res.ok)throw new Error('Cannot load AJIO final engine');
      let code=await res.text();
      if(!code.includes(oldSort))throw new Error('Multi-page invoice group patch did not apply');
      if(!code.includes(oldQtySort))throw new Error('Multi-page invoice sub-sort patch did not apply');
      code=code.replace(oldSort,newSort).replace(oldQtySort,newQtySort);
      code=code.replace('V2 manual leftover retry test loaded. Upload Label, Invoice and Excel files.','AJIO live final loaded. Upload Label, Invoice and Excel files.');
      const s=document.createElement('script');
      s.textContent=code+'\n//# sourceURL=/assets/ajio-v2-live-final-multipage-single-before-combo-runtime.js';
      document.body.appendChild(s);
    }catch(err){
      console.error(err);
      alert('AJIO engine failed to load. Please hard refresh and try again.');
    }
  })();
})();