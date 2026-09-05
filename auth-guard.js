(()=>{
  const SESSION_KEY='d7_supa_session_v1';
  const RETURN_KEY='d7_auth_return';

  function readSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{return null;}
  }
  function saveSession(s){
    if(!s){localStorage.removeItem(SESSION_KEY);return;}
    const now=Math.floor(Date.now()/1000);
    const normalized={...s,expires_at:s.expires_at||now+Number(s.expires_in||3600)};
    localStorage.setItem(SESSION_KEY,JSON.stringify(normalized));
  }
  function getAccessToken(){return readSession()?.access_token||'';}
  function authHeaders(extra={}){
    const token=getAccessToken();
    return {'apikey':SUPA_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json',...extra};
  }
  function parseCallback(){
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    if(hash.get('access_token')){
      saveSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')||'',expires_in:Number(hash.get('expires_in')||3600),token_type:hash.get('token_type')||'bearer'});
      history.replaceState({},document.title,location.pathname+location.search);
      return true;
    }
    return false;
  }
  function authErrorMessage(raw,context='login'){
    const text=String(raw||'').trim();
    if(/Signups not allowed for otp/i.test(text)||/signup.*not allowed/i.test(text))return 'E-mail não autorizado para acessar o D7COMERCIAL.';
    if(/invalid login credentials/i.test(text))return 'E-mail ou senha inválidos.';
    if(/email not confirmed/i.test(text))return 'Este e-mail ainda não está confirmado.';
    if(context==='magic')return 'Não foi possível enviar o link de acesso. Confira o e-mail autorizado e tente novamente.';
    return text||'Não foi possível entrar.';
  }
  async function refreshSession(){
    const s=readSession();
    if(!s?.refresh_token)return false;
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',headers:{'apikey':SUPA_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:s.refresh_token})
      });
      if(!r.ok)throw new Error('refresh '+r.status);
      saveSession(await r.json());
      return true;
    }catch(e){console.warn('D7 auth refresh:',e);saveSession(null);return false;}
  }
  async function hasValidSession(){
    const s=readSession();
    if(!s?.access_token)return false;
    const now=Math.floor(Date.now()/1000);
    if(Number(s.expires_at||0)>now+60)return true;
    return refreshSession();
  }
  async function signInWithPassword(email,password){
    const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=password',{
      method:'POST',headers:{'apikey':SUPA_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password})
    });
    const body=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(authErrorMessage(body.error_description||body.msg||body.message,'login'));
    if(!body.access_token)throw new Error('Sessão não recebida');
    saveSession(body);
    return body;
  }
  async function sendMagicLink(email){
    const redirect=location.origin+location.pathname;
    localStorage.setItem(RETURN_KEY,redirect);
    const r=await fetch(SUPA_URL+'/auth/v1/otp',{
      method:'POST',headers:{'apikey':SUPA_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,create_user:false,options:{email_redirect_to:redirect}})
    });
    const body=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(authErrorMessage(body.error_description||body.msg||body.message,'magic'));
    return true;
  }
  async function signOut(){
    const token=getAccessToken();
    try{if(token)await fetch(SUPA_URL+'/auth/v1/logout',{method:'POST',headers:authHeaders()});}catch{}
    saveSession(null);
    location.reload();
  }
  function ensureOverlay(){
    if(document.getElementById('d7AuthGate'))return document.getElementById('d7AuthGate');
    const gate=document.createElement('div');
    gate.id='d7AuthGate';
    gate.style.cssText='position:fixed;inset:0;z-index:99999;background:#0d0d0d;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif';
    gate.innerHTML=`<div style="width:min(420px,100%);background:#171717;border:1px solid #2b2b2b;border-radius:16px;padding:26px;color:#f3f3f3;box-shadow:0 20px 60px rgba(0,0,0,.45)">
      <div style="font-size:12px;font-weight:900;letter-spacing:2px;color:#ef4444;margin-bottom:7px">D7COMERCIAL</div>
      <div style="font-size:24px;font-weight:900;margin-bottom:6px">Acesso seguro</div>
      <div style="font-size:13px;color:#999;line-height:1.5;margin-bottom:18px">Entre para liberar os dados comerciais e a sincronização com a nuvem.</div>
      <label style="display:block;font-size:11px;font-weight:800;color:#aaa;margin:10px 0 5px">E-MAIL</label>
      <input id="d7AuthEmail" type="email" autocomplete="username" style="width:100%;box-sizing:border-box;padding:12px;border-radius:9px;border:1px solid #333;background:#101010;color:#fff;outline:none" placeholder="seu@email.com">
      <label style="display:block;font-size:11px;font-weight:800;color:#aaa;margin:12px 0 5px">SENHA</label>
      <input id="d7AuthPass" type="password" autocomplete="current-password" style="width:100%;box-sizing:border-box;padding:12px;border-radius:9px;border:1px solid #333;background:#101010;color:#fff;outline:none" placeholder="••••••••">
      <button id="d7AuthLogin" style="width:100%;margin-top:14px;padding:12px;border:0;border-radius:9px;background:#dc2626;color:#fff;font-weight:900;cursor:pointer">Entrar</button>
      <button id="d7AuthMagic" style="width:100%;margin-top:9px;padding:11px;border:1px solid #383838;border-radius:9px;background:#222;color:#eee;font-weight:800;cursor:pointer">Enviar link para e-mail autorizado</button>
      <div id="d7AuthMsg" style="min-height:20px;margin-top:12px;font-size:12px;color:#fbbf24"></div>
    </div>`;
    document.body.appendChild(gate);
    const msg=gate.querySelector('#d7AuthMsg');
    gate.querySelector('#d7AuthLogin').onclick=async()=>{
      const email=gate.querySelector('#d7AuthEmail').value.trim();
      const pass=gate.querySelector('#d7AuthPass').value;
      if(!email||!pass){msg.textContent='Informe e-mail e senha.';return;}
      msg.textContent='Entrando...';
      try{await signInWithPassword(email,pass);msg.style.color='#4ade80';msg.textContent='Acesso liberado.';gate.remove();window.dispatchEvent(new Event('d7-auth-ready'));}
      catch(e){msg.style.color='#f87171';msg.textContent=e.message;}
    };
    gate.querySelector('#d7AuthMagic').onclick=async()=>{
      const email=gate.querySelector('#d7AuthEmail').value.trim();
      if(!email){msg.textContent='Informe o e-mail primeiro.';return;}
      msg.textContent='Enviando link...';
      try{await sendMagicLink(email);msg.style.color='#4ade80';msg.textContent='Link enviado. Abra seu e-mail e toque no link para entrar.';}
      catch(e){msg.style.color='#f87171';msg.textContent=e.message;}
    };
    return gate;
  }
  async function ensureSession(){
    parseCallback();
    if(await hasValidSession())return true;
    ensureOverlay();
    return false;
  }

  window.D7Auth={readSession,getAccessToken,authHeaders,ensureSession,hasValidSession,signInWithPassword,sendMagicLink,signOut,refreshSession};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>ensureSession());
  else ensureSession();
})();
