import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.deepEqual([...html.matchAll(/class="sb-item" id="([^"]+)"/g)].map(x=>x[1]),['si-representadas','si-produtos','si-clientes','si-novo-pedido','si-historico']);
assert.ok(!html.includes('Importar de Orçamento'));
assert.match(html,/D7Data.get/);
assert.match(html,/D7Data.importBackup/);
console.log('SIMPLIFIED_APP_OK');
