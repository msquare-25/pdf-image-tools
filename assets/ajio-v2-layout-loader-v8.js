(async function(){
  'use strict';
  window.AJIO_V2_LAYOUT_VERSION='v8-bottom-right-cell';
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
    let skuUnits=[];
    let orderLine='';
    if(row.stampData&&row.confidence!=='UNSAFE'){
      skuUnits=(row.stampData.skuItems||[]).map(i=>cleanLine(sanitizeSku(i.sku)+(qty(i.qty)>1?' ('+qty(i.qty)+')':''))).filter(Boolean);
      orderLine=cleanLine(row.bagBarcode||row.matchedOrder||'');
    }else{
      skuUnits=['MANUAL CHECK'];
      orderLine=cleanLine(row.matchedOrder||'');
    }

    // AJIO bottom-right writable cell: keep text inside the right-side column.
    // Long SKU lists wrap upward, not into the return/consignor address area.
    const rightAnchor=width*.936;
    const minX=width*.715;
    const bottomBase=height*.060;
    const topLimit=height*.350;
    const maxW=rightAnchor-minX;
    const maxH=topLimit-bottomBase;
    const measure=(t,s)=>font.widthOfTextAtSize(t,s);

    function packLines(units,size){
      const lines=[];
      let cur='';
      for(const unit of units){
        const next=cur?cur+' + '+unit:unit;
        if(cur && measure(next,size)>maxW){
          lines.push(cur);
          cur=unit;
        }else{
          cur=next;
        }
      }
      if(cur)lines.push(cur);
      if(orderLine)lines.push(orderLine);
      return lines.map(cleanLine).filter(Boolean);
    }

    let fit=null;
    for(let size=7.2;size>=3.6;size-=.2){
      const lines=packLines(skuUnits,size);
      const lh=size+2.8;
      const w=Math.max(25,...lines.map(t=>measure(t,size)));
      const h=(lines.length-1)*lh+size;
      if(w<=maxW && h<=maxH){fit={lines,size,lh,w,h};break;}
    }
    if(!fit){
      const size=3.4,lh=6.0;
      const lines=packLines(skuUnits,size);
      fit={lines,size,lh,w:Math.min(maxW,Math.max(25,...lines.map(t=>measure(t,size)))),h:(lines.length-1)*lh+size};
    }

    const x=Math.max(minX,rightAnchor-fit.w);
    let yb=bottomBase;
    if(yb+fit.h>topLimit)yb=Math.max(height*.018,topLimit-fit.h);

    page.drawRectangle({x:x-3,y:yb-2.5,width:Math.min(maxW,fit.w)+6,height:fit.h+6,color:PDFLib.rgb(1,1,1),opacity:.97});
    fit.lines.forEach((t,i)=>page.drawText(t,{x,y:yb+(fit.lines.length-1-i)*fit.lh,size:fit.size,font,color:PDFLib.rgb(0,0,0)}));
  }`;
  try{
    const res=await fetch(source,{cache:'no-store'});
    if(!res.ok)throw new Error('Cannot load AJIO V2 base engine');
    let code=await res.text();
    code=code.replace(/qc=col\(h,\[[^\]]*Confirm Quantity[^\]]*\],17\)/,"qc=col(h,['*Confirm Quantity','Confirm Quantity'],20)");
    code=code.replace(/function lineGroups\(items\)\{[\s\S]*?\}\nfunction cleanLine/,lineGroups+'\nfunction cleanLine');
    const before=code;
    code=code.replace(/function stampLabel\(page,row,font\)\{[\s\S]*?\}\nasync function createFinalPdf/,stampLabel+'\nasync function createFinalPdf');
    if(code===before)throw new Error('Stamp layout patch did not apply');
    const s=document.createElement('script');
    s.textContent=code+'\n//# sourceURL=/assets/ajio-v2-final-v8-runtime.js';
    document.body.appendChild(s);
    const st=document.getElementById('status');
    if(st)st.textContent='V8 bottom-right layout loaded. Upload Label and Excel files.';
  }catch(err){
    console.error(err);
    alert('AJIO V2 v8 engine failed to load. Please hard refresh and try again.');
  }
})();