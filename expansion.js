const BASE='https://huggingface.co/datasets/codepawl/scanned-objects-glb/resolve/main/';
const KEY='virtuaco-scan-expansion-v1';
export const EXPANSION_COUNT=500;
const mapping={'shoe':'clothing','clothing':'clothing','toy':'season','board game':'misc','media':'misc','bag':'misc','household':'home','kitchen':'home','electronics':'electronics','food and drink':'pantry','health and beauty':'health','bottles and cups':'home','baby gear':'baby','other':'misc'};
export function selectExpansion(rows,existing){
 const used=new Set(existing.map(p=>p.scan).filter(Boolean)), result=[];
 // Round-robin categories to avoid selecting mostly shoes or toys.
 const groups=new Map();
 for(const r of rows){
  if(!r.id||used.has(r.id)||r.license!=='CC-BY-4.0'||!r.file||!r.thumb||!r.name||!mapping[r.category]||!/^objects\/[\w.-]+\/[\w.-]+\.glb$/.test(r.file)||!/^thumbs\/[\w.-]+\.webp$/.test(r.thumb))continue;
  used.add(r.id);if(!groups.has(r.category))groups.set(r.category,[]);groups.get(r.category).push(r);
 }
 while(result.length<EXPANSION_COUNT&&[...groups.values()].some(g=>g.length)){
  for(const group of groups.values()){if(result.length===EXPANSION_COUNT)break;const r=group.shift();if(!r)continue;
   result.push({id:'gso-'+r.id,scan:r.id,name:r.name,category:mapping[r.category],size:'Scanned display sample',price:9.99+(result.length%15)*5,color:['#64869a','#a87959','#708974','#b1a07f'][result.length%4],shape:'box',stock:[96,48,14,72,0][result.length%5],file:r.file,thumb:r.thumb,source:r.source||'https://fuel.gazebosim.org/1.0/GoogleResearch/models/'+encodeURIComponent(r.id),credit:'Google Research, copyright 2020 Google LLC; conversion by CodePawl',license:'CC-BY-4.0',expansion:true});
  }
 }
 return result;
}
export async function fetchExpansion(existing){
 let rows;try{rows=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
 if(!Array.isArray(rows)||rows.length<500){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch(BASE+'metadata.jsonl',{signal:controller.signal});if(!response.ok)throw Error('Catalog HTTP '+response.status);rows=(await response.text()).trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));try{localStorage.setItem(KEY,JSON.stringify(rows));}catch{}}
  finally{clearTimeout(timeout);}
 }
 const items=selectExpansion(rows,existing);if(items.length!==EXPANSION_COUNT)throw Error('Expected 500 eligible unique scans; found '+items.length);return items;
}
export function registerExpansion(items,catalog,byCategory,byId,models){
 for(const p of items){catalog.push(p);byId[p.id]=p;(byCategory[p.category]??=[]).push(p);models[p.id]={name:p.name,url:BASE+p.file,thumb:BASE+p.thumb,source:p.source,credit:p.credit,license:p.license,expansion:true};}
}
