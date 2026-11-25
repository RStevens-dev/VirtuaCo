// Local screenshot suite. No uploads, extra WebGL context or runtime dependencies.
export const views=[
 {id:'front',angle:0,elevation:8,distance:1},
 {id:'quarter',angle:35,elevation:15,distance:1.15},
 {id:'side',angle:-65,elevation:8,distance:1.25},
 {id:'top',angle:20,elevation:45,distance:1.25},
 {id:'aisle',angle:-25,elevation:0,distance:3}
];
export function selectCases(displays,limit=10){
 const sorted=[...displays].filter(d=>d.ready).sort((a,b)=>Number(!!b.product.regionalListing)-Number(!!a.product.regionalListing)||a.product.id.localeCompare(b.product.id));
 const used=new Set(),types=new Set(),out=[];
 for(const diverse of [true,false])for(const d of sorted){
  if(out.length>=limit)return out;
  if(used.has(d.product.id)||(diverse&&types.has(d.type)))continue;
  used.add(d.product.id);types.add(d.type);out.push(d);
 }
 return out;
}
function dbOpen(){return new Promise((resolve,reject)=>{const r=indexedDB.open('virtuaco-visual-tests',1);r.onupgradeneeded=()=>{r.result.createObjectStore('runs',{keyPath:'id'});r.result.createObjectStore('shots',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transact(store,mode,fn){const db=await dbOpen();try{return await new Promise((resolve,reject)=>{const t=db.transaction(store,mode),r=fn(t.objectStore(store));t.oncomplete=()=>resolve(r?.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Storage transaction aborted'));});}finally{db.close();}}
const save=(store,value)=>transact(store,'readwrite',s=>s.put(value));
export const listRuns=async()=> (await transact('runs','readonly',s=>s.getAll())).sort((a,b)=>b.created.localeCompare(a.created));
const getShot=id=>transact('shots','readonly',s=>s.get(id));
export async function deleteRun(run){for(const id of run.shots)await transact('shots','readwrite',s=>s.delete(id));await transact('runs','readwrite',s=>s.delete(run.id));}
export async function runViews({displays,capture,onProgress,signal,revision='unknown'}){
 const prior=(await listRuns()).find(r=>r.cases.length===10&&r.shots.length>=40&&r.status!=='running'), baseline=prior?.cases.map(c=>c.id)||[];
 const cases=baseline.length?baseline.map(id=>displays.find(d=>d.ready&&d.product.id===id)).filter(Boolean):selectCases(displays),created=new Date().toISOString(),run={id:created+'-'+Math.random().toString(36).slice(2,8),created,revision,status:'running',planned:cases.length*views.length,requested:50,baseline:prior?.id||null,missingProducts:baseline.filter(id=>!cases.some(d=>d.product.id===id)),cases:cases.map(d=>({id:d.product.id,name:d.product.name,type:d.type,source:d.product.source,image:d.product.image||null,zone:d.zone})),shots:[],errors:[]};
 await save('runs',run);
 try{
  for(const d of cases)for(const v of views){
   if(signal?.aborted){run.status='cancelled';return run;}
   const id=run.id+'/'+d.product.id+'/'+v.id;
   try{const result=await capture(d,v);await save('shots',{id,productId:d.product.id,view:v.id,...result});run.shots.push(id);}
   catch(e){run.errors.push({productId:d.product.id,view:v.id,error:String(e.message||e)});}
   await save('runs',run);onProgress?.(run,d,v);await new Promise(r=>setTimeout(r,30));
  }
  run.status=run.errors.length||run.shots.length!==50?'partial':'complete';return run;
 }catch(e){run.status='failed';run.errors.push({error:String(e.message||e)});throw e;}finally{await save('runs',run);}
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const b64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
// A self-contained HTML file keeps all screenshots and metadata together, readable offline.
export async function exportRun(run){
 const chunks=['<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>VirtuaCo product views</title><style>body{font:16px system-ui;margin:24px;background:#f5f5f5;color:#172733}section{background:white;padding:16px;margin:20px 0;border-radius:8px}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}img{width:100%;display:block}figure{margin:0}pre{white-space:pre-wrap}small{color:#536471}</style>','<h1>VirtuaCo product view report</h1><p>'+escape(run.created)+' · '+escape(run.status)+' · '+run.shots.length+'/50 captures · '+escape(run.revision)+'</p><p>Actual warehouse captures; visual quality has not been scored automatically.</p>'];
 for(const c of run.cases){chunks.push('<section><h2>'+escape(c.name)+'</h2><p>'+escape(c.type)+' · '+escape(c.zone)+' · '+escape(c.id)+'</p><small>'+escape(c.source)+'</small><div class="shots">');for(const v of views){const id=run.id+'/'+c.id+'/'+v.id;if(!run.shots.includes(id))continue;const shot=await getShot(id);if(!shot?.blob)continue;chunks.push('<figure><img alt="'+escape(c.name+' '+v.id)+'" src="'+await b64(shot.blob)+'"><figcaption>'+escape(v.id)+' · '+escape(shot.width)+'×'+escape(shot.height)+'<br><small>'+escape(JSON.stringify({camera:shot.camera,stats:shot.stats}))+'</small></figcaption></figure>');}chunks.push('</div></section>');}
 chunks.push('<h2>Run metadata and errors</h2><pre>'+escape(JSON.stringify(run,null,2))+'</pre>');
 return new Blob(chunks,{type:'text/html;charset=utf-8'});
}
