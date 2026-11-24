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
 if(asset.expansion)return;
 const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{
  try{const c=texture.image,ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle=p.color;ctx.fillRect(0,0,w,h);const k=Math.min(w*.95/image.width,h*.95/image.height);ctx.drawImage(image,(w-image.width*k)/2,(h-image.height*k)/2,image.width*k,image.height*k);texture.needsUpdate=true;}catch{}
 };image.src=asset.thumb;
}



import {rankSlots,residentPlan,evictionPlan} from './sections.js';
export async function createSectionStreamer(scene,slots,renderer,status=()=>{}){
 const low=matchMedia('(pointer:coarse)').matches||(navigator.deviceMemory||8)<=4;
 let lods={};try{const r=await fetch('./assets/lod-index.json');if(r.ok){const j=await r.json();for(const slot of slots){const variant=j.variants?.[slot.assetId||slot.id];if(variant)lods[slot.id]=variant;}}}catch{}
 const hasLOD=Object.keys(lods).length===slots.length;
 const limit=low?24:48,byteLimit=low?9_000_000:20_000_000,gpuLimit=low?64*1024*1024:144*1024*1024,workers=low?2:3;
 const resident=new Map(),pending=new Set(),failed=new Set(),impostors=new Map();let desired=new Set(),running=0,queue=[],lastRank=[],atlas=null,tolerance={forward:36,side:18},anchor=null,dirty=true,blockedUntil=new Map(),baseMeshes=new Map(),basePending=0,baseReady=0,evictions=0,upgrades=0,bulkUnits=new Map();
 // One shared atlas, per-product UVs; the billboard is an actual scan render, never a fabricated carton.
 try{
  const response=await fetch('./assets/merch-atlas.json');if(!response.ok)throw Error('Atlas not published');
  const meta=await response.json();atlas=await new T.TextureLoader().loadAsync('./assets/merch-atlas.webp');atlas.colorSpace=T.SRGBColorSpace;atlas.generateMipmaps=false;atlas.minFilter=T.LinearFilter;atlas.magFilter=T.LinearFilter;
  const mat=new T.MeshBasicMaterial({map:atlas,transparent:true,alphaTest:.35,side:T.DoubleSide});
  for(const slot of slots){
   const e=meta.entries[slot.assetId||slot.id];if(!e)continue;const geo=new T.PlaneGeometry(1,1),uv=geo.attributes.uv;
   for(let i=0;i<uv.count;i++)uv.setXY(i,(e.x+uv.getX(i)*e.w)/meta.width,1-(e.y+(1-uv.getY(i))*e.h)/meta.height);
   const mesh=new T.Mesh(geo,mat),dims=models[slot.id]?.dimensions;
   let w=slot.w,h=slot.h;if(Array.isArray(dims)&&dims.length===3&&dims.every(x=>x>0)){const k=Math.min(slot.w/dims[0],slot.h/dims[1],slot.d/dims[2]);w=Math.max(dims[0],dims[2])*k;h=dims[1]*k;}
   mesh.position.set(slot.x,slot.y+h/2,slot.z);mesh.scale.set(w,h,1);mesh.rotation.y=slot.rot||0;scene.add(mesh);impostors.set(slot.id,mesh);
   if(slot.bulk){
    const group=new T.InstancedMesh(geo,mat,6),dummy=new T.Object3D(),angle=slot.rot||0;
    for(let i=0;i<6;i++){let u=(i%3-1)*slot.w*.24,v=(Math.floor(i/3)-.5)*slot.d*.35;dummy.position.set(slot.x+u*Math.cos(angle)+v*Math.sin(angle),slot.bulkY+h*.30,slot.z-u*Math.sin(angle)+v*Math.cos(angle));dummy.rotation.y=angle;dummy.scale.set(w*.55,h*.60,1);dummy.updateMatrix();group.setMatrixAt(i,dummy.matrix);}
    group.instanceMatrix.needsUpdate=true;scene.add(group);bulkUnits.set(slot.id,group);
   }
  }
 if(impostors.size!==slots.length)throw Error('Incomplete merchandise atlas: '+impostors.size+' / '+slots.length);
 }catch(e){throw Error('Merchandise atlas required for stable streaming: '+e.message);}
 function dispose(root){
  const geos=new Set(),mats=new Set(),textures=new Set(),images=new Set();root.traverse(o=>{if(!o.isMesh)return;geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture){textures.add(v);if(v.image?.close)images.add(v.image);}}});
  for(const t of textures)t.dispose();for(const m of mats)m.dispose();for(const g of geos)g.dispose();for(const im of images)im.close();
 }
 function estimate(root){
  const geos=new Set(),textures=new Set();let bytes=0;root.traverse(o=>{if(!o.isMesh)return;if(!geos.has(o.geometry)){geos.add(o.geometry);for(const a of Object.values(o.geometry.attributes))bytes+=(a.array||a.data?.array)?.byteLength||0;bytes+=o.geometry.index?.array?.byteLength||0;}for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v?.isTexture&&!textures.has(v)){textures.add(v);bytes+=(v.image?.width||512)*(v.image?.height||512)*4*1.34;} });return bytes;
 }
 function evict(id){const record=resident.get(id);if(!record)return;evictions++;const sprite=impostors.get(id),base=baseMeshes.get(id);if(base)base.visible=true;else if(sprite)sprite.visible=true;scene.remove(record.holder);dispose(record.holder);resident.delete(id);status(id,sprite?'Scan image · distant':'Local model · outside active sections');}
 function used(){return [...resident.values()].reduce((a,r)=>a+r.bytes,0);}
 function pump(){
  while(running<workers&&queue.length){
   const slot=queue.shift(),id=slot.id;if(!desired.has(id)||resident.has(id)||pending.has(id)||failed.has(id)||(blockedUntil.get(id)||0)>performance.now())continue;
   pending.add(id);running++;status(id,'Loading local model…');
   // Do not use the old promise cache: it retains decoded meshes indefinitely.
   const distance=lastRank.find(r=>r.slot.id===id)?.d??30;const variant=lods[id]?.[distance<8?'high':'medium'];
   loader.loadAsync(variant?.url||models[id].url).then(gltf=>{
    const root=gltf.scene,bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
    if(![size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>0)){dispose(root);throw Error('Invalid bounds');}
    if(!desired.has(id)){dispose(root);return;}
    const bytes=estimate(root);
    // Avoid evicting a closer product to admit a farther one.
    // Never evict an established model to admit another during a stationary look.
    const victims=evictionPlan(resident,lastRank,id,bytes,{limit,gpuLimit,byteLimit,bytesOf:key=>models[key]?.bytes||250000,protectRadius:12,margin:8});
    if(victims===null){dispose(root);blockedUntil.set(id,performance.now()+15000);status(id,'Scan image · memory budget');return;}
    const holder=new T.Group();root.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));holder.add(root);holder.scale.setScalar(Math.min(slot.w/size.x,slot.h/size.y,slot.d/size.z));holder.position.set(slot.x,slot.y,slot.z);holder.rotation.y=slot.rot||0;
    // Commit the replacement only after the incoming model is ready to display.
    for(const victim of victims)evict(victim);
    scene.add(holder);resident.set(id,{holder,bytes});upgrades++;const sprite=impostors.get(id),base=baseMeshes.get(id);if(sprite)sprite.visible=false;if(base)base.visible=false;status(id,'3D model loaded');
   }).catch(e=>{failed.add(id);status(id,impostors.has(id)?'Scan image · model failed':'Model failed to load');console.warn(id,e);}).finally(()=>{pending.delete(id);running--;pump();});
  }
 }
 function update(pos,yaw,velocity={x:0,z:0}){
  // Residency changes only after meaningful translation, never from camera rotation.
  const moved=!anchor||Math.hypot(pos.x-anchor.x,pos.z-anchor.z)>=4;
  if(moved||dirty){
   anchor={x:pos.x,z:pos.z};dirty=false;lastRank=rankSlots(slots,pos,yaw,velocity,tolerance);
   const predict={x:pos.x+velocity.x*2.5,z:pos.z+velocity.z*2.5};for(const r of lastRank)r.priority-=Math.max(0,r.d-Math.hypot(r.slot.x-predict.x,r.slot.z-predict.z))*.65;lastRank.sort((a,b)=>a.priority-b.priority);
   desired=residentPlan(lastRank,new Map(),{limit,byteLimit,bytesOf:id=>models[id]?.bytes||250000});
   // Existing residents are protected from speculative decoding unless replacement is plausible.
   for(const id of [...desired])if(!resident.has(id)&&evictionPlan(resident,lastRank,id,0,{limit,gpuLimit,byteLimit,bytesOf:key=>models[key]?.bytes||250000,protectRadius:12,margin:8})===null)desired.delete(id);
   // Keep all residents, even outside the requested loading area. Eviction is admission-driven only.
   queue=lastRank.filter(r=>desired.has(r.slot.id)&&!resident.has(r.slot.id)&&!pending.has(r.slot.id)&&!failed.has(r.slot.id)&&(blockedUntil.get(r.slot.id)||0)<=performance.now()).map(r=>r.slot);
  }
  // Rotate only distant scan images toward the viewer, never full meshes.
  for(const [id,sprite] of impostors)if(sprite.visible)sprite.rotation.y=Math.atan2(pos.x-sprite.position.x,pos.z-sprite.position.z);
  pump();
 }
 async function prepareBase(){
  if(!hasLOD)return;
  // Permanent low tier, bounded by measured decoded footprint; atlas remains if budget is exhausted.
  let next=0,usedBase=0;const budget=(low?32:64)*1048576;
  async function worker(){while(next<slots.length){const slot=slots[next++],asset=lods[slot.id]?.low;if(!asset||usedBase>=budget)continue;basePending++;try{const gltf=await loader.loadAsync(asset.url),root=gltf.scene,bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),bytes=estimate(root);if(![size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>0)||usedBase+bytes>budget){dispose(root);continue;}usedBase+=bytes;const holder=new T.Group();root.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));holder.add(root);holder.scale.setScalar(Math.min(slot.w/size.x,slot.h/size.y,slot.d/size.z));holder.position.set(slot.x,slot.y,slot.z);holder.rotation.y=slot.rot||0;holder.visible=!resident.has(slot.id);scene.add(holder);baseMeshes.set(slot.id,holder);baseReady++;impostors.get(slot.id).visible=false;}catch(e){console.warn('Low LOD unavailable',slot.id,e);}finally{basePending--;}await new Promise(r=>setTimeout(r,20));}}
  await worker();
 }
 async function initial(pos,yaw,progress){
  update(pos,yaw);const initialIds=new Set(desired);const total=initialIds.size;
  if(!total){prepareBase().catch(console.warn);return {loaded:0,total:0,atlas:impostors.size};}
  const start=performance.now();
  while(true){
   const loaded=[...initialIds].filter(id=>resident.has(id)).length,settled=loaded+[...initialIds].filter(id=>failed.has(id)).length;
   progress({loaded,total,settled,atlas:impostors.size});
   if(settled===total||(!running&&!queue.length)||performance.now()-start>45000){prepareBase().catch(console.warn);return {loaded,total,atlas:impostors.size};}
   await new Promise(r=>setTimeout(r,100));
  }
 }
 return {update,initial,setStock:(id,units)=>{const group=bulkUnits.get(id);if(group)group.count=Math.min(6,Math.ceil(units/8));},setTolerance:(value)=>{tolerance={...tolerance,...value};dirty=true;},stats:()=>({resident:resident.size,pending:pending.size,bytes:used(),limit,eligible:lastRank.filter(r=>r.eligible).length,impostors:impostors.size,baseReady,basePending,hasLOD,evictions,upgrades}),has:id=>resident.has(id)||impostors.has(id)};
}
