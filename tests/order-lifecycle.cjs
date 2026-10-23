const {chromium}=require('playwright');
const http=require('http');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname.endsWith('/auth-guard.js')){res.writeHead(200,{'content-type':'text/javascript'});return res.end('window.D7Auth={getAccessToken:()=>"",hasValidSession:async()=>false};');}
  const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const file=path.resolve(root,rel);
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end('not found');}
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(file).pipe(res);
});

(async()=>{
  await new Promise(resolve=>server.listen(4175,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
  try{
    const page=await browser.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('dialog',d=>d.accept());
    await page.addInitScript(()=>{
      localStorage.setItem('d7_clientes',JSON.stringify([{id:'c1',razao:'Cliente Teste',condPag:'28 dias'}]));
      localStorage.setItem('d7_representadas',JSON.stringify([{id:'r1',razao:'Representada A'},{id:'r2',razao:'Representada B'}]));
      localStorage.setItem('d7_produtos',JSON.stringify([{id:'p1',repId:'r1',cod:'001',desc:'Produto A',un:'cx',preco:25.9,custom:'preservar'},{id:'p2',repId:'r2',cod:'002',desc:'Produto B',preco:10}]));
      window.__shared=[];window.__print='';
      Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>window.__shared.push(payload)});
      window.open=()=>({document:{write(html){window.__print=html},close(){}},print(){}});
    });
    await page.goto('http://127.0.0.1:4175/',{waitUntil:'networkidle'});
    await page.selectOption('#npCli','c1');await page.selectOption('#npRep','r1');
    if(await page.locator('#npProdSel option[value="p2"]').count())throw Error('produto de outra representada disponível');
    await page.selectOption('#npProdSel','p1');await page.fill('#npProdQty','3');await page.click('#npAddProd');
    await page.fill('.pedido-resumo-item input[type="text"]','Entregar fechado');
    await page.fill('#npObs','Pedido de teste');
    await page.locator('#npObs').evaluate(el=>el.blur());
    await page.getByRole('button',{name:'Finalizar Pedido'}).click();
    let orders=await page.evaluate(()=>DB.get('pedidos'));
    if(orders[0]?.obs!=='Pedido de teste')throw Error('Observação não salva na emissão: '+JSON.stringify(orders));
    if(orders.length!==1||Math.abs(orders[0].total-77.7)>0.001)throw Error('emissão incorreta');
    const id=orders[0].id;
    await page.evaluate(id=>editarPedido(id),id);
    await page.fill('.pedido-resumo-controls input[title="Quantidade"]','2');
    await page.locator('.pedido-resumo-controls input[title="Quantidade"]').dispatchEvent('change');
    await page.getByRole('button',{name:'Salvar Pedido',exact:true}).click();
    orders=await page.evaluate(()=>DB.get('pedidos'));
    if(orders.length!==1||orders[0].id!==id||orders[0].num!==1||orders[0].total!==51.8)throw Error('edição duplicou ou alterou identidade/total');
    await page.evaluate(id=>exportWpp(id),id);
    const payload=await page.evaluate(()=>window.__shared.at(-1));
    for(const text of ['D7 PEDIDOS','Pedido #1','Cliente Teste','Representada A','Produto A','51,80','Pedido de teste','Entregar fechado'])if(!payload.text.includes(text))throw Error('WhatsApp sem '+text);
    if(/undefined|NaN|```|\|/.test(payload.text))throw Error('payload WhatsApp inválido');
    await page.evaluate(id=>imprimirPedido(id),id);
    const print=await page.evaluate(()=>window.__print);
    for(const text of ['D7 PEDIDOS','Produto A','51,80','Entregar fechado'])if(!print.includes(text))throw Error('impressão sem '+text);
    await page.evaluate(()=>{openFormProd('p1');});await page.fill('#pPreco','30');await page.getByRole('button',{name:'Salvar Produto'}).click();
    if(await page.evaluate(()=>DB.get('produtos').find(p=>p.id==='p1').custom)!=='preservar')throw Error('edição perdeu dados legados');
    await page.evaluate(()=>delProd('p1'));
    await page.evaluate(()=>D7Data.importBackup({produtos:[{id:'p1',desc:'backup antigo'}]}));
    await page.reload({waitUntil:'networkidle'});
    if(await page.evaluate(()=>DB.get('produtos').some(p=>p.id==='p1')))throw Error('produto excluído voltou após backup/reabertura');
    if(errors.length)throw Error(errors.join(' | '));
    console.log('ORDER_LIFECYCLE_OK');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exit(1)});
