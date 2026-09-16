(function(){
  const CFG={apiKey:'AIzaSyCORJ_E8w5G7h0-z65vy22SSB4_UcJY_tw',authDomain:'sarasvati-school-result.firebaseapp.com',projectId:'sarasvati-school-result',storageBucket:'sarasvati-school-result.firebasestorage.app',messagingSenderId:'178995934524',appId:'1:178995934524:web:2d00528bf6116a4a221a39',measurementId:'G-8X48NY379L'};
  const SDK=['https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js'];
  let db,auth,user,unsub=null,syncing=false;
  const $=id=>document.getElementById(id);
  function addScript(src){return new Promise((resolve,reject)=>{let s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
  function ui(){
    if($('firebaseLogin'))return;
    const st=document.createElement('style');st.textContent='#firebaseGate{position:fixed;inset:0;background:#f3f6fa;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}#firebaseLogin{width:min(430px,100%);background:#fff;border-radius:16px;padding:22px;box-shadow:0 8px 30px #0002}#firebaseLogin h2{margin-top:0;color:#173f67}#firebaseLogin input{width:100%;margin:6px 0}#firebaseLogin button{width:100%;margin-top:8px}#firebaseMsg{margin-top:10px;padding:9px;border-radius:8px;background:#fff7d6}#accountBar{position:fixed;right:10px;bottom:10px;z-index:20;background:#fff;padding:8px 10px;border-radius:10px;box-shadow:0 2px 12px #0002;font-size:12px}';document.head.appendChild(st);
    const gate=document.createElement('div');gate.id='firebaseGate';gate.innerHTML='<div id="firebaseLogin"><h2>🔐 Sarasvati School Result</h2><p>मोबाइल और लैपटॉप में data sync करने के लिए Login करें।</p><input id="fbEmail" type="email" placeholder="Email address" autocomplete="email"><input id="fbPass" type="password" placeholder="Password" autocomplete="current-password"><button id="fbLogin">Login</button><button id="fbSignup" class="secondary">नया Account बनाएं</button><div id="firebaseMsg">Firebase connect हो रहा है...</div></div>';document.body.prepend(gate);
    $('fbLogin').onclick=()=>login(false);$('fbSignup').onclick=()=>login(true);
  }
  function msg(t,ok){let e=$('firebaseMsg');if(e){e.textContent=t;e.className=ok?'success':'';}}
  function showApp(){let g=$('firebaseGate');if(g)g.style.display='none';if(!$('accountBar')){let b=document.createElement('div');b.id='accountBar';b.innerHTML='<span id="fbUser"></span> <button style="width:auto;margin:0;padding:5px 8px" id="fbOut">Logout</button>';document.body.appendChild(b);$('fbOut').onclick=()=>auth.signOut();}$('fbUser').textContent=user.email;}
  function hideApp(){let g=$('firebaseGate');if(g)g.style.display='flex';let b=$('accountBar');if(b)b.remove();}
  async function login(signup){let email=$('fbEmail').value.trim(),pass=$('fbPass').value;if(!email||pass.length<6)return msg('सही email और कम से कम 6 character का password डालें।');try{msg(signup?'Account बनाया जा रहा है...':'Login हो रहा है...');if(signup)await auth.createUserWithEmailAndPassword(email,pass);else await auth.signInWithEmailAndPassword(email,pass);}catch(e){msg((e.code||'error')+': '+(e.message||'Login failed'));}}
  function localData(){return {students:Array.isArray(window.students)?window.students:[],subjects:window.subjects||{},marks:Array.isArray(window.marks)?window.marks:[]};}
  function putLocal(d){window.students=Array.isArray(d.students)?d.students:[];window.subjects=d.subjects&&typeof d.subjects==='object'?d.subjects:{};window.marks=Array.isArray(d.marks)?d.marks:[];localStorage.setItem('sbvm2_students',JSON.stringify(window.students));localStorage.setItem('sbvm2_subjects',JSON.stringify(window.subjects));localStorage.setItem('sbvm2_marks',JSON.stringify(window.marks));if(typeof window.refresh==='function')window.refresh();if(typeof window.loadMarks==='function')window.loadMarks(false);}
  function mergeLocalCloud(cloud,local){
    if(!cloud)return local;
    const sm=new Map((cloud.students||[]).map(x=>[x.id,x]));(local.students||[]).forEach(x=>{if(!sm.has(x.id))sm.set(x.id,x);});
    const mm=new Map((cloud.marks||[]).map(x=>[[(x.studentId||''),x.cls||'',x.sec||'',x.exam||'',x.subject||''].join('|'),x]));(local.marks||[]).forEach(x=>{let k=[x.studentId||'',x.cls||'',x.sec||'',x.exam||'',x.subject||''].join('|');if(!mm.has(k))mm.set(k,x);});
    const sub=Object.assign({},cloud.subjects||{});Object.keys(local.subjects||{}).forEach(c=>{if(!sub[c])sub[c]=local.subjects[c];else local.subjects[c].forEach(s=>{if(!sub[c].includes(s))sub[c].push(s);});});
    return {students:[...sm.values()],subjects:sub,marks:[...mm.values()]};
  }
  async function syncInitial(){
    const ref=db.collection('users').doc(user.uid),snap=await ref.get(),local=localData();
    if(snap.exists){const merged=mergeLocalCloud(snap.data(),local);putLocal(merged);await ref.set({...merged,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}
    else {await ref.set({...local,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});}
    if(unsub)unsub();unsub=ref.onSnapshot(s=>{if(!s.exists||syncing)return;let d=s.data();if(d.students||d.subjects||d.marks)putLocal(d);});
  }
  async function cloudSave(){if(!user||syncing)return;syncing=true;try{let d=localData();await db.collection('users').doc(user.uid).set({...d,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}catch(e){console.warn('Cloud save failed',e);msg('Cloud sync error: '+(e.message||'permission'));}finally{syncing=false;}}
  async function start(){ui();try{for(const s of SDK)await addScript(s);firebase.initializeApp(CFG);auth=firebase.auth();db=firebase.firestore();window.saveLocalOnly=window.save;window.save=function(){if(typeof window.saveLocalOnly==='function')window.saveLocalOnly();cloudSave();};auth.onAuthStateChanged(async u=>{user=u;if(!u){hideApp();msg('Login करें।');return;}showApp();try{await syncInitial();msg('Cloud sync चालू है।',true);}catch(e){msg('Firestore permission error: Firebase Rules check करें।');console.error(e);}});}catch(e){msg('Firebase SDK load नहीं हुआ। Internet connection जाँचें।');console.error(e);}}
  window.addEventListener('load',start);
})();