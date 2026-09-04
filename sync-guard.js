(()=>{
  const BROKEN_HOST='uewcjlfctumjvqsagnxg.supabase.co';
  const nativeFetch=window.fetch.bind(window);
  const isBrokenSupabase=input=>{
    try{
      const u=typeof input==='string'?input:(input&&input.url)||'';
      return u.includes(BROKEN_HOST);
    }catch{return false;}
  };

  function showLocalOnly(){
    try{ if(typeof window.setSyncDot==='function') window.setSyncDot('err'); }catch{}
    const msg=document.getElementById('statusMsg');
    if(msg) msg.textContent='Dados salvos localmente • nuvem indisponível';
    const dot=document.getElementById('syncDot');
    if(dot){ dot.style.background='var(--red)'; dot.title='Nuvem indisponível — dados locais preservados'; }
  }

  // O endpoint configurado no app não resolve. Bloqueamos somente esse host para
  // evitar falsos sucessos, ruído de rede e qualquer risco sobre dados locais.
  window.fetch=(input,init)=>{
    if(isBrokenSupabase(input)){
      showLocalOnly();
      return Promise.reject(new TypeError('D7 cloud endpoint unavailable'));
    }
    return nativeFetch(input,init);
  };

  window.supaSyncTable=async()=>{ showLocalOnly(); return false; };
  window.supaFullSync=async()=>{ showLocalOnly(); return false; };
  window.supaPull=async()=>{ showLocalOnly(); return 0; };
  window.queueSync=()=>{ showLocalOnly(); };

  showLocalOnly();
  setTimeout(showLocalOnly,2200);
})();
