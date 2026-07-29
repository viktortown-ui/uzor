/* global URL, console, process, document */
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
try{for(const [width,height] of [...desktop,...mobile]){const page=await browser.newPage({viewport:{width,height}});await page.goto(`http://127.0.0.1:${port}/uzor/#/map`,{waitUntil:'domcontentloaded'});await page.locator('.delta-map-page').waitFor();const geometry=await page.evaluate(()=>{const map=document.querySelector('.delta-map-page').getBoundingClientRect();const shell=document.querySelector('[data-layout-mode="fullscreen"]').getBoundingClientRect();const dock=document.querySelector('.mobile-app-dock')?.getBoundingClientRect();const sidebar=document.querySelector('.product-sidebar')?.getBoundingClientRect();return{map:{left:map.left,top:map.top,right:map.right,bottom:map.bottom},shell:{left:shell.left,top:shell.top,right:shell.right,bottom:shell.bottom},dock:dock&&{top:dock.top},sidebar:sidebar&&{right:sidebar.right},scroll:[document.documentElement.scrollWidth,document.documentElement.clientWidth,document.documentElement.scrollHeight,document.documentElement.clientHeight]}});const mobileView=width<=900;if(geometry.scroll[0]!==geometry.scroll[1]||geometry.scroll[2]!==geometry.scroll[3])throw new Error(`overflow ${width}x${height}: ${JSON.stringify(geometry)}`);if(mobileView){if(geometry.map.left!==0||geometry.map.right!==width||Math.abs(geometry.map.bottom-geometry.dock.top)>1)throw new Error(`mobile geometry ${width}x${height}: ${JSON.stringify(geometry)}`)}else if(geometry.map.top!==0||geometry.map.right!==width||geometry.map.bottom!==height||geometry.map.left!==geometry.sidebar.right)throw new Error(`desktop geometry ${width}x${height}: ${JSON.stringify(geometry)}`);await page.screenshot({path:`artifacts/product-foundation-visuals/map-${width}x${height}.png`,fullPage:false});await page.close()}console.log(`Geometry verified at ${desktop.length+mobile.length} viewports; artifact product-foundation-visuals`)}finally{await browser.close();server.close()}
