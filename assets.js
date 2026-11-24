import * as T from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/meshopt_decoder.module.js';
import {scannedCatalog} from './world.js';
const base='https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/';
const gso='https://huggingface.co/datasets/codepawl/scanned-objects-glb/resolve/main/';
export const models={
 'produce-1':{name:'Avocado',url:base+'Avocado/glTF-Binary/Avocado.glb',credit:'Microsoft',license:'CC0-1.0'},
 'home-1':{name:'Water bottle',url:base+'WaterBottle/glTF-Binary/WaterBottle.glb',credit:'Microsoft',license:'CC0-1.0'},
 ...Object.fromEntries(scannedCatalog.map(p=>[p.id,{name:p.name,url:gso+'objects/'+p.scan+'/'+p.scan+'.glb',thumb:gso+'thumbs/'+p.scan+'.webp',credit:p.credit,license:p.license,source:p.source}]))
};
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map();
function load(asset){if(!cache.has(asset.url))cache.set(asset.url,loader.loadAsync(asset.url));return cache.get(asset.url);}
export async function installProductModels(scene,slots,status=()=>{}){
 // Shared geometry/materials; limit repetitions to keep GPU memory and draw calls bounded.
 const entries=Object.entries(models);
 for(let i=0;i<entries.length;i+=3)await Promise.allSettled(entries.slice(i,i+3).map(async ([id,asset])=>{
  const selected=slots.filter(s=>s.id===id).slice(0,8);if(!selected.length){status(id,'No model placement');return;}status(id,'Downloading 3D model…');
  try{
   const gltf=await load(asset),root=gltf.scene,box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   if(!size.x||!size.y||!size.z)throw Error('Invalid model dimensions');
   for(const slot of selected){
    const clone=root.clone(true),holder=new T.Group(),scale=Math.min(slot.w/size.x,slot.h/size.y,slot.d/size.z);
    clone.position.set(-center.x,-box.min.y,-center.z);holder.add(clone);holder.scale.setScalar(scale);holder.position.set(slot.x,slot.y,slot.z);holder.rotation.y=slot.rot||0;scene.add(holder);
    // Dedicated fallback mesh is removed only after the actual model is present.
    if(slot.fallback)slot.fallback.visible=false;
   }
  status(id,'3D model loaded · '+selected.length+' displays');
  }catch(error){status(id,'Download failed · fallback packaging visible');console.warn('Optional model unavailable; procedural merchandise remains:',asset.name,error);}
 }));
}
export function applyScanThumbnail(p,texture){
 const asset=models[p.id];if(!asset?.thumb)return;
 if(asset.expansion){thumbnailQueue.set(p.id,{p,texture});return;}
 const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{
  try{const c=texture.image,ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle=p.color;ctx.fillRect(0,0,w,h);const k=Math.min(w*.95/image.width,h*.95/image.height);ctx.drawImage(image,(w-image.width*k)/2,(h-image.height*k)/2,image.width*k,image.height*k);texture.needsUpdate=true;}catch{}
 };image.src=asset.thumb;
}

const thumbnailQueue=new Map(),active=new Map(),failed=new Set();let loading=0,photoLoading=0;
export function streamExpansion(scene,slots,pos,status=()=>{}){
 const nearby=slots.filter(s=>s.expansion).map(s=>({s,d:Math.hypot(s.x-pos.x,s.z-pos.z)})).sort((a,b)=>a.d-b.d);
 const desired=new Set(nearby.filter(q=>q.d<18).slice(0,36).map(q=>q.s.id));
 for(const [id,holder] of active)if(!desired.has(id)){scene.remove(holder);holder.userData.slot.fallback.visible=!holder.userData.slot.strict;status(id,'Local model · not currently rendered');holder.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});active.delete(id);}
 for(const {s,d} of nearby){
  if(d>22||photoLoading>=3)break;const q=thumbnailQueue.get(s.id);if(!q)continue;thumbnailQueue.delete(s.id);photoLoading++;
  const img=new Image();img.crossOrigin='anonymous';let done=false;const finish=()=>{if(!done){done=true;photoLoading--;}};img.onload=()=>{try{const c=q.texture.image,ctx=c.getContext('2d'),k=Math.min(c.width/img.width,c.height/img.height);ctx.fillStyle=q.p.color;ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,(c.width-img.width*k)/2,(c.height-img.height*k)/2,img.width*k,img.height*k);q.texture.needsUpdate=true;}finally{finish();}};img.onerror=finish;setTimeout(finish,15000);img.src=models[s.id].thumb;
 }
 for(const {s} of nearby){
  if(!desired.has(s.id)||active.has(s.id)||failed.has(s.id)||loading>=2)continue;
  failed.add(s.id);loading++;status(s.id,'Downloading 3D model…');
  loader.loadAsync(models[s.id].url).then(gltf=>{
   const root=gltf.scene,box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   if(!size.x||!size.y||!size.z)throw Error('Invalid dimensions');
   const holder=new T.Group();root.position.set(-center.x,-box.min.y,-center.z);holder.add(root);holder.scale.setScalar(Math.min(s.w/size.x,s.h/size.y,s.d/size.z));holder.position.set(s.x,s.y,s.z);holder.rotation.y=s.rot;holder.userData.slot=s;scene.add(holder);active.set(s.id,holder);s.fallback.visible=false;failed.delete(s.id);status(s.id,'3D model loaded');
  }).catch(()=>status(s.id,s.strict?'Model failed to render · shelf left empty':'Download failed · fallback visible')).finally(()=>loading--);
 }
}
