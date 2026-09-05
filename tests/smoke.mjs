import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const guardPath = new URL('../sync-guard.js', import.meta.url);
const authPath = new URL('../auth-guard.js', import.meta.url);
assert.ok(fs.existsSync(guardPath), 'sync-guard.js deve existir');
assert.ok(fs.existsSync(authPath), 'auth-guard.js deve existir');
const guard = fs.readFileSync(guardPath, 'utf8');
const auth = fs.readFileSync(authPath, 'utf8');

assert.match(html, /D7COMERCIAL/, 'branding D7COMERCIAL deve existir');
for (const item of ['Clientes','Produtos com Ficha','Representadas','Novo Orçamento','Novo Pedido','Pedidos','Catálogo']) {
  assert.ok(html.includes(item), `menu obrigatório ausente: ${item}`);
}
for (const route of ['prospectos','followups','relatorios','agenda','backup','config']) {
  assert.ok(!html.includes(`id="si-${route}"`), `atalho removido reapareceu: ${route}`);
  assert.ok(!html.includes(`goto('${route}')`), `rota removida reapareceu: ${route}`);
}
assert.ok(!/<button[^>]*>[^<]*📌\s*Follow-up<\/button>/i.test(html), 'ação visível de Follow-up reapareceu em Pedido');
assert.ok(!/>D7 HUB</.test(html), 'marca antiga D7 HUB reapareceu');
assert.ok(!html.includes("method:'DELETE'"), 'sincronização não pode apagar dados remotos');

// Sincronização segura: local -> nuvem -> merge remoto.
assert.match(guard, /pushLocalFirst/, 'sincronização deve enviar dados locais antes de ler a nuvem');
assert.match(guard, /mergeRemote/, 'sincronização deve mesclar dados remotos sem substituir o local');
assert.match(guard, /resolution=merge-duplicates/, 'envio deve usar upsert no Supabase');
assert.ok(!/localStorage\.setItem\([^\n]+JSON\.stringify\(d\)\)/.test(guard), 'guard não pode substituir dados locais diretamente pela nuvem');
assert.match(guard, /orcamentos/, 'orçamentos devem participar da sincronização segura');
assert.ok(sw.includes('sync-guard.js'), 'service worker deve injetar o guard em toda navegação do app');
assert.ok(sw.includes('d7comercial-v2.2-stable'), 'service worker está na base estável restaurada');

// O guard deve estar presente já na primeira abertura, antes de qualquer sincronização automática.
assert.match(html, /<script src="\.\/sync-guard\.js\?v=2\.3-safe"><\/script>/, 'index deve carregar o guard diretamente na primeira visita');
assert.ok(!html.includes('// On startup: pull cloud first, then push any local data that exists'), 'startup legado não pode executar antes do guard');

// Acesso à nuvem deve exigir sessão autenticada, nunca usar o anon como bearer de dados.
assert.match(html, /<script src="\.\/auth-guard\.js\?v=1\.0"><\/script>/, 'index deve carregar o auth guard');
assert.match(auth, /signInWithPassword|\/auth\/v1\/token\?grant_type=password/, 'auth guard deve oferecer login autenticado');
assert.match(auth, /access_token/, 'auth guard deve persistir token autenticado');
assert.match(guard, /D7Auth\.getAccessToken/, 'sync guard deve usar token autenticado');
assert.ok(!guard.includes("'Authorization':'Bearer '+SUPA_KEY"), 'sync guard não pode usar chave anon como bearer');
assert.ok(!html.includes("'Authorization':'Bearer '+SUPA_KEY"), 'index não pode usar chave anon como bearer de dados');

assert.equal(manifest.name, 'D7COMERCIAL');
assert.equal(manifest.short_name, 'D7COMERCIAL');
assert.ok(manifest.start_url.startsWith('/d7core-pedidos/'));
assert.ok(sw.includes('index.html'));
console.log('SMOKE_OK');
