(function(){
  function sbvmRead(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}}
  function sbvmData(){return {students:sbvmRead('sbvm2_students',[]),subjects:sbvmRead('sbvm2_subjects',{}),marks:sbvmRead('sbvm2_marks',[])}}
  function sbvmSize(d){return (Array.isArray(d.students)?d.students.length:0)*100+(Array.isArray(d.marks)?d.marks.length:0)*10+Object.values(d.subjects&&typeof d.subjects==='object'?d.subjects:{}).reduce((n,v)=>n+(Array.isArray(v)?v.length:0),0)}
  function sbvmHas(d){return sbvmSize(d)>0}
  function sbvmPut(d){localStorage.setItem('sbvm2_students',JSON.stringify(d.students||[]));localStorage.setItem('sbvm2_subjects',JSON.stringify(d.subjects||{}));localStorage.setItem('sbvm2_marks',JSON.stringify(d.marks||[]))}
  async function recover(){
    try{
      const local=sbvmData(), backup=sbvmRead('sbvm2_recovery_backup',null);
      if(backup&&sbvmHas(backup)&&sbvmSize(backup)>sbvmSize(local)){sbvmPut(backup);window.dispatchEvent(new CustomEvent('sbvm-cloud-update'));if(typeof window.refresh==='function')window.refresh()}
      if(window.sbvmCloud&&window.sbvmCloud.ready&&sbvmSize(sbvmData())===0){
        const r=await window.sbvmCloud.restore();
        if(r&&r.students)window.dispatchEvent(new CustomEvent('sbvm-cloud-update'));
      }
    }catch(e){console.warn('SBVM automatic recovery:',e)}
  }
  window.addEventListener('load',()=>setTimeout(recover,1200));
  window.addEventListener('sbvm-cloud-update',()=>setTimeout(()=>{if(typeof window.refresh==='function')window.refresh()},50));
})();

(function(){
  function editStudentFixed(id){
    const s=students.find(x=>String(x.id)===String(id));
    if(!s)return alert('विद्यार्थी नहीं मिला।');
    const oldClass=s.cls;
    const oldSec=s.sec||'A';
    const name=prompt('विद्यार्थी का नाम:',s.name||'');
    if(name===null)return;
    const roll=prompt('रोल नंबर:',s.roll||'');
    if(roll===null)return;
    const clsInput=prompt('कक्षा चुनें/बदलें:\n'+CLASSES.join(', '),s.cls||'');
    if(clsInput===null)return;
    const matchedClass=CLASSES.find(c=>String(c).trim().toLowerCase()===String(clsInput).trim().toLowerCase());
    if(!matchedClass)return alert('कक्षा सही नहीं है। उपलब्ध कक्षाओं में से चुनें: '+CLASSES.join(', '));
    const secInput=prompt('सेक्शन:',s.sec||'A');
    if(secInput===null)return;
    const sec=String(secInput||'A').trim().toUpperCase()||'A';
    const father=prompt('पिता/अभिभावक का नाम:',s.father||'');
    if(father===null)return;
    const mother=prompt('माता का नाम:',s.mother||'');
    if(mother===null)return;
    const phone=prompt('Parent Mobile:',s.parentPhone||'');
    if(phone===null)return;
    const cleanName=String(name).trim();
    const cleanRoll=String(roll).trim();
    if(!cleanName||!cleanRoll)return alert('नाम और रोल नंबर खाली नहीं हो सकते।');
    if(students.some(x=>String(x.id)!==String(id)&&String(x.cls).trim().toLowerCase()===matchedClass.toLowerCase()&&String(x.sec||'A').trim().toUpperCase()===sec&&String(x.roll).trim()===cleanRoll)){
      return alert('यह रोल नंबर उसी कक्षा/सेक्शन में पहले से है।');
    }
    s.name=cleanName;
    s.roll=cleanRoll;
    s.cls=matchedClass;
    s.sec=sec;
    s.father=String(father).trim();
    s.mother=String(mother).trim();
    s.parentPhone=String(phone).trim();
    if(oldClass!==matchedClass||oldSec!==sec){
      marks.forEach(m=>{
        if(String(m.studentId)===String(id)){
          m.cls=matchedClass;
          m.sec=sec;
        }
      });
    }
    // Write the exact edited objects immediately, then run the app's normal save/cloud-sync path.
    localStorage.setItem('sbvm2_students',JSON.stringify(students));
    localStorage.setItem('sbvm2_subjects',JSON.stringify(subjects));
    localStorage.setItem('sbvm2_marks',JSON.stringify(marks));
    if(typeof window.save==='function')window.save();
    if(typeof window.refresh==='function')window.refresh();
    const saved=students.find(x=>String(x.id)===String(id));
    const ok=saved&&saved.name===cleanName&&String(saved.roll)===cleanRoll&&saved.cls===matchedClass&&saved.sec===sec;
    if(!ok){
      alert('Edit save नहीं हुआ। कृपया दोबारा कोशिश करें।');
      return;
    }
    alert('विद्यार्थी की जानकारी सफलतापूर्वक अपडेट हो गई।');
  }
  window.editStudent=editStudentFixed;
})();
