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
for (const removed of ['D7 HUB','Prospecção','Follow-up','Relatórios']) {
  assert.ok(!html.includes(`>${removed}<`), `módulo removido reapareceu: ${removed}`);
}

// Segurança de dados e falha de nuvem.
assert.ok(!html.includes("method:'DELETE'"), 'sincronização não pode apagar dados remotos a partir de lista vazia');
assert.match(guard, /window\.supaFullSync\s*=\s*async/, 'guard deve substituir full sync quebrado');
assert.match(guard, /window\.queueSync\s*=/, 'guard deve impedir tentativas automáticas no backend indisponível');
assert.match(guard, /nuvem indisponível/i, 'UI deve informar indisponibilidade da nuvem');
assert.ok(sw.includes('sync-guard.js'), 'service worker deve entregar o guard em toda navegação do app');
assert.ok(sw.includes('d7comercial-v2.2-stable'), 'cache do PWA deve ser atualizado');

assert.equal(manifest.name, 'D7COMERCIAL');
assert.equal(manifest.short_name, 'D7COMERCIAL');
assert.ok(manifest.start_url.startsWith('/d7core-pedidos/'));
assert.ok(sw.includes('index.html'));
console.log('SMOKE_OK');
