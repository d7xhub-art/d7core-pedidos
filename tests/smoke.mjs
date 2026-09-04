import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

assert.match(html, /D7COMERCIAL/, 'branding D7COMERCIAL deve existir');
for (const item of ['Clientes','Produtos com Ficha','Representadas','Novo Orçamento','Novo Pedido','Pedidos','Catálogo']) {
  assert.ok(html.includes(item), `menu obrigatório ausente: ${item}`);
}
for (const removed of ['D7 HUB','Prospecção','Follow-up','Relatórios']) {
  assert.ok(!html.includes(`>${removed}<`), `módulo removido reapareceu: ${removed}`);
}

// Proteção de dados: inicialização nunca pode disparar upload automático para um backend indisponível.
assert.ok(!/setTimeout\(\(\)=>supaFullSync\(\),\s*2000\)/.test(html), 'não iniciar push automático para Supabase');
// Nunca apagar tabela remota quando o conjunto local estiver vazio.
assert.ok(!html.includes("method:'DELETE'"), 'sincronização não pode apagar dados remotos a partir de lista vazia');
// Falha de rede precisa ser refletida como erro, não como sucesso global.
assert.ok(!/for\(const t of tabs\)await supaSyncTable\(t,DB\.get\(t\)\);\s*setSyncDot\('ok'\)/.test(html), 'full sync não pode marcar sucesso ignorando falhas');

assert.equal(manifest.name, 'D7COMERCIAL');
assert.equal(manifest.short_name, 'D7COMERCIAL');
assert.ok(manifest.start_url.startsWith('/d7core-pedidos/'));
assert.ok(sw.includes('index.html'));
console.log('SMOKE_OK');
