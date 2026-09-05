import re
from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

css=r'''
/* ══ NOVO PEDIDO PROFISSIONAL ══ */
.pedido-profissional{max-width:1380px;margin:0 auto}
.pedido-profissional .pg-head{margin-bottom:14px}
.pedido-dados-compactos{padding:14px 16px!important}
.pedido-dados-grid{display:grid;grid-template-columns:minmax(260px,1.4fr) minmax(240px,1.1fr) minmax(150px,.55fr);gap:12px;align-items:end}
.pedido-dados-grid .fld{margin:0}.pedido-dados-grid .fld label{margin-bottom:2px}
.pedido-workspace{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(320px,.75fr);gap:16px;align-items:start}
.pedido-catalogo{min-width:0}.pedido-catalogo .dark-input#bProd{height:46px;font-size:14px;border-color:var(--border2);background:#151515}
.pedido-catalogo .dark-input#bProd:focus{border-color:var(--p);box-shadow:0 0 0 3px rgba(220,38,38,.08)}
.pedido-catalogo .prod-result{max-height:520px;overflow:auto;margin-top:10px;border:1px solid var(--border);border-radius:10px;background:#151515}
.pedido-catalogo .prod-row{min-height:58px;padding:10px 12px;border-bottom:1px solid var(--border);transition:.15s;background:transparent}
.pedido-catalogo .prod-row:last-child{border-bottom:none}.pedido-catalogo .prod-row:hover{background:rgba(255,255,255,.035)}
.pedido-catalogo .prod-row.preco-indisponivel{opacity:.55;cursor:not-allowed}.pedido-catalogo .prod-row.preco-indisponivel:hover{background:transparent}
.preco-nao-cadastrado{color:#fca5a5;font-weight:800;font-size:11.5px}.pedido-catalogo .prod-row.preco-indisponivel .add-ico{background:#333;color:#777;box-shadow:none}
.pedido-resumo{position:sticky;top:0;padding:0!important;overflow:hidden}.pedido-resumo-head{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px}
.pedido-resumo-lista{max-height:450px;overflow:auto}.pedido-resumo-vazio{padding:34px 18px;text-align:center;color:var(--sub);line-height:1.5}
.pedido-resumo-item{padding:12px 14px;border-bottom:1px solid var(--border)}.pedido-resumo-item-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.pedido-resumo-item-nome{font-weight:750;font-size:12.5px;line-height:1.3}
.pedido-resumo-controls{display:grid;grid-template-columns:68px 90px 1fr 26px;gap:7px;align-items:center;margin-top:9px}.pedido-resumo-controls .num-inp{width:100%;height:32px;padding:4px 6px;font-size:12px}
.pedido-resumo-subtotal{text-align:right;font-weight:850;color:var(--a);font-size:12px;white-space:nowrap}.pedido-resumo-total{padding:14px 16px;background:linear-gradient(135deg,rgba(220,38,38,.14),rgba(249,115,22,.08));border-top:1px solid rgba(220,38,38,.25);display:flex;justify-content:space-between;align-items:end;gap:12px}.pedido-resumo-total strong{font-size:23px;color:#fff}
.pedido-acoes{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:12px}.pedido-extra{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
@media(max-width:1050px){.pedido-workspace{grid-template-columns:1fr}.pedido-resumo{position:static}.pedido-resumo-lista{max-height:none}.pedido-dados-grid{grid-template-columns:1fr 1fr}.pedido-dados-grid .fld:last-child{grid-column:1/-1;max-width:220px}}
@media(max-width:700px){.pedido-dados-grid,.pedido-extra{grid-template-columns:1fr}.pedido-dados-grid .fld:last-child{max-width:none}.pedido-resumo-controls{grid-template-columns:64px 82px 1fr 26px}.pedido-acoes{grid-template-columns:1fr}.pedido-profissional .pd-block{padding:14px}.pedido-catalogo .prod-result{max-height:430px}}
'''
if '/* ══ NOVO PEDIDO PROFISSIONAL ══ */' not in s:
    s=s.replace('</style>',css+'\n</style>',1)

novo=r'''function pgNovoPedido(){
  const clis=DB.get('clientes'),reps=DB.get('representadas'),prods=DB.get('produtos');
  const total=np.itens.reduce((s,i)=>s+i.qty*i.preco,0);
  const q=pSearch;
  const norm=s=>(s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const fp=q?prods.filter(p=>{const hay=norm(p.desc+' '+p.cod+' '+(p.refFab||''));return norm(q).split(' ').filter(Boolean).every(w=>hay.includes(w));}):prods;
  return `
  <div class="pedido-profissional">
    <div class="pg-head"><div><div class="pg-title">${npEditId?'✏️ Editar Pedido':'Novo Pedido'}</div><div class="pg-sub">Monte o pedido com rapidez e confira o resumo antes de confirmar</div></div></div>
    <div class="pd-block pedido-dados-compactos">
      <div class="sec" style="padding-top:0">📋 Dados do Pedido</div>
      <div class="pedido-dados-grid">
        <div class="fld"><label>Cliente *</label><select id="npCli" onchange="np.cliId=this.value" style="background:rgba(255,255,255,.025);border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--text);outline:none;width:100%"><option value="">— Selecione o cliente —</option>${clis.map(c=>`<option value="${c.id}" ${np.cliId==c.id?'selected':''}>${c.razao||c.fantasia}${c.cidade?' · '+c.cidade+'/'+c.uf:''}</option>`).join('')}</select></div>
        <div class="fld"><label>Representada *</label><select id="npRep" onchange="np.repId=this.value" style="background:rgba(255,255,255,.025);border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--text);outline:none;width:100%"><option value="">— Selecione a empresa —</option>${reps.map(r=>`<option value="${r.id}" ${np.repId==r.id?'selected':''}>${r.razao||r.fantasia}</option>`).join('')}</select></div>
        <div class="fld"><label>Data do Pedido</label><input type="date" id="npData" value="${np.data||new Date().toISOString().slice(0,10)}" onchange="np.data=this.value" style="background:rgba(255,255,255,.025);border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--text);outline:none;width:100%"></div>
      </div>
    </div>
    <div class="pedido-workspace">
      <div class="pd-block pedido-catalogo">
        <div class="sec" style="padding-top:0">🔍 Adicionar Produto</div>
        <input class="dark-input" id="bProd" type="search" placeholder="Digite código, referência ou nome do produto..." value="${q}" oninput="pSearch=this.value;render()" autocomplete="off">
        <div style="font-size:11px;color:var(--sub);margin:8px 1px 0">${fp.length} produto(s) encontrado(s) · produtos sem preço ficam bloqueados</div>
        ${fp.length>0?`<div class="prod-result">${fp.slice(0,30).map(p=>{const ok=Number(p.preco)>0;return `<div class="prod-row ${ok?'':'preco-indisponivel'}" ${ok?`onclick="addItem('${p.id}')"`:''}><div style="min-width:0"><div style="font-weight:750;font-size:13px;white-space:normal">${p.desc}</div><div style="font-size:11.5px;color:var(--sub);margin-top:4px"><span class="tag" style="margin-right:6px">${p.cod}</span>${ok?`${fmt(p.preco)} / ${p.un}`:`<span class="preco-nao-cadastrado">Preço não cadastrado</span>`}</div></div><div class="add-ico" title="${ok?'Adicionar ao pedido':'Cadastre um preço para liberar'}">${ok?'+':'×'}</div></div>`}).join('')}</div>`:`<div class="pedido-resumo-vazio">Nenhum produto encontrado para essa busca.</div>`}
      </div>
      <div class="pd-block pedido-resumo">
        <div class="pedido-resumo-head"><div><div style="font-weight:900;font-size:14px">🛒 Resumo do Pedido</div><div style="font-size:11px;color:var(--sub);margin-top:2px">${np.itens.length} item(ns)</div></div><span class="tag">${np.itens.length}</span></div>
        <div class="pedido-resumo-lista">${np.itens.length?np.itens.map((it,i)=>`<div class="pedido-resumo-item"><div class="pedido-resumo-item-top"><div style="min-width:0"><div class="pedido-resumo-item-nome">${it.desc}</div><div style="font-size:10.5px;color:var(--sub);margin-top:3px">${it.cod} · ${it.un}</div></div></div><input class="dark-input" style="margin-top:8px;padding:6px 8px;font-size:11.5px" type="text" placeholder="Observação do item..." value="${it.disc||''}" oninput="updItemDisc(${i},this.value)"><div class="pedido-resumo-controls"><input class="num-inp" title="Quantidade" type="number" min="0.001" step="0.001" value="${it.qty}" onchange="updItem(${i},'qty',this.value)"><input class="num-inp" title="Preço" type="number" min="0.01" step="0.01" value="${it.preco}" onchange="updItem(${i},'preco',this.value)"><div class="pedido-resumo-subtotal">${fmt(it.qty*it.preco)}</div><button title="Remover" onclick="remItem(${i})" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:20px">×</button></div></div>`).join(''):`<div class="pedido-resumo-vazio"><div style="font-size:24px;margin-bottom:8px">🛒</div>Seu pedido ainda está vazio.<br>Use o botão <b>+</b> na lista de produtos.</div>`}</div>
        <div class="pedido-resumo-total"><div><div style="font-size:10px;color:var(--sub);font-weight:800;text-transform:uppercase;letter-spacing:.6px">Total do Pedido</div><div style="font-size:11px;color:var(--sub);margin-top:3px">${np.itens.length} item(ns)</div></div><strong>${fmt(total)}</strong></div>
      </div>
    </div>
    <div class="pedido-extra">
      <div class="pd-block"><div class="sec" style="padding-top:0">🚚 Frete <span style="font-size:11px;color:var(--sub);font-weight:400;text-transform:none;letter-spacing:0">(opcional)</span></div><div class="row2"><div class="fld"><label>Peso Total (kg)</label><input class="dark-input" id="npFretePeso" type="number" min="0" step="0.1" placeholder="0,00" value="${np.fretePeso||''}" oninput="np.fretePeso=this.value"></div><div class="fld"><label>Distância (km)</label><input class="dark-input" id="npFreteKm" type="number" min="0" step="1" placeholder="0" value="${np.freteKm||''}" oninput="np.freteKm=this.value"></div></div><div class="row2"><div class="fld"><label>Valor do Frete (R$)</label><input class="dark-input" id="npFreteValor" type="number" min="0" step="0.01" placeholder="0,00" value="${np.freteValor||''}" oninput="np.freteValor=this.value"></div><div class="fld"><label>Responsável pelo Frete</label><select class="dark-input" id="npFreteResp" oninput="np.freteResp=this.value"><option value="">— Selecione —</option><option value="CIF" ${(np.freteResp||'')==='CIF'?'selected':''}>CIF (por conta do vendedor)</option><option value="FOB" ${(np.freteResp||'')==='FOB'?'selected':''}>FOB (por conta do comprador)</option></select></div></div></div>
      <div class="pd-block"><div class="sec" style="padding-top:0">📝 Observações</div><textarea class="dark-input" id="npObs" rows="6" placeholder="Condições, instruções de entrega ou observações do pedido..." oninput="np.obs=this.value">${np.obs||''}</textarea></div>
    </div>
    <div class="pedido-acoes"><button class="btn btn-a" style="padding:14px" onclick="confirmar()">✅ ${npEditId?'Salvar Alterações':'Confirmar Pedido'} — ${fmt(total)}</button><button class="btn btn-ghost" onclick="limpar()" style="padding:14px 20px">🗑️ Limpar</button></div>
  </div>`;
}

function addItem(pid){const p=DB.get('produtos').find(x=>x.id==pid);if(!p)return;if(!(Number(p.preco)>0))return alert('Preço não cadastrado. Cadastre o preço do produto antes de adicioná-lo ao pedido.');const ex=np.itens.find(i=>i.pid==pid);if(ex){ex.qty=parseFloat((ex.qty+1).toFixed(3))}else np.itens.push({pid,cod:p.cod,desc:p.desc,un:p.un,qty:1,preco:p.preco,disc:''});pSearch='';render()}
'''
pattern=r'function pgNovoPedido\(\)\{.*?\nfunction addItem\(pid\)\{[^\n]*\}\n'
out,n=re.subn(pattern,novo,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'pgNovoPedido/addItem alvo não encontrado: {n}')
p.write_text(out,encoding='utf-8')
print('PATCH_NOVO_PEDIDO_OK')
