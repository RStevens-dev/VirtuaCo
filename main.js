import * as T from 'three';
import {zones,WIDTH,DEPTH,SPAWN,colors,catalog,byCategory,byId,money,stockState,rng,archive,planFixtures} from './world.js';
const $=id=>document.getElementById(id);
const random=rng(32701), scene=new T.Scene(), camera=new T.PerspectiveCamera(73,innerWidth/innerHeight,.06,160);
scene.background=new T.Color('#bfc8cf');scene.fog=new T.Fog('#bfc8cf',75,155);
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
$('viewport').appendChild(renderer.domElement);
scene.add(new T.HemisphereLight(0xf4f8ff,0xa49a86,2.0));
const sun=new T.DirectionalLight(0xfff7e6,1.5);sun.position.set(25,35,10);scene.add(sun);
const mats=new Map(), batches=new Map(), colliders=[], targets=[], fixtures=planFixtures(), productLocations=new Map(), stock=new Map(catalog.map(p=>[p.id,p.stock]));
const boxGeo=new T.BoxGeometry(1,1,1), cylGeo=new T.CylinderGeometry(.5,.5,1,12), sphereGeo=new T.SphereGeometry(.5,12,8);
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
 });packaging.set(p.id,mat);return mat;
}
function priceMat(p){if(priceMats.has(p.id))return priceMats.get(p.id);let mat=canvasMat(384,192,(c,w,h)=>{c.fillStyle='#fffef5';c.fillRect(0,0,w,h);c.fillStyle='#202526';c.font='bold 25px sans-serif';let ls=lines(c,p.name.toUpperCase(),355).slice(0,2);ls.forEach((s,i)=>c.fillText(s,13,30+i*27));c.font='19px sans-serif';c.fillText(p.size+' · DEMO',13,87);c.font='bold 78px sans-serif';c.fillText(money(p.price),12,165);c.fillStyle='#b8252b';c.fillRect(344,99,27,70);},false);priceMats.set(p.id,mat);return mat;}
function signMat(text,sub='',bg='#164369'){return canvasMat(768,192,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle='#ffffff';c.font='bold 52px sans-serif';let ls=lines(c,text.toUpperCase(),720).slice(0,2);ls.forEach((s,i)=>c.fillText(s,24,62+i*56));if(sub){c.font='25px sans-serif';c.fillStyle='#d8e5ee';c.fillText(sub,24,169);}},false);}
const steel=material('#245d50',.55,.5),beam=material('#d86a22',.45,.52),wood=material('#9e7951'),kraft=material('#b8905c'),darkKraft=material('#8a663e'),black=material('#202a2c'),gray=material('#aab3b5',.4),white=material('#e5e8e6'),rubber=material('#303a3e');
function proxy(p,x,y,z,w,h,d,zone,slot){const obj=new T.Mesh(boxGeo,invisible);obj.position.set(x,y,z);obj.scale.set(w,h,d);obj.updateMatrixWorld(true);obj.userData={p,zone,slot};targets.push(obj);if(!productLocations.has(p.id))productLocations.set(p.id,[]);productLocations.get(p.id).push({x,z,zone});}
function packageItem(p,x,y,z,w,h,d,rot=0){
 const mat=label(p);
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
const stockGroups=new Map();
function makeStock(p,x,z,w,d,seed){
 const g=new T.Group();scene.add(g);
 const slot={g,p,x,z,w,d,seed};if(!stockGroups.has(p.id))stockGroups.set(p.id,[]);stockGroups.get(p.id).push(slot);refreshStock(slot);
}
function refreshStock(slot){
 let {g,p,x,z,w,d,seed}=slot;g.clear();let n=stock.get(p.id),r=rng(seed),state=stockState(n);
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
 const groups=new Map();for(const e of entries){const m=typeof e.m==='string'?material(e.m):e.m;if(!groups.has(m))groups.set(m,[]);groups.get(m).push(e);}
 for(const [m,items] of groups){let mesh=new T.InstancedMesh(boxGeo,m,items.length);items.forEach((e,i)=>{dummy.position.set(e.a,e.b,e.c);dummy.scale.set(e.ww,e.hh,e.dd);dummy.rotation.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});g.add(mesh);}
}
function setStock(id,n){stock.set(id,Math.max(0,Math.min(120,Math.round(n))));for(const s of stockGroups.get(id)||[]){for(const m of s.g.children)m.dispose?.();refreshStock(s);}}
function local(f,u,v){return f.alongX?[f.x+f.w/2+u,f.z+f.d/2+v]:[f.x+f.w/2+v,f.z+f.d/2+u];}
function lb(f,u,y,v,w,h,d,c){let [x,z]=local(f,u,v);B(x,y,z,f.alongX?w:d,h,f.alongX?d:w,c);}
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
  const side=faces===1?(f.zone.z<2?1:-1):(face===0?-1:1),v=side*d*.27, p=products[(f.index*2+face)%products.length];
  let [x,z]=local(f,0,v),pw=w*.84, pd=d*(faces===1?.79:.42);
  makeStock(p,x,z,f.alongX?pw:pd,f.alongX?pd:pw,1000+f.index*19+face);
  // The second level is the customer-facing hero product shelf.
  const count=Math.max(2,Math.min(5,Math.floor(w/.65)));
  for(let i=0;i<count;i++){
   let u=(i-(count-1)/2)*w*.77/count;let [a,b]=local(f,u,v);let ww=w*.68/count,hh=.82+random()*.27,dd=Math.min(pd*.79,.65);
   packageItem(p,a,1.80,b,ww,hh,dd,f.alongX?0:Math.PI/2);
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
 if(p.shape==='sofa'){B(x,.35,z,w*.86,.5,d*.78,p.color);B(x,.8,z-d*.32,w*.86,.66,d*.22,p.color);B(x-w*.39,.72,z,w*.13,.54,d*.7,p.color);B(x+w*.39,.72,z,w*.13,.54,d*.7,p.color);for(let i=0;i<3;i++)B(x+(i-1)*w*.24,.64,z,w*.22,.15,d*.45,'#b7b7b4');}
 else if(p.shape==='table'){B(x,.83,z,w*.78,.13,d*.68,'#8b6d4d');for(const a of [-1,1])for(const b of [-1,1])B(x+a*w*.32,.41,z+b*d*.25,.13,.82,.13,'#534439');}
 else if(p.shape==='mattress'){B(x,.33,z,w*.85,.3,d*.8,'#697784');B(x,.67,z,w*.85,.36,d*.8,'#e4e3dc');}
 else if(p.shape==='tv'){B(x,.48,z,w*.88,.95,d*.8,'#515b61');B(x,1.55,z,w*.78,1.17,.12,'#20252b');B(x,1.55,z+.071,w*.73,1.08,.01,canvasMat(256,128,(c,w,h)=>{let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#173c72');g.addColorStop(.5,'#51a5b9');g.addColorStop(1,'#f5b96c');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#fff';c.font='bold 24px sans-serif';c.fillText('V / ULTRA HD',12,72);},false));}
 else {pallet(x,z,w*.86,d*.86);B(x,.54,z,w*.86,.74,d*.8,'#b4a08b');B(x,.94,z,w*.9,.09,d*.85,'#e3ddd3');let cols=Math.max(2,Math.floor(w/.8)),rows=Math.max(1,Math.floor(d/.8));for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)packageItem(p,x+(i-(cols-1)/2)*w*.75/cols,1.0,z+(j-(rows-1)/2)*d*.7/rows,w*.63/cols,.44,d*.6/rows);}
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
 let ground=new T.Mesh(new T.PlaneGeometry(WIDTH,DEPTH),concrete);ground.rotation.x=-Math.PI/2;ground.position.set(WIDTH/2,0,DEPTH/2);scene.add(ground);
 B(WIDTH/2,4.7,0,WIDTH,9.4,.26,'#d2d5d1');B(0,4.7,DEPTH/2,.26,9.4,DEPTH,'#d2d5d1');B(WIDTH,4.7,DEPTH/2,.26,9.4,DEPTH,'#d2d5d1');B(54,4.7,DEPTH,108,9.4,.26,'#d2d5d1');B(119,4.7,DEPTH,8,9.4,.26,'#d2d5d1');
 B(WIDTH/2,9.6,DEPTH/2,WIDTH,.25,DEPTH,'#c2c9ca');
 for(let x=2;x<WIDTH;x+=7.5){B(x,4.5,.35,.18,9,.27,gray);B(x,4.5,DEPTH-.35,.18,9,.27,gray);B(x,8.8,DEPTH/2,.19,.42,DEPTH,gray);for(let z=3;z<DEPTH;z+=8){B(x,8.2,z,.2,.18,3.5,gray);B(x,8.03,z,.35,.12,2.8,material('#fff7de'));}}
 for(let z=3;z<DEPTH;z+=6){B(.35,4.5,z,.24,9,.16,gray);B(WIDTH-.35,4.5,z,.24,9,.16,gray);B(WIDTH/2,9.05,z,WIDTH,.16,.12,gray);}
 for(let x=0.6;x<WIDTH;x+=2.1){B(x,2.8,.2,.035,5.5,.035,'#adb4b2');B(x,2.8,DEPTH-.2,.035,5.5,.035,'#adb4b2');}
 for(let x=4;x<WIDTH;x+=12)B(x,.008,DEPTH-1.3,6,.012,.10,'#d1b35a');
 const welcome=signMat('VIRTUACO','WAREHOUSE 01 / WELCOME','#a52830');B(113.5,5.8,DEPTH-.3,8,2.0,.10,welcome);
 B(113,3.0,DEPTH-1.0,5,.35,.28,steel);
}
shell();
for(const f of fixtures){colliders.push(f);if(f.type==='rack')rack(f);else if(f.type==='display')display(f);else if(f.type==='cold')cold(f);else if(f.type==='service')service(f);else counter(f);}
for(const q of zones){
 const x=q.x+q.w/2,z=q.z+q.d/2,y=q.kind==='rack'?6.72:4.2,sign=signMat(q.name,q.id+' / '+(q.kind==='rack'?'BULK GOODS':'WAREHOUSE DEPARTMENT'));
 B(x,y,z,Math.min(4.9,Math.max(2.3,q.w)),.88,.1,sign);
 B(x-.8,(y+9.2)/2,z,.025,9.2-y,.025,black);B(x+.8,(y+9.2)/2,z,.025,9.2-y,.025,black);
}
for(const {geo,mat,matrices} of batches.values()){let mesh=new T.InstancedMesh(geo,mat,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);}
batches.clear();
let pos=new T.Vector3(SPAWN.x,1.68,SPAWN.z),yaw=SPAWN.yaw,pitch=0,started=false,open=false,mode='',selected=null,hit=null,keys=new Set(),drag=null,toastTimer;
const radius=.36;
function blocked(x,z){if(x<.55||x>WIDTH-.55||z<.55||z>DEPTH-.55)return true;return colliders.some(f=>x>f.x-radius&&x<f.x+f.w+radius&&z>f.z-radius&&z<f.z+f.d+radius);}
function nearestFree(x,z){if(!blocked(x,z))return {x,z};for(let r=.65;r<22;r+=.55)for(let a=0;a<Math.PI*2;a+=Math.PI/16){let xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;if(!blocked(xx,zz))return {x:xx,z:zz};}return SPAWN;}
function jump(x,z,lookX=x,lookZ=z){const a=nearestFree(x,z);pos.set(a.x,1.68,a.z);if(Math.hypot(lookX-a.x,lookZ-a.z)>.1)yaw=Math.atan2(a.x-lookX,a.z-lookZ);pitch=0;closePanel();toast('Moved to a nearby walkable aisle');}
function look(dx,dy){yaw-=dx*.0024;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.0024));}
function lock(){if(!matchMedia('(pointer: coarse)').matches&&renderer.domElement.requestPointerLock)try{const p=renderer.domElement.requestPointerLock();p?.catch?.(()=>{});}catch{}}
function unlock(){if(document.pointerLockElement)document.exitPointerLock();}
$('start').disabled=false;$('start').textContent='Enter the warehouse →';
$('start').onclick=()=>{started=true;$('welcome').hidden=true;lock();};
document.addEventListener('mousemove',e=>{if(started&&!open&&document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);});
renderer.domElement.addEventListener('pointerdown',e=>{if(!started||open)return;if(document.pointerLockElement===renderer.domElement){inspect();return;}drag={x:e.clientX,y:e.clientY,moved:false};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||open||document.pointerLockElement)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved||=Math.abs(dx)+Math.abs(dy)>2;look(dx,dy);drag.x=e.clientX;drag.y=e.clientY;});
renderer.domElement.addEventListener('pointerup',e=>{if(!drag)return;if(!drag.moved&&started&&!open){if(hit)inspect();else lock();}drag=null;});
renderer.domElement.addEventListener('pointercancel',()=>{drag=null;});
const moveKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
document.addEventListener('keydown',e=>{if(!started||/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;if(moveKeys.includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.repeat)return;switch(e.code){case 'KeyE':if(!open)inspect();break;case 'KeyM':showMap();break;case 'KeyF':showSearch();break;case 'KeyB':showBasket();break;case 'Escape':if(open)closePanel();break;case 'KeyH':showHelp();break;}});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
for(const btn of document.querySelectorAll('[data-move]')){let k=btn.dataset.move;btn.onpointerdown=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(k);};btn.onpointerup=btn.onpointercancel=btn.onlostpointercapture=()=>keys.delete(k);}
$('touchInspect').onclick=inspect;
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
function showPanel(title,kicker,m){open=true;mode=m;keys.clear();unlock();$('panelTitle').textContent=title;$('panelKicker').textContent=kicker;$('panelBody').replaceChildren();$('panel').hidden=false;return $('panelBody');}
function closePanel(){open=false;mode='';$('panel').hidden=true;keys.clear();selected=null;}
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
 let art=el('div','product-art');art.style.background=p.color;let canvas=label(p).map.image;let img=el('img');img.src=canvas.toDataURL();img.alt='Illustrative packaging for '+p.name;art.append(img);
 let amount=el('div','price',money(p.price)),status=el('div','stock-status'),quantity=el('input');quantity.type='range';quantity.min=0;quantity.max=120;quantity.value=stock.get(p.id);quantity.setAttribute('aria-label','Simulated inventory units');
 let add=button('Add to basket',()=>addBasket(p),'primary');
 function update(){let n=stock.get(p.id);status.textContent=n+' demo units · '+stockState(n);status.dataset.state=stockState(n);add.disabled=n===0;}
 quantity.oninput=()=>{setStock(p.id,Number(quantity.value));update();};update();
 append(body,art,el('div','eyebrow',p.size+' / '+p.id.toUpperCase()),amount,status,info('Illustrative bulk product. Price and inventory are fictional and not connected to a retailer.'),add,el('hr'),el('h3','','Inventory visualizer'),info('Move the slider to update the bottom pallet displays for this product throughout the warehouse. The second-level hero products and upper archival stock remain unchanged.'),quantity,button('Reset simulated stock',()=>{setStock(p.id,p.stock);quantity.value=p.stock;update();}));
}
function inspect(){if(hit&&!open)showProduct(hit.p,hit.zone);else if(!open)toast('Look at a product or price sign to inspect it');}
function productRow(p,fn){let row=el('button','product-row'),sw=el('span','swatch');sw.style.background=p.color;let left=append(el('span','product-text'),el('b','',p.name),el('small','',p.size+' · '+stockState(stock.get(p.id))));append(row,sw,left,el('strong','',money(p.price)));row.onclick=fn;return row;}
function showSearch(){let body=showPanel('Find a product','CATALOG / '+catalog.length+' DEMO PRODUCTS','search'),input=el('input','search-input');input.placeholder='Search products or departments';input.setAttribute('aria-label','Search products or departments');let results=el('div','results');function render(){let query=input.value.trim().toLowerCase();results.replaceChildren();let items=catalog.filter(p=>(p.name+' '+p.category+' '+p.size+' '+(productLocations.get(p.id)||[]).map(v=>v.zone.name).join(' ')).toLowerCase().includes(query));if(!items.length)results.append(info('No matching products.'));for(const p of items){let loc=productLocations.get(p.id)?.[0];let row=productRow(p,()=>showProduct(p,loc?.zone));results.append(row);if(loc){let b=button('Go to '+loc.zone.name+' →',()=>jump(loc.x,loc.z,loc.x,loc.z),'text-button');results.append(b);}}}input.oninput=render;append(body,input,results);render();input.focus();}
function showBasket(){let body=showPanel('Your basket','DEMO SHOPPING / NO CHECKOUT','basket');let ids=Object.keys(basket);if(!ids.length)body.append(info('Your basket is empty. Find a product and add it while exploring.'));let total=0;for(let id of ids){let p=byId[id],n=basket[id];total+=p.price*n;let row=productRow(p,()=>showProduct(p));let controls=el('div','qty');append(controls,button('−',()=>{if(--basket[id]<=0)delete basket[id];saveBasket();showBasket();}),el('span','',String(n)),button('+',()=>{addBasket(p);showBasket();}),button('Remove',()=>{delete basket[id];saveBasket();showBasket();},'text-button'));append(body,row,controls);}append(body,el('hr'),el('div','price',money(total)),info('Estimated demo total before tax. Items are not available for purchase. Basket is saved on this device.'),button('Empty basket',()=>{basket={};saveBasket();showBasket();}));}
function drawMap(canvas,full=false){let c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,sx=w/WIDTH,sz=h/DEPTH;c.fillStyle='#172733';c.fillRect(0,0,w,h);for(let q of zones){c.fillStyle=colors[q.kind]+'bb';c.fillRect(q.x*sx,q.z*sz,q.w*sx,q.d*sz);c.strokeStyle='#111c25';c.lineWidth=full?2:1;c.strokeRect(q.x*sx,q.z*sz,q.w*sx,q.d*sz);if(full&&q.w*sx>56&&q.d*sz>23){c.fillStyle='#fff';c.font='bold 11px sans-serif';let ls=lines(c,q.name,q.w*sx-6).slice(0,2);ls.forEach((s,i)=>c.fillText(s,q.x*sx+3,q.z*sz+12+12*i));}}
 c.fillStyle='#ffffff';c.beginPath();c.arc(pos.x*sx,pos.z*sz,full?5:3,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(pos.x*sx,pos.z*sz);c.lineTo(pos.x*sx-Math.sin(yaw)*11,pos.z*sz-Math.cos(yaw)*11);c.stroke();}
function showMap(){let body=showPanel('Warehouse map','FLOOR PLAN / SELECT A DESTINATION','map'),can=el('canvas','full-map');can.width=738;can.height=462;drawMap(can,true);can.setAttribute('aria-label','Warehouse map: click to teleport to an aisle');can.onclick=e=>{let r=can.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*WIDTH,z=(e.clientY-r.top)/r.height*DEPTH;jump(x,z,x,z);};append(body,can,info('Select the map or a department to move to its nearest walkable aisle.'),button('Return to entrance',()=>jump(SPAWN.x,SPAWN.z,SPAWN.x-10,SPAWN.z)));let list=el('div','department-list');for(const q of zones)list.append(button(q.name,()=>jump(q.x+q.w/2,q.z+q.d/2,q.x+q.w/2,q.z+q.d/2),'department'));body.append(list);}
function showHelp(){let b=showPanel('Make yourself at home','CONTROLS / ABOUT','help');append(b,info('Desktop: WASD or arrows to move, mouse to look, Shift to walk faster. Click or press E to inspect an item. Escape releases the mouse.'),info('Touch: drag the warehouse view to look; use the direction buttons to move, and Inspect to open the targeted product.'),info('M opens the map, F finds products, B opens the basket, H opens this help. Product inventory can be adjusted in the detail panel.'),info('VirtuaCo is an independent fictional warehouse simulator, not affiliated with Costco. All packaging, prices and inventory are illustrative. No accounts, payments or tracking.'),button('Back to entrance',()=>jump(SPAWN.x,SPAWN.z,SPAWN.x-10,SPAWN.z)));}
$('mapBtn').onclick=showMap;$('searchBtn').onclick=showSearch;$('cartBtn').onclick=showBasket;$('helpBtn').onclick=showHelp;$('mini').onclick=showMap;
let prev=performance.now(),lastScan=0,lastMap=0;
function frame(now){
 requestAnimationFrame(frame);let dt=Math.min(.045,(now-prev)/1000);prev=now;
 if(started&&!open){
  let f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),s=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),len=Math.hypot(f,s)||1,speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?7.2:4.4)*dt/len;
  let dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed;if(!blocked(pos.x+dx,pos.z))pos.x+=dx;if(!blocked(pos.x,pos.z+dz))pos.z+=dz;
 }
 camera.position.copy(pos);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();
 if(now-lastScan>100){lastScan=now;hit=null;if(started&&!open){ray.setFromCamera(new T.Vector2(0,0),camera);let intersects=ray.intersectObjects(targets,false);if(intersects.length){let h=intersects[0]; // Reject targets behind other fixture footprints.
  let v=h.point.clone().sub(pos),dist=Math.hypot(v.x,v.z),clear=true;for(let i=.5;i<dist-.35;i+=.45){let a=pos.x+v.x*i/dist,b=pos.z+v.z*i/dist;if(colliders.some(f=>f!==h.object.userData.slot&&a>f.x&&a<f.x+f.w&&b>f.z&&b<f.z+f.d)){clear=false;break;}}if(clear)hit=h.object.userData;
 }}
 $('reticle').classList.toggle('active',!!hit);$('hint').textContent=hit?hit.p.name+' · '+money(hit.p.price)+'  /  E or click to inspect':'';
 }
 if(now-lastMap>220){lastMap=now;let q=zones.reduce((best,q)=>{let d=Math.hypot(Math.max(q.x-pos.x,0,pos.x-q.x-q.w),Math.max(q.z-pos.z,0,pos.z-q.z-q.d));return d<best.d?{q,d}:best;},{d:Infinity,q:null});$('where').textContent=q.d<4?q.q.name:'Main aisle';$('coords').textContent=Math.round(pos.x)+' / '+Math.round(pos.z);drawMap($('mini'));}
 renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
requestAnimationFrame(frame);
