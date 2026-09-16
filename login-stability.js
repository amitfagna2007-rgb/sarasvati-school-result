// Login stability patch: prevent the old in-page auto-update checker from reloading the form while typing.
(function(){
  function disableUpdateReload(){
    if(typeof window.checkForUpdate==='function'){
      window.checkForUpdate=function(manual){
        const s=document.getElementById('updateStatus');
        if(manual&&s)s.textContent='Automatic update check is disabled while Login is active.';
        return Promise.resolve(false);
      };
    }
  }
  disableUpdateReload();
  window.addEventListener('load',function(){disableUpdateReload();setTimeout(disableUpdateReload,50);setTimeout(disableUpdateReload,500);},false);
})();
