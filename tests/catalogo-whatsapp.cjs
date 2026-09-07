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
  await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.addInitScript(()=>{
    localStorage.setItem('d7_clientes',JSON.stringify([{id:'c1',razao:'Cliente Teste',fone:'62999999999'}]));
    localStorage.setItem('d7_representadas',JSON.stringify([{id:'r1',razao:'Yka Alimentos'},{id:'r2',razao:'Outra Indústria'}]));
    localStorage.setItem('d7_produtos',JSON.stringify([
      {id:'p1',repId:'r1',desc:'Farinha Biju 500g',preco:25.90},
      {id:'p2',repId:'r1',desc:'Farofa Picanha 250g',preco:42.00},
      {id:'p3',repId:'r2',desc:'Produto de Outra Representada',preco:99.00}
    ]));
    window.__opened=[];
    window.open=(url)=>{window.__opened.push(url);return {document:{write(){},close(){}},print(){}}};
  });
  await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
  await page.evaluate(()=>goto('catalogo'));
  const catalogText=await page.locator('#content').innerText();
  if(catalogText.includes('R$')||catalogText.includes('25,90')||catalogText.includes('42,00'))throw new Error('O catálogo visível expôs preços');
  await page.locator('input[name="catalogProd"]').nth(0).check();
  await page.getByRole('button',{name:'Enviar marcados'}).first().click();
  const preview=await page.locator('#modal').innerText();
  if(!preview.includes('Farinha Biju 500g'))throw new Error('A prévia não mostra o produto marcado');
  if(preview.includes('Farofa Picanha 250g')||preview.includes('Produto de Outra Representada'))throw new Error('A prévia incluiu produto não marcado ou de outra representada');
  if(preview.includes('25,90')||preview.includes('R$'))throw new Error('A prévia expôs preço');
  await page.fill('#wppNum','62999999999');
  await page.locator('#modal button').filter({hasText:'Abrir WhatsApp'}).click();
  const opened=await page.evaluate(()=>window.__opened.at(-1));
  const sent=decodeURIComponent(opened||'');
  if(!sent.includes('Farinha Biju 500g'))throw new Error('A mensagem não contém o produto marcado');
  if(sent.includes('Farofa Picanha 250g')||sent.includes('Produto de Outra Representada'))throw new Error('A mensagem incluiu produto não marcado ou de outra representada');
  if(sent.includes('25,90')||sent.includes('42,00')||sent.includes('99,00')||sent.includes('R$'))throw new Error('A mensagem expôs preços');
  if(errors.length)throw new Error('Erros JavaScript: '+errors.join(' | '));
  console.log('CATALOGO_WHATSAPP_OK');
  await browser.close();
  server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
