import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../auth-guard.js',import.meta.url),'utf8');
let requestedUrl='';
const storage=new Map();
const context={
  console,
  Date,
  URLSearchParams,
  Event:class Event{constructor(type){this.type=type;}},
  location:{hash:'',origin:'https://d7xhub-art.github.io',pathname:'/d7core-pedidos/',search:'',reload(){}},
  history:{replaceState(){}},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  document:{readyState:'loading',addEventListener(){},title:'D7COMERCIAL',getElementById(){return null;},body:{appendChild(){}}},
  fetch:async url=>{requestedUrl=String(url);return {ok:true,json:async()=>({access_token:'token',refresh_token:'refresh',expires_in:3600})};}
};
context.window=context;
context.window.D7_SUPABASE_CONFIG={url:'https://projeto.supabase.co',key:'chave-publica'};
vm.createContext(context);
vm.runInContext(source,context);

await context.window.D7Auth.signInWithPassword('usuario@teste.com','senha');
assert.equal(requestedUrl,'https://projeto.supabase.co/auth/v1/token?grant_type=password');
assert.equal(JSON.parse(storage.get('d7_supa_session_v1')).access_token,'token');
console.log('AUTH_CONFIG_OK');
