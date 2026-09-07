import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
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
for (const item of ['Clientes','Produtos','Ficha Técnica','Representadas','Novo Orçamento','Novo Pedido','Pedidos','Catálogo']) {
  assert.ok(html.includes(item), `menu obrigatório ausente: ${item}`);
}
const menuOrder=['si-dashboard','si-clientes','si-orcamento','si-novo-pedido','si-produtos','si-ficha-tecnica','si-representadas','si-pedidos','si-catalogo'];
let lastMenuPosition=-1;
for(const id of menuOrder){
  const position=html.indexOf(`id="${id}"`);
  assert.ok(position>lastMenuPosition,`${id} deve respeitar a nova ordem do menu`);
  lastMenuPosition=position;
}
assert.match(html, /function pgFichaTecnica\(\)/, 'Ficha Técnica deve ter página própria');
for (const route of ['prospectos','followups','relatorios','agenda','backup','config']) {
  assert.ok(!html.includes(`id="si-${route}"`), `atalho removido reapareceu: ${route}`);
  assert.ok(!html.includes(`goto('${route}')`), `rota removida reapareceu: ${route}`);
}
assert.ok(!/<button[^>]*>[^<]*📌\s*Follow-up<\/button>/i.test(html), 'ação visível de Follow-up reapareceu em Pedido');
assert.ok(!/>D7 HUB</.test(html), 'marca antiga D7 HUB reapareceu');
assert.ok(!html.includes("method:'DELETE'"), 'sincronização não pode apagar dados remotos');

assert.match(guard, /pushLocalFirst/, 'sincronização deve enviar dados locais antes de ler a nuvem');
assert.match(guard, /mergeRemote/, 'sincronização deve mesclar dados remotos sem substituir o local');
assert.match(guard, /resolution=merge-duplicates/, 'envio deve usar upsert no Supabase');
assert.match(guard, /d7_deleted_/, 'sincronização deve persistir exclusões locais');
assert.match(guard, /_deleted/, 'sincronização deve enviar e respeitar marcadores de exclusão');
assert.match(guard, /deletedIds\.has\(id\)/, 'itens excluídos não podem voltar durante a mesclagem');
assert.match(html, /markDeleted\('produtos',id\)/, 'exclusão de produto deve ser registrada antes da sincronização');
assert.ok(!/localStorage\.setItem\([^\n]+JSON\.stringify\(d\)\)/.test(guard), 'guard não pode substituir dados locais diretamente pela nuvem');
assert.match(guard, /orcamentos/, 'orçamentos devem participar da sincronização segura');
assert.ok(sw.includes('sync-guard.js'), 'service worker deve injetar o guard em toda navegação do app');
assert.ok(sw.includes('d7comercial-v3.1-deletions'), 'service worker deve renovar o cache após corrigir exclusões');

assert.match(html, /<script src="\.\/sync-guard\.js\?v=2\.7-deletions"><\/script>/, 'index deve renovar o guard com exclusões permanentes');
assert.ok(!html.includes('// On startup: pull cloud first, then push any local data that exists'), 'startup legado não pode executar antes do guard');

assert.match(html, /<script src="\.\/auth-guard\.js\?v=1\.2-enter"><\/script>/, 'index deve carregar o auth guard');
assert.match(auth, /signInWithPassword|\/auth\/v1\/token\?grant_type=password/, 'auth guard deve oferecer login autenticado');
assert.match(auth, /access_token/, 'auth guard deve persistir token autenticado');
assert.match(guard, /D7Auth\??\.getAccessToken/, 'sync guard deve usar token autenticado');
assert.ok(!guard.includes("'Authorization':'Bearer '+SUPA_KEY"), 'sync guard não pode usar chave anon como bearer');
assert.ok(!html.includes("'Authorization':'Bearer '+SUPA_KEY"), 'index não pode usar chave anon como bearer de dados');
assert.ok(!html.includes('create policy "anon_all"'), 'interface não pode instruir recriação de política anon_all');

assert.match(auth, /create_user\s*:\s*false/, 'magic link deve aceitar apenas usuário já existente');
assert.match(auth, /E-mail não autorizado/, 'erro de OTP/signup deve ser traduzido para mensagem clara em português');
assert.match(auth, /Signups not allowed for otp/i, 'auth guard deve reconhecer o erro técnico retornado pelo Supabase');

assert.match(html, /pedido-profissional/, 'Novo Pedido deve usar layout profissional');
assert.match(html, /Resumo do Pedido/, 'Novo Pedido deve exibir resumo lateral');
assert.match(html, /sw\.js\?v=3\.1-deletions/, 'deve forçar a atualização do service worker após corrigir exclusões');
assert.match(sw, /d7comercial-v3\.1-deletions/, 'deve usar um cache novo após corrigir exclusões');
assert.match(html, /Preço não cadastrado/, 'produto sem preço deve ser sinalizado');
assert.match(html, /preco-indisponivel/, 'produto sem preço deve ter inclusão bloqueada');
assert.match(html, /pedido-dados-compactos/, 'cliente, representada e data devem usar cabeçalho compacto');

const catalogoInicio=html.indexOf('/* ══════════════════════ CATÁLOGO ══════════════════════ */');
const catalogoFim=html.indexOf('/* ══════════════════════ NOVO PEDIDO ══════════════════════ */');
assert.ok(catalogoInicio>=0&&catalogoFim>catalogoInicio,'bloco do catálogo deve existir');
const catalogo=html.slice(catalogoInicio,catalogoFim);
assert.ok(!catalogo.includes('fmt(p.preco)'), 'catálogo não deve exibir preço de lista');
assert.ok(!catalogo.includes('p.precoMin'), 'catálogo não deve exibir preço mínimo');
assert.ok(!catalogo.includes('DB.set(\'produtos\''), 'catálogo não deve alterar nem restaurar a lista de produtos');
assert.ok(!catalogo.includes('Preço Lista'), 'catálogo impresso não deve ter coluna de preço de lista');
assert.ok(!catalogo.includes('Preço Mín.'), 'catálogo impresso não deve ter coluna de preço mínimo');
assert.match(catalogo, /onclick="delProd\('\$\{p\.id\}'\)"/, 'catálogo deve permitir excluir o produto');
assert.ok(!catalogo.includes("enviarCatalogoWpp('')"), 'catálogo não deve oferecer envio de todas as representadas');
assert.ok(!catalogo.includes('enviarRepsSelecionadasWpp'), 'catálogo não deve permitir envio conjunto de representadas');
assert.match(catalogo, /name="catalogProd"/, 'cada produto no catálogo deve ter uma opção visível para marcar');
assert.match(catalogo, /toggleCatalogProd\('\$\{p\.id\}'\)/, 'a marcação deve atualizar a seleção do produto');
assert.match(catalogo, /_selCatalogProds\.has\(String\(p\.id\)\)/, 'mensagem deve conter somente os produtos marcados');
assert.match(catalogo, /Selecione pelo menos um produto/, 'envio sem produto selecionado deve ser bloqueado');
assert.match(html, /function delProd\(id\)\{if\(!confirm\('Excluir produto\?'\)\)return;/, 'exclusão pelo catálogo deve exigir confirmação');

assert.match(guard, /saas-light\.css\?v=1\.3-order-builder/, 'sync guard deve carregar a camada visual do construtor de itens');
assert.match(guard, /productivity\.js\?v=1\.2-search-layout/, 'sync guard deve renovar os atalhos sem quebrar a grade de busca');
assert.match(ui, /D7 SaaS Light UI/, 'CSS deve identificar a camada SaaS');
assert.match(ui, /:focus-visible/, 'interface deve ter foco visível para teclado');
assert.match(ui, /text-transform:\s*none/, 'interface deve reduzir caixa alta');
assert.match(ui, /font-weight:\s*600/, 'interface deve usar pesos tipográficos mais leves');
assert.match(ui, /@media\s*\(max-width:\s*700px\)/, 'interface deve preservar responsividade no celular');
assert.match(ui, /prefers-reduced-motion/, 'interface deve respeitar redução de movimento');

assert.match(ui, /--bg:\s*#f6f7f9/i, 'fundo principal deve ser claro');
assert.match(ui, /--sidebar:\s*#ffffff/i, 'sidebar deve ser clara');
assert.match(ui, /--card:\s*#ffffff/i, 'cards devem usar superfície clara');
assert.match(ui, /--text:\s*#1f2937/i, 'texto principal deve usar cinza escuro confortável');
assert.match(ui, /--p:\s*#d92d3a/i, 'vermelho da marca deve ser usado como acento, não como fundo dominante');
assert.match(ui, /box-shadow:\s*0 1px 2px rgba\(16,24,40,.05\)/i, 'cards devem usar sombra SaaS discreta');
assert.match(ui, /font-weight:\s*500!important/, 'navegação deve ter peso visual leve');
assert.match(ui, /background:\s*#fff!important/, 'superfícies principais devem ser brancas');

assert.equal(manifest.name, 'D7COMERCIAL');
assert.equal(manifest.short_name, 'D7COMERCIAL');
assert.ok(manifest.start_url.startsWith('/d7core-pedidos/'));
assert.ok(sw.includes('index.html'));
console.log('SMOKE_OK');
