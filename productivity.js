(()=>{
  'use strict';

  let lastSearch=null;
  let pending=false;

  function isNovoPedido(){
    return !!document.querySelector('.pedido-profissional #bProd');
  }

  function focusSearch(){
    const search=document.getElementById('bProd');
    if(!search)return false;
    search.focus({preventScroll:true});
    const end=search.value.length;
    if(typeof search.setSelectionRange==='function')search.setSelectionRange(end,end);
    return true;
  }

  function firstValidRow(){
    return document.querySelector('.prod-result .prod-row:not(.preco-indisponivel)');
  }

  function addFirstResult(){
    const row=firstValidRow();
    if(!row)return false;
    const handler=row.getAttribute('onclick')||'';
    const match=handler.match(/addItem\('([^']+)'\)/);
    if(!match||typeof window.addItem!=='function')return false;
    window.addItem(match[1]);
    setTimeout(()=>{clearSearch();focusSearch();},0);
    return true;
  }

  function clearSearch(){
    const search=document.getElementById('bProd');
    if(!search||!search.value)return false;
    search.value='';
    search.dispatchEvent(new Event('input',{bubbles:true}));
    return true;
  }

  function ensureHint(search){
    const catalog=search.closest('.pedido-catalogo');
    if(!catalog||catalog.querySelector('.d7-shortcuts'))return;
    const hint=document.createElement('div');
    hint.className='d7-shortcuts';
    hint.setAttribute('aria-label','Atalhos de produtividade');
    hint.innerHTML='<span><kbd>Enter</kbd> adiciona</span><span><kbd>Ctrl</kbd> + <kbd>K</kbd> busca</span><span><kbd>Esc</kbd> limpa</span>';
    search.insertAdjacentElement('afterend',hint);
  }

  function highlightFirst(){
    document.querySelectorAll('.prod-result .prod-row.d7-first-result').forEach(el=>el.classList.remove('d7-first-result'));
    const row=firstValidRow();
    if(row)row.classList.add('d7-first-result');
  }

  function organizePedido(search){
    const catalog=search.closest('.pedido-catalogo');
    const workspace=search.closest('.pedido-workspace');
    const summary=workspace?.querySelector('.pedido-resumo');
    if(!catalog||!summary)return;

    catalog.classList.add('pedido-busca-dropdown');
    catalog.classList.toggle('busca-ativa',!!search.value.trim());
    summary.classList.add('pedido-itens-principal');

    const meta=[...catalog.children].find(el=>el.tagName==='DIV'&&/produto\(s\) encontrado\(s\)/.test(el.textContent||''));
    if(meta)meta.classList.add('pedido-busca-meta');

    const title=summary.querySelector('.pedido-resumo-head > div > div:first-child');
    if(title)title.textContent='🛒 Itens do Pedido';
    const empty=summary.querySelector('.pedido-resumo-vazio');
    if(empty&&summary.contains(empty))empty.innerHTML='<div style="font-size:24px;margin-bottom:8px">🛒</div>Nenhum item adicionado ainda.<br>Busque um produto acima para começar.';
  }

  function ensureStyle(){
    if(document.getElementById('d7-productivity-style'))return;
    const style=document.createElement('style');
    style.id='d7-productivity-style';
    style.textContent=`
      .d7-shortcuts{display:flex;gap:12px;flex-wrap:wrap;margin:7px 1px 2px;color:var(--sub);font-size:10.5px;align-items:center}
      .d7-shortcuts span{display:inline-flex;gap:4px;align-items:center}
      .d7-shortcuts kbd{font:inherit;font-weight:600;color:var(--text);background:var(--card2);border:1px solid var(--border2);border-bottom-width:2px;border-radius:5px;padding:1px 5px;line-height:1.4}
      .prod-row.d7-first-result:not(.preco-indisponivel){border-color:rgba(220,38,38,.38);background:rgba(220,38,38,.055)}
      @media(max-width:700px){.d7-shortcuts{gap:8px;font-size:10px}.d7-shortcuts span:nth-child(2){display:none}}
    `;
    document.head.appendChild(style);
  }

  function enhance(){
    pending=false;
    if(!isNovoPedido()){lastSearch=null;return;}
    const search=document.getElementById('bProd');
    if(!search)return;

    ensureStyle();
    ensureHint(search);
    organizePedido(search);
    highlightFirst();

    const active=document.activeElement;
    const oldSearchGone=lastSearch&&lastSearch!==search&&!lastSearch.isConnected;
    const shouldFocus=!lastSearch||oldSearchGone||active===document.body||active===document.documentElement;
    lastSearch=search;
    if(shouldFocus)setTimeout(focusSearch,0);
  }

  function scheduleEnhance(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(enhance);
  }

  function onKeydown(e){
    const search=document.getElementById('bProd');

    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
      if(search){e.preventDefault();focusSearch();}
      return;
    }

    if(!search||!isNovoPedido())return;

    if(e.key==='Escape'){
      if(clearSearch())e.preventDefault();
      return;
    }

    if(e.key==='Enter'&&document.activeElement===search&&search.value.trim()){
      if(addFirstResult())e.preventDefault();
    }
  }

  function onClick(e){
    const row=e.target.closest?.('.pedido-catalogo .prod-row:not(.preco-indisponivel)');
    if(!row)return;
    setTimeout(()=>{const search=document.getElementById('bProd');if(search&&search.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}},0);
  }

  function start(){
    ensureStyle();
    document.addEventListener('keydown',onKeydown);
    document.addEventListener('click',onClick);
    const root=document.getElementById('content')||document.body;
    const observer=new MutationObserver(scheduleEnhance);
    observer.observe(root,{childList:true,subtree:true});
    scheduleEnhance();
  }

  // Ctrl + K / Cmd + K foca a busca; Enter adiciona; Escape fecha a busca.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
