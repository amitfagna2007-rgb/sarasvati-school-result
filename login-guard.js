(function(){
  const KEY='sbvm2_login_confirmed_v2';
  let auth=null,attempting=false,started=false;
  const show=()=>{const g=document.getElementById('firebaseGate');if(g)g.style.display='flex';};
  const hide=()=>{const g=document.getElementById('firebaseGate');if(g)g.style.display='none';};
  const note=t=>{const e=document.getElementById('firebaseMsg');if(e)e.textContent=t;};
  document.addEventListener('click',function(e){
    const id=e.target&&e.target.id;
    if(id==='fbLogin'||id==='fbSignup') attempting=true;
    if(id==='fbOut'){attempting=false;localStorage.removeItem(KEY);show();note('Email और Password डालकर Login करें।');}
  },true);
  function boot(){
    if(started)return;
    if(!window.firebase||!firebase.auth){setTimeout(boot,300);return;}
    started=true;auth=firebase.auth();
    auth.onAuthStateChanged(function(u){
      const confirmed=localStorage.getItem(KEY)==='1';
      if(u){
        if(confirmed){hide();return;}
        if(attempting){localStorage.setItem(KEY,'1');hide();return;}
        auth.signOut().finally(function(){show();note('पहली बार Email और Password से Login करें।');});
      }else{
        show();
        if(!attempting)note('Email और Password डालकर Login करें।');
      }
      attempting=false;
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();