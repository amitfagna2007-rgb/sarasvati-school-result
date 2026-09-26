(function(){
  const CFG={apiKey:'AIzaSyBgpGHrpdWGgIyG0wYSYDtBOtud7SASJlQ',authDomain:'sarasvati-school-result.firebaseapp.com',projectId:'sarasvati-school-result',storageBucket:'sarasvati-school-result.firebasestorage.app',messagingSenderId:'178995934524',appId:'1:178995934524:web:a290e6ccd3c63811221a39',measurementId:'G-HF2E5D0WSC'};
  const SDK=['https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js'];
  let db=null,auth=null,cloudReady=false,saving=false,started=false,unsub=null,lastLocalSaveAt=0;
  function addScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error('Firebase CDN failed'));document.head.appendChild(s);});}
  async function loadSDK(){for(const src of SDK){if(src.includes('firebase-app')&&window.firebase&&firebase.initializeApp)continue;if(src.includes('firebase-auth')&&window.firebase&&firebase.auth)continue;if(src.includes('firebase-firestore')&&window.firebase&&firebase.firestore)continue;await addScript(src);}}
  function readLocal(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch(e){return f;}}
  function localData(){return {students:readLocal('sbvm2_students',[]),subjects:readLocal('sbvm2_subjects',{}),marks:readLocal('sbvm2_marks',[]),marksExams:readLocal('sbvm2_marks_exams',{})}}
  function clean(d){d=d||{};return {students:Array.isArray(d.students)?d.students:[],subjects:d.subjects&&typeof d.subjects==='object'?d.subjects:{},marks:Array.isArray(d.marks)?d.marks:[],marksExams:d.marksExams&&typeof d.marksExams==='object'?d.marksExams:{}};}
  function putLocal(d){d=clean(d);localStorage.setItem('sbvm2_students',JSON.stringify(d.students));localStorage.setItem('sbvm2_subjects',JSON.stringify(d.subjects));localStorage.setItem('sbvm2_marks',JSON.stringify(d.marks));localStorage.setItem('sbvm2_marks_exams',JSON.stringify(d.marksExams));}
  function hasData(d){d=clean(d);return d.students.length>0||d.marks.length>0||Object.values(d.subjects).some(v=>Array.isArray(v)&&v.length);}
  function dataSize(d){d=clean(d);return d.students.length*100+d.marks.length*10+Object.values(d.subjects).reduce((n,v)=>n+(Array.isArray(v)?v.length:0),0)+Object.values(d.marksExams).reduce((n,v)=>n+(Array.isArray(v)?v.length:0),0);}
  function recoveryData(){const b=clean(readLocal('sbvm2_recovery_backup',{}));return hasData(b)?b:null;}
  function studentKey(x){return String(x&&x.id||'');}
  function markKey(x){return [x&&x.studentId||'',x&&x.cls||'',x&&x.sec||'',x&&x.exam||'',String(x&&x.subject||'').trim().toLowerCase()].join('|');}
  function subjectKey(cls,sub){return String(cls||'')+'|'+String(sub||'').trim().toLowerCase();}
  function getTombstones(){return {students:new Set(readLocal('sbvm2_deleted_students',[])),marks:new Set(readLocal('sbvm2_deleted_marks',[])),subjects:new Set(readLocal('sbvm2_deleted_subjects',[]))};}
  function saveTombstones(t){localStorage.setItem('sbvm2_deleted_students',JSON.stringify([...t.students]));localStorage.setItem('sbvm2_deleted_marks',JSON.stringify([...t.marks]));localStorage.setItem('sbvm2_deleted_subjects',JSON.stringify([...t.subjects]));}
  function applyTombstones(d,t){d=clean(d);d.students=d.students.filter(x=>!t.students.has(studentKey(x)));d.marks=d.marks.filter(x=>!t.marks.has(markKey(x))&&!t.students.has(String(x.studentId||'')));const sub={};Object.keys(d.subjects).forEach(cls=>{sub[cls]=(Array.isArray(d.subjects[cls])?d.subjects[cls]:[]).filter(s=>!t.subjects.has(subjectKey(cls,s)));});d.subjects=sub;return d;}
  function rememberDeletions(previous,current){
    const t=getTombstones(),p=clean(previous),c=clean(current),cs=new Set(c.students.map(studentKey)),cm=new Set(c.marks.map(markKey));
    p.students.forEach(x=>{if(!cs.has(studentKey(x)))t.students.add(studentKey(x));});
    p.marks.forEach(x=>{if(!cm.has(markKey(x)))t.marks.add(markKey(x));});
    Object.keys(p.subjects).forEach(cls=>(Array.isArray(p.subjects[cls])?p.subjects[cls]:[]).forEach(s=>{
      const now=(c.subjects[cls]||[]).some(v=>String(v).trim().toLowerCase()===String(s).trim().toLowerCase());
      if(!now)t.subjects.add(subjectKey(cls,s));
    }));
    saveTombstones(t);return t;
  }
  function recoverySave(d){try{const data=clean(d||localData());if(!hasData(data))return;localStorage.setItem('sbvm2_recovery_backup',JSON.stringify({savedAt:new Date().toISOString(),...data}));}catch(e){}}
  function notifyUpdate(){window.dispatchEvent(new CustomEvent('sbvm-cloud-update'));}
  function userRef(){const u=auth&&auth.currentUser;if(!u)throw new Error('Not authenticated');return db.collection('users').doc(u.uid).collection('schoolData').doc('main');}
  function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function mergeMapRecords(baseArr,localArr,cloudArr,keyFn){
    const base=new Map((Array.isArray(baseArr)?baseArr:[]).map(x=>[keyFn(x),x]));
    const local=new Map((Array.isArray(localArr)?localArr:[]).map(x=>[keyFn(x),x]));
    const cloud=new Map((Array.isArray(cloudArr)?cloudArr:[]).map(x=>[keyFn(x),x]));
    const keys=new Set([...base.keys(),...local.keys(),...cloud.keys()]);
    const out=[];
    keys.forEach(k=>{
      const b=base.get(k),l=local.get(k),c=cloud.get(k);
      const lc=!equal(l,b),cc=!equal(c,b);
      if(lc&&!cc&&l!==undefined)out.push(l);
      else if(cc&&!lc&&c!==undefined)out.push(c);
      else if(lc&&cc&&l!==undefined)out.push(l);
      else if(l!==undefined)out.push(l);
      else if(c!==undefined)out.push(c);
    });
    return out;
  }
  function mergeData(base,local,cloud,t){
    base=clean(base);local=clean(local);cloud=clean(cloud);
    const merged=clean({});
    merged.students=mergeMapRecords(base.students,local.students,cloud.students,studentKey);
    merged.marks=mergeMapRecords(base.marks,local.marks,cloud.marks,markKey);
    const classes=new Set([...Object.keys(base.subjects),...Object.keys(local.subjects),...Object.keys(cloud.subjects)]);
    merged.subjects={};
    classes.forEach(cls=>{
      const b=Array.isArray(base.subjects[cls])?base.subjects[cls]:[];
      const l=Array.isArray(local.subjects[cls])?local.subjects[cls]:[];
      const c=Array.isArray(cloud.subjects[cls])?cloud.subjects[cls]:[];
      // Subjects are a list, so merge additions from both devices. Tombstones below
      // still remove a subject explicitly deleted by the user.
      merged.subjects[cls]=[...new Map([...b,...l,...c].map(x=>[String(x).trim().toLowerCase(),x])).values()];
    });
    const exKeys=new Set([...Object.keys(base.marksExams),...Object.keys(local.marksExams),...Object.keys(cloud.marksExams)]);
    merged.marksExams={};
    exKeys.forEach(k=>{
      const b=Array.isArray(base.marksExams[k])?base.marksExams[k]:[];
      const l=Array.isArray(local.marksExams[k])?local.marksExams[k]:[];
      const c=Array.isArray(cloud.marksExams[k])?cloud.marksExams[k]:[];
      merged.marksExams[k]=[...new Map([...b,...l,...c].map(x=>[normalizeKey(x),x])).values()];
    });
    return applyTombstones(merged,t);
  }
  function mergeCloudTombstones(raw){
    const t=getTombstones();
    (raw&&raw.deletedStudentIds||[]).forEach(x=>t.students.add(String(x)));
    (raw&&raw.deletedMarkKeys||[]).forEach(x=>t.marks.add(String(x)));
    (raw&&raw.deletedSubjectKeys||[]).forEach(x=>t.subjects.add(String(x)));
    saveTombstones(t);
    return t;
  }
  async function cloudSave(){
    if(!cloudReady||saving)return false;saving=true;
    try{
      let local=applyTombstones(localData(),getTombstones());
      const base=readLocal('sbvm2_cloud_base',null);
      if(base)rememberDeletions(base,local);
      let rawCloud={};
      try{const snap=await userRef().get();if(snap.exists)rawCloud=snap.data()||{};}catch(e){console.warn('Cloud read before save failed:',e);throw e;}
      const tomb=mergeCloudTombstones(rawCloud);
      local=applyTombstones(local,tomb);
      const cloud=applyTombstones(clean(rawCloud),tomb);
      const merged=mergeData(base||{},local,cloud,tomb);
      recoverySave(merged);
      await userRef().set({
        ...merged,
        deletedStudentIds:[...tomb.students],
        deletedMarkKeys:[...tomb.marks],
        deletedSubjectKeys:[...tomb.subjects],
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
      putLocal(merged);
      localStorage.setItem('sbvm2_cloud_base',JSON.stringify(merged));
      notifyUpdate();
      return true;
    }catch(e){console.warn('Cloud sync save failed',e);return false}finally{saving=false}
  }
  async function initialSync(){
    const ref=userRef();let local=applyTombstones(localData(),getTombstones());const backup=recoveryData();
    // Recovery backup is only a fallback when local data is genuinely empty.
    if(backup&&!hasData(local)){putLocal(backup);local=backup;notifyUpdate();}
    recoverySave(local);
    const snap=await ref.get();
    const raw=snap.exists?(snap.data()||{}):{};
    const tomb=mergeCloudTombstones(raw);
    local=applyTombstones(local,tomb);
    const cloud=applyTombstones(clean(raw),tomb);
    const base=readLocal('sbvm2_cloud_base',null);
    if(snap.exists&&hasData(cloud)){
      const merged=mergeData(base||{},local,cloud,tomb);
      putLocal(merged);
      local=merged;
      localStorage.setItem('sbvm2_cloud_base',JSON.stringify(merged));
      recoverySave(merged);
      notifyUpdate();
      await cloudSave();
    }else if(hasData(local)){
      await cloudSave();
    }
    if(unsub)unsub();
    unsub=ref.onSnapshot(async s=>{
      if(!s.exists||saving)return;
      try{
        const raw=s.data()||{},t=mergeCloudTombstones(raw);
        const localNow=applyTombstones(localData(),t);
        const cloudNow=applyTombstones(clean(raw),t);
        const baseNow=readLocal('sbvm2_cloud_base',null);
        const merged=mergeData(baseNow||{},localNow,cloudNow,t);
        if(!equal(clean(merged),clean(localNow))){
          putLocal(merged);
          recoverySave(merged);
          notifyUpdate();
        }
        localStorage.setItem('sbvm2_cloud_base',JSON.stringify(merged));
      }catch(e){console.warn('Cloud snapshot merge failed:',e);}
    });
  }
  function expose(){window.sbvmCloud={get ready(){return cloudReady},save:cloudSave,restore:restoreFromCloud,status:()=>({ready:cloudReady,loggedIn:!!(auth&&auth.currentUser),uid:auth&&auth.currentUser?auth.currentUser.uid:null})}}
  window.addEventListener('sbvm-local-save',()=>{lastLocalSaveAt=Date.now();recoverySave();cloudSave()});
  async function start(){if(started)return;started=true;expose();try{await loadSDK();if(!window.firebase||!firebase.auth||!firebase.firestore)throw new Error('Firebase SDK incomplete');if(!firebase.apps.length)firebase.initializeApp(CFG);auth=firebase.auth();db=firebase.firestore();await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);auth.onAuthStateChanged(async user=>{if(!user){cloudReady=false;expose();return}cloudReady=true;expose();wrapSave();try{await initialSync()}catch(e){console.warn('Initial cloud sync unavailable:',e)}});setInterval(()=>cloudSave(),10000);window.addEventListener('online',cloudSave)}catch(e){console.warn('Automatic cloud sync unavailable:',e.message);wrapSave()}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0),{once:true});else setTimeout(start,0);
})();