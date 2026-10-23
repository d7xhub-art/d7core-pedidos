import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../sync-guard.js',import.meta.url),'utf8');
const storage=new Map([['d7_produtos',JSON.stringify([{id:'p1',desc:'Backup antigo'}])]]);
const cloud=new Map([['p0',{id:'p0',_deleted:true}],['p1',{id:'p1',_deleted:true}]]);
const calls=[];
let failRead=false;
const warnings=[];
const ctx={console:{...console,warn:(...args)=>warnings.push(args)},Date,Set,Map,JSON,clearTimeout(){},setTimeout(){},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 document:{querySelector:()=>true,getElementById:()=>null},
 setSyncDot(){},updateStatus(){},updateBadges(){},render(){},addEventListener(){},
 D7Auth:{getAccessToken:()=> 'session',hasValidSession:async()=>true},
 DB:{get:k=>JSON.parse(storage.get('d7_'+k)||'[]')},
 fetch:async(url,opts={})=>{
   const table=url.split('/rest/v1/')[1].split('?')[0];
   calls.push([table,opts.method||'GET']);
   if(opts.method==='POST'){
     if(table==='produtos')for(const row of JSON.parse(opts.body))cloud.set(row.id,row.data);
     return {ok:true};
   }
   if(failRead)return {ok:false,status:503};
   const offset=Number(new URL(url).searchParams.get('offset')||0);
   return {ok:true,json:async()=>table==='produtos'?[...cloud.values()].slice(offset,offset+1).map(data=>({data})):[]};
 }
};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
await ctx.supaFullSync();
assert.equal(cloud.get('p1')._deleted,true,'backup antigo não pode sobrescrever tombstone remoto');
assert.deepEqual(JSON.parse(storage.get('d7_produtos')),[],'exclusão remota deve remover cópia local');
await ctx.supaSyncTable('produtos',[{id:'p1',desc:'restaurado'}]);
assert.equal(cloud.get('p1')._deleted,true,'envio direto também deve respeitar exclusões');
storage.set('d7_produtos',JSON.stringify([{id:'p2'}]));failRead=true;calls.length=0;
assert.equal(await ctx.supaFullSync(),false);
assert.ok(!calls.some(([,method])=>method==='POST'),'falha ao consultar exclusões deve impedir envio inseguro');
assert.equal(warnings.length,7,'falhas de leitura devem ser relatadas para cada tabela');
console.log('PERMANENT_DELETIONS_OK');
