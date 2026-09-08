import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const match=html.match(/\/\/ CRM WHATSAPP FORMAT START\n([\s\S]*?)\/\/ CRM WHATSAPP FORMAT END/);
assert.ok(match,'formatador central do CRM deve existir');
const ctx={};
vm.runInNewContext(match[1],ctx);

const entrada='```json\n*CATÁLOGO*\n| Item | Preço |\n|---|---|\n| Farinha | R$ 10 |\n```';
const limpa=ctx.formatarCRMWhatsapp(entrada);
assert.ok(limpa.includes('*CATÁLOGO*'),'deve preservar negrito compatível com WhatsApp');
assert.ok(!limpa.includes('```'),'não deve manter marcação de bloco de código');
assert.ok(!limpa.includes('|'),'não deve manter tabela Markdown');

const produtos=Array.from({length:12},(_,i)=>`• Produto ${i+1}`).join('\n');
const compacto=ctx.formatarCRMWhatsapp(`*CATÁLOGO*\n${produtos}`,{catalogo:true,limite:8});
assert.ok(compacto.includes('Produto 8'),'deve manter os oito principais produtos');
assert.ok(!compacto.includes('Produto 9'),'deve limitar catálogos grandes');
assert.ok(compacto.includes('catálogo completo pode ser solicitado'),'deve avisar sobre o catálogo completo');

const fluxo=html.slice(html.indexOf('async function confirmarEnvioWpp'),html.indexOf('/* ══════════════════════ NOVO PEDIDO'));
assert.ok(fluxo.indexOf("alert('📷 Foto copiada!")<fluxo.indexOf("window.open('https://web.whatsapp.com"),'deve mostrar a instrução antes de abrir o WhatsApp');

console.log('CRM_WHATSAPP_FORMAT_OK');
