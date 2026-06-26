(async function(){
  'use strict';
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
      orderLine=row.bagBarcode||row.matchedOrder||'';
    }else{
      groups=[['MANUAL CHECK']];
      orderLine=row.matchedOrder||'';
    }
    const rightAnchor=width*.94;
    const bottomBase=height*.052;
    const minX=width*.035;
    const maxW=rightAnchor-minX;
    const maxH=height*.24;
    const measure=(t,s)=>font.widthOfTextAtSize(t,s);
    const makeLines=(gs)=>gs.map(g=>cleanLine(g.join(' + '))).filter(Boolean).concat(orderLine?[cleanLine(orderLine)]:[]).filter(Boolean);
    let fit=null, working=groups.map(g=>g.slice());
    for(let pass=0;pass<6&&!fit;pass++){
      const lines=makeLines(working);
      for(let size=7.5;size>=4.6;size-=.25){
        const lh=size+3.1;
        const w=Math.max(35,...lines.map(t=>measure(t,size)));
        const h=(lines.length-1)*lh+size;
        if(w<=maxW&&h<=maxH){fit={lines,size,lh,w,h};break;}
      }
      if(fit)break;
      let idx=-1,maxLen=-1;
      working.forEach((g,i)=>{if(g.length>1&&g.join(' + ').length>maxLen){idx=i;maxLen=g.join(' + ').length;}});
      if(idx<0)break;
      const g=working[idx];
      const mid=Math.ceil(g.length/2);
      working.splice(idx,1,g.slice(0,mid),g.slice(mid));
    }
    if(!fit){
      const lines=makeLines(working);
      const size=4.5,lh=7.4;
      fit={lines,size,lh,w:Math.min(maxW,Math.max(35,...lines.map(t=>measure(t,size)))),h:(lines.length-1)*lh+size};
    }
    let x=rightAnchor-fit.w;
    if(x<minX)x=minX;
    let yb=bottomBase;
    if(yb+fit.h>height*.305)yb=Math.max(height*.018,height*.305-fit.h);
    page.drawRectangle({x:x-4,y:yb-3,width:fit.w+8,height:fit.h+8,color:PDFLib.rgb(1,1,1),opacity:.97});
    fit.lines.forEach((t,i)=>page.drawText(t,{x,y:yb+(fit.lines.length-1-i)*fit.lh,size:fit.size,font,color:PDFLib.rgb(0,0,0)}));
  }`;
  try{
    const res=await fetch(source,{cache:'no-store'});
    if(!res.ok)throw new Error('Cannot load AJIO V2 base engine');
    let code=await res.text();
    code=code.replace(/function lineGroups\(items\)\{[\s\S]*?\}\nfunction cleanLine/,lineGroups+'\nfunction cleanLine');
    code=code.replace(/function stampLabel\(page,row,font\)\{[\s\S]*?\}\nasync function createFinalPdf/,stampLabel+'\nasync function createFinalPdf');
    const s=document.createElement('script');
    s.textContent=code+'\n//# sourceURL=/assets/ajio-v2-final-v6-runtime.js';
    document.body.appendChild(s);
  }catch(err){
    console.error(err);
    alert('AJIO V2 engine failed to load. Please hard refresh and try again.');
  }
})();