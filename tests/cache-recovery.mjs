import fs from 'node:fs';
import assert from 'node:assert/strict';

const path=new URL('../recuperar.html',import.meta.url);
assert.ok(fs.existsSync(path),'a página independente de recuperação deve existir');
const html=fs.readFileSync(path,'utf8');
assert.match(html,/serviceWorker\.getRegistrations/,'deve remover o service worker antigo');
assert.match(html,/caches\.keys/,'deve limpar todos os caches antigos');
assert.match(html,/index\.html\?recovered=/,'deve reabrir o aplicativo com URL inédita');
assert.match(html,/Recuperando o D7COMERCIAL/,'deve informar claramente o processo');
console.log('CACHE_RECOVERY_OK');
