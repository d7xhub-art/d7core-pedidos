import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const guardPath = new URL('../sync-guard.js', import.meta.url);
const authPath = new URL('../auth-guard.js', import.meta.url);
const uiPath = new URL('../saas-light.css', import.meta.url);
assert.ok(fs.existsSync(guardPath), 'sync-guard.js deve existir');
assert.ok(fs.existsSync(authPath), 'auth-guard.js deve existir');
assert.ok(fs.existsSync(uiPath), 'saas-light.css deve existir');
const guard = fs.readFileSync(guardPath, 'utf8');
const auth = fs.readFileSync(authPath, 'utf8');
const ui = fs.readFileSync(uiPath, 'utf8');

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
assert.ok(sw.includes('d7comercial-v2.3-auth'), 'service worker deve usar cache da versão autenticada');

// O guard deve estar presente já na primeira abertura, antes de qualquer sincronização automática.
assert.match(html, /<script src="\.\/sync-guard\.js\?v=2\.3-safe"><\/script>/, 'index deve carregar o guard diretamente na primeira visita');
assert.ok(!html.includes('// On startup: pull cloud first, then push any local data that exists'), 'startup legado não pode executar antes do guard');

// Acesso à nuvem deve exigir sessão autenticada, nunca usar o anon como bearer de dados.
assert.match(html, /<script src="\.\/auth-guard\.js\?v=1\.0"><\/script>/, 'index deve carregar o auth guard');
assert.match(auth, /signInWithPassword|\/auth\/v1\/token\?grant_type=password/, 'auth guard deve oferecer login autenticado');
assert.match(auth, /access_token/, 'auth guard deve persistir token autenticado');
assert.match(guard, /D7Auth\??\.getAccessToken/, 'sync guard deve usar token autenticado');
assert.ok(!guard.includes("'Authorization':'Bearer '+SUPA_KEY"), 'sync guard não pode usar chave anon como bearer');
assert.ok(!html.includes("'Authorization':'Bearer '+SUPA_KEY"), 'index não pode usar chave anon como bearer de dados');
assert.ok(!html.includes('create policy "anon_all"'), 'interface não pode instruir recriação de política anon_all');

// Magic Link: nunca cria usuário novo e nunca expõe erro técnico do Supabase ao usuário.
assert.match(auth, /create_user\s*:\s*false/, 'magic link deve aceitar apenas usuário já existente');
assert.match(auth, /E-mail não autorizado/, 'erro de OTP/signup deve ser traduzido para mensagem clara em português');
assert.match(auth, /Signups not allowed for otp/i, 'auth guard deve reconhecer o erro técnico retornado pelo Supabase');

// Novo Pedido profissional: layout compacto, resumo lateral e proteção de preço.
assert.match(html, /pedido-profissional/, 'Novo Pedido deve usar layout profissional');
assert.match(html, /Resumo do Pedido/, 'Novo Pedido deve exibir resumo lateral');
assert.match(html, /Preço não cadastrado/, 'produto sem preço deve ser sinalizado');
assert.match(html, /preco-indisponivel/, 'produto sem preço deve ter inclusão bloqueada');
assert.match(html, /pedido-dados-compactos/, 'cliente, representada e data devem usar cabeçalho compacto');

// Camada visual SaaS: leve, acessível, responsiva e carregada desde a primeira abertura.
assert.match(guard, /saas-light\.css\?v=1\.0/, 'sync guard deve carregar a camada visual SaaS');
assert.match(ui, /D7 SaaS Light UI/, 'CSS deve identificar a camada SaaS');
assert.match(ui, /:focus-visible/, 'interface deve ter foco visível para teclado');
assert.match(ui, /text-transform:\s*none/, 'interface deve reduzir caixa alta');
assert.match(ui, /font-weight:\s*600/, 'interface deve usar pesos tipográficos mais leves');
assert.match(ui, /@media\s*\(max-width:\s*700px\)/, 'interface deve preservar responsividade no celular');
assert.match(ui, /prefers-reduced-motion/, 'interface deve respeitar redução de movimento');

assert.equal(manifest.name, 'D7COMERCIAL');
assert.equal(manifest.short_name, 'D7COMERCIAL');
assert.ok(manifest.start_url.startsWith('/d7core-pedidos/'));
assert.ok(sw.includes('index.html'));
console.log('SMOKE_OK');
