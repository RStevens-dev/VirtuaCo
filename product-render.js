// Pure geometry rules shared by both near and distant product representations.
export function fitProduct(pixelW,pixelH,maxW,maxH){
 const scale=Math.min(maxW/Math.max(1,pixelW),maxH/Math.max(1,pixelH)),w=pixelW*scale,h=pixelH*scale;
 return {w,h,d:Math.min(.24,Math.max(.045,Math.min(w,h)*.36))};
}
export function shelfFace(alongX,face){const side=face==='left'?-1:1;return alongX?{nx:0,nz:side,rot:side===1?0:Math.PI}:{nx:side,nz:0,rot:side*Math.PI/2};}
export function productFacings(width,itemWidth){const n=Math.max(1,Math.min(3,Math.floor((width+.001)/itemWidth)));const pitch=Math.min(itemWidth*1.06,(width-itemWidth)/Math.max(1,n-1));return Array.from({length:n},(_,i)=>(i-(n-1)/2)*pitch);}
export function atlasCell(index){const cell=96,cols=20,capacity=400,tile=index%capacity;return {page:Math.floor(index/capacity),x:(tile%cols)*cell+2,y:Math.floor(tile/cols)*cell+2,size:cell-4};}

export function packageType(p){
 const n=(p.name||'').toLowerCase(),s=(p.size||'').toLowerCase();
 if(/paper towels|toilet paper|bath tissue/.test(n))return 'bale';
 if(/sauvignon|chardonnay|cabernet|pinot|merlot|prosecco|wine|vodka|whiskey|whisky|tequila|bourbon|sangria|champagne/.test(n))return 'wine';
 if(/ahi tuna.*poke|spicy poke|roller tray|clamshell|deli tray|muffin|croissant|pie|sliced.*(turkey|ham)|chicken wings|ground.*beef|cheese.*pack/.test(n))return 'tray';
 if(/water|agua|soda|sparkling|energy drink/.test(n)&&/\b(?:[2-9]\d)\s*(?:x|×|pack|count|pk)/.test(s+' '+n))return 'case';
 if(/honey roasted.*nuts|macadamia nuts|pretzel|peanut butter|almond butter|spread|jam|jelly|pickles|mayonnaise|gummies/.test(n))return 'jar';
 if(/lowfat milk|whole milk|reduced fat milk/.test(n)&&!/powder|dry|chocolate/.test(n))return 'jug';
 if(/milk|orange juice|almond beverage|oat beverage|broth/.test(n))return 'carton';
 if(/olive oil|avocado oil|honey|water|agua|juice|vinegar|syrup|shampoo|detergent|sauce/.test(n))return 'bottle';
 if(/tuna|canned|sardines|canned beans/.test(n))return 'can';
 if(/yogurt|ice cream|cream cheese|hummus|protein powder/.test(n))return 'tub';
 if(/breaded chicken.*chunks|whey protein|nuts|almonds|cashews|chips|seeds|rice|flour|coffee|granola|frozen|chocolate chips|trail mix|popcorn/.test(n))return 'bag';
 return 'box';
}
export function merchDepartment(p){
 const n=(p.name||'').toLowerCase(),c=p.category;
 if(/paper towels|toilet paper|bath tissue/.test(n))return 'paper';
 if(/purified water|bottled water|agua purificada/.test(n))return 'water';
 if(/sauvignon|chardonnay|cabernet|pinot|merlot|prosecco|wine|vodka|whiskey|whisky|tequila|bourbon|sangria|champagne|orange juice|sparkling|soda/.test(n))return 'drinks';
 if(/olive oil|avocado oil|honey|spread|jam|rice|flour|vinegar/.test(n))return 'pantry';
 if(/muffin|croissant|pecan pie|bread|bagel|cake/.test(n))return 'bakery';
 if(/ahi tuna.*poke|spicy poke|breaded chicken.*chunks|roller tray|sliced.*(turkey|ham)|ground.*beef|chicken wings|salmon/.test(n))return 'meat';
 if(/whey protein|protein powder/.test(n))return 'health';
 if(/nuts|almonds|cashews|pretzel|chips|chocolate|popcorn|trail mix/.test(n))return 'snacks';
 if(/milk|butter|cheese|yogurt/.test(n))return 'dairy';
 if(/gummies|vitamin|supplement/.test(n))return 'health';
 if(/blender|blending system|air fryer|microwave/.test(n))return 'appliances';
 return ({beverages:'drinks',household:'clean',produce:'produce'})[c]||c||'misc';
}
export function assignMerchandise(products,fixtures){
 const output=new Map(),byDept=new Map();
 for(const f of fixtures){const c=f.zone.category;if(!byDept.has(c))byDept.set(c,[]);byDept.get(c).push(f);}
 const score=p=>Number(!!p.regionalListing)*8+Number(!!p.model)*4+Number(!!p.image)*2;
 for(const p of [...products].filter(p=>p.model||p.image||p.regionalListing).sort((a,b)=>score(b)-score(a))){
  const dept=merchDepartment(p),pool=(byDept.get(dept)||[]).filter(f=>(output.get(f)?.length||0)<3);
  if(!pool.length)continue;const f=pool.reduce((a,b)=>(output.get(a)?.length||0)<=(output.get(b)?.length||0)?a:b);
  if(!output.has(f))output.set(f,[]);output.get(f).push(p);
 }
 return output;
}
const dimensions={jug:[.26,.32,.22],wine:[.14,.43,.14],bottle:[.18,.37,.18],jar:[.24,.29,.24],tray:[.38,.16,.29],case:[.49,.27,.36],bale:[.54,.43,.36],box:[.36,.48,.24],bag:[.29,.41,.17],can:[.14,.19,.14],tub:[.25,.18,.25],carton:[.19,.32,.19]};
export function packageLayout(type,width,depth,hero=false){
 const [a,b,c]=dimensions[type]||dimensions.box,scale=Math.min(1.4,width/a,depth/c);
 const w=a*scale,h=b*scale,d=c*scale,n=Math.max(1,Math.min(hero?4:3,Math.floor((width+.00001)/(w*1.05))));
 const pitch=Math.min(w*1.05,(width-w)/Math.max(1,n-1));
 return {w,h,d,offsets:Array.from({length:n},(_,i)=>(i-(n-1)/2)*pitch)};
}
