const {chromium}=require('playwright');
const http=require('http');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const file=path.resolve(root,rel);
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end('not found');}
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(file).pipe(res);
});

(async()=>{
 await new Promise(r=>server.listen(4176,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
 try{
  const page=await browser.newPage();let payload;
  await page.route('**/auth/v1/otp?**',route=>{payload=route.request().postDataJSON();return route.fulfill({contentType:'application/json',body:'{}'});});
  await page.goto('http://127.0.0.1:4176/',{waitUntil:'networkidle'});
  await page.locator('#d7AuthEmail').waitFor();
  if(await page.locator('input[type="password"]').count())throw Error('Campo de senha ainda visível');
  await page.fill('#d7AuthEmail','usuario@teste.com');await page.locator('#d7AuthEmail').press('Enter');
  await page.waitForFunction(()=>document.getElementById('d7AuthMsg').textContent.includes('Abra seu e-mail'));
  if(payload.email!=='usuario@teste.com'||payload.create_user!==false)throw Error('Payload incorreto');
  if(!await page.locator('#d7AuthGate').isVisible())throw Error('Login liberado antes da confirmação do e-mail');
  console.log('EMAIL_LOGIN_UI_OK');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
