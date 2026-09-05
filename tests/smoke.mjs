import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const guardPath = new URL('../sync-guard.js', import.meta.url);
assert.ok(fs.existsSync(guardPath), 'sync-guard.js deve existir');
const guard = fs.readFileSync(guardPath, 'utf8');

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

// Sincronização: primeiro envia o local, depois mescla a nuvem; nunca sobrescreve lista local.
assert.match(guard, /pushLocalFirst/, 'sincronização deve enviar dados locais antes de ler a nuvem');
assert.match(guard, /mergeRemote/, 'sincronização deve mesclar dados remotos sem substituir o local');
assert.match(guard, /resolution=merge-duplicates/, 'envio deve usar upsert no Supabase');
assert.ok(!/localStorage\.setItem\([^\n]+JSON\.stringify\(d\)\)/.test(guard), 'guard não pode substituir dados locais diretamente pela nuvem');
assert.match(guard, /orcamentos/, 'orçamentos devem participar da sincronização segura');
assert.ok(sw.includes('sync-guard.js?v=2.4-safe-cloud'), 'service worker deve injetar a sincronização segura atual');
assert.ok(sw.includes('d7comercial-v2.4-safe-cloud'), 'cache PWA deve ser renovado');

assert.equal(manifest.name, 'D7COMERCIAL');
assert.equal(manifest.short_name, 'D7COMERCIAL');
assert.ok(manifest.start_url.startsWith('/d7core-pedidos/'));
assert.ok(sw.includes('index.html'));
console.log('SMOKE_OK');
