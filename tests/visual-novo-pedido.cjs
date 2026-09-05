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
  await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.addInitScript(()=>{
    localStorage.setItem('d7_clientes',JSON.stringify([{id:'c1',razao:'Cliente Demonstração',cidade:'Goiânia',uf:'GO',condPag:'21/28/35'}]));
    localStorage.setItem('d7_representadas',JSON.stringify([{id:'r1',razao:'Representada Demonstração'}]));
    localStorage.setItem('d7_produtos',JSON.stringify([{id:'p1',repId:'r1',cod:'0001',desc:'SAL MOÍDO 30X1 FARDO',un:'frd',preco:25.9,estoque:20}]));
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.evaluate(()=>goto('novo-pedido'));
  await page.waitForSelector('.pedido-dados-compactos');
  await page.waitForFunction(()=>document.querySelector('link[data-d7-saas-ui]')?.sheet);
  await page.waitForTimeout(500);

  const data=await page.locator('.pedido-dados-compactos').boundingBox();
  const catalog=await page.locator('.pedido-catalogo').boundingBox();
  const summary=await page.locator('.pedido-resumo').boundingBox();
  const input=await page.locator('#bProd').boundingBox();
  const button=await page.locator('.pedido-busca-acao .btn').boundingBox();
  const scrollTop=await page.locator('#content').evaluate(el=>el.scrollTop);
  const shortcutsParent=await page.locator('.d7-shortcuts').evaluate(el=>el.parentElement.className);

  if(!data||data.y<90||data.y>420)throw new Error('Dados do Pedido fora da área inicial');
  if(!catalog||catalog.y<=data.y)throw new Error('Catálogo deve aparecer depois dos Dados do Pedido');
  if(!summary||summary.x<=catalog.x)throw new Error('Resumo deve permanecer na coluna direita');
  if(!input||!button||Math.abs(input.y-button.y)>3)throw new Error('Campo e botão Buscar não estão na mesma linha');
  if(input.width<350||button.width<75||button.width>180)throw new Error('Proporção da busca está incorreta');
  if(scrollTop!==0)throw new Error('Novo Pedido não abriu no topo');
  if(shortcutsParent.includes('pedido-busca-acao'))throw new Error('Atalhos deslocaram o botão Buscar');
  if(errors.length)throw new Error('Erros JavaScript: '+errors.join(' | '));

  fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
  await page.screenshot({path:path.join(root,'artifacts','novo-pedido-validado.png'),fullPage:true});
  console.log('VISUAL_NOVO_PEDIDO_OK');
  await browser.close();
  server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1);});
