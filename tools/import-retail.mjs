// Import all US Kirkland entries exposed by the licensed Open Food Facts search API.
// No Costco scraping, no fixed product-count limit, no inferred local inventory.
import fs from 'node:fs/promises';
const products=new Map();let page=1,count=Infinity;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
while((page-1)*100<count){
 const url=new URL('https://world.openfoodfacts.org/cgi/search.pl');
 for(const [k,v] of Object.entries({action:'process',json:'1',page_size:'100',page:String(page),tagtype_0:'brands',tag_contains_0:'contains',tag_0:'kirkland-signature',tagtype_1:'countries',tag_contains_1:'contains',tag_1:'united-states',fields:'code,product_name,brands,quantity,categories_tags,image_front_url'}))url.searchParams.set(k,v);
 let data;
 for(let attempt=0;attempt<4;attempt++){try{const res=await fetch(url,{headers:{'User-Agent':'VirtuaCo/1.0 (https://github.com/RStevens-dev/VirtuaCo)'},signal:AbortSignal.timeout(60000)});if(!res.ok)throw Error('HTTP '+res.status);data=await res.json();break;}catch(e){if(attempt===3)throw e;await sleep(10000*(attempt+1));}}
 if(!Array.isArray(data.products)||!Number.isFinite(Number(data.count)))throw Error('Invalid API response');
 count=Number(data.count);if(!data.products.length){if((page-1)*100<count)throw Error('Incomplete page');break;}
 for(const p of data.products){if(!/^\d{8,14}$/.test(p.code)||!p.product_name?.trim())continue;const tags=(p.categories_tags||[]).join(' ');const category=/beverage|water|juice|coffee|tea/.test(tags)?'beverages':/frozen/.test(tags)?'frozen':/milk|cheese|yogurt|dairy/.test(tags)?'dairy':/meat|fish|seafood/.test(tags)?'meat':/snack|chocolate|biscuit/.test(tags)?'snacks':'pantry';
 products.set(p.code,{upc:p.code,name:p.product_name,brand:p.brands,size:p.quantity,category,source:'https://world.openfoodfacts.org/product/'+p.code,sourceLicense:'ODbL-1.0',image:p.image_front_url,imageLicense:p.image_front_url?'CC-BY-SA-3.0':null});}
 console.log('Page',page,'of',Math.ceil(count/100),'valid records',products.size);page++;await sleep(6500);
}
if(!products.size)throw Error('Empty dataset; refusing to replace catalogue');
await fs.mkdir('data',{recursive:true});await fs.writeFile('data/open-food-facts.json',JSON.stringify({version:1,license:'ODbL-1.0',attribution:'Open Food Facts contributors',source:'https://world.openfoodfacts.org/',retrievedAt:new Date().toISOString(),scope:'US Kirkland Signature product identities; not Costco warehouse assortment',products:[...products.values()]},null,2));
