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
export async function installProductModels(scene,slots){
 // Shared geometry/materials; limit repetitions to keep GPU memory and draw calls bounded.
 const entries=Object.entries(models);
 for(let i=0;i<entries.length;i+=3)await Promise.allSettled(entries.slice(i,i+3).map(async ([id,asset])=>{
  const selected=slots.filter(s=>s.id===id).slice(0,8);if(!selected.length)return;
  try{
   const gltf=await load(asset),root=gltf.scene,box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   if(!size.x||!size.y||!size.z)return;
   for(const slot of selected){
    const clone=root.clone(true),holder=new T.Group(),scale=Math.min(slot.w/size.x,slot.h/size.y,slot.d/size.z);
    clone.position.set(-center.x,-box.min.y,-center.z);holder.add(clone);holder.scale.setScalar(scale);holder.position.set(slot.x,slot.y,slot.z);holder.rotation.y=slot.rot||0;scene.add(holder);
    // Dedicated fallback mesh is removed only after the actual model is present.
    if(slot.fallback)slot.fallback.visible=false;
   }
  }catch(error){console.warn('Optional model unavailable; procedural merchandise remains:',asset.name,error);}
 }));
}
export function applyScanThumbnail(p,texture){
 const asset=models[p.id];if(!asset?.thumb)return;
 const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{
  try{const c=texture.image,ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle=p.color;ctx.fillRect(0,0,w,h);const k=Math.min(w*.95/image.width,h*.95/image.height);ctx.drawImage(image,(w-image.width*k)/2,(h-image.height*k)/2,image.width*k,image.height*k);texture.needsUpdate=true;}catch{}
 };image.src=asset.thumb;
}
