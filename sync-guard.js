(()=>{
  const TABLES=['clientes','produtos','representadas','pedidos','orcamentos','followups','prospectos'];
  const OPTIONAL=new Set(['orcamentos']);
  const timers=new Map();

  function idOf(x){return String((x&&(x.id??x.num))??'');}
  function headers(){return {'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'};}
  function setMessage(text){const el=document.getElementById('statusMsg');if(el)el.textContent=text;}

  async function syncTableSafe(tbl,rows){
    if(!Array.isArray(rows)||rows.length===0)return true;
    const payload=rows.map(r=>({id:idOf(r)||String(Date.now()),data:r,updated_at:new Date().toISOString()}));
    try{
      const r=await fetch(SUPA_URL+'/rest/v1/'+tbl,{
        method:'POST',
        headers:{...headers(),'Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(payload)
      });
      if(!r.ok){
        if(OPTIONAL.has(tbl)&&(r.status===404||r.status===400))return true;
        throw new Error('HTTP '+r.status+' em '+tbl);
      }
      return true;
    }catch(e){console.warn('D7 safe sync:',tbl,e);return false;}
  }

  async function pushLocalFirst(){
    setSyncDot('wait');
    setMessage('Salvando dados locais na nuvem...');
    let ok=true;
    for(const tbl of TABLES){
      const rows=DB.get(tbl);
      const one=await syncTableSafe(tbl,rows);
      if(!one)ok=false;
    }
    return ok;
  }

  async function mergeRemote(){
    let imported=0,ok=true;
    for(const tbl of TABLES){
      try{
        const r=await fetch(SUPA_URL+'/rest/v1/'+tbl+'?select=data&order=updated_at.asc',{headers:headers()});
        if(!r.ok){
          if(OPTIONAL.has(tbl)&&(r.status===404||r.status===400))continue;
          ok=false;continue;
        }
        const rows=await r.json();
        const remote=rows.map(x=>x.data).filter(Boolean);
        if(!remote.length)continue;
        const local=DB.get(tbl);
        const localIds=new Set(local.map(idOf).filter(Boolean));
        const additions=remote.filter(x=>{const id=idOf(x);return id&&!localIds.has(id);});
        if(additions.length){
          localStorage.setItem('d7_'+tbl,JSON.stringify([...local,...additions]));
          imported+=additions.length;
        }
      }catch(e){ok=false;console.warn('D7 safe pull:',tbl,e);}
    }
    updateStatus();updateBadges();render();
    return {ok,imported};
  }

  async function fullSafeSync(){
    const pushed=await pushLocalFirst();
    const pulled=await mergeRemote();
    if(pushed&&pulled.ok){
      setSyncDot('ok');
      setMessage('Dados locais e nuvem sincronizados');
      return true;
    }
    setSyncDot('err');
    setMessage('Dados locais preservados • falha na nuvem');
    return false;
  }

  window.supaSyncTable=syncTableSafe;
  window.supaFullSync=fullSafeSync;
  window.supaPull=async()=>{const r=await mergeRemote();return r.imported;};
  window.queueSync=(tbl,rows)=>{
    setSyncDot('wait');
    clearTimeout(timers.get(tbl));
    timers.set(tbl,setTimeout(async()=>{
      const ok=await syncTableSafe(tbl,rows);
      setSyncDot(ok?'ok':'err');
      setMessage(ok?'Dados locais e nuvem sincronizados':'Dados locais preservados • falha na nuvem');
    },700));
  };

  // A primeira sincronização é sempre local -> nuvem -> merge remoto.
  // Isso impede uma nuvem vazia/antiga de substituir cadastros existentes no navegador.
  setTimeout(()=>fullSafeSync(),1200);
})();
