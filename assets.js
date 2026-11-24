import * as T from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
const base='https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/';
export const models={
 'produce-1':{name:'Avocado',url:base+'Avocado/glTF-Binary/Avocado.glb',credit:'Microsoft',license:'CC0-1.0'},
 'home-1':{name:'Water bottle',url:base+'WaterBottle/glTF-Binary/WaterBottle.glb',credit:'Microsoft',license:'CC0-1.0'}
};
export async function installProductModels(scene,slots){
 const loader=new GLTFLoader();
 await Promise.allSettled(Object.entries(models).map(async ([id,asset])=>{
  const selected=slots.filter(s=>s.id===id).slice(0,16);if(!selected.length)return;
  try{
   const gltf=await loader.loadAsync(asset.url);
   const root=gltf.scene,box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   if(!size.x||!size.y||!size.z)return;
   for(const slot of selected){
    const clone=root.clone(true),holder=new T.Group(),scale=Math.min(slot.w/size.x,slot.h/size.y,slot.d/size.z);
    clone.position.set(-center.x,-box.min.y,-center.z);holder.add(clone);holder.scale.setScalar(scale);holder.position.set(slot.x,slot.y,slot.z);scene.add(holder);
   }
  }catch(error){console.warn('Optional model unavailable; procedural merchandise remains:',asset.name,error);}
 }));
}
