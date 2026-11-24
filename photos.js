// Opt-in curated photo references. No automatic API traffic from visitors.
// Each entry is independently reviewed before use; image URLs must be HTTPS.
export const photoManifest={};
export function validatePhoto(entry){
 try{let u=new URL(entry.image);return u.protocol==='https:'&&['images.openfoodfacts.org','static.openfoodfacts.org'].includes(u.hostname)&&entry.license==='CC-BY-SA-3.0'&&typeof entry.source==='string'&&entry.source.startsWith('https://world.openfoodfacts.org/product/')&&!!entry.credit&&!!entry.name;}catch{return false;}
}
const cache=new Map();
export function applyProductPhoto(p,texture){
 const entry=photoManifest[p.id];if(!entry||!validatePhoto(entry))return Promise.resolve(false);
 if(cache.has(p.id))return cache.get(p.id);
 const promise=new Promise(resolve=>{
  const image=new Image();image.crossOrigin='anonymous';
  const timeout=setTimeout(()=>resolve(false),10000);
  image.onload=()=>{clearTimeout(timeout);try{
   const canvas=texture.image,ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
   const scale=Math.min(w*.92/image.width,h*.92/image.height),iw=image.width*scale,ih=image.height*scale;
   ctx.fillStyle=p.color;ctx.fillRect(0,0,w,h);ctx.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);
   texture.needsUpdate=true;resolve(true);
  }catch{resolve(false);}};
  image.onerror=()=>{clearTimeout(timeout);resolve(false);};image.src=entry.image;
 });cache.set(p.id,promise);return promise;
}
