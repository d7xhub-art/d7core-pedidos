import fs from 'node:fs';
import assert from 'node:assert/strict';

const p='productivity.js';
assert.ok(fs.existsSync(p),'productivity.js deve existir');
const js=fs.readFileSync(p,'utf8');
assert.match(js,/Ctrl\s*\+\s*K|ctrlKey/,'deve existir atalho Ctrl+K para busca de produto');
assert.match(js,/Escape/,'deve existir atalho Esc para limpar busca');
assert.match(js,/Enter/,'deve existir ação rápida com Enter');
assert.match(js,/bProd/,'deve focar a busca de produto');
assert.match(js,/addItem/,'Enter deve usar a inclusão existente de produto');
assert.match(js,/MutationObserver/,'deve reaplicar produtividade após re-render sem alterar o núcleo');
assert.match(js,/closest\('\.pedido-busca-acao'\)/,'atalhos devem ficar fora da grade formada por busca e botão');
assert.doesNotMatch(js,/search\.insertAdjacentElement\('afterend',hint\)/,'atalhos não podem deslocar o botão Buscar para outra linha');
console.log('PRODUCTIVITY_OK');
