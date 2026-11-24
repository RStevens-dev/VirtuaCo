// Florida catalogue: product identities are independent of model assets.
// Open Food Facts data is maintained as a separate ODbL database.
export const warehouse={id:'1235',name:'South Orlando',state:'Florida',country:'US',currency:'USD',url:'https://www.costco.com/w/-/fl/s-orlando/1235'};
export const normalize=s=>String(s??'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function validGTIN(value){const s=String(value);if(!/^\d{8}$|^\d{12,14}$/.test(s))return false;let sum=0;for(let i=s.length-2,k=3;i>=0;i--,k=4-k)sum+=Number(s[i])*k;return (10-sum%10)%10===Number(s.at(-1));}
export function validateRecord(raw){
 if(!raw||typeof raw.name!=='string'||!raw.name.trim()||!raw.source||!/^https:\/\//.test(raw.source))return null;
 const upc=String(raw.upc??'').trim(),item=String(raw.item??'').trim();
 const official=/^https:\/\/(?:www\.)?costco\.com\//.test(raw.source)&&/^\d{3,12}$/.test(item);
 const open=raw.source==='https://world.openfoodfacts.org/product/'+upc&&validGTIN(upc)&&raw.sourceLicense==='ODbL-1.0'&&/kirkland/i.test(raw.brand||'');
 if(!official&&!open)return null;
 const observed=raw.warehouse===warehouse.id&&raw.observedAt&&Number.isFinite(Date.parse(raw.observedAt));
 const price=Number.isFinite(raw.price)&&raw.price>=0&&['warehouse','online','delivery'].includes(raw.priceType)&&raw.priceObservedAt&&Number.isFinite(Date.parse(raw.priceObservedAt))&&(raw.priceType!=='warehouse'||observed)?raw.price:null;
 const availability=observed&&['available','unavailable','low'].includes(raw.availability)?raw.availability:'unknown';
 const stockQuantity=observed&&Number.isInteger(raw.stockQuantity)&&raw.stockQuantity>=0?raw.stockQuantity:null;
 return {...raw,id:item?'costco-'+item:'upc-'+upc,upc,item,name:raw.name.trim(),brand:String(raw.brand||''),size:String(raw.size||'Size not verified'),category:String(raw.category||'misc'),price,priceType:price===null?'unknown':raw.priceType,availability,stockQuantity,warehouse:observed?warehouse.id:null,observedAt:observed?raw.observedAt:null,color:'#c5b08c',stock:stockQuantity,kind:'retail',image:open&&raw.imageLicense==='CC-BY-SA-3.0'&&/^https:\/\/images\.openfoodfacts\.org\/images\/products\//.test(raw.image||'')?raw.image:null};
}
export function buildCatalogue(records,assets,approved=[]){
 const index=new Map(assets.map(a=>[a.id,a])),matches=new Map(approved.filter(m=>m.verified===true&&m.evidence&&index.has(m.assetId)).map(m=>[m.productId,m]));
 const output=new Map();
 for(const raw of records){const p=validateRecord(raw);if(!p)continue;
  const old=output.get(p.id);if(old&&old.observedAt&&(!p.observedAt||Date.parse(old.observedAt)>Date.parse(p.observedAt)))continue;
  const match=matches.get(p.id),asset=match&&index.get(match.assetId);
  // No fuzzy-name matches, multipack assumptions or license inference.
  if(asset&&['CC-BY-4.0','CC0-1.0'].includes(asset.license)&&asset.sha256){p.assetId=asset.id;p.model=asset;p.representation='exact-model';}
  else p.representation=p.image?'licensed-image':'catalogue';
  output.set(p.id,p);
 }
 return [...output.values()];
}
export function priceLabel(p){return p.price==null?'Price unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.price);}
export function availabilityLabel(p){return p.availability==='unknown'?'South Orlando availability unknown':p.availability+' · observed '+new Date(p.observedAt).toLocaleDateString('en-US');}
export async function loadRetailCatalogue(assets){
 const read=async path=>{try{const r=await fetch(path,{cache:'no-cache'});if(r.ok)return await r.json();}catch{}return {};};
 const [manual,open,matches]=await Promise.all([read('./data/warehouse-products.json'),read('./data/open-food-facts.json'),read('./data/verified-matches.json')]);
 return buildCatalogue([...(open.products||[]),...(manual.products||[])],assets,matches.matches||[]);
}
