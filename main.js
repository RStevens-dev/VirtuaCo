import * as T from 'three';
import {warehouse,loadRetailCatalogue,priceLabel,availabilityLabel} from './retail.js';
import {routeGrid,analog,orderStops,ambientAudio} from './experience.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/meshopt_decoder.module.js';
import {zones,WIDTH,DEPTH,SPAWN,colors,catalog,byCategory,byId,money,stockState,rng,archive,planFixtures} from './world.js';
const $=id=>document.getElementById(id);
import {installProductModels,models,applyScanThumbnail,createSectionStreamer} from './assets.js';
import {applyProductPhoto,photoManifest} from './photos.js';
import {fetchExpansion,registerExpansion} from './expansion.js';
import {nativeIds,sculpt} from './native-models.js';
const random=rng(32701), scene=new T.Scene(), camera=new T.PerspectiveCamera(73,innerWidth/innerHeight,.06,160);
scene.background=new T.Color('#bfc8cf');scene.fog=new T.Fog('#bfc8cf',75,155);
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1:1.4));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
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
function priceMat(p){if(priceMats.has(p.id))return priceMats.get(p.id);let mat=canvasMat(384,192,(c,w,h)=>{c.fillStyle='#fffef5';c.fillRect(0,0,w,h);c.fillStyle='#202526';c.font='bold 25px sans-serif';let ls=lines(c,p.name.toUpperCase(),355).slice(0,2);ls.forEach((s,i)=>c.fillText(s,13,30+i*27));c.font='19px sans-serif';c.fillText(p.size.slice(0,32),13,87);c.font=p.price==null?'bold 35px sans-serif':'bold 78px sans-serif';c.fillText(p.price==null?'PRICE UNKNOWN':money(p.price),12,165);c.fillStyle='#b8252b';c.fillRect(344,99,27,70);},false);priceMats.set(p.id,mat);return mat;}
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
function setStock(id,n){stock.set(id,Math.max(0,Math.min(120,Math.round(n))));rebuildProductStock(id);sectionStreamer?.setStock(id,stock.get(id));}
function local(f,u,v){return f.alongX?[f.x+f.w/2+u,f.z+f.d/2+v]:[f.x+f.w/2+v,f.z+f.d/2+u];}
function lb(f,u,y,v,w,h,d,c){let [x,z]=local(f,u,v);B(x,y,z,f.alongX?w:d,h,f.alongX?d:w,c);}
// Permanent reserve stock: opaque cartons block sightlines, cheap film highlights suggest cling wrap.
// All pieces are batched with the structural fixtures; no imported assets or inventory coupling.
const reserveColors=['#b49a77','#aa8d65','#c6b28f','#d4d0c4','#a4aca5','#b7b9ac'];
const film=new T.MeshStandardMaterial({color:0xe9f2f5,transparent:true,opacity:.17,roughness:.24,metalness:.04,depthWrite:false,side:T.FrontSide});
const filmBand=new T.MeshBasicMaterial({color:0xe8f2fa,transparent:true,opacity:.24,depthWrite:false});
const filmGlint=new T.MeshBasicMaterial({color:0xf2f8fa,transparent:true,opacity:.43,depthWrite:false});
function reservePallets(f,w,d){
 const r=rng(81173+Math.round(f.x*127)+Math.round(f.z*313)+f.index*19);
 // Fill the two upper storage tiers, including the top deck, with narrow clearance.
 for(const deck of [3.80,5.60]){
  const bays=Math.max(1,Math.round((w-.16)/1.25)),bayW=(w-.16)/bays;
  const faces=d>1.65?2:1,faceD=(d-.19)/faces;
  for(let b=0;b<bays;b++)for(let face=0;face<faces;face++){
   const u=-w/2+.08+(b+.5)*bayW,v=-d/2+.095+(face+.5)*faceD;
   const pw=bayW*(.96+r()*.02),pd=faceD*(.94+r()*.035);
   for(let j=0;j<4;j++)lb(f,u+(j-1.5)*pw/4,deck+.07,v,pw*.21,.07,pd,wood);
   for(let j=0;j<3;j++)lb(f,u,deck+.025,v+(j-1)*pd*.33,pw,.05,pd*.13,darkKraft);
   const h=deck<5?1.42+r()*.08:1.46+r()*.32;
   const color=reserveColors[Math.floor(r()*reserveColors.length)], rows=r()>.65?3:2,cols=pw>.78?2:1, cw=pw*.95/cols,rh=h/rows;
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const a=u+(col-(cols-1)/2)*cw,y=deck+.105+(row+.5)*rh;
    lb(f,a,y,v,cw*.994,rh*.986,pd*.96,color);
    // Dark seams and pale tape on exposed carton faces.
    for(const side of [-1,1]){lb(f,a,y+.03,v+side*pd*.482,cw*.105,rh*.89,.009,'#cbb797');if((row+col+b)%3===0)lb(f,a-cw*.24,y-rh*.23,v+side*pd*.484,cw*.23,rh*.22,.008,'#dddcd2');}
   }
   const base=deck+.105;
   lb(f,u,base+h*.5,v,pw*.974,h+.018,pd*.987,film);
   const bands=5+Math.floor(r()*3);
   for(let j=0;j<bands;j++){const y=base+h*(.08+.85*j/(bands-1));const thick=.018+r()*.026;for(const side of [-1,1]){lb(f,u,y,v+side*pd*.496,pw*.98,thick,.008,filmBand);lb(f,u+side*pw*.49,y,v,.008,thick,pd*.99,filmBand);}}
   for(const side of [-1,1])lb(f,u+side*pw*.37,base+h*.51,v+pd*.497,.017,h*.88,.008,filmGlint);
  }
 }
}
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
 reservePallets(f,w,d);
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
let stick={x:0,y:0},stickId=null,route=[],routeStops=[],tapWalk=false,battery=false,sensitivity=1,gyro=false,gyroBase=null,viewerCleanup=null;const audio=ambientAudio();
const routeMarker=new T.Group();scene.add(routeMarker);
const trolley=new T.Group(),trolleyWire=new T.MeshBasicMaterial({color:0x9da9b2,wireframe:true}),trolleyBody=new T.Mesh(new T.BoxGeometry(.58,.42,.72,5,3,6),trolleyWire);trolleyBody.position.y=.72;trolley.add(trolleyBody);const trolleyHandle=new T.Mesh(new T.BoxGeometry(.66,.045,.045),material('#bd3438'));trolleyHandle.position.set(0,.99,.45);trolley.add(trolleyHandle);for(const x of [-.25,.25])for(const z of [-.28,.28]){const wheel=new T.Mesh(new T.CylinderGeometry(.09,.09,.04,12),material('#26292d'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.11,z);trolley.add(wheel);}scene.add(trolley);trolley.visible=false;let showTrolley=false;const trolleyItems=new T.Group();trolley.add(trolleyItems);
function updateTrolley(){trolley.visible=showTrolley&&started&&!open;if(!trolley.visible)return;const x=pos.x-Math.sin(yaw)*.95,z=pos.z-Math.cos(yaw)*.95;trolley.position.set(x,0,z);trolley.rotation.y=yaw;}
const seasonName=new Intl.DateTimeFormat('en',{month:'long'}).format(new Date());
function showSeason(){const b=showPanel('Seasonal discoveries',seasonName.toUpperCase()+' / ROTATING PICKS','season');const month=new Date().getMonth(),pool=catalog.filter(p=>p.category==='season'||p.category==='home'||p.category==='misc');const ordered=[...pool.slice((month*17)%Math.max(1,pool.length)),...pool.slice(0,(month*17)%Math.max(1,pool.length))];for(const p of ordered.slice(0,12))b.append(productRow(p,()=>showProduct(p)));}
function showSamples(){const b=showPanel('Sample station','VIRTUAL DEMONSTRATIONS','samples');const pool=catalog.filter(p=>['pantry','food','fresh','bakery'].includes(p.category));for(const p of pool.slice(0,8)){b.append(productRow(p,()=>showProduct(p)),button('View sample product',()=>showProduct(p)));}}
const markerGeo=new T.RingGeometry(.12,.25,16),markerMat=new T.MeshBasicMaterial({color:0xffd04a,side:T.DoubleSide});
function paintRoute(){routeMarker.clear();for(const p of route.filter((_,i)=>i%3===0)){const m=new T.Mesh(markerGeo,markerMat);m.rotation.x=-Math.PI/2;m.position.set(p.x,.035,p.z);routeMarker.add(m);}}
function navigate(x,z){const end=nearestFree(x,z);route=routeGrid(pos,end,WIDTH,DEPTH,blocked);paintRoute();closePanel();if(!route.length)toast('No walkable route found');else toast('Follow the yellow floor markers');}
function nextStop(){const n=routeStops.shift();if(n)navigate(n.x,n.z);}
const joy=$('joystick'),knob=$('joystickKnob');
const touchDevice=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;
if(touchDevice)document.documentElement.classList.add('touch-device');
function moveStick(x,y){const r=joy.getBoundingClientRect();stick=analog(x-r.left-r.width/2,y-r.top-r.height/2,Math.max(24,r.width*.36));knob.style.transform='translate('+stick.x*34+'px,'+stick.y*34+'px)';}
function resetStick(){stickId=null;stick={x:0,y:0};knob.style.transform='';}
if(touchDevice){
 // Safari touch identifiers remain stable even when a second finger controls the camera.
 joy.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();if(stickId!==null)return;const t=e.changedTouches[0];if(!t)return;stickId=t.identifier;moveStick(t.clientX,t.clientY);},{passive:false});
 document.addEventListener('touchmove',e=>{if(stickId===null)return;const t=Array.from(e.changedTouches).find(t=>t.identifier===stickId);if(t){if(e.cancelable)e.preventDefault();moveStick(t.clientX,t.clientY);}},{passive:false});
 for(const type of ['touchend','touchcancel'])document.addEventListener(type,e=>{if(Array.from(e.changedTouches).some(t=>t.identifier===stickId))resetStick();},{passive:true});
}else{
 joy.addEventListener('pointerdown',e=>{e.preventDefault();stickId=e.pointerId;moveStick(e.clientX,e.clientY);try{joy.setPointerCapture(e.pointerId);}catch{}});
 document.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e.clientX,e.clientY);});
 for(const type of ['pointerup','pointercancel'])document.addEventListener(type,e=>{if(e.pointerId===stickId)resetStick();});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetStick();});
$('touchWalk').onclick=()=>{tapWalk=!tapWalk;$('touchWalk').dataset.active=tapWalk;toast(tapWalk?'Tap the floor to walk':'Tap merchandise to inspect');};
function blocked(x,z){if(x<.55||x>WIDTH-.55||z<.55||z>DEPTH-.55)return true;return colliders.some(f=>x>f.x-radius&&x<f.x+f.w+radius&&z>f.z-radius&&z<f.z+f.d+radius);}
function nearestFree(x,z){if(!blocked(x,z))return {x,z};for(let r=.65;r<22;r+=.55)for(let a=0;a<Math.PI*2;a+=Math.PI/16){let xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;if(!blocked(xx,zz))return {x:xx,z:zz};}return SPAWN;}
function jump(x,z,lookX=x,lookZ=z){route=[];routeStops=[];paintRoute();const a=nearestFree(x,z);pos.set(a.x,1.68,a.z);if(Math.hypot(lookX-a.x,lookZ-a.z)>.1)yaw=Math.atan2(a.x-lookX,a.z-lookZ);pitch=0;closePanel();toast('Moved to a nearby walkable aisle');}
function look(dx,dy){const scale=.0024*sensitivity;yaw-=dx*scale;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*scale));}
function tapAt(e){const r=renderer.domElement.getBoundingClientRect(),point=new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);const rr=new T.Raycaster();rr.setFromCamera(point,camera);if(tapWalk){const floor=new T.Plane(new T.Vector3(0,1,0),0),dest=new T.Vector3();if(rr.ray.intersectPlane(floor,dest))navigate(dest.x,dest.z);return;}rr.far=8;const intersection=rr.intersectObjects(targets,false)[0],target=intersection?.object.userData;const obstructed=intersection&&colliders.some(f=>{if(f===target.slot)return false;const delta=intersection.point.clone().sub(pos),d=Math.hypot(delta.x,delta.z);for(let i=.5;i<d-.35;i+=.5){let x=pos.x+delta.x*i/d,z=pos.z+delta.z*i/d;if(x>f.x&&x<f.x+f.w&&z>f.z&&z<f.z+f.d)return true;}return false;});if(target&&!obstructed&&byId[target.p.id]?.kind==='retail')showProduct(target.p,target.zone);else if(hit)inspect();}
window.addEventListener('deviceorientation',e=>{if(!gyro||!started||open||e.alpha==null)return;if(!gyroBase)gyroBase={a:e.alpha,b:e.beta,yaw,pitch};yaw=gyroBase.yaw-(e.alpha-gyroBase.a)*Math.PI/180;pitch=Math.max(-1.35,Math.min(1.35,gyroBase.pitch+(e.beta-gyroBase.b)*Math.PI/180));});
function lock(){if(!touchDevice&&renderer.domElement.requestPointerLock)try{const p=renderer.domElement.requestPointerLock();p?.catch?.(()=>{});}catch{}}
function unlock(){if(document.pointerLockElement)document.exitPointerLock();}
let warehouseReady=false,sectionStreamer=null,streamX=SPAWN.x,streamZ=SPAWN.z;
let loadingTolerance={forward:36,side:18};try{const saved=JSON.parse(localStorage.getItem('virtuaco-loading')||'null');if(saved)for(const k of ['forward','side'])if(Number.isFinite(saved[k]))loadingTolerance[k]=Math.max(0,Math.min(WIDTH,saved[k]));}catch{}
$('start').disabled=true;$('start').textContent='Loading warehouse…';
$('start').onclick=()=>{if(!warehouseReady)return;started=true;if(blocked(pos.x,pos.z)){const p=nearestFree(pos.x,pos.z);pos.set(p.x,1.68,p.z);} $('welcome').hidden=true;document.activeElement?.blur();lock();};
document.addEventListener('mousemove',e=>{if(started&&!open&&document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);});
renderer.domElement.addEventListener('pointerdown',e=>{if(!started||open||e.pointerType==='touch')return;if(document.pointerLockElement===renderer.domElement){inspect();return;}drag={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId};try{renderer.domElement.setPointerCapture(e.pointerId);}catch{}});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||open||document.pointerLockElement)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved||=Math.abs(dx)+Math.abs(dy)>2;look(dx,dy);drag.x=e.clientX;drag.y=e.clientY;});
renderer.domElement.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&started&&!open){if(e.pointerType==='touch')tapAt(e);else if(hit)inspect();else lock();}drag=null;});
renderer.domElement.addEventListener('pointercancel',()=>{drag=null;});
// Native touch camera path; independent from joystick finger and pointer capture.
let cameraTouch=null;
renderer.domElement.addEventListener('touchstart',e=>{if(!started||open)return;if(e.cancelable)e.preventDefault();if(cameraTouch)return;const t=e.changedTouches[0];if(t)cameraTouch={id:t.identifier,x:t.clientX,y:t.clientY,moved:false};},{passive:false});
renderer.domElement.addEventListener('touchmove',e=>{if(!cameraTouch||open)return;if(e.cancelable)e.preventDefault();const t=Array.from(e.changedTouches).find(t=>t.identifier===cameraTouch.id);if(!t)return;const dx=t.clientX-cameraTouch.x,dy=t.clientY-cameraTouch.y;cameraTouch.moved||=Math.abs(dx)+Math.abs(dy)>2;look(dx,dy);cameraTouch.x=t.clientX;cameraTouch.y=t.clientY;},{passive:false});
renderer.domElement.addEventListener('touchend',e=>{if(!cameraTouch)return;const t=Array.from(e.changedTouches).find(t=>t.identifier===cameraTouch.id);if(!t)return;if(e.cancelable)e.preventDefault();if(!cameraTouch.moved&&started&&!open)tapAt(t);cameraTouch=null;},{passive:false});
renderer.domElement.addEventListener('touchcancel',e=>{if(cameraTouch&&Array.from(e.changedTouches).some(t=>t.identifier===cameraTouch.id))cameraTouch=null;});
const moveKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
document.addEventListener('keydown',e=>{if(!started)return;if(e.code==='Escape'&&open){closePanel();return;}if(/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;if(moveKeys.includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.repeat)return;switch(e.code){case 'KeyE':if(!open)inspect();break;case 'KeyM':showMap();break;case 'KeyF':showSearch();break;case 'KeyB':showBasket();break;case 'Escape':if(open)closePanel();break;case 'KeyL':showLoadingSettings();break;case 'KeyH':showHelp();break;}});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();resetStick();cameraTouch=null;});
for(const btn of document.querySelectorAll('[data-move]')){let k=btn.dataset.move;btn.onpointerdown=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(k);};btn.onpointerup=btn.onpointercancel=btn.onlostpointercapture=()=>keys.delete(k);}
$('touchInspect').onclick=inspect;
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
function showPanel(title,kicker,m){viewerCleanup?.();viewerCleanup=null;open=true;mode=m;keys.clear();resetStick();cameraTouch=null;unlock();$('panelTitle').textContent=title;$('panelKicker').textContent=kicker;$('panelBody').replaceChildren();$('panel').hidden=false;return $('panelBody');}
function closePanel(){viewerCleanup?.();viewerCleanup=null;document.activeElement?.blur();open=false;mode='';$('panel').hidden=true;keys.clear();selected=null;}
$('closePanel').onclick=closePanel;$('resume').onclick=()=>{closePanel();lock();};
function el(tag,cls,text){let a=document.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=text;return a;}
function button(label,fn,cls='secondary'){let b=el('button',cls,label);b.onclick=fn;return b;}
function append(p,...nodes){p.append(...nodes);return p;}
function info(s){return el('p','muted',s);}
let basket={};try{const raw=JSON.parse(localStorage.getItem('virtuaco-basket')||'{}');for(const [k,v] of Object.entries(raw))if(Number.isInteger(v)&&v>0)basket[k]=Math.min(v,99);}catch{}
function saveBasket(){try{localStorage.setItem('virtuaco-basket',JSON.stringify(basket));}catch{}$('cartCount').textContent=Object.values(basket).reduce((a,b)=>a+b,0);}
saveBasket();
function addBasket(p){if(p.kind==='retail'){basket[p.id]=Math.min(99,(basket[p.id]||0)+1);saveBasket();toast('Added to planning basket');return;}if(stock.get(p.id)===0){toast('This demo item is out of stock');return;}let n=basket[p.id]||0;if(n>=Math.min(stock.get(p.id),99)){toast('Simulated stock limit reached');return;}basket[p.id]=n+1;saveBasket();toast('Added '+p.name);}
function openProductViewer(host,p){
 let disposed=false,root=null,drag=null,zoom=1,raf=0;const sc=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.01,100),view=new T.WebGLRenderer({antialias:false,alpha:true});view.setPixelRatio(1);view.setSize(320,220);host.prepend(view.domElement);sc.add(new T.HemisphereLight(0xffffff,0x777777,2.5));const light=new T.DirectionalLight(0xffffff,2);light.position.set(3,4,5);sc.add(light);cam.position.set(0,0,3);let pointers=new Map(),pinch=0;host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});};host.onpointermove=e=>{const a=pointers.get(e.pointerId);if(!a||!root)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [u,v]=[...pointers.values()],d=Math.hypot(u.x-v.x,u.y-v.y);if(pinch)zoom=Math.max(.5,Math.min(3,zoom*d/pinch));pinch=d;}else{root.rotation.y+=(e.clientX-a.x)*.012;root.rotation.x+=(e.clientY-a.y)*.012;}};host.onpointerup=host.onpointercancel=e=>{pointers.delete(e.pointerId);pinch=0;};host.onwheel=e=>{e.preventDefault();zoom=Math.max(.5,Math.min(3,zoom-e.deltaY*.002));};
 const release=r=>r?.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v?.isTexture){v.dispose();v.image?.close?.();}m.dispose();}}});
 viewerCleanup=()=>{disposed=true;cancelAnimationFrame(raf);release(root);view.dispose();view.forceContextLoss();};
 new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(p.url).then(g=>{if(disposed){release(g.scene);return;}root=new T.Group();const b=new T.Box3().setFromObject(g.scene),size=b.getSize(new T.Vector3());g.scene.position.sub(b.getCenter(new T.Vector3()));root.add(g.scene);root.scale.setScalar(1.7/Math.max(size.x,size.y,size.z));sc.add(root);host.querySelector('.product-view-status').textContent='Drag to rotate · pinch or scroll to zoom';}).catch(()=>{if(!disposed)host.querySelector('.product-view-status').textContent='Original scan could not load';});
 function draw(){if(disposed)return;raf=requestAnimationFrame(draw);cam.position.z=3/zoom;cam.lookAt(0,0,0);view.render(sc,cam);}draw();
}
function showProduct(p,zone){
 if(p.kind==='retail'){showRetailProduct(p,zone);return;}
 selected=p;let body=showPanel(p.name,zone?.name||'PRODUCT / SAMPLE CATALOG','product');selected=p;
 let art=el('div','product-view');art.append(el('div','product-view-status','Loading original scan…'));if(p.scan)openProductViewer(art,p);
 let amount=el('div','price',money(p.price)),status=el('div','stock-status'),quantity=el('input');quantity.type='range';quantity.min=0;quantity.max=120;quantity.value=stock.get(p.id);quantity.setAttribute('aria-label','Simulated inventory units');
 let add=button('Add to basket',()=>addBasket(p),'primary');
 function update(){let n=stock.get(p.id);status.textContent=n+' demo units · '+stockState(n);status.dataset.state=stockState(n);add.disabled=n===0;}
 quantity.oninput=()=>{setStock(p.id,Number(quantity.value));update();};update();
 append(body,art,el('div','eyebrow',p.size+' / '+p.id.toUpperCase()),amount,status,info(nativeVisible.has(p.id)?'Locally generated 3D product geometry. Demo price and stock.':'Illustrative bulk product. Price and inventory are fictional and not connected to a retailer.'),...(p.scan?[info('3D scan: '+p.credit+' · '+p.license),(()=>{const a=el('a','text-button','Original scan and attribution');a.href=p.source;a.target='_blank';a.rel='noopener noreferrer';return a;})()]:photoManifest[p.id]?[info('Photo: '+photoManifest[p.id].credit+' · '+photoManifest[p.id].license),(()=>{const a=el('a','text-button','Original product photo record');a.href=photoManifest[p.id].source;a.target='_blank';a.rel='noopener noreferrer';return a;})()]:[]),add,el('hr'),el('h3','','Inventory visualizer'),info('Adjust simulated availability. The number of visible scan-derived units on bulk displays changes with inventory.'),quantity,button('Walk to this product',()=>{const l=productLocations.get(p.id)?.[0];if(l)navigate(l.x,l.z);}),button('Reset simulated stock',()=>{setStock(p.id,p.stock);quantity.value=p.stock;update();}));
}
function inspect(){if(hit&&!open&&byId[hit.p.id]?.kind==='retail')showProduct(hit.p,hit.zone);else if(!open)toast('Look at a product or price sign to inspect it');}
function showRetailProduct(p,zone){const b=showPanel(p.name,'FLORIDA / '+(p.item?'ITEM '+p.item:p.upc?'UPC '+p.upc:'ORLANDO DELIVERY LISTING'),'product');if(p.model){const art=el('div','product-view');art.append(el('div','product-view-status','Loading verified matching scan…'));b.append(art);openProductViewer(art,p.model);}else if(p.image){const img=el('img','retail-photo');img.src=p.image;img.alt=p.name;img.loading='lazy';b.append(img,info('Product photo · Open Food Facts contributors · '+p.imageLicense));}else b.append(info('No verified matching visual asset.'));const link=el('a','text-button','Product source and attribution');link.href=p.source;link.target='_blank';link.rel='noopener noreferrer';append(b,el('div','price',priceLabel(p)),info(p.priceType==='unknown'?'No verified price':p.priceType+' price · USD'),info(availabilityLabel(p)),...(p.regionalListing?[info('South Orlando delivery listing observed '+p.listingObservedAt+'; not an in-store stock check.')]:[]),info(p.brand+' · '+p.size),info('Warehouse reference: South Orlando #1235. Catalogue listing does not establish local stock.'),link,button('Back to catalogue',showSearch),button('Add to planning basket',()=>addBasket(p),'primary'));const loc=productLocations.get(p.id)?.[0];if(loc)b.append(button('Walk to representative display',()=>navigate(loc.x,loc.z)));}
function productRow(p,fn){let row=el('button','product-row'),sw=el('span','swatch');sw.style.background=p.color;let left=append(el('span','product-text'),el('b','',p.name),el('small','',p.size+' · '+(p.regionalListing?'Orlando delivery listing':p.kind==='retail'?p.availability==='unknown'?'Availability unknown':p.availability:stockState(stock.get(p.id)))));append(row,sw,left,el('strong','',p.kind==='retail'?priceLabel(p):money(p.price)));row.onclick=fn;return row;}
function renderModelList(){const body=$('panelBody');body.replaceChildren(info('Verified local files: '+catalog.length+' · currently rendered: '+[...modelStatus.values()].filter(s=>s==='3D model loaded').length+'. No procedural merchandise.'),info('Select a product to travel directly to a display.'));for(const id of nativeVisible){const p=byId[id],loc=productLocations.get(id)?.[0];body.append(productRow(p,()=>showProduct(p,loc?.zone)),info('Local 3D geometry · no external download'));if(loc)body.append(button('Go to product →',()=>{jump(loc.x,loc.z,loc.x,loc.z);pitch=Math.atan2(.6,Math.hypot(pos.x-loc.x,pos.z-loc.z));}));}for(const [id,asset] of Object.entries(models).filter(([id,a])=>modelStatus.has(id)).slice(0,100)){const p=byId[id],slot=modelSlots.find(s=>s.id===id);if(!p)continue;body.append(productRow(p,()=>showProduct(p)));body.append(info(modelStatus.get(id)||'Waiting for download'));if(slot)body.append(button('Go to model →',()=>{jump(slot.x,slot.z,slot.x,slot.z);pitch=Math.atan2(slot.y+slot.h/2-1.68,Math.hypot(pos.x-slot.x,pos.z-slot.z));}));else body.append(info('No dedicated model placement'));}}
function showModels(){showPanel('Real product models','ASSET STATUS / FIND A DISPLAY','models');renderModelList();}
let searchState={query:'',filter:'all',category:'all',page:0};
function showSearch(){const b=showPanel('Explore the catalogue','SOUTH ORLANDO / FLORIDA REFERENCE','search'),input=el('input','search-input'),filter=el('select','search-input'),category=el('select','search-input'),results=el('div','results');input.placeholder='Name, brand, UPC or item number';input.setAttribute('aria-label','Search sourced products');filter.setAttribute('aria-label','Filter product evidence');category.setAttribute('aria-label','Department');for(const [value,label] of [['all','All sourced products'],['matched','Exact 3D matches'],['image','Licensed product photos'],['priced','Observed prices'],['orlando','South Orlando delivery listings'],['local','Observed South Orlando availability'],['display','Physical displays']]){const option=el('option','',label);option.value=value;filter.append(option);}for(const value of ['all',...new Set(catalog.map(p=>p.category).sort())]){const o=el('option','',value==='all'?'All departments':value);o.value=value;category.append(o);}input.value=searchState.query;filter.value=searchState.filter;category.value=searchState.category;
 function render(){const tokens=input.value.toLowerCase().trim().split(/\s+/).filter(Boolean),items=catalog.filter(p=>{const hay=[p.name,p.brand,p.category,p.size,p.item,p.upc].join(' ').toLowerCase();return tokens.every(t=>hay.includes(t))&&(category.value==='all'||p.category===category.value)&&(filter.value==='all'||filter.value==='matched'&&p.model||filter.value==='image'&&p.image||filter.value==='priced'&&p.price!=null||filter.value==='orlando'&&p.regionalListing||filter.value==='local'&&p.availability!=='unknown'||filter.value==='display'&&productLocations.has(p.id));});searchState.page=Math.min(searchState.page,Math.max(0,Math.ceil(items.length/30)-1));results.replaceChildren(info(items.length.toLocaleString()+' results · '+(items.length?'page '+(searchState.page+1)+' of '+Math.ceil(items.length/30):'no matches')));for(const p of items.slice(searchState.page*30,searchState.page*30+30)){const loc=productLocations.get(p.id)?.[0];results.append(productRow(p,()=>showProduct(p,loc?.zone)));if(loc)results.append(button('Walk to '+loc.zone.name,()=>navigate(loc.x,loc.z),'text-button'));}const nav=el('div','route-actions');if(searchState.page>0)nav.append(button('Previous',()=>{searchState.page--;render();}));if((searchState.page+1)*30<items.length)nav.append(button('Next',()=>{searchState.page++;render();}));results.append(nav);}
 input.oninput=filter.onchange=category.onchange=()=>{searchState={query:input.value,filter:filter.value,category:category.value,page:0};render();};append(b,info(expansionState),input,filter,category,results);render();}
function showBasket(){let body=showPanel('Your basket','DEMO SHOPPING / NO CHECKOUT','basket');let ids=Object.keys(basket);if(!ids.length)body.append(info('Your basket is empty. Find a product and add it while exploring.'));let total=0,unknown=0;for(let id of ids){let p=byId[id],n=basket[id];if(!p)continue;if(p.price==null||p.priceType!=='warehouse')unknown+=n;else total+=p.price*n;let row=productRow(p,()=>showProduct(p));let controls=el('div','qty');append(controls,button('−',()=>{if(--basket[id]<=0)delete basket[id];saveBasket();showBasket();}),el('span','',String(n)),button('+',()=>{addBasket(p);showBasket();}),button('Remove',()=>{delete basket[id];saveBasket();showBasket();},'text-button'));append(body,row,controls);}append(body,el('hr'),el('div','price',money(total)),info('Observed warehouse-price subtotal before tax; '+unknown+' units without an observed warehouse price. No checkout.'),button('Empty basket',()=>{basket={};saveBasket();showBasket();}));}
function drawMap(canvas,full=false){let c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,sx=w/WIDTH,sz=h/DEPTH;c.fillStyle='#172733';c.fillRect(0,0,w,h);for(let q of zones){c.fillStyle=colors[q.kind]+'bb';c.fillRect(q.x*sx,q.z*sz,q.w*sx,q.d*sz);c.strokeStyle='#111c25';c.lineWidth=full?2:1;c.strokeRect(q.x*sx,q.z*sz,q.w*sx,q.d*sz);if(full&&q.w*sx>56&&q.d*sz>23){c.fillStyle='#fff';c.font='bold 11px sans-serif';let ls=lines(c,q.name,q.w*sx-6).slice(0,2);ls.forEach((s,i)=>c.fillText(s,q.x*sx+3,q.z*sz+12+12*i));}}
 if(full){c.fillStyle='#fff';c.font='bold 12px sans-serif';c.fillText('ENTRANCE',w-85,12);}
 c.fillStyle='#ffffff';c.beginPath();c.arc(pos.x*sx,pos.z*sz,full?5:3,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(pos.x*sx,pos.z*sz);c.lineTo(pos.x*sx-Math.sin(yaw)*11,pos.z*sz-Math.cos(yaw)*11);c.stroke();}
function showMap(){let body=showPanel('Warehouse map','FLOOR PLAN / SELECT A DESTINATION','map'),can=el('canvas','full-map');can.width=738;can.height=462;drawMap(can,true);can.setAttribute('aria-label','Warehouse map: click to teleport to an aisle');can.onclick=e=>{let r=can.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*WIDTH,z=(e.clientY-r.top)/r.height*DEPTH;navigate(x,z);};append(body,can,info('Select the map or a department to move to its nearest walkable aisle. The entrance is at the upper right, matching the Coomera reference.'),button('Return to entrance',()=>navigate(SPAWN.x,SPAWN.z)),button('Plan basket route',()=>{routeStops=orderStops(pos,Object.keys(basket).map(id=>productLocations.get(id)?.[0]).filter(Boolean));nextStop();}));let list=el('div','department-list');for(const q of zones)list.append(button(q.name,()=>jump(q.x+q.w/2,q.z+q.d/2,q.x+q.w/2,q.z+q.d/2),'department'));body.append(list);}
function showLoadingSettings(){
 const b=showPanel('Loading distances','PERFORMANCE / STREAMING','loading');
 append(b,info('Control the detailed model loading area relative to your view and movement. Nearby models are prioritized; memory limits still apply.'));
 performanceLine=el('p','muted','Collecting live performance metrics…');b.append(performanceLine);
 const trolleyButton=button('Shopping trolley: '+(showTrolley?'On':'Off'),()=>{showTrolley=!showTrolley;trolleyButton.textContent='Shopping trolley: '+(showTrolley?'On':'Off');});append(b,trolleyButton,button('Seasonal discoveries',showSeason),button('Sample station',showSamples));
 const batteryButton=button('Battery saver: '+(battery?'On':'Off'),()=>{battery=!battery;batteryButton.textContent='Battery saver: '+(battery?'On':'Off');});const audioButton=button('Toggle warehouse ambience',()=>toast(audio.toggle()?'Ambient audio on':'Ambient audio off'));const gyroButton=button('Motion viewing: '+(gyro?'On':'Off'),async()=>{try{if(!gyro&&typeof globalThis.DeviceOrientationEvent?.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted')return;gyro=!gyro;gyroBase=null;gyroButton.textContent='Motion viewing: '+(gyro?'On':'Off');}catch{toast('Motion viewing unavailable');}});const sense=el('input');sense.type='range';sense.min=.4;sense.max=2.5;sense.step=.1;sense.value=sensitivity;sense.setAttribute('aria-label','Look sensitivity');sense.oninput=()=>sensitivity=Number(sense.value);append(b,batteryButton,audioButton,gyroButton,info('Look sensitivity'),sense);
 const controls=[];
 for(const [key,name] of [['forward','Forward distance'],['side','Side distance (each direction)']]){
  const label=el('label','stream-label'),value=el('strong','',loadingTolerance[key]+' m'),input=el('input');input.type='range';input.min=0;input.max=WIDTH;input.step=1;input.value=loadingTolerance[key];input.setAttribute('aria-label',name);
  append(label,el('span','',name),value);append(b,label,input,el('div','stream-scale','0 m — '+WIDTH+' m (warehouse length)'));
  input.oninput=()=>{loadingTolerance[key]=Number(input.value);value.textContent=input.value+' m';apply();};controls.push({key,input,value});
 }
 function apply(){try{localStorage.setItem('virtuaco-loading',JSON.stringify(loadingTolerance));}catch{}sectionStreamer?.setTolerance(loadingTolerance);sectionStreamer?.update(pos,yaw);}
 append(b,info('A small near-field safety radius and short rear retention prevent immediate unloading when turning. Maximum distance expands eligibility, not the hard memory budget.'),button('Reset recommended distances',()=>{loadingTolerance={forward:36,side:18};for(const c of controls){c.input.value=loadingTolerance[c.key];c.value.textContent=c.input.value+' m';}apply();}));
}
function showHelp(){let b=showPanel('Make yourself at home','CONTROLS / ABOUT','help');append(b,info('Desktop: WASD or arrows to move, mouse to look, Shift to walk faster. Click or press E to inspect an item. Escape releases the mouse.'),info('Touch: drag the warehouse view to look; use the direction buttons to move, and Inspect to open the targeted product.'),info('M opens the map, F finds products, B opens the basket, H opens this help. Product inventory can be adjusted in the detail panel.'),info('VirtuaCo is an independent fictional warehouse simulator, not affiliated with Costco. Product identities are sourced; local prices and stock are shown only when verified. Upper reserve pallets are decorative. No accounts, payments or tracking.'),button('Back to entrance',()=>jump(SPAWN.x,SPAWN.z,SPAWN.x-10,SPAWN.z)));}
$('streamBtn').onclick=showLoadingSettings;$('mapBtn').onclick=showMap;$('searchBtn').onclick=showSearch;$('cartBtn').onclick=showBasket;$('helpBtn').onclick=showHelp;$('mini').onclick=showMap;
let prev=performance.now(),lastScan=0,lastMap=0,lastStream=0;
let lastBatteryFrame=0,fps=60,frameCount=0,fpsStart=performance.now(),lastQuality=0,pixelRatio=renderer.getPixelRatio(),performanceLine=null;
function frame(now){
 requestAnimationFrame(frame);let dt=Math.min(.045,(now-prev)/1000);prev=now;
 if(started&&!open){
  let f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))-stick.y,s=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.x,len=Math.max(1,Math.hypot(f,s)),speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?7.2:4.4)*dt/len;
  let dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed;if(!blocked(pos.x+dx,pos.z))pos.x+=dx;if(!blocked(pos.x,pos.z+dz))pos.z+=dz;
  if(Math.abs(f)+Math.abs(s)>.05&&route.length){route=[];routeStops=[];paintRoute();}else if(route.length){const q=route[0],d=Math.hypot(q.x-pos.x,q.z-pos.z);if(d<.16){route.shift();if(!route.length){paintRoute();if(routeStops.length)nextStop();else toast('Destination reached');}}else{const k=Math.min(d,dt*3.4)/d,xx=pos.x+(q.x-pos.x)*k,zz=pos.z+(q.z-pos.z)*k;if(!blocked(xx,zz)){pos.x=xx;pos.z=zz;}}}
 }
 updateTrolley();camera.position.copy(pos);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();
 if(now-lastScan>100){lastScan=now;hit=null;if(started&&!open){ray.setFromCamera(new T.Vector2(0,0),camera);let intersects=ray.intersectObjects(targets,false);if(intersects.length){let h=intersects[0]; // Reject targets behind other fixture footprints.
  let v=h.point.clone().sub(pos),dist=Math.hypot(v.x,v.z),clear=true;for(let i=.5;i<dist-.35;i+=.45){let a=pos.x+v.x*i/dist,b=pos.z+v.z*i/dist;if(colliders.some(f=>f!==h.object.userData.slot&&a>f.x&&a<f.x+f.w&&b>f.z&&b<f.z+f.d)){clear=false;break;}}if(clear&&byId[h.object.userData.p.id]?.kind==='retail')hit=h.object.userData;
 }}
 $('reticle').classList.toggle('active',!!hit);$('hint').textContent=hit?hit.p.name+' · '+priceLabel(hit.p)+'  /  E or click to inspect':'';
 }
 if(now-lastMap>220){lastMap=now;let q=zones.reduce((best,q)=>{let d=Math.hypot(Math.max(q.x-pos.x,0,pos.x-q.x-q.w),Math.max(q.z-pos.z,0,pos.z-q.z-q.d));return d<best.d?{q,d}:best;},{d:Infinity,q:null});$('where').textContent=q.d<4?q.q.name:'Main aisle';audio.update(q.q?.kind==='cold');$('coords').textContent=Math.round(pos.x)+' / '+Math.round(pos.z);drawMap($('mini'));}
 if(warehouseReady&&sectionStreamer&&now-lastStream>250){const elapsed=Math.max(.25,(now-lastStream)/1000);sectionStreamer.update(pos,yaw,{x:(pos.x-streamX)/elapsed,z:(pos.z-streamZ)/elapsed});streamX=pos.x;streamZ=pos.z;lastStream=now;const stats=sectionStreamer.stats();$('coords').textContent=stats.resident+' / '+stats.limit+' 3D · '+stats.eligible+' eligible · '+Math.round(stats.bytes/1048576)+' MB';}
 if(warehouseReady&&(!battery||now-lastBatteryFrame>=33)){lastBatteryFrame=now;renderer.render(scene,camera);frameCount++;if(now-fpsStart>=2000){fps=frameCount*1000/(now-fpsStart);frameCount=0;fpsStart=now;if(now-lastQuality>8000){let target=pixelRatio;if(battery)target=Math.min(.85,pixelRatio);else if(fps<28)target=Math.max(.65,pixelRatio-.15);else if(fps>55)target=Math.min(1.6,devicePixelRatio,pixelRatio+.05);if(target!==pixelRatio){pixelRatio=target;renderer.setPixelRatio(pixelRatio);lastQuality=now;}}if(performanceLine?.isConnected){const st=sectionStreamer.stats(),r=renderer.info;performanceLine.textContent=Math.round(fps)+' FPS · '+r.render.calls+' draw calls · '+r.render.triangles.toLocaleString()+' triangles · '+r.memory.textures+' textures · '+st.resident+' detailed / '+st.baseReady+' low-detail models · '+st.pending+' loading · '+st.evictions+' evictions · '+Math.round(st.bytes/1048576)+' MiB detailed estimate · '+(st.hasLOD?'Optimized assets active':'Original assets active');}}}
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
requestAnimationFrame(frame);

// Add unique scan displays to existing rack shelves without moving fixtures.
// Each scan gets an independently searchable location, its own price and stock signal.
async function expandWarehouse(){
 catalog.splice(0);for(const key of Object.keys(byId))delete byId[key];for(const key of Object.keys(byCategory))byCategory[key]=[];for(const key of Object.keys(models))delete models[key];stock.clear();productLocations.clear();modelSlots.length=0;targets.length=0;
 try{
  const response=await fetch('./assets/catalog.json',{cache:'no-cache'});const manifest=response.ok?await response.json():{products:[]};
  const library=(manifest.products||[]).filter(p=>/^\.\/assets\/models\/[A-Za-z0-9_.-]+\.glb$/.test(p.url)&&p.sha256&&['CC-BY-4.0','CC0-1.0'].includes(p.license));
  const retail=await loadRetailCatalogue(library);
  if(!retail.length)throw Error('No sourced retail products available');
  const racks=fixtures.filter(f=>f.type==='rack'||f.type==='display'||f.type==='cold'),assignments=new Map(),displayed=new Set();
  for(const p of retail){catalog.push(p);byId[p.id]=p;(byCategory[p.category]??=[]).push(p);stock.set(p.id,p.stockQuantity);}
  // Catalogue is unlimited; physical space is finite. Leave excess items searchable.
  // Prefer exact models, then licensed images, then sourced name-only placards.
  for(const p of [...retail].sort((a,b)=>Number(b.regionalListing)-Number(a.regionalListing)||Number(!!b.model)-Number(!!a.model)||Number(!!b.image)-Number(!!a.image))){
   const matching=racks.filter(f=>f.zone.category===p.category),pool=(matching.length?matching:racks).filter(f=>(assignments.get(f)?.length||0)<3);
   if(!pool.length)continue;const f=pool.reduce((a,b)=>(assignments.get(a)?.length||0)<=(assignments.get(b)?.length||0)?a:b);
   if(!assignments.has(f))assignments.set(f,[]);assignments.get(f).push(p);
  }
  const photoQueue=[],shelfCards=[];
  // One atlas for all sourced shelf signs; avoid hundreds of individual GPU textures.
  const tileW=256,tileH=128,columns=8,perAtlas=128,atlasCanvases=[];
  for(const [f,products] of assignments){
   const rack=f.type==='rack',alongX=f.alongX??f.w>=f.d,width=alongX?f.w:f.d,depth=alongX?f.d:f.w;
   for(let i=0;i<products.length;i++){
    const p=products[i],u=(i-(products.length-1)/2)*width*.82/products.length,x=f.x+f.w/2+(alongX?u:0),z=f.z+f.d/2+(alongX?0:u),y=rack?1.8:f.type==='cold'?.82:.92,size=Math.min(width*.75/products.length,depth*.75,.85),rot=alongX?0:(f.zone.face==='left'?-Math.PI/2:Math.PI/2);
    const idx=shelfCards.length,atlasIndex=Math.floor(idx/perAtlas),tile=idx%perAtlas;
    if(!atlasCanvases[atlasIndex]){const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2048;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;atlasCanvases.push({canvas,ctx:canvas.getContext('2d'),texture,mat:new T.MeshBasicMaterial({map:texture,side:T.DoubleSide})});}
    const atlas=atlasCanvases[atlasIndex],tx=(tile%columns)*tileW,ty=Math.floor(tile/columns)*tileH,c=atlas.ctx;
    c.fillStyle='#faf9f3';c.fillRect(tx,ty,tileW,tileH);c.fillStyle='#182b37';c.font='bold 17px sans-serif';
    lines(c,p.name.toUpperCase(),240).slice(0,3).forEach((v,j)=>c.fillText(v,tx+8,ty+20+j*19));c.font='12px sans-serif';c.fillText((p.item?'ITEM '+p.item:'UPC '+p.upc),tx+8,ty+82);
    c.font='bold 22px sans-serif';c.fillText(p.price==null?'PRICE UNKNOWN':priceLabel(p),tx+8,ty+111);c.fillStyle=p.regionalListing?'#176a53':'#a82f35';c.fillRect(tx,ty+124,tileW,4);
    const geo=new T.PlaneGeometry(Math.min(size,.75),.37),uv=geo.attributes.uv;
    for(let k=0;k<uv.count;k++)uv.setXY(k,(tx+uv.getX(k)*tileW)/2048,1-(ty+(1-uv.getY(k))*tileH)/2048);
    const sign=new T.Mesh(geo,atlas.mat);sign.position.set(x+Math.sin(rot)*depth*.43,y+.12,z+Math.cos(rot)*depth*.43);sign.rotation.y=rot;scene.add(sign);shelfCards.push(sign);
    proxy(p,x,y+.42,z,size,.84,size,f.zone,f);displayed.add(p.id);
    if(p.model){models[p.id]={...p.model};modelSlots.push({id:p.id,assetId:p.assetId,x,y,z,w:size,h:.85,d:size,rot,bulk:false});}
    else if(p.image){const mat=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});const photo=new T.Mesh(new T.PlaneGeometry(size,.70),mat);photo.position.set(x,y+.62,z);photo.rotation.y=rot;photo.visible=false;scene.add(photo);const back=new T.Mesh(boxGeo,material('#e4e1db'));back.scale.set(size*.94,.72,.045);back.position.set(x-Math.sin(rot)*.03,y+.62,z-Math.cos(rot)*.03);back.rotation.y=rot;back.visible=false;scene.add(back);photoQueue.push({p,photo,mat,x,z,back,size});}
    // Unknown stock remains empty: no invented stock count. Verified quantities fill neutral cartons.
    if(rack&&p.stockQuantity>0){const n=Math.min(12,Math.ceil(p.stockQuantity/4)),bw=size*.44,bd=Math.min(depth*.37,.38),bh=.27;for(let k=0;k<n;k++){const col=k%2,row=Math.floor(k/2)%2,layer=Math.floor(k/4),mesh=new T.Mesh(boxGeo,kraft);mesh.scale.set(bw,bh,bd);mesh.position.set(x+(col-.5)*bw,.17+(layer+.5)*bh,z+(row-.5)*bd);scene.add(mesh);}}
   }
  }
  for(const a of atlasCanvases)a.texture.needsUpdate=true;
  for(const id of Object.keys(basket))if(!byId[id])delete basket[id];saveBasket();
  $('loadError').textContent='';$('preloadStatus').textContent='Preparing sourced catalogue';
  if(modelSlots.length){sectionStreamer=await createSectionStreamer(scene,modelSlots,renderer,(id,state)=>modelStatus.set(id,state));sectionStreamer.setTolerance(loadingTolerance);await sectionStreamer.initial(SPAWN,SPAWN.yaw,()=>{});}
  else sectionStreamer={update(){},setTolerance(){},setStock(){},has:id=>displayed.has(id),stats:()=>({resident:0,limit:0,eligible:0,bytes:0,baseReady:0,pending:0,evictions:0,hasLOD:false})};
  // Keep product identity visible before optional remote photos finish loading.
  // Photographs are distance-prioritized and bounded; decoded images never fill all GPU memory.
  const photoLimit=touchDevice?48:96,photoResidents=new Map(),photoFailed=new Set();let photoBusy=false;
  async function photos(){if(photoBusy||!warehouseReady)return;photoBusy=true;try{
   const ranked=photoQueue.map(e=>({...e,d:Math.hypot(e.x-pos.x,e.z-pos.z)})).sort((a,b)=>a.d-b.d),near=ranked.filter(e=>e.d<=30&&!photoFailed.has(e.p.id)).slice(0,photoLimit);
   for(const e of near){if(photoResidents.has(e.p.id))continue;const distant=[...photoResidents.values()].sort((a,b)=>Math.hypot(b.x-pos.x,b.z-pos.z)-Math.hypot(a.x-pos.x,a.z-pos.z))[0];if(photoResidents.size>=photoLimit&&(!distant||Math.hypot(distant.x-pos.x,distant.z-pos.z)<e.d+10))continue;
    try{const img=new Image();img.crossOrigin='anonymous';img.src=e.p.image;await img.decode();const c=document.createElement('canvas');const scale=Math.min(1,192/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.generateMipmaps=false;tx.minFilter=T.LinearFilter;
    if(photoResidents.size>=photoLimit&&distant){distant.photo.visible=false;distant.back.visible=false;distant.mat.map.dispose();distant.mat.map=null;distant.mat.needsUpdate=true;photoResidents.delete(distant.p.id);}
    e.mat.map=tx;e.mat.needsUpdate=true;const aspect=c.width/c.height;const fitW=Math.min(e.size,.70*aspect),fitH=fitW/aspect;e.photo.scale.set(fitW/e.size,fitH/.70,1);e.back.scale.set(fitW,fitH,.045);e.photo.visible=true;e.back.visible=true;photoResidents.set(e.p.id,e);
    }catch{photoFailed.add(e.p.id);}await new Promise(r=>setTimeout(r,40));}
  }finally{photoBusy=false;}}
  const photoTimer=setInterval(photos,1500);
  expansionState=retail.length.toLocaleString()+' sourced US products · '+modelSlots.length+' exact model displays · '+displayed.size+' physical listings. South Orlando stock is not implied.';
  $('preloadBar').value=100;$('preloadPercent').textContent='100%';$('preloadStatus').textContent='Warehouse ready';$('preloadDetail').textContent=expansionState;$('preloader').dataset.ready='true';warehouseReady=true;$('start').disabled=false;$('start').textContent='Enter the warehouse →';
  photos();if(mode==='search')showSearch();
 }catch(error){expansionState='Warehouse preload failed · '+error.message;$('preloadStatus').textContent='Loading unsuccessful';$('loadError').textContent=error.message;$('start').disabled=false;$('start').textContent='Retry loading';$('start').onclick=()=>location.reload();console.warn(error);}
}
expandWarehouse();
