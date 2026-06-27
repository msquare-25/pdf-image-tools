(async function(){
const r=await fetch('/assets/ajio-v2-final-v5.js?v=20260626-5',{cache:'no-store'});
let code=await r.text();
const s=document.createElement('script');
s.textContent=code;
document.body.appendChild(s);
})();
