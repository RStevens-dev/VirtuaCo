// Floor plan: map top = z 0, entrance at lower right. Units are meters.
// [name, x, z, width, depth, kind, product category]
export const zones = [
 ['Water',10,1.5,4.5,5,'rack','water'],['Paper goods',5.5,7.5,9,8,'rack','paper'],
 ['Baby goods',16,1,2.4,15,'rack','baby'],['Laundry / cleaning',19,2.5,10.5,13,'rack','clean'],
 ['Beverages',31.5,2.5,11,13,'rack','drinks'],['Frozen',44.5,2.5,19,13,'cold','frozen'],
 ['Pantry goods · North',65.5,2.5,24,13.5,'rack','pantry'],['Medicine / bath',92,2.5,15.5,14,'rack','health'],
 ['Soda',19,0.2,24,1.5,'rack','drinks'],['Sports drinks',44,0.2,19,1.5,'rack','drinks'],
 ['Snacks',64,0.2,25,1.5,'rack','snacks'],['Pharmacy',90,0.2,14,1.5,'counter','health'],
 ['Hearing',105,0.2,6,1.5,'counter','health'],['Restrooms',112,1,9.5,8,'service',''],
 ['Merch pickup',114,11,7,7.5,'counter',''],['Pet supplies',4,17,10.5,1.5,'rack','pet'],
 ['Sushi',16,17.5,6,1.6,'counter','fresh'],['Household',22.5,17.5,20.5,1.6,'rack','home'],
 ['Miscellaneous',44.5,17.5,19,1.6,'rack','misc'],['Treasure finds',65.5,18,24,1.6,'rack','season'],
 ['Skincare',92,19,15,1.6,'rack','health'],['Deli counter',2,19.5,11,10,'counter','fresh'],
 ['Rotisserie',2,30.5,11,6,'counter','fresh'],['Meat counter',2,37.5,10,18,'counter','meat'],
 ['Bakery counter',1.5,56.5,10,9,'counter','bakery'],['Team area',1,67,10,8,'service',''],
 ['Refrigerated foods',15,21,19,14,'cold','fresh'],['Meat',15,37,19,11,'cold','meat'],
 ['Household essentials',36,21,12,12,'rack','home'],['Plants',36,35,2,13,'display','plants'],
 ['Seasonal',49.5,21,18,13,'display','season'],['Seasonal · Discovery',39.5,35,28,13,'display','season'],
 ['Clothing',69,21.5,5.5,26.5,'display','clothing'],['Pantry goods · East',76,22,24.5,10.5,'rack','pantry'],
 ['Furniture · East',76,34,24.5,14,'display','furniture'],['Self checkout',104,22,5,5,'checkout',''],
 ['Checkout',104,28,5,19,'checkout',''],['Food court',115,20,6,9,'counter','food'],
 ['Tire sales',115,48,6,6,'counter',''],['Member service',115,55,6,8,'counter',''],
 ['Baked goods',14,50.5,8.5,13,'display','bakery'],['Produce',24,50.5,10,13,'display','produce'],
 ['Adult beverages',35.5,50.5,6,22,'rack','wine'],['Refrigerated produce',12.5,65,11,10,'cold','produce'],
 ['Dairy',25,65,9,10,'cold','dairy'],['Furniture',43,50.5,33,22,'display','furniture'],
 ['Electronics',78,50.5,19,22,'display','electronics'],['Clothing · Front',99,51,9,12,'display','clothing'],
 ['TVs',99,64.5,9,4.5,'display','electronics'],['Optical',99,70.5,9,4.5,'counter','health'],
 ['Appliances',43,74,54,1.4,'rack','appliances'],['Misc. · Front',99,48.5,13,1.5,'rack','misc'],
 ['Misc. · Side',110,51,2,18,'rack','misc'],['Misc. · South',35,74,7,1.4,'rack','misc']
].map(([name,x,z,w,d,kind,category],i)=>({id:'D'+(i+1),name,x,z,w,d,kind,category}));
export const WIDTH=123, DEPTH=77, SPAWN={x:116,z:72,yaw:Math.PI/2};
export const colors={rack:'#df923b',cold:'#62b8ce',display:'#62a581',counter:'#d76558',checkout:'#d76558',service:'#8797a5'};
const groups={
 water:[['Spring water','40 × 500 mL',5.49,'#3c92c6','bottle'],['Sparkling mineral water','24 × 330 mL',14.99,'#357e67','can']],
 paper:[['Ultra soft bath tissue','30 rolls',22.99,'#2466b1'],['Premium paper towels','12 rolls',20.49,'#f4b632']],
 baby:[['Everyday diapers','192 count',36.99,'#73b9cf'],['Gentle baby wipes','900 count',19.99,'#8cae73']],
 clean:[['Laundry detergent','146 loads',19.99,'#e58726','bottle'],['Dishwasher pods','115 count',17.99,'#43a7aa'],['Multi-surface cleaner','3 × 1 L',12.49,'#61a64a','bottle']],
 drinks:[['Cola variety pack','35 cans',16.49,'#bd242e','can'],['Orange sports drink','28 bottles',19.99,'#ed8427','bottle'],['Cold brew coffee','12 cans',18.99,'#745345','can'],['Apple juice','2 × 2 L',8.99,'#c9a537','bottle']],
 frozen:[['Wild blueberries','4 lb',12.99,'#4056a4','bag'],['Mini dumplings','3 lb',13.49,'#d45648','bag'],['Four cheese pizza','4 pack',16.99,'#e0b74b'],['Vanilla ice cream','2 tubs',13.99,'#a7c2e4','tub']],
 pantry:[['Roasted almonds','3 lb',13.99,'#9d583b','bag'],['Extra virgin olive oil','2 L',19.99,'#4c7139','bottle'],['Organic jasmine rice','25 lb',24.99,'#ddac52','bag'],['Tomato sauce','12 cans',11.99,'#bd322b','can'],['Rolled oats','10 lb',11.49,'#ddb977'],['Pasta assortment','6 pack',10.99,'#365e9c'],['Wildflower honey','3 lb',14.49,'#dca134','bottle'],['Peanut butter','2 × 28 oz',10.49,'#bc7542','tub']],
 snacks:[['Trail mix','4 lb',15.99,'#d9a234','bag'],['Sea salt chips','30 oz',6.99,'#32a2b0','bag'],['Chocolate snack bars','48 count',17.99,'#773e51'],['Popcorn variety','32 bags',15.49,'#dd7551']],
 health:[['Daily multivitamins','365 tablets',18.99,'#517b42','bottle'],['Moisturizing lotion','2 × 20 oz',15.99,'#73a2b9','bottle'],['Toothpaste bundle','5 tubes',13.99,'#d74745'],['Shampoo duo','2 × 1 L',16.49,'#8e71ae','bottle']],
 pet:[['Adult dog food','40 lb',39.99,'#b37442','bag'],['Cat litter','42 lb',17.99,'#6d7eaa']],
 home:[['Storage tote','27 gallon',9.99,'#e7b729','tub'],['Microfiber cloths','36 pack',14.99,'#6a9da1'],['Kitchen utensil set','12 pieces',22.99,'#626e7b'],['LED light bulbs','12 pack',15.99,'#e4bb46']],
 misc:[['Adventure lantern','2 pack',19.99,'#e08f32'],['Travel organizer set','6 pieces',17.99,'#557b9f'],['Mystery warehouse find','Limited edition',9.97,'#a3689c']],
 season:[['Patio string lights','48 ft',29.99,'#485b66'],['Inflatable holiday dinosaur','8 ft',69.97,'#70a64c'],['Giant plush bear','53 in',39.99,'#b48c66'],['Retro arcade console','12 games',149.99,'#8e4a9c'],['Garden solar lanterns','6 pack',24.99,'#e5b55a']],
 fresh:[['Rotisserie chicken','3 lb',4.99,'#bd7641','tub'],['Fresh sushi sampler','24 pieces',16.99,'#355c59','tub'],['Greek yogurt cups','18 count',12.99,'#4d7bab','tub'],['Deli salad','2 lb',10.99,'#6d9b51','tub']],
 meat:[['Boneless chicken breast','6 lb',19.99,'#d98279','tub'],['Ground beef','5 lb',24.99,'#b84745','tub'],['Atlantic salmon','2 lb',23.99,'#e49166','tub']],
 bakery:[['Butter croissants','12 count',6.99,'#ce9b55','tub'],['Blueberry muffins','6 count',6.99,'#7467a5','tub'],['Chocolate chip cookies','24 count',9.99,'#ac7842','tub']],
 plants:[['Indoor monstera','10 in pot',24.99,'#578456','tub'],['Orchid assortment','2 stems',16.99,'#ad6ca9','tub']],
 clothing:[['Everyday crew socks','8 pairs',12.99,'#68798d'],['Fleece pullover','Unisex',19.99,'#a46c58'],['Cotton tees','4 pack',16.99,'#496e9b']],
 furniture:[['Modular fabric sofa','3 pieces',899.99,'#9a9c9f','sofa'],['Dining table set','5 pieces',499.99,'#967551','table'],['Memory foam mattress','Queen',299.99,'#b9c7d3','mattress']],
 electronics:[['4K smart television','65 inch',449.99,'#283a50','tv'],['Wireless headphones','Over-ear',69.99,'#6e7787'],['Portable speaker','Bluetooth',49.99,'#3a4657'],['Laptop computer','15 inch',599.99,'#7c8a99','tv']],
 produce:[['Avocados','6 count',7.99,'#63833e','bag'],['Honeycrisp apples','4 lb',8.99,'#c64b42','bag'],['Organic bananas','3 lb',2.49,'#e4bd3c','bag'],['Baby spinach','1 lb',4.99,'#458350','tub']],
 dairy:[['Whole milk','2 gallons',6.99,'#4a83c7','bottle'],['Salted butter','4 lb',13.99,'#e0b64f'],['Cage-free eggs','24 count',7.99,'#a9ab8f']],
 wine:[['Red grape wine','750 mL',10.99,'#773d53','bottle'],['Sparkling wine','750 mL',12.99,'#c5a35d','bottle']],
 appliances:[['Countertop air fryer','8 qt',69.99,'#424d59'],['Stand mixer','5 qt',229.99,'#b94b49'],['Robot vacuum','Wi-Fi',199.99,'#66717e']],
 food:[['Hot dog & soda','Combo',1.50,'#d54b42','tub'],['Pizza slice','Cheese',1.99,'#df9d42','tub'],['Berry sundae','12 oz',2.49,'#bf6b9b','tub']]
};
export const catalog=Object.entries(groups).flatMap(([category,items])=>items.map(([name,size,price,color,shape='box'],i)=>({id:category+'-'+(i+1),category,name,size,price,color,shape,stock:[96,48,14,0,72,33][(i+category.length)%6]})));
export const byCategory=Object.fromEntries(Object.keys(groups).map(k=>[k,catalog.filter(p=>p.category===k)]));
export const byId=Object.fromEntries(catalog.map(p=>[p.id,p]));
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
export const stockState=n=>n===0?'empty':n<20?'low':n<60?'partial':'full';
export function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export const archive=['Moon cheese · 1998','Gigantic fax machine','Space-age cereal','Retro cassette bundle','Winter 2004 blanket','Emergency disco kit','Mystery warehouse carton','Summer inflatable 2009','Bulk cloud storage','Mega pancake tower'];
// Shared fixture planner. All physical fixtures are inset from department boundaries;
// aisles between parallel rows are at least 2.7 m.
export function planFixtures(){
 const out=[];
 for(const q of zones){
  if(q.kind==='service'){out.push({...q,x:q.x+.15,z:q.z+.15,w:q.w-.3,d:q.d-.3,type:'service',zone:q});continue;}
  const narrow=Math.min(q.w,q.d)<3.5;
  if(q.kind==='checkout'||q.kind==='counter'){
   const alongX=q.w>=q.d; const length=alongX?q.w:q.d;
   const count=q.kind==='checkout'?Math.max(1,Math.floor(length/3.2)):Math.max(1,Math.floor(length/(q.category==='food'?3:4.5)));
   for(let i=0;i<count;i++){let l=length/count;out.push({zone:q,type:q.kind,x:alongX?q.x+i*l+.22:q.x+.2,z:alongX?q.z+.2:q.z+i*l+.22,w:alongX?l-.44:Math.min(2,q.w-.4),d:alongX?Math.min(2,q.d-.4):l-.44,index:i});}continue;
  }
  const alongX=q.w>=q.d;
  const length=alongX?q.w:q.d, cross=alongX?q.d:q.w;
  const depth=narrow?Math.min(1.15,cross-.2):q.kind==='display'?2.4:2.15;
  const rows=Math.max(1,Math.floor((cross+2.7-0.8)/(depth+2.7)));
  const usable=length-0.7;const count=Math.max(1,Math.floor(usable/(q.kind==='display'?4.3:3.5)));
  const bay=usable/count;
  for(let r=0;r<rows;r++)for(let i=0;i<count;i++){
   const a=.35+i*bay,b=(cross-(rows*depth+(rows-1)*2.7))/2+r*(depth+2.7);
   out.push({zone:q,type:q.kind,x:q.x+(alongX?a:b),z:q.z+(alongX?b:a),w:alongX?bay-.12:depth,d:alongX?depth:bay-.12,alongX,index:r*count+i,narrow});
  }
 }
 return out;
}
