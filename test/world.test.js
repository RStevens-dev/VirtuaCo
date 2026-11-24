import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {zones,catalog,byCategory,byId,WIDTH,DEPTH,SPAWN,planFixtures,rng,stockState} from '../world.js';
const fixtures=planFixtures();
const blocked=(x,z)=>x<.55||x>WIDTH-.55||z<.55||z>DEPTH-.55||fixtures.some(f=>x>f.x-.36&&x<f.x+f.w+.36&&z>f.z-.36&&z<f.z+f.d+.36);
test('floor plan, fixture bounds and collision-free spawn',()=>{
 assert.equal(zones.length,82);
 assert.equal(new Set(zones.map(z=>z.id)).size,zones.length);
 assert.equal(fixtures.length,371);
 for(const f of fixtures){assert.ok(f.w>0&&f.d>0);assert.ok(f.x>=0&&f.z>=0&&f.x+f.w<=WIDTH&&f.z+f.d<=DEPTH);}
 assert.equal(blocked(SPAWN.x,SPAWN.z),false);
 for(let i=0;i<fixtures.length;i++)for(let j=i+1;j<fixtures.length;j++){
  const a=fixtures[i],b=fixtures[j];
  assert.ok(!(a.x<b.x+b.w-.001&&b.x<a.x+a.w-.001&&a.z<b.z+b.d-.001&&b.z<a.z+a.d-.001),a.zone.name+' overlaps '+b.zone.name);
 }
});
test('every fixture is adjacent to the entrance-connected aisle network',()=>{
 const step=.5,nx=Math.floor(WIDTH/step),nz=Math.floor(DEPTH/step),seen=new Set(),queue=[[Math.floor(SPAWN.x/step),Math.floor(SPAWN.z/step)]];
 for(let i=0;i<queue.length;i++){
  let [x,z]=queue[i],key=z*nx+x;
  if(x<0||z<0||x>=nx||z>=nz||seen.has(key)||blocked(x*step+.25,z*step+.25))continue;
  seen.add(key);queue.push([x+1,z],[x-1,z],[x,z+1],[x,z-1]);
 }
 for(const f of fixtures){
  let accessible=false;
  for(let x=Math.floor((f.x-2)/step);x<=Math.ceil((f.x+f.w+2)/step);x++)
  for(let z=Math.floor((f.z-2)/step);z<=Math.ceil((f.z+f.d+2)/step);z++)
   if(x>=0&&x<nx&&z>=0&&z<nz&&seen.has(z*nx+x))accessible=true;
  assert.ok(accessible,'No connected aisle near '+f.zone.name);
 }
});
test('all unique catalog SKUs are displayed in at least one fixture',()=>{
 const seen=new Set();
 assert.equal(catalog.length,91);
 for(const p of catalog){assert.equal(byId[p.id],p);assert.ok(p.price>=0&&p.stock>=0);}
 for(const f of fixtures){const items=byCategory[f.zone.category];if(!items||f.type==='service')continue;
  const n=f.type==='rack'&&!f.narrow?2:1;
  for(let i=0;i<n;i++)seen.add(items[(f.index*n+i)%items.length].id);
 }
 assert.equal(seen.size,catalog.length);
});
test('inventory threshold boundaries and stable random seed',()=>{
 assert.deepEqual([0,1,19,20,59,60,120].map(stockState),['empty','low','low','partial','partial','full','full']);
 const a=rng(9),b=rng(9);
 for(let i=0;i<50;i++){let v=a();assert.equal(v,b());assert.ok(v>=0&&v<1);}
});
test('all JavaScript HUD references exist in HTML',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../main.js',import.meta.url),'utf8');
 for(const [,id] of js.matchAll(/\$\('([^']+)'\)/g))assert.ok(html.includes('id="'+id+'"'),'Missing #'+id);
});

test('scan records preserve source and license',()=>{const scans=catalog.filter(p=>p.scan);assert.equal(scans.length,10);for(const p of scans){assert.equal(p.license,'CC-BY-4.0');assert.ok(p.source.endsWith('/'+p.scan));assert.ok(p.credit.includes('Google Research'));}});
