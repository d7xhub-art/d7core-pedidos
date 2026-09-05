import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(source,/c\.scrollTop=0/,'a navegação deve abrir cada tela no topo');

function extractFunction(name){
  const start=source.indexOf(`function ${name}(`);
  assert.notEqual(start,-1,`${name} deve existir`);
  const open=source.indexOf('{',start);
  let depth=0;
  for(let i=open;i<source.length;i++){
    if(source[i]==='{')depth++;
    if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error(`fim de ${name} não encontrado`);
}

const context={
  DB:{get:key=>({
    clientes:[{id:'c1',razao:'Cliente Teste',cidade:'Goiânia',uf:'GO',condPag:'21/28/35'}],
    representadas:[{id:'r1',razao:'Representada Teste'}],
    produtos:[{id:'p1',cod:'0001',desc:'Farinha Teste',un:'20x500g',preco:42,estoque:18,categoria:'Farinhas'}]
  }[key]||[])},
  np:{cliId:'c1',repId:'r1',itens:[],obs:'',fretePeso:0,freteKm:0,freteValor:0,freteResp:'CIF',data:'2026-09-05'},
  npEditId:null,
  pSearch:'',
  fmt:value=>`R$ ${Number(value).toFixed(2).replace('.',',')}`,
  Date
};
vm.createContext(context);
vm.runInContext(`${extractFunction('pgNovoPedido')};this.renderPedido=pgNovoPedido`,context);
const html=context.renderPedido();

assert.match(html,/Início\s*&gt;\s*Novo Pedido|Início\s*>\s*Novo Pedido/,'deve orientar o usuário com breadcrumb');
assert.match(html,/Importar de Orçamento/,'deve disponibilizar a ação do mockup aprovado');
assert.match(html,/1\s*<\/span>\s*Dados do Pedido/,'deve numerar a primeira etapa');
assert.match(html,/2\s*<\/span>\s*Adicionar Produtos/,'deve numerar a segunda etapa');
assert.match(html,/Condição de Pagamento/,'deve mostrar a condição comercial do cliente');
assert.match(html,/Observações opcionais/,'deve manter observações dentro dos dados do pedido');
assert.match(html,/Buscar Produto/,'deve oferecer a aba principal do catálogo');
assert.match(html,/pedido-busca-acao/,'deve exibir busca com ação destacada');
assert.match(html,/Adicionar por Código/,'deve oferecer inclusão rápida por código');
assert.match(html,/Produtos Recentes/,'deve mostrar a navegação profissional de produtos');
assert.match(html,/Favoritos/,'deve mostrar a navegação profissional de produtos');
assert.match(html,/Resumo do Pedido/,'deve manter o resumo lateral');
assert.match(html,/Subtotal/,'deve discriminar subtotal antes do total');
assert.match(html,/Desconto/,'deve exibir o controle de desconto do mockup aprovado');
assert.match(html,/Aplicar Desconto/,'deve oferecer a ação complementar de desconto');
assert.match(html,/Finalizar Pedido/,'deve usar a ação final aprovada');
assert.match(html,/Preços e estoques/,'deve orientar sobre a sincronização comercial');

console.log('PEDIDO_UI_OK');
