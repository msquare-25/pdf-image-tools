(function(){
  'use strict';
  window.AJIO_V2_LAYOUT_VERSION='live-final-manual-leftover-retry';
  const s=document.createElement('script');
  s.src='/assets/ajio-v2-layout-loader-ex-test.js?v=20260814-live-final';
  s.onload=function(){
    setTimeout(function(){
      const st=document.getElementById('status');
      if(st && /test/i.test(st.textContent||'')){
        st.textContent='AJIO live final loaded. Upload Label, Invoice and Excel files.';
      }
    },0);
  };
  s.onerror=function(){
    alert('AJIO engine failed to load. Please hard refresh and try again.');
  };
  document.body.appendChild(s);
})();