/* global URL, console, process, document, performance, Event, window */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';

import { join, extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
const root=resolve(process.cwd(),'dist');
const types=new Map([['.html','text/html'],['.js','text/javascript'],['.css','text/css'],['.webmanifest','application/manifest+json'],['.svg','image/svg+xml'],['.png','image/png']]);
const assetExtensions=new Set(['.js','.css','.json','.webmanifest','.svg','.png','.ico']);
function insideDist(file){const normalized=resolve(file);return normalized===root||normalized.startsWith(root+sep)}
function notFound(res){res.writeHead(404);res.end('Not found')}
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (!url.pathname.startsWith('/uzor')) return notFound(res);
  const relative = url.pathname === '/uzor' || url.pathname === '/uzor/' ? 'index.html' : decodeURIComponent(url.pathname.slice('/uzor/'.length));
  const requested = resolve(root, relative);
  if (!insideDist(requested)) return notFound(res);
  try { const data = await readFile(requested); res.writeHead(200, { 'content-type': types.get(extname(requested)) ?? 'application/octet-stream' }); res.end(data); return; }
  catch {
    if (assetExtensions.has(extname(relative)) || relative.includes('.')) return notFound(res);
    const data = await readFile(join(root, 'index.html')); res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(data);
  }
});
await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
const {port}=server.address();const browser=await chromium.launch();await mkdir('artifacts/product-foundation-visuals',{recursive:true});
const desktop=[[1920,1080],[1600,900],[1440,900],[1366,768],[1280,720],[1024,768],[901,800]];
const mobile=[[900,800],[430,932],[412,915],[390,844],[375,812],[360,800],[320,700]];
try{for(const [width,height] of [...desktop,...mobile]){const page=await browser.newPage({viewport:{width,height}});await page.goto(`http://127.0.0.1:${port}/uzor/#/map`,{waitUntil:'domcontentloaded'});await page.locator('.delta-map-page').waitFor();await page.locator('[data-map-render-state="ready"]').waitFor();const geometry=await page.evaluate(()=>{const map=document.querySelector('.delta-map-page').getBoundingClientRect();const shell=document.querySelector('[data-layout-mode="fullscreen"]').getBoundingClientRect();const dock=document.querySelector('.mobile-app-dock')?.getBoundingClientRect();const sidebar=document.querySelector('.product-sidebar')?.getBoundingClientRect();return{map:{left:map.left,top:map.top,right:map.right,bottom:map.bottom},shell:{left:shell.left,top:shell.top,right:shell.right,bottom:shell.bottom},dock:dock&&{top:dock.top},sidebar:sidebar&&{right:sidebar.right},scroll:[document.documentElement.scrollWidth,document.documentElement.clientWidth,document.documentElement.scrollHeight,document.documentElement.clientHeight]}});const mobileView=width<=900;if(geometry.scroll[0]!==geometry.scroll[1]||geometry.scroll[2]!==geometry.scroll[3])throw new Error(`overflow ${width}x${height}: ${JSON.stringify(geometry)}`);if(mobileView){if(geometry.map.left!==0||geometry.map.right!==width||Math.abs(geometry.map.bottom-geometry.dock.top)>1)throw new Error(`mobile geometry ${width}x${height}: ${JSON.stringify(geometry)}`)}else if(geometry.map.top!==0||geometry.map.right!==width||geometry.map.bottom!==height||geometry.map.left!==geometry.sidebar.right)throw new Error(`desktop geometry ${width}x${height}: ${JSON.stringify(geometry)}`);const [header,filters]=await Promise.all([page.locator('.delta-map-header').boundingBox(),page.locator('.delta-map-filters').boundingBox()]);if(header&&filters&&header.y+header.height>filters.y)throw new Error(`header and filters overlap ${width}x${height}`);const reset=await page.locator('.delta-map-reset').boundingBox();if(reset&&(reset.y<geometry.map.top||reset.y+reset.height>geometry.map.bottom))throw new Error(`reset outside map stage ${width}x${height}`);await page.screenshot({path:`artifacts/product-foundation-visuals/map-${width}x${height}.png`,fullPage:false});await page.close()}
const capture=async(name,route,viewport,action)=>{
  const page=await browser.newPage({viewport});
  try{
    await page.goto(`http://127.0.0.1:${port}/uzor/#${route}`,{waitUntil:'domcontentloaded'});
    if(route.startsWith('/auth?visual=email'))await page.getByLabel('Электронная почта').waitFor();
    else if(route.startsWith('/auth?visual=otp'))await page.getByLabel('Одноразовый код').waitFor();
    else if(route.startsWith('/settings'))await page.getByRole('heading',{name:'Настройки'}).waitFor();
    else if(route.startsWith('/map'))await page.locator('[data-map-render-state="ready"]').waitFor();
    const assertionError=action?await action(page):undefined;
    await page.screenshot({path:`artifacts/product-foundation-visuals/${name}.png`,fullPage:false});
    if(assertionError)throw assertionError;
  }catch(error){
    await page.screenshot({path:`artifacts/product-foundation-visuals/${name}-failure.png`,fullPage:false}).catch(()=>{});
    throw error;
  }finally{await page.close()}
};
await capture('auth-email','/auth?visual=email',{width:1440,height:900},async page=>{const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>entry.name));if(resources.some(name=>/maplibre|DeltaMap|DeltaCreate/i.test(name)))return new Error('authentication entry eagerly loaded map or Delta creation chunks')});
await capture('auth-otp','/auth?visual=otp',{width:390,height:844});
await capture('settings-desktop','/settings',{width:1440,height:900});
await capture('settings-mobile','/settings',{width:390,height:844});
await capture('onboarding-desktop','/about?visualOnboarding=1',{width:1440,height:900},page=>page.getByRole('dialog').waitFor());
await capture('onboarding-mobile','/about?visualOnboarding=1',{width:390,height:844},page=>page.getByRole('dialog').waitFor());
await capture('map-inspector','/map?delta=demo-1',{width:1440,height:900},page=>page.locator('.delta-map-card--desktop').waitFor());
const showInstall=async page=>{await page.evaluate(()=>{const event=new Event('beforeinstallprompt');Object.defineProperties(event,{prompt:{value:async()=>undefined},userChoice:{value:Promise.resolve({outcome:'dismissed',platform:'web'})}});window.dispatchEvent(event)});await page.locator('.pwa-install-launcher').waitFor()};
await capture('map-utilities-legend-open','/map',{width:1440,height:900},async page=>{await showInstall(page);await page.getByRole('button',{name:'Легенда'}).click();const boxes=await Promise.all(['.delta-map-legend','.delta-legend-toggle','.delta-map-reset','.pwa-install-launcher','.maplibregl-ctrl-bottom-right'].map(selector=>page.locator(selector).boundingBox()));let overlap=false;for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){const x=boxes[a],y=boxes[b];if(x&&y&&x.x<y.x+y.width&&x.x+x.width>y.x&&x.y<y.y+y.height&&x.y+x.height>y.y)overlap=true}if(overlap)return new Error('desktop map utilities overlap '+JSON.stringify(boxes))});
await capture('map-utilities-inspector','/map?delta=demo-1',{width:1440,height:900},async page=>{await page.locator('.delta-map-card--desktop').waitFor();await showInstall(page)});
await capture('mobile-card-compact','/map?delta=demo-1',{width:390,height:844},async page=>{const card=page.locator('.delta-map-card--mobile');await card.waitFor();const [box,map]=await Promise.all([card.boundingBox(),page.locator('.delta-map-page').boundingBox()]);if(!box||!map||Math.abs(box.y+box.height-(map.y+map.height-10))>2)throw new Error('compact card is not anchored to map-stage bottom')});
await capture('mobile-card-expanded','/map?delta=demo-1',{width:390,height:844},async page=>{await page.getByRole('button',{name:'Подробнее'}).click();await page.locator('.delta-map-card--mobile.is-expanded').waitFor()});
await capture('mobile-filter-sheet','/map',{width:390,height:844},async page=>{await page.getByRole('button',{name:/Фильтры/}).click();await page.getByRole('dialog',{name:'Фильтры'}).waitFor()});
console.log(`Geometry verified at ${desktop.length+mobile.length} viewports; visual artifact product-foundation-visuals captured`)}finally{await browser.close();server.close()}
