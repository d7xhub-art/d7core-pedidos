import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../auth-guard.js',import.meta.url),'utf8');
let requestedUrl='';
const storage=new Map();
let domReady;
const elements={};
function field(value=''){
  return {value,style:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},click(){this.onclick?.();}};
}
function makeGate(){
  const gate={style:{},remove(){},set innerHTML(value){
    this._html=value;
    elements['#d7AuthEmail']=field('usuario@teste.com');
    elements['#d7AuthPass']=field('senha');
    elements['#d7AuthLogin']=field();
    elements['#d7AuthMagic']=field();
    elements['#d7AuthMsg']={textContent:'',style:{}};
  },querySelector(selector){return elements[selector];}};
  return gate;
}
const context={
  console,
  Date,
  URLSearchParams,
  Event:class Event{constructor(type){this.type=type;}},
  location:{hash:'',origin:'https://d7xhub-art.github.io',pathname:'/d7core-pedidos/',search:'',reload(){}},
  history:{replaceState(){}},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  document:{readyState:'loading',addEventListener(type,fn){if(type==='DOMContentLoaded')domReady=fn;},createElement(){return makeGate();},title:'D7COMERCIAL',getElementById(){return null;},body:{appendChild(){}}},
  fetch:async url=>{requestedUrl=String(url);return {ok:true,json:async()=>({access_token:'token',refresh_token:'refresh',expires_in:3600})};}
};
context.window=context;
context.window.D7_SUPABASE_CONFIG={url:'https://projeto.supabase.co',key:'chave-publica'};
vm.createContext(context);
vm.runInContext(source,context);

assert.ok(!source.includes('type="password"'),'a tela não deve pedir senha');
await context.window.D7Auth.sendMagicLink('usuario@teste.com');
assert.equal(new URL(requestedUrl).pathname,'/auth/v1/otp');
assert.equal(new URL(requestedUrl).searchParams.get('redirect_to'),'https://d7xhub-art.github.io/d7core-pedidos/');
storage.clear();requestedUrl='';
await domReady();
await new Promise(resolve=>setTimeout(resolve,0));
let prevented=false;
assert.equal(typeof elements['#d7AuthEmail'].listeners.keydown,'function');
elements['#d7AuthEmail'].listeners.keydown({key:'Enter',preventDefault(){prevented=true;}});
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(prevented,true);
assert.equal(new URL(requestedUrl).pathname,'/auth/v1/otp');
assert.equal(new URL(requestedUrl).searchParams.get('redirect_to'),'https://d7xhub-art.github.io/d7core-pedidos/');
assert.ok(!storage.has('d7_supa_session_v1'),'solicitar link não libera sessão antes da confirmação do e-mail');
assert.match(elements['#d7AuthMsg'].textContent,/Abra seu e-mail/);
console.log('AUTH_CONFIG_OK');
