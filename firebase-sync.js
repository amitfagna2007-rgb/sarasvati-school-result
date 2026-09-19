(function(){
  const CFG={apiKey:'AIzaSyBgpGHrpdWGgIyG0wYSYDtBOtud7SASJlQ',authDomain:'sarasvati-school-result.firebaseapp.com',projectId:'sarasvati-school-result',storageBucket:'sarasvati-school-result.firebasestorage.app',messagingSenderId:'178995934524',appId:'1:178995934524:web:a290e6ccd3c63811221a39',measurementId:'G-HF2E5D0WSC'};
  const SDK=['https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js'];
  let db=null,auth=null,cloudReady=false,saving=false,started=false,unsub=null;

  function addScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error('Firebase CDN failed'));document.head.appendChild(s);});}
  async function loadSDK(){for(const src of SDK){if(src.includes('firebase-app')&&window.firebase&&firebase.initializeApp)continue;if(src.includes('firebase-auth')&&window.firebase&&firebase.auth)continue;if(src.includes('firebase-firestore')&&window.firebase&&firebase.firestore)continue;await addScript(src);}}

  function localData(){
    const read=(k,f)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch(e){return f;}};
    return {students:read('sbvm2_students',[]),subjects:read('sbvm2_subjects',{}),marks:read('sbvm2_marks',[])};
  }
  function clean(d){
    d=d||{};
    return {
      students:Array.isArray(d.students)?d.students:[],
      subjects:d.subjects&&typeof d.subjects==='object'?d.subjects:{},
      marks:Array.isArray(d.marks)?d.marks:[]
    };
  }
  function putLocal(d){
    d=clean(d);
    localStorage.setItem('sbvm2_students',JSON.stringify(d.students));
    localStorage.setItem('sbvm2_subjects',JSON.stringify(d.subjects));
    localStorage.setItem('sbvm2_marks',JSON.stringify(d.marks));
  }
  function hasData(d){
    d=clean(d);
    return d.students.length>0 || d.marks.length>0 || Object.keys(d.subjects).some(k=>Array.isArray(d.subjects[k])&&d.subjects[k].length);
  }
  function mergeCloudAndLocal(cloud,local){
    const c=clean(cloud),l=clean(local);
    const students=new Map((c.students||[]).map(x=>[String(x.id),x]));
    (l.students||[]).forEach(x=>students.set(String(x.id),x));
    const marks=new Map((c.marks||[]).map(x=>[[
      x.studentId||'',x.cls||'',x.sec||'',x.exam||'',String(x.subject||'').trim().toLowerCase()
    ].join('|'),x]));
    (l.marks||[]).forEach(x=>marks.set([
      x.studentId||'',x.cls||'',x.sec||'',x.exam||'',String(x.subject||'').trim().toLowerCase()
    ].join('|'),x));
    const subjects=JSON.parse(JSON.stringify(c.subjects||{}));
    Object.keys(l.subjects||{}).forEach(cls=>{
      if(!Array.isArray(subjects[cls]))subjects[cls]=[];
      (l.subjects[cls]||[]).forEach(sub=>{
        if(!subjects[cls].some(x=>String(x).trim().toLowerCase()===String(sub).trim().toLowerCase()))subjects[cls].push(sub);
      });
    });
    return {students:[...students.values()],subjects,marks:[...marks.values()]};
  }
  function same(a,b){return JSON.stringify(clean(a))===JSON.stringify(clean(b));}
  function recoverySave(d){
    try{const data=clean(d||localData());if(!hasData(data))return;localStorage.setItem('sbvm2_recovery_backup',JSON.stringify({savedAt:new Date().toISOString(),...data}));}catch(e){}
  }
  function notifyUpdate(){window.dispatchEvent(new CustomEvent('sbvm-cloud-update'));}

  function userRef(){
    const u=auth&&auth.currentUser;
    if(!u)throw new Error('Not authenticated');
    return db.collection('users').doc(u.uid).collection('schoolData').doc('main');
  }

  async function cloudSave(){
    if(!cloudReady||saving)return false;
    saving=true;
    try{
      const ref=userRef();
      const local=localData();
      recoverySave(local);
      // A normal local save is authoritative. Do not merge with the old cloud
      // snapshot here, otherwise deleted students/subjects/marks would come back.
      await ref.set({...local,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      return true;
    }catch(e){console.warn('Cloud sync save failed',e);return false;}
    finally{saving=false;}
  }

  async function initialSync(){
    const ref=userRef();
    const local=localData();
    recoverySave(local);
    const snap=await ref.get();
    if(snap.exists){
      const cloud=clean(snap.data());
      const merged=mergeCloudAndLocal(cloud,local);
      // Never replace non-empty local data with an empty/stale cloud snapshot.
      if(hasData(merged) && !same(merged,local)){putLocal(merged);notifyUpdate();}
      if(hasData(merged))await ref.set({...merged,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    }else if(hasData(local)){
      await ref.set({...local,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    }
    if(unsub)unsub();
    unsub=ref.onSnapshot(s=>{
      if(!s.exists||saving)return;
      const incoming=clean(s.data()),now=localData();
      // Cloud changes from another device are authoritative. Do not union
      // records here, because a union would resurrect items deleted locally.
      if(hasData(incoming)&&!same(incoming,now)){
        recoverySave(now);
        putLocal(incoming);
        notifyUpdate();
      }
    });
  }

  function wrapSave(){
    if(typeof window.save!=='function'||window.save._autoCloudWrapped)return;
    const original=window.save;
    const wrapped=function(){original();recoverySave();setTimeout(()=>cloudSave(),50);};
    wrapped._autoCloudWrapped=true;
    window.save=wrapped;
  }
  async function restoreFromCloud(){
    if(!cloudReady)throw new Error('पहले School Result Login करें।');
    const local=localData();
    recoverySave(local);
    const ref=userRef();
    const snap=await ref.get();
    if(!snap.exists)throw new Error('इस account के cloud में कोई saved school data नहीं मिला।');
    const cloud=clean(snap.data());
    if(!hasData(cloud))throw new Error('Cloud record मिला, लेकिन उसमें विद्यार्थी/अंक/विषय data नहीं है।');
    recoverySave(cloud);
    putLocal(cloud);
    notifyUpdate();
    return {students:cloud.students.length,marks:cloud.marks.length,subjects:Object.keys(cloud.subjects).length};
  }
  function expose(){window.sbvmCloud={get ready(){return cloudReady;},save:cloudSave,restore:restoreFromCloud,status:()=>({ready:cloudReady,loggedIn:!!(auth&&auth.currentUser),uid:auth&&auth.currentUser?auth.currentUser.uid:null})};}
  window.addEventListener('sbvm-local-save',()=>{recoverySave();cloudSave();});

  async function start(){
    if(started)return;
    started=true;expose();
    try{
      await loadSDK();
      if(!window.firebase||!firebase.auth||!firebase.firestore)throw new Error('Firebase SDK incomplete');
      if(!firebase.apps.length)firebase.initializeApp(CFG);
      auth=firebase.auth();db=firebase.firestore();
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      auth.onAuthStateChanged(async user=>{
        if(!user){cloudReady=false;expose();return;}
        cloudReady=true;expose();wrapSave();
        try{await initialSync();}catch(e){console.warn('Initial cloud sync unavailable:',e);}
      });
      setInterval(()=>cloudSave(),10000);
      window.addEventListener('online',cloudSave);
    }catch(e){console.warn('Automatic cloud sync unavailable:',e.message);wrapSave();}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0),{once:true});else setTimeout(start,0);
})();