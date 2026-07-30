/* global fetch, process, console, setTimeout, clearTimeout, AbortController */
const url=process.env.VITE_MAP_STYLE_URL||'https://tiles.openfreemap.org/styles/liberty';
const attempts=3;const timeoutMs=10000;
let lastError;
for(let attempt=1;attempt<=attempts;attempt++){
 try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const response=await fetch(url,{headers:{accept:'application/json'},signal:controller.signal});clearTimeout(timer);
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const style=await response.json();
  if(style?.version!==8)throw new Error(`expected style version 8, received ${String(style?.version)}`);
  if(!style.sources||Object.keys(style.sources).length===0)throw new Error('style has no sources');
  if(!Array.isArray(style.layers)||style.layers.length===0)throw new Error('style has no layers');
  console.log(`Production map style verified: ${url} (${Object.keys(style.sources).length} sources, ${style.layers.length} layers)`);process.exit(0);
 }catch(error){lastError=error;if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,attempt*750));}
}
console.error(`Production map style check failed after ${attempts} attempts: ${lastError instanceof Error?lastError.message:String(lastError)}`);process.exit(1);
