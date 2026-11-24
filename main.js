import * as T from 'three';
import {zones,WIDTH,DEPTH,SPAWN,colors,catalog,byCategory,byId,money,stockState,rng,archive,planFixtures} from './world.js';
const $=id=>document.getElementById(id);
import {installProductModels,models,applyScanThumbnail,preloadWarehouse} from './assets.js';
import {applyProductPhoto,photoManifest} from './photos.js';
import {fetchExpansion,registerExpansion} from './expansion.js';
import {nativeIds,sculpt} from './native-models.js';
const random=rng(32701), scene=new T.Scene(), camera=new T.PerspectiveCamera(73,innerWidth/innerHeight,.06,160);
scene.background=new T.Color('#bfc8cf');scene.fog=new T.Fog('#bfc8cf',75,155);
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
$('viewport').appendChild(renderer.domElement);
scene.add(new T.HemisphereLight(0xf4f8ff,0xa49a86,2.0));
const sun=new T.DirectionalLight(0xfff7e6,1.5);sun.position.set(25,35,10);scene.add(sun);
const mats=new Map(), batches=new Map(), colliders=[], targets=[], fixtures=planFixtures(), productLocations=new Map(), stock=new Map(catalog.map(p=>[p.id,p.stock]));
const boxGeo=new T.BoxGeometry(1,1,1), cylGeo=new T.CylinderGeometry(.5,.5,1,12), sphereGeo=new T.SphereGeometry(.5,12,8);
const torusGeo=new T.TorusGeometry(.38,.10,8,20);
const nativeVisible=new Set();
const temp=new T.Object3D(), dummy=new T.Object3D(), ray=new T.Raycaster();ray.far=8;
const invisible=new T.MeshBasicMaterial({visible:false});
function material(color,metal=0,rough=.8){let key=color+'|'+metal+'|'+rough;if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,metalness:metal,roughness:rough}));return mats.get(key);}
function batch(geo,mat,x,y,z,w,h,d,ry=0,rz=0,rx=0){
 if(w<=0||h<=0||d<=0)return;
 const key=geo.uuid+'|'+(Array.isArray(mat)?mat.map(m=>m.uuid).join(','):mat.uuid);
 if(!batches.has(key))batches.set(key,{geo,mat,matrices:[]});
 temp.position.set(x,y,z);temp.scale.set(w,h,d);temp.rotation.set(rx,ry,rz);temp.updateMatrix();batches.get(key).matrices.push(temp.matrix.clone());
}
const B=(x,y,z,w,h,d,c,ry=0,rz=0,rx=0)=>batch(boxGeo,typeof c==='string'||typeof c==='number'?material(c):c,x,y,z,w,h,d,ry,rz,rx);
const C=(x,y,z,w,h,d,c)=>batch(cylGeo,typeof c==='string'?material(c):c,x,y,z,w,h,d);
function canvasMat(w,h,draw,lit=true){let c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);let tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);return lit?new T.MeshStandardMaterial({map:tx,roughness:.85}):new T.MeshBasicMaterial({map:tx});}
function lines(ctx,s,maxWidth){let words=s.split(' '),out=[],line='';for(const word of words){let next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){out.push(line);line=word;}else line=next;}if(line)out.push(line);return out;}
const packaging=new Map(), priceMats=new Map();
function label(p){if(packaging.has(p.id))return packaging.get(p.id);
 let mat=canvasMat(256,256,(c,w,h)=>{
 c.fillStyle=p.color;c.fillRect(0,0,w,h);c.fillStyle='#ffffff17';for(let i=-200;i<400;i+=45){c.save();c.translate(i,0);c.rotate(-.32);c.fillRect(0,0,19,350);c.restore();}
 c.fillStyle='#17242d';c.fillRect(0,0,w,47);c.fillStyle='#fff';c.font='bold 22px sans-serif';c.fillText('V / SELECT',15,31);
 c.fillStyle='#f5f1e5';c.fillRect(12,59,232,111);c.fillStyle='#192a34';c.font='bold 28px sans-serif';let ls=lines(c,p.name.toUpperCase(),216).slice(0,3);ls.forEach((l,i)=>c.fillText(l,20,84+i*29));c.font='bold 19px sans-serif';c.fillStyle='#fff';c.fillText(p.size,15,201);
 c.fillStyle='#f7f3e9';c.fillRect(153,214,90,30);c.fillStyle='#282828';for(let i=0;i<24;i++)c.fillRect(157+i*3.4,218,(i%3===0?2.4:1.1),20);
 });packaging.set(p.id,mat);if(p.scan)applyScanThumbnail(p,mat.map);else applyProductPhoto(p,mat.map);return mat;
}
function priceMat(p){if(priceMats.has(p.id))return priceMats.get(p.id);let mat=canvasMat(384,192,(c,w,h)=>{c.fillStyle='#fffef5';c.fillRect(0,0,w,h);c.fillStyle='#202526';c.font='bold 25px sans-serif';let ls=lines(c,p.name.toUpperCase(),355).slice(0,2);ls.forEach((s,i)=>c.fillText(s,13,30+i*27));c.font='19px sans-serif';c.fillText(p.size+' · DEMO',13,87);c.font='bold 78px sans-serif';c.fillText(money(p.price),12,165);c.fillStyle='#b8252b';c.fillRect(344,99,27,70);},false);priceMats.set(p.id,mat);return mat;}
function signMat(text,sub='',bg='#164369'){return canvasMat(768,192,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle='#ffffff';c.font='bold 52px sans-serif';let ls=lines(c,text.toUpperCase(),720).slice(0,2);ls.forEach((s,i)=>c.fillText(s,24,62+i*56));if(sub){c.font='25px sans-serif';c.fillStyle='#d8e5ee';c.fillText(sub,24,169);}},false);}
const lightMat=new T.MeshStandardMaterial({color:'#fff9e9',emissive:'#fff5dc',emissiveIntensity:1.4});
const contactMat=new T.MeshBasicMaterial({color:'#303434',transparent:true,opacity:.14,depthWrite:false});
const steel=material('#245d50',.55,.5),beam=material('#d86a22',.45,.52),wood=material('#9e7951'),kraft=material('#b8905c'),darkKraft=material('#8a663e'),black=material('#202a2c'),gray=material('#aab3b5',.4),white=material('#e5e8e6'),rubber=material('#303a3e');
function proxy(p,x,y,z,w,h,d,zone,slot){const obj=new T.Mesh(boxGeo,invisible);obj.position.set(x,y,z);obj.scale.set(w,h,d);obj.updateMatrixWorld(true);obj.userData={p,zone,slot};targets.push(obj);if(!productLocations.has(p.id))productLocations.set(p.id,[]);productLocations.get(p.id).push({x,z,zone});}
function packageItem(p,x,y,z,w,h,d,rot=0){
 if(nativeIds.has(p.id)&&sculpt(p,(kind,a,b,c,ww,hh,dd,color,rz,rx)=>{const co=Math.cos(rot),si=Math.sin(rot),xx=a*w,zz=c*d;batch(kind==='sphere'?sphereGeo:kind==='cylinder'?cylGeo:kind==='torus'?torusGeo:boxGeo,material(color),x+xx*co+zz*si,y+b*h,z-xx*si+zz*co,ww*w,hh*h,dd*d,rot,rz,rx); })){nativeVisible.add(p.id);return;}
 const mat=label(p);
 if(p.scan){
  // Cap expensive scanned instances; remaining units are textured packaging proxies.
  if(modelSlots.filter(s=>s.id===p.id).length<8){
   const fallback=new T.Mesh(boxGeo,mat);fallback.position.set(x,y+h/2,z);fallback.scale.set(w,h,d);fallback.rotation.y=rot;scene.add(fallback);
   modelSlots.push({id:p.id,x,y,z,w,h,d,rot,fallback});return;
  }
 }
 if(p.shape==='bottle'||p.shape==='can'||p.shape==='tub'){
  batch(cylGeo,mat,x,y+h*.45,z,w,h*.9,d,rot);
  C(x,y+h*.93,z,w*.76,h*.12,d*.76,p.shape==='bottle'?'#e2e4dc':p.color);
 }else {B(x,y+h/2,z,w,h,d,mat,rot);if(p.shape==='bag')B(x,y+h*.96,z,w*.92,h*.07,d*.76,p.color,rot);}
}
function crate(x,y,z,w,h,d,open=false){
 if(open){B(x,y+.035,z,w,.07,d,kraft);B(x-w/2+.035,y+h/2,z,.07,h,d,kraft);B(x+w/2-.035,y+h/2,z,.07,h,d,kraft);B(x,y+h/2,z-d/2+.035,w,h,.07,kraft);B(x,y+h/2,z+d/2-.035,w,h,.07,kraft);}
 else{B(x,y+h/2,z,w,h,d,kraft);B(x,y+h+.003,z,w*.12,.008,d,'#d8b383');B(x,y+h*.56,z+d/2+.006,w*.37,h*.25,.01,'#e9e0c9');}
}
function pallet(x,z,w,d){for(let i=0;i<5;i++)B(x-w/2+w*(i+.5)/5,.115,z,w*.17,.075,d,wood);for(let i=0;i<3;i++)B(x,.045,z-d/2+d*(i+.5)/3,w,.09,d*.15,darkKraft);}
const stockGroups=new Map(),stockMeshes=new Map();
const modelSlots=[];
let expansionState='Checking locally imported GLB assets…';
const modelStatus=new Map();
function makeStock(p,x,z,w,d,seed){
 const slot={p,x,z,w,d,seed};if(!stockGroups.has(p.id))stockGroups.set(p.id,[]);stockGroups.get(p.id).push(slot);
}
function stockEntries(slot){
 let {p,x,z,w,d,seed}=slot;let n=stock.get(p.id),r=rng(seed),state=stockState(n);
 // Instance batches are static; only these small inventory groups are rebuilt.
 const entries=[];
 const add=(a,b,c,ww,hh,dd,m)=>entries.push({a,b,c,ww,hh,dd,m});
 for(let i=0;i<5;i++)add(x-w/2+w*(i+.5)/5,.12,z,w*.17,.075,d,wood);
 for(let i=0;i<3;i++)add(x,.045,z-d/2+d*(i+.5)/3,w,.09,d*.15,darkKraft);
 if(state!=='empty'){
  const columns=state==='full'?3:state==='partial'?2:1, layers=state==='full'?3:state==='partial'?2:1;
  for(let i=0;i<columns;i++)for(let j=0;j<layers;j++){
   let ww=w*.29,hh=.39,dd=d*.8,xx=x-w/2+ww/2+i*w/3,yy=.16+j*hh;
   if(j===layers-1&&r()>.32){
    add(xx,yy+.04,z,ww,.08,dd,kraft);add(xx,yy+.16,z-dd/2+.03,ww,.26,.06,kraft);add(xx,yy+.16,z+dd/2-.03,ww,.26,.06,kraft);add(xx-ww/2+.03,yy+.16,z,.06,.26,dd,kraft);add(xx+ww/2-.03,yy+.16,z,.06,.26,dd,kraft);
    let count=state==='low'?1:3;for(let k=0;k<count;k++)add(xx+(k-(count-1)/2)*ww*.28,yy+.27,z,ww*.25,.37,dd*.64,label(p));
   }else{add(xx,yy+hh/2,z,ww*.97,hh,dd,kraft);add(xx,yy+hh+.004,z,ww*.13,.009,dd,'#d7b38b');add(xx,yy+hh*.52,z+dd/2+.008,ww*.54,hh*.35,.012,label(p));}
  }
 }
 return entries;
}
function rebuildProductStock(id){
 let g=stockMeshes.get(id);if(!g){g=new T.Group();scene.add(g);stockMeshes.set(id,g);}
 for(const m of g.children)m.dispose?.();g.clear();
 const entries=(stockGroups.get(id)||[]).flatMap(stockEntries);
 const groups=new Map();for(const e of entries){const m=typeof e.m==='string'?material(e.m):e.m;if(!groups.has(m))groups.set(m,[]);groups.get(m).push(e);}
 for(const [m,items] of groups){let mesh=new T.InstancedMesh(boxGeo,m,items.length);items.forEach((e,i)=>{dummy.position.set(e.a,e.b,e.c);dummy.scale.set(e.ww,e.hh,e.dd);dummy.rotation.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});g.add(mesh);}
}
function setStock(id,n){stock.set(id,Math.max(0,Math.min(120,Math.round(n))));rebuildProductStock(id);}
function local(f,u,v){return f.alongX?[f.x+f.w/2+u,f.z+f.d/2+v]:[f.x+f.w/2+v,f.z+f.d/2+u];}
function lb(f,u,y,v,w,h,d,c){let [x,z]=local(f,u,v);B(x,y,z,f.alongX?w:d,h,f.alongX?d:w,c);}
function emptyRack(f){
 const w=f.alongX?f.w:f.d,d=f.alongX?f.d:f.w;
 for(const u of [-w/2+.065,w/2-.065])for(const v of [-d/2+.065,d/2-.065]){
  lb(f,u,2.925,v,.13,5.85,.13,steel);lb(f,u,.035,v,.25,.07,.25,gray);
  for(let i=0;i<11;i++)lb(f,u,.45+i*.48,v+(v<0?-.072:.072),.042,.09,.012,black);
 }
 for(const y of [1.65,3.65,5.45]){for(const v of [-d/2+.07,d/2-.07])lb(f,0,y,v,w,.19,.14,beam);lb(f,0,y+.11,0,w-.14,.075,d-.2,gray);}
 for(const u of [-w/2+.07,w/2-.07])for(const y of [.38,2,3.85,5.55])lb(f,u,y,0,.07,.07,d-.2,steel);
 for(const u of [-w/2+.075,w/2-.075])for(const yy of [1.15,3,4.75]){
 let [x,z]=local(f,u,0),len=Math.hypot(d-.15,1.55),a=Math.atan2(d-.15,1.55);B(x,yy,z,.055,len,.055,steel,0,f.alongX?0:a,f.alongX?a:0);}
 // Empty shipping pallets are fixtures, not merchandise.
 let [x,z]=local(f,0,0);pallet(x,z,f.w*.84,f.d*.78);
}
function rack(f){
 const w=f.alongX?f.w:f.d,d=f.alongX?f.d:f.w, height=5.85, products=byCategory[f.zone.category]||byCategory.misc, faces=f.narrow?1:2;
 // Teardrop-style green uprights, orange box beams, steel decking, braces and base plates.
 for(const u of [-w/2+.065,w/2-.065])for(const v of [-d/2+.065,d/2-.065]){
  lb(f,u,height/2,v,.13,height,.13,steel);lb(f,u,.035,v,.25,.07,.25,gray);
  for(let k=0;k<11;k++)lb(f,u,0.45+k*.48,v+(v<0?-.072:.072),.042,.09,.012,black);
 }
 for(const y of [1.65,3.65,5.45]){
  for(const v of [-d/2+.07,d/2-.07])lb(f,0,y,v,w,.19,.14,beam);
  lb(f,0,y+.11,0,w-.14,.075,d-.2,gray);
  for(let i=0;i<5;i++)lb(f,(i-2)*w/5,y+.04,0,.055,.08,d-.16,gray);
 }
 for(const u of [-w/2+.07,w/2-.07])for(const y of [.38,2.0,3.85,5.55])lb(f,u,y,0,.07,.07,d-.2,steel);
 // X-bracing in upright frames.
 for(const u of [-w/2+.075,w/2-.075])for(const yy of [1.15,3.0,4.75]){
  let [x,z]=local(f,u,0),len=Math.hypot(d-.15,1.55),a=Math.atan2(d-.15,1.55);
  B(x,yy,z,.055,len,.055,steel,0,f.alongX?0:a,f.alongX?a:0);
 }
 for(let face=0;face<faces;face++){
  const side=faces===1?(f.zone.face==='right'?1:f.zone.face==='left'?-1:f.zone.z<2?1:-1):(face===0?-1:1),v=side*d*.27, p=products[(f.index*faces+face)%products.length];
  let [x,z]=local(f,0,v),pw=w*.84, pd=d*(faces===1?.79:.42);
  makeStock(p,x,z,f.alongX?pw:pd,f.alongX?pd:pw,1000+f.index*19+face);
  // The second level is the customer-facing hero product shelf.
  const count=Math.max(2,Math.min(5,Math.floor(w/.65)));
  for(let i=0;i<count;i++){
   let u=(i-(count-1)/2)*w*.77/count;let [a,b]=local(f,u,v);let ww=w*.68/count,hh=.82+random()*.27,dd=Math.min(pd*.79,.65);
   packageItem(p,a,1.80,b,ww,hh,dd,f.alongX?(side>0?0:Math.PI):(side>0?Math.PI/2:-Math.PI/2));if(i===0&&p.id==='home-1')modelSlots.push({id:p.id,x:a,y:2.85,z:b,w:.28,h:.47,d:.28});
  }
  let [a,b]=local(f,0,side*(d/2+.02));
  B(a,1.67,b,f.alongX?Math.min(w*.45,1.1):.035,.38,f.alongX?.035:Math.min(w*.45,1.1),priceMat(p));
  proxy(p,x,2.22,z,f.alongX?w*.88:pd,1.18,f.alongX?pd:w*.88,f.zone,f);
  proxy(p,a,1.67,b,f.alongX?1.1:.2,.4,f.alongX?.2:1.1,f.zone,f);
 }
 // Upper levels are noninteractive, randomized surplus / archival and fictional cartons.
 for(const y of [3.79,5.59]){
  for(let k=0;k<Math.max(2,Math.floor(w/1.0));k++){
   let u=-w*.38+k*w*.76/Math.max(1,Math.floor(w/1.0)-1), [x,z]=local(f,u,0);
   let ww=Math.min(.8,w*.28),dd=d*.67,hh=y>5?.56:.79;
   crate(x,y,z,f.alongX?ww:dd,hh,f.alongX?dd:ww);
   let p=catalog[Math.floor(random()*catalog.length)], old=archive[Math.floor(random()*archive.length)];
   if(random()>.55){let key='archive-'+old;if(!packaging.has(key))label({id:key,name:old,size:'ARCHIVE / SURPLUS',color:['#826854','#77927d','#997746'][Math.floor(random()*3)]});p={id:key};}
   B(x,y+hh*.54,z+(f.alongX?dd/2+.007:ww/2+.007),f.alongX?ww*.72:dd*.58,hh*.45,.016,label(p));
  }
 }
}
function display(f){
 const p=(byCategory[f.zone.category]||byCategory.misc)[f.index%(byCategory[f.zone.category]||byCategory.misc).length],x=f.x+f.w/2,z=f.z+f.d/2,w=f.w,d=f.d;
 if(nativeIds.has(p.id)&&!['clothing-1','clothing-2','clothing-3'].includes(p.id)){pallet(x,z,w*.86,d*.86);B(x,.48,z,w*.85,.63,d*.80,'#b4a08b');B(x,.82,z,w*.88,.06,d*.83,'#e3ddd3');const n=p.id.startsWith('produce-')||p.id.startsWith('bakery-')?2:1;for(let i=0;i<n;i++)packageItem(p,x+(i-(n-1)/2)*w*.45,.86,z,Math.min(w*.85/n,1.8),p.id==='season-3'?1.4:.85,Math.min(d*.8,1.2));}
 else if(p.shape==='sofa'){B(x,.35,z,w*.86,.5,d*.78,p.color);B(x,.8,z-d*.32,w*.86,.66,d*.22,p.color);B(x-w*.39,.72,z,w*.13,.54,d*.7,p.color);B(x+w*.39,.72,z,w*.13,.54,d*.7,p.color);for(let i=0;i<3;i++)B(x+(i-1)*w*.24,.64,z,w*.22,.15,d*.45,'#b7b7b4');}
 else if(p.shape==='table'){B(x,.83,z,w*.78,.13,d*.68,'#8b6d4d');for(const a of [-1,1])for(const b of [-1,1])B(x+a*w*.32,.41,z+b*d*.25,.13,.82,.13,'#534439');}
 else if(p.shape==='mattress'){B(x,.33,z,w*.85,.3,d*.8,'#697784');B(x,.67,z,w*.85,.36,d*.8,'#e4e3dc');}
 else if(p.shape==='tv'){B(x,.48,z,w*.88,.95,d*.8,'#515b61');B(x,1.55,z,w*.78,1.17,.12,'#20252b');B(x,1.55,z+.071,w*.73,1.08,.01,canvasMat(256,128,(c,w,h)=>{let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#173c72');g.addColorStop(.5,'#51a5b9');g.addColorStop(1,'#f5b96c');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#fff';c.font='bold 24px sans-serif';c.fillText('V / ULTRA HD',12,72);},false));}
 else {pallet(x,z,w*.86,d*.86);B(x,.54,z,w*.86,.74,d*.8,'#b4a08b');B(x,.94,z,w*.9,.09,d*.85,'#e3ddd3');let cols=Math.max(2,Math.floor(w/.8)),rows=Math.max(1,Math.floor(d/.8));for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)packageItem(p,x+(i-(cols-1)/2)*w*.75/cols,1.0,z+(j-(rows-1)/2)*d*.7/rows,w*.63/cols,.44,d*.6/rows);}
 if(p.id==='produce-1')modelSlots.push({id:p.id,x,y:1.49,z,w:.32,h:.22,d:.26});
 B(x,1.45,z+d*.43,.07,1.25,.07,gray);B(x,1.85,z+d*.43,.9,.45,.065,priceMat(p));proxy(p,x,1.15,z,w*.9,1.8,d*.9,f.zone,f);
}
function cold(f){
 const w=f.alongX?f.w:f.d,d=f.alongX?f.d:f.w,items=byCategory[f.zone.category]||byCategory.fresh;
 lb(f,0,.36,0,w,.72,d,gray);lb(f,0,1.3,0,w,.14,d,'#d9e5e8');
 const p=items[f.index%items.length];
 for(let i=0;i<4;i++){let [x,z]=local(f,(i-1.5)*w*.2,0);packageItem(p,x,.76,z,w*.16,.46,d*.48,f.alongX?0:Math.PI/2);}
 lb(f,0,1.55,0,w,.11,d,'#7d939d');for(let side of [-1,1]){let [x,z]=local(f,0,side*d*.46);B(x,1.36,z,f.alongX?1:.06,.38,f.alongX?.06:1,priceMat(p));proxy(p,x,1.08,z,f.alongX?w:.45,.8,f.alongX?.45:w,f.zone,f);}
}
function counter(f){let x=f.x+f.w/2,z=f.z+f.d/2;B(x,.54,z,f.w,1.08,f.d,'#b1b6b5');B(x,1.1,z,f.w+.06,.1,f.d+.06,'#e4e5e0');
 if(f.type==='checkout'){B(x,1.16,z,f.w*.68,.07,f.d*.66,'#343b40');B(x,1.42,z,.34,.48,.3,'#535f66');B(x,1.7,z,.48,.31,.11,'#243b4d');}
 else{let items=byCategory[f.zone.category];if(items?.length){let p=items[f.index%items.length];for(let i=0;i<3;i++)packageItem(p,x+(i-1)*f.w*.23,1.16,z,f.w*.18,.48,f.d*.35);proxy(p,x,1.45,z,f.w,.85,f.d,f.zone,f);B(x,1.24,z+f.d*.5,.75,.32,.06,priceMat(p));}}
}
function service(f){B(f.x+f.w/2,1.6,f.z+f.d/2,f.w,3.2,f.d,'#a7b0b4');}
function shell(){
 let concrete=canvasMat(256,256,(c,w,h)=>{c.fillStyle='#a5a7a4';c.fillRect(0,0,w,h);let r=rng(9);for(let i=0;i<8000;i++){let v=100+Math.floor(r()*100);c.fillStyle='rgba('+v+','+v+','+v+',.13)';c.fillRect(r()*w,r()*h,1+r()*3,1+r()*2);}c.strokeStyle='#777b7733';c.strokeRect(1,1,w-2,h-2);});concrete.map.wrapS=concrete.map.wrapT=T.RepeatWrapping;concrete.map.repeat.set(34,22);
 concrete.roughness=.42;
 let ground=new T.Mesh(new T.PlaneGeometry(WIDTH,DEPTH),concrete);ground.rotation.x=-Math.PI/2;ground.position.set(WIDTH/2,0,DEPTH/2);scene.add(ground);
 B(WIDTH/2,4.7,0,WIDTH,9.4,.26,'#d2d5d1');B(0,4.7,DEPTH/2,.26,9.4,DEPTH,'#d2d5d1');B(WIDTH,4.7,DEPTH/2,.26,9.4,DEPTH,'#d2d5d1');B(54,4.7,DEPTH,108,9.4,.26,'#d2d5d1');B(119,4.7,DEPTH,8,9.4,.26,'#d2d5d1');
 B(WIDTH/2,9.6,DEPTH/2,WIDTH,.25,DEPTH,'#c2c9ca');
 // White open-web roof trusses, with diagonal members in each panel.
 for(let x=4;x<WIDTH;x+=7.5){
  for(let z=3;z<DEPTH-3;z+=3){B(x,8.64,z,.11,.10,3.0,'#e7e9e7');B(x,9.28,z,.11,.10,3.0,'#e7e9e7');B(x,8.96,z,.075,Math.hypot(3,.64),.075,'#e7e9e7',0,0,Math.atan2(3,.64)*(Math.round(z/3)%2?1:-1));}
 }
 for(let x=2;x<WIDTH;x+=7.5){B(x,4.5,.35,.18,9,.27,gray);B(x,4.5,DEPTH-.35,.18,9,.27,gray);B(x,9.30,DEPTH/2,.14,.12,DEPTH,'#e7e9e7');for(let z=3;z<DEPTH;z+=8){B(x,8.2,z,.2,.18,3.5,gray);B(x,8.03,z,.35,.12,2.8,lightMat);C(x,7.92,z,.57,.23,.57,'#e5e7e5');C(x,7.79,z,.41,.04,.41,lightMat);}}
 for(let z=3;z<DEPTH;z+=6){B(.35,4.5,z,.24,9,.16,gray);B(WIDTH-.35,4.5,z,.24,9,.16,gray);B(WIDTH/2,9.05,z,WIDTH,.16,.12,gray);}
 for(let x=0.6;x<WIDTH;x+=2.1){B(x,2.8,.2,.035,5.5,.035,'#adb4b2');B(x,2.8,DEPTH-.2,.035,5.5,.035,'#adb4b2');}
 for(let x=4;x<WIDTH;x+=12)B(x,.008,DEPTH-1.3,6,.012,.10,'#d1b35a');
 const welcome=signMat('VIRTUACO','WAREHOUSE 01 / WELCOME','#a52830');B(112,5.8,.32,8,2.0,.10,welcome);
 B(112,3.0,1.0,5,.35,.28,steel);
}
shell();
for(const f of fixtures){colliders.push(f);B(f.x+f.w/2,.008,f.z+f.d/2,f.w+.12,.012,f.d+.12,contactMat);if(f.type==='rack')emptyRack(f);else if(f.type==='display'){B(f.x+f.w/2,.46,f.z+f.d/2,f.w*.88,.80,f.d*.85,'#b4a08b');B(f.x+f.w/2,.89,f.z+f.d/2,f.w*.9,.06,f.d*.87,'#e3ddd3');}else if(f.type==='cold'){B(f.x+f.w/2,.37,f.z+f.d/2,f.w,.74,f.d,gray);B(f.x+f.w/2,.78,f.z+f.d/2,f.w,.07,f.d,'#d9e5e8');}else if(f.type==='service')service(f);else{B(f.x+f.w/2,.55,f.z+f.d/2,f.w,1.10,f.d,'#aab3b5');if(f.type==='checkout')B(f.x+f.w/2,1.13,f.z+f.d/2,f.w*.75,.06,f.d*.7,'#30383e');}}
for(const q of zones){
 const x=q.x+q.w/2,z=q.z+q.d/2,y=q.kind==='rack'?6.72:4.2,sign=signMat(q.name,q.id+' / '+(q.kind==='rack'?'BULK GOODS':'WAREHOUSE DEPARTMENT'));
 B(x,y,z,Math.min(4.9,Math.max(2.3,q.w)),.88,.1,sign);
 B(x-.8,(y+9.2)/2,z,.025,9.2-y,.025,black);B(x+.8,(y+9.2)/2,z,.025,9.2-y,.025,black);
}
for(const {geo,mat,matrices} of batches.values()){let mesh=new T.InstancedMesh(geo,mat,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);}
batches.clear();
// External fallback catalog disabled; local manifest is the only merchandise source.
for(const id of stockGroups.keys())rebuildProductStock(id);
let pos=new T.Vector3(SPAWN.x,1.68,SPAWN.z),yaw=SPAWN.yaw,pitch=0,started=false,open=false,mode='',selected=null,hit=null,keys=new Set(),drag=null,toastTimer;
const radius=.36;
function blocked(x,z){if(x<.55||x>WIDTH-.55||z<.55||z>DEPTH-.55)return true;return colliders.some(f=>x>f.x-radius&&x<f.x+f.w+radius&&z>f.z-radius&&z<f.z+f.d+radius);}
function nearestFree(x,z){if(!blocked(x,z))return {x,z};for(let r=.65;r<22;r+=.55)for(let a=0;a<Math.PI*2;a+=Math.PI/16){let xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;if(!blocked(xx,zz))return {x:xx,z:zz};}return SPAWN;}
function jump(x,z,lookX=x,lookZ=z){const a=nearestFree(x,z);pos.set(a.x,1.68,a.z);if(Math.hypot(lookX-a.x,lookZ-a.z)>.1)yaw=Math.atan2(a.x-lookX,a.z-lookZ);pitch=0;closePanel();toast('Moved to a nearby walkable aisle');}
function look(dx,dy){yaw-=dx*.0024;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.0024));}
function lock(){if(!matchMedia('(pointer: coarse)').matches&&renderer.domElement.requestPointerLock)try{const p=renderer.domElement.requestPointerLock();p?.catch?.(()=>{});}catch{}}
function unlock(){if(document.pointerLockElement)document.exitPointerLock();}
let warehouseReady=false;
$('start').disabled=true;$('start').textContent='Loading warehouse…';
$('start').onclick=()=>{if(!warehouseReady)return;started=true;$('welcome').hidden=true;document.activeElement?.blur();lock();};
document.addEventListener('mousemove',e=>{if(started&&!open&&document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);});
renderer.domElement.addEventListener('pointerdown',e=>{if(!started||open)return;if(document.pointerLockElement===renderer.domElement){inspect();return;}drag={x:e.clientX,y:e.clientY,moved:false};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||open||document.pointerLockElement)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved||=Math.abs(dx)+Math.abs(dy)>2;look(dx,dy);drag.x=e.clientX;drag.y=e.clientY;});
renderer.domElement.addEventListener('pointerup',e=>{if(!drag)return;if(!drag.moved&&started&&!open){if(hit)inspect();else lock();}drag=null;});
renderer.domElement.addEventListener('pointercancel',()=>{drag=null;});
const moveKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
document.addEventListener('keydown',e=>{if(!started)return;if(e.code==='Escape'&&open){closePanel();return;}if(/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;if(moveKeys.includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.repeat)return;switch(e.code){case 'KeyE':if(!open)inspect();break;case 'KeyM':showMap();break;case 'KeyF':showSearch();break;case 'KeyB':showBasket();break;case 'Escape':if(open)closePanel();break;case 'KeyH':showHelp();break;}});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
for(const btn of document.querySelectorAll('[data-move]')){let k=btn.dataset.move;btn.onpointerdown=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(k);};btn.onpointerup=btn.onpointercancel=btn.onlostpointercapture=()=>keys.delete(k);}
$('touchInspect').onclick=inspect;
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
function showPanel(title,kicker,m){open=true;mode=m;keys.clear();unlock();$('panelTitle').textContent=title;$('panelKicker').textContent=kicker;$('panelBody').replaceChildren();$('panel').hidden=false;return $('panelBody');}
function closePanel(){document.activeElement?.blur();open=false;mode='';$('panel').hidden=true;keys.clear();selected=null;}
$('closePanel').onclick=closePanel;$('resume').onclick=()=>{closePanel();lock();};
function el(tag,cls,text){let a=document.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=text;return a;}
function button(label,fn,cls='secondary'){let b=el('button',cls,label);b.onclick=fn;return b;}
function append(p,...nodes){p.append(...nodes);return p;}
function info(s){return el('p','muted',s);}
let basket={};try{const raw=JSON.parse(localStorage.getItem('virtuaco-basket')||'{}');for(const [k,v] of Object.entries(raw))if(byId[k]&&Number.isInteger(v)&&v>0)basket[k]=Math.min(v,99);}catch{}
function saveBasket(){try{localStorage.setItem('virtuaco-basket',JSON.stringify(basket));}catch{}$('cartCount').textContent=Object.values(basket).reduce((a,b)=>a+b,0);}
saveBasket();
function addBasket(p){if(stock.get(p.id)===0){toast('This demo item is out of stock');return;}let n=basket[p.id]||0;if(n>=Math.min(stock.get(p.id),99)){toast('Simulated stock limit reached');return;}basket[p.id]=n+1;saveBasket();toast('Added '+p.name);}
function showProduct(p,zone){
 selected=p;let body=showPanel(p.name,zone?.name||'PRODUCT / SAMPLE CATALOG','product');selected=p;
 let art=el('div','product-art');art.style.background=p.color;art.append(info(modelStatus.get(p.id)||'Verified local model'));
 let amount=el('div','price',money(p.price)),status=el('div','stock-status'),quantity=el('input');quantity.type='range';quantity.min=0;quantity.max=120;quantity.value=stock.get(p.id);quantity.setAttribute('aria-label','Simulated inventory units');
 let add=button('Add to basket',()=>addBasket(p),'primary');
 function update(){let n=stock.get(p.id);status.textContent=n+' demo units · '+stockState(n);status.dataset.state=stockState(n);add.disabled=n===0;}
 quantity.oninput=()=>{setStock(p.id,Number(quantity.value));update();};update();
 append(body,art,el('div','eyebrow',p.size+' / '+p.id.toUpperCase()),amount,status,info(nativeVisible.has(p.id)?'Locally generated 3D product geometry. Demo price and stock.':'Illustrative bulk product. Price and inventory are fictional and not connected to a retailer.'),...(p.scan?[info('3D scan: '+p.credit+' · '+p.license),(()=>{const a=el('a','text-button','Original scan and attribution');a.href=p.source;a.target='_blank';a.rel='noopener noreferrer';return a;})()]:photoManifest[p.id]?[info('Photo: '+photoManifest[p.id].credit+' · '+photoManifest[p.id].license),(()=>{const a=el('a','text-button','Original product photo record');a.href=photoManifest[p.id].source;a.target='_blank';a.rel='noopener noreferrer';return a;})()]:[]),add,el('hr'),el('h3','','Inventory visualizer'),info('Adjust simulated availability. Stock-driven physical pallets will be reconnected to verified models in a later iteration.'),quantity,button('Reset simulated stock',()=>{setStock(p.id,p.stock);quantity.value=p.stock;update();}));
}
function inspect(){if(hit&&!open&&modelStatus.get(hit.p.id)==='3D model loaded')showProduct(hit.p,hit.zone);else if(!open)toast('Look at a product or price sign to inspect it');}
function productRow(p,fn){let row=el('button','product-row'),sw=el('span','swatch');sw.style.background=p.color;let left=append(el('span','product-text'),el('b','',p.name),el('small','',p.size+' · '+stockState(stock.get(p.id))));append(row,sw,left,el('strong','',money(p.price)));row.onclick=fn;return row;}
function renderModelList(){const body=$('panelBody');body.replaceChildren(info('Verified local files: '+catalog.length+' · currently rendered: '+[...modelStatus.values()].filter(s=>s==='3D model loaded').length+'. No procedural merchandise.'),info('Select a product to travel directly to a display.'));for(const id of nativeVisible){const p=byId[id],loc=productLocations.get(id)?.[0];body.append(productRow(p,()=>showProduct(p,loc?.zone)),info('Local 3D geometry · no external download'));if(loc)body.append(button('Go to product →',()=>{jump(loc.x,loc.z,loc.x,loc.z);pitch=Math.atan2(.6,Math.hypot(pos.x-loc.x,pos.z-loc.z));}));}for(const [id,asset] of Object.entries(models).filter(([id,a])=>modelStatus.has(id)).slice(0,100)){const p=byId[id],slot=modelSlots.find(s=>s.id===id);if(!p)continue;body.append(productRow(p,()=>showProduct(p)));body.append(info(modelStatus.get(id)||'Waiting for download'));if(slot)body.append(button('Go to model →',()=>{jump(slot.x,slot.z,slot.x,slot.z);pitch=Math.atan2(slot.y+slot.h/2-1.68,Math.hypot(pos.x-slot.x,pos.z-slot.z));}));else body.append(info('No dedicated model placement'));}}
function showModels(){showPanel('Real product models','ASSET STATUS / FIND A DISPLAY','models');renderModelList();}
function showSearch(){let body=showPanel('Find a product','CATALOG / '+catalog.length+' DEMO PRODUCTS','search'),input=el('input','search-input');input.placeholder='Search products or departments';input.setAttribute('aria-label','Search products or departments');let results=el('div','results');function render(){let query=input.value.trim().toLowerCase();results.replaceChildren();let items=catalog.filter(p=>(p.name+' '+p.category+' '+p.size+' '+(productLocations.get(p.id)||[]).map(v=>v.zone.name).join(' ')).toLowerCase().includes(query));if(!items.length)results.append(info('No matching products.'));if(items.length>100)results.append(info(items.length+' matches · showing first 100. Narrow your search.'));for(const p of items.slice(0,100)){let loc=productLocations.get(p.id)?.[0];let row=productRow(p,()=>showProduct(p,loc?.zone));results.append(row);if(loc){let b=button('Go to '+loc.zone.name+' →',()=>{jump(loc.x,loc.z,loc.x,loc.z);if(p.expansion){const slot=modelSlots.find(s=>s.id===p.id);if(slot)pitch=Math.atan2(slot.y+.42-1.68,Math.hypot(pos.x-slot.x,pos.z-slot.z));}},'text-button');results.append(b);}}}input.oninput=render;append(body,button('Find real 3D models / download status',showModels),info(expansionState),input,results);render();input.focus();}
function showBasket(){let body=showPanel('Your basket','DEMO SHOPPING / NO CHECKOUT','basket');let ids=Object.keys(basket);if(!ids.length)body.append(info('Your basket is empty. Find a product and add it while exploring.'));let total=0;for(let id of ids){let p=byId[id],n=basket[id];total+=p.price*n;let row=productRow(p,()=>showProduct(p));let controls=el('div','qty');append(controls,button('−',()=>{if(--basket[id]<=0)delete basket[id];saveBasket();showBasket();}),el('span','',String(n)),button('+',()=>{addBasket(p);showBasket();}),button('Remove',()=>{delete basket[id];saveBasket();showBasket();},'text-button'));append(body,row,controls);}append(body,el('hr'),el('div','price',money(total)),info('Estimated demo total before tax. Items are not available for purchase. Basket is saved on this device.'),button('Empty basket',()=>{basket={};saveBasket();showBasket();}));}
function drawMap(canvas,full=false){let c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,sx=w/WIDTH,sz=h/DEPTH;c.fillStyle='#172733';c.fillRect(0,0,w,h);for(let q of zones){c.fillStyle=colors[q.kind]+'bb';c.fillRect(q.x*sx,q.z*sz,q.w*sx,q.d*sz);c.strokeStyle='#111c25';c.lineWidth=full?2:1;c.strokeRect(q.x*sx,q.z*sz,q.w*sx,q.d*sz);if(full&&q.w*sx>56&&q.d*sz>23){c.fillStyle='#fff';c.font='bold 11px sans-serif';let ls=lines(c,q.name,q.w*sx-6).slice(0,2);ls.forEach((s,i)=>c.fillText(s,q.x*sx+3,q.z*sz+12+12*i));}}
 if(full){c.fillStyle='#fff';c.font='bold 12px sans-serif';c.fillText('ENTRANCE',w-85,12);}
 c.fillStyle='#ffffff';c.beginPath();c.arc(pos.x*sx,pos.z*sz,full?5:3,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(pos.x*sx,pos.z*sz);c.lineTo(pos.x*sx-Math.sin(yaw)*11,pos.z*sz-Math.cos(yaw)*11);c.stroke();}
function showMap(){let body=showPanel('Warehouse map','FLOOR PLAN / SELECT A DESTINATION','map'),can=el('canvas','full-map');can.width=738;can.height=462;drawMap(can,true);can.setAttribute('aria-label','Warehouse map: click to teleport to an aisle');can.onclick=e=>{let r=can.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*WIDTH,z=(e.clientY-r.top)/r.height*DEPTH;jump(x,z,x,z);};append(body,can,info('Select the map or a department to move to its nearest walkable aisle. The entrance is at the upper right, matching the Coomera reference.'),button('Return to entrance',()=>jump(SPAWN.x,SPAWN.z,SPAWN.x-10,SPAWN.z)));let list=el('div','department-list');for(const q of zones)list.append(button(q.name,()=>jump(q.x+q.w/2,q.z+q.d/2,q.x+q.w/2,q.z+q.d/2),'department'));body.append(list);}
function showHelp(){let b=showPanel('Make yourself at home','CONTROLS / ABOUT','help');append(b,info('Desktop: WASD or arrows to move, mouse to look, Shift to walk faster. Click or press E to inspect an item. Escape releases the mouse.'),info('Touch: drag the warehouse view to look; use the direction buttons to move, and Inspect to open the targeted product.'),info('M opens the map, F finds products, B opens the basket, H opens this help. Product inventory can be adjusted in the detail panel.'),info('VirtuaCo is an independent fictional warehouse simulator, not affiliated with Costco. All packaging, prices and inventory are illustrative. No accounts, payments or tracking.'),button('Back to entrance',()=>jump(SPAWN.x,SPAWN.z,SPAWN.x-10,SPAWN.z)));}
$('mapBtn').onclick=showMap;$('searchBtn').onclick=showSearch;$('cartBtn').onclick=showBasket;$('helpBtn').onclick=showHelp;$('mini').onclick=showMap;
let prev=performance.now(),lastScan=0,lastMap=0,lastStream=0;
function frame(now){
 requestAnimationFrame(frame);let dt=Math.min(.045,(now-prev)/1000);prev=now;
 if(started&&!open){
  let f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),s=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),len=Math.hypot(f,s)||1,speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?7.2:4.4)*dt/len;
  let dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed;if(!blocked(pos.x+dx,pos.z))pos.x+=dx;if(!blocked(pos.x,pos.z+dz))pos.z+=dz;
 }
 camera.position.copy(pos);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();
 if(now-lastScan>100){lastScan=now;hit=null;if(started&&!open){ray.setFromCamera(new T.Vector2(0,0),camera);let intersects=ray.intersectObjects(targets,false);if(intersects.length){let h=intersects[0]; // Reject targets behind other fixture footprints.
  let v=h.point.clone().sub(pos),dist=Math.hypot(v.x,v.z),clear=true;for(let i=.5;i<dist-.35;i+=.45){let a=pos.x+v.x*i/dist,b=pos.z+v.z*i/dist;if(colliders.some(f=>f!==h.object.userData.slot&&a>f.x&&a<f.x+f.w&&b>f.z&&b<f.z+f.d)){clear=false;break;}}if(clear&&modelStatus.get(h.object.userData.p.id)==='3D model loaded')hit=h.object.userData;
 }}
 $('reticle').classList.toggle('active',!!hit);$('hint').textContent=hit?hit.p.name+' · '+money(hit.p.price)+'  /  E or click to inspect':'';
 }
 if(now-lastMap>220){lastMap=now;let q=zones.reduce((best,q)=>{let d=Math.hypot(Math.max(q.x-pos.x,0,pos.x-q.x-q.w),Math.max(q.z-pos.z,0,pos.z-q.z-q.d));return d<best.d?{q,d}:best;},{d:Infinity,q:null});$('where').textContent=q.d<4?q.q.name:'Main aisle';$('coords').textContent=Math.round(pos.x)+' / '+Math.round(pos.z);drawMap($('mini'));}
 // Models stay in the scene for the entire visit; normal GPU frustum culling only.
 if(warehouseReady)renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
requestAnimationFrame(frame);

// Add unique scan displays to existing rack shelves without moving fixtures.
// Each scan gets an independently searchable location, its own price and stock signal.
async function expandWarehouse(){
 catalog.splice(0);for(const key of Object.keys(byId))delete byId[key];for(const key of Object.keys(byCategory))byCategory[key]=[];for(const key of Object.keys(models))delete models[key];stock.clear();saveBasket();
 try{
  const response=await fetch('./assets/catalog.json',{cache:'no-cache'});if(!response.ok)throw Error('Local catalog not published');
  const manifest=await response.json();const items=manifest.products;
  if(!Array.isArray(items)||manifest.count!==items.length||items.some(p=>!/^\.\/assets\/models\/[A-Za-z0-9_.-]+\.glb$/.test(p.url)||!p.sha256||p.license!=='CC-BY-4.0'))throw Error('Invalid local manifest');
  const racks=fixtures.filter(f=>f.type==='rack'||f.type==='display'||f.type==='cold'), assignments=new Map();
  for(const p of items){
   p.expansion=true;catalog.push(p);byId[p.id]=p;(byCategory[p.category]??=[]).push(p);stock.set(p.id,p.stock);models[p.id]={...p,expansion:true};
   const matching=racks.filter(f=>f.zone.category===p.category),pool=matching.length?matching:racks;
   const f=pool.reduce((a,b)=>(assignments.get(a)?.length||0)<=(assignments.get(b)?.length||0)?a:b);if(!assignments.has(f))assignments.set(f,[]);assignments.get(f).push(p);
  }
  for(const [f,products] of assignments){
   const rack=f.type==='rack',alongX=f.alongX??f.w>=f.d, width=alongX?f.w:f.d,depth=alongX?f.d:f.w;
   const cols=Math.min(5,products.length),rows=Math.ceil(products.length/cols);
   for(let i=0;i<products.length;i++){
    const p=products[i],col=i%cols,row=Math.floor(i/cols),u=(col-(cols-1)/2)*width*.78/cols,v=(row-(rows-1)/2)*depth*.70/rows,
    x=f.x+f.w/2+(alongX?u:v),z=f.z+f.d/2+(alongX?v:u),y=rack?1.80:f.type==='cold'?.82:.92;
    const size=Math.min(width*.73/cols,depth*.73/rows,.72),rot=alongX?0:(f.zone.face==='left'?-Math.PI/2:Math.PI/2);
    const slot={id:p.id,x,y,z,w:size,h:.85,d:size,rot,expansion:true,fallback:{visible:false},strict:true};
    modelSlots.push(slot);proxy(p,x,y+.42,z,size,.84,size,f.zone,f);
   }
  }
  for(const id of Object.keys(basket))if(!byId[id])delete basket[id];saveBasket();
  $('loadError').textContent='';
  const report=await preloadWarehouse(scene,modelSlots,{progress:({completed,loaded,total,bytes,totalBytes,errors})=>{const percent=Math.floor(95*completed/Math.max(1,total));$('preloadBar').value=percent;$('preloadPercent').textContent=percent+'%';$('preloadStatus').textContent='Loading merchandise';$('preloadDetail').textContent=loaded+' / '+total+' models ready · '+(bytes/1e6).toFixed(1)+' / '+(totalBytes/1e6).toFixed(1)+' MB'+(errors?' · '+errors+' failed':'');},status:(id,state)=>modelStatus.set(id,state)});
  if(report.errors.length||!report.total||report.loaded!==report.total)throw Error(report.errors.length+' models failed. Reload to retry.');
  $('preloadStatus').textContent='Preparing graphics…';$('preloadDetail').textContent=report.loaded+' models loaded. Preparing GPU materials.';$('preloadBar').value=96;$('preloadPercent').textContent='96%';
  await new Promise(resolve=>requestAnimationFrame(resolve));
  camera.position.set(SPAWN.x,1.68,SPAWN.z);camera.rotation.set(0,SPAWN.yaw,0,'YXZ');camera.updateMatrixWorld();
  if(renderer.compileAsync)await renderer.compileAsync(scene,camera);else renderer.compile(scene,camera);
  const warmed=new Set();scene.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(material)){if(value?.isTexture)warmed.add(value);}});
  let done=0;for(const texture of warmed){renderer.initTexture(texture);if(++done%20===0)await new Promise(resolve=>requestAnimationFrame(resolve));}
  renderer.render(scene,camera);
  expansionState=report.loaded+' verified local models · all preloaded';$('preloadBar').value=100;$('preloadPercent').textContent='100%';$('preloadStatus').textContent='Warehouse ready';$('preloadDetail').textContent=report.loaded+' / '+report.total+' models loaded. Merchandise remains visible throughout your visit.';$('preloader').dataset.ready='true';warehouseReady=true;$('start').disabled=false;$('start').textContent='Enter the warehouse →';
  if(mode==='search')showSearch();
 }catch(error){expansionState='Warehouse preload failed · '+error.message;$('preloadStatus').textContent='Loading unsuccessful';$('loadError').textContent=error.message;$('preloadDetail').textContent='Entry is disabled to avoid missing merchandise.';$('start').disabled=false;$('start').textContent='Retry loading';$('start').onclick=()=>location.reload();if(mode==='search')showSearch();console.warn(error);}
}
expandWarehouse();
