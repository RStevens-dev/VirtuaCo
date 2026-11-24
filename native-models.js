// Original, self-contained merchandise geometry. No network assets required.
// Coordinates are normalized to a unit product footprint; y starts at its base.
export const nativeIds=new Set(['season-3','season-2','season-4','season-5','season-1','home-1','home-2','home-4','home-5','appliances-1','appliances-2','appliances-3','electronics-2','electronics-3','electronics-4','produce-1','produce-2','produce-3','produce-4','bakery-1','bakery-2','bakery-3','fresh-1','fresh-2','fresh-3','fresh-4','food-1','food-2','food-3','clothing-1','clothing-2','clothing-3','misc-1','misc-2','dairy-3']);
export function sculpt(p,emit){
 const E=(x,y,z,w,h,d,c,rz=0,rx=0)=>emit('sphere',x,y,z,w,h,d,c,rz,rx);
 const B=(x,y,z,w,h,d,c,rz=0,rx=0)=>emit('box',x,y,z,w,h,d,c,rz,rx);
 const C=(x,y,z,w,h,d,c,rz=0,rx=0)=>emit('cylinder',x,y,z,w,h,d,c,rz,rx);
 const R=(x,y,z,w,h,d,c,rz=0,rx=0)=>emit('torus',x,y,z,w,h,d,c,rz,rx);
 const dark='#25272a', steel='#aeb6b8', cream='#eee0c8', red='#b63831';
 switch(p.id){
 case 'season-3': // seated teddy bear: ears, paws, muzzle, eyes and ribbon
 E(0,.37,0,.68,.65,.57,'#b78a59');E(0,.74,.025,.65,.53,.57,'#c49a69');
 for(const s of [-1,1]){E(s*.25,.93,0,.23,.22,.18,'#b78a59');E(s*.25,.93,.075,.13,.13,.045,'#e2bd91');E(s*.34,.43,.02,.23,.46,.24,'#bd905f',s*.44);E(s*.24,.15,.19,.32,.27,.37,'#be925f');E(s*.24,.16,.35,.20,.17,.035,'#e6c59e');E(s*.125,.79,.279,.049,.055,.038,'#211914');}
 E(0,.66,.27,.32,.22,.19,'#e9c8a1');E(0,.71,.363,.10,.065,.06,'#39251d');B(0,.645,.367,.015,.065,.014,'#39251d');E(-.11,.47,.29,.23,.14,.08,red,.35);E(.11,.47,.29,.23,.14,.08,red,-.35);E(0,.47,.34,.10,.10,.08,'#912921');return true;
 case 'season-2':
 E(0,.38,0,.53,.65,.58,'#75a850');E(0,.73,.15,.46,.48,.46,'#83bc55');E(0,.64,.32,.38,.23,.35,'#a4ca75');E(0,.35,-.33,.22,.22,.55,'#75a850',0,-.28);for(const s of [-1,1]){E(s*.19,.11,.09,.23,.22,.31,'#75a850');E(s*.31,.51,.19,.14,.26,.16,'#75a850',s*.5);E(s*.13,.81,.35,.05,.06,.04,dark);}for(let i=0;i<4;i++)E(0,.51+i*.10,-.24,.10,.18,.12,'#e2c153');return true;
 case 'season-4':
 B(0,.40,0,.72,.80,.60,'#202332');B(0,.76,.32,.61,.36,.025,'#384b83');B(0,.76,.34,.52,.28,.015,'#63b6cc');B(0,.50,.37,.70,.09,.30,'#a44b78',0,-.2);C(-.18,.58,.40,.07,.10,.07,dark);E(-.18,.64,.40,.11,.11,.11,red);for(let i=0;i<3;i++)C(.10+i*.10,.56,.40,.06,.04,.06,['#f1cb46','#dd5744','#54b3bb'][i]);return true;
 case 'season-5':case 'misc-1':
 B(0,.10,0,.57,.13,.57,dark);C(0,.44,0,.46,.62,.46,'#e9dba5');for(const a of [-1,1])for(const b of [-1,1])B(a*.23,.44,b*.23,.055,.67,.055,dark);B(0,.79,0,.59,.12,.59,dark);R(0,.91,0,.36,.20,.09,dark);return true;
 case 'season-1':
 for(let i=0;i<6;i++){let x=(i%3-1)*.26,z=(Math.floor(i/3)-.5)*.40;C(x,.65,z,.12,.18,.12,dark);E(x,.46,z,.17,.33,.17,'#f5d686');}R(0,.75,0,.69,.23,.10,dark,0,1.57);return true;
 case 'home-1':
 C(0,.40,0,.48,.80,.48,p.color);C(0,.85,0,.36,.14,.36,steel);R(.13,.94,0,.22,.11,.09,dark);return true;
 case 'home-2':
 B(0,.35,0,.83,.67,.75,'#34383b');B(0,.71,0,.90,.09,.80,'#e4b827');for(let i=0;i<5;i++)B((i-2)*.14,.37,.38,.035,.44,.025,'#55595a');return true;
 case 'home-4':
 C(0,.26,0,.48,.52,.48,steel);for(let i=0;i<5;i++){let x=(i-2)*.11;B(x,.64,0,.055,.61,.055,'#4d5255',i*.07);E(x,.91,0,.14,.20,.075,'#83888a',i*.07);}return true;
 case 'home-5':
 for(let i=0;i<3;i++){let x=(i-1)*.25;C(x,.16,0,.14,.23,.14,steel);E(x,.49,0,.24,.46,.24,'#f7f0dc');}return true;
 case 'appliances-1':
 E(0,.46,0,.80,.91,.72,'#303337');B(0,.44,.32,.64,.44,.12,'#3f4447');B(0,.45,.43,.20,.32,.13,dark);C(0,.76,.34,.16,.07,.16,steel,0,1.57);return true;
 case 'appliances-2':
 B(0,.09,0,.79,.15,.63,p.color);B(-.26,.46,-.04,.22,.70,.30,p.color);E(0,.81,0,.78,.26,.42,p.color);C(.13,.33,.05,.55,.43,.55,steel);C(.13,.56,.05,.08,.28,.08,steel);return true;
 case 'appliances-3':
 C(0,.19,0,.91,.27,.91,'#32363b');C(0,.34,0,.87,.06,.87,'#666a6d');C(.10,.39,0,.18,.09,.18,dark);B(0,.18,.44,.22,.10,.04,'#71828a');return true;
 case 'electronics-2':
 R(0,.57,0,.73,.68,.12,dark);for(const s of [-1,1]){E(s*.32,.33,0,.22,.40,.35,'#373a40');E(s*.32,.33,.06,.17,.30,.27,'#555b60');}return true;
 case 'electronics-3':
 C(0,.43,0,.59,.86,.59,'#3b454d');C(0,.86,0,.55,.08,.55,'#737b80');for(let i=0;i<8;i++)C(0,.12+i*.086,0,.60,.018,.60,'#29333b');return true;
 case 'electronics-4':
 B(0,.09,.12,.87,.09,.68,steel);B(0,.47,-.19,.87,.73,.07,dark,0,-.16);B(0,.47,-.145,.79,.65,.025,'#4888ad',0,-.16);B(0,.14,.05,.70,.015,.32,dark);B(0,.14,.29,.27,.016,.13,'#888e91');return true;
 case 'produce-1':case 'produce-2':case 'produce-3':case 'produce-4':
 for(let i=0;i<6;i++){let x=(i%3-1)*.25,z=(Math.floor(i/3)-.5)*.38;if(p.id==='produce-1'){E(x,.29,z,.25,.49,.28,'#486338',.25);E(x,.19,z,.30,.29,.30,'#53733b');}else if(p.id==='produce-2'){E(x,.30,z,.28,.46,.30,i%2?'#a8322d':'#bd4132');B(x,.55,z,.035,.09,.035,'#59442b');}else if(p.id==='produce-3'){E(x,.25,z,.20,.42,.18,'#e5c54c',-.38);E(x+.07,.49,z,.19,.37,.18,'#efd35b',.32);}else{E(x,.20,z,.27,.20,.35,'#498445',i*.2);}}return true;
 case 'bakery-1':case 'bakery-2':case 'bakery-3':
 B(0,.035,0,.93,.07,.83,'#cfbca0');
 for(let i=0;i<6;i++){let x=(i%3-1)*.28,z=(Math.floor(i/3)-.5)*.38;
 if(p.id==='bakery-1'){E(x,.22,z,.28,.25,.32,'#c98c43');E(x-.09,.15,z,.17,.18,.23,'#d6a05b',-.45);E(x+.09,.15,z,.17,.18,.23,'#d6a05b',.45);}
 else if(p.id==='bakery-2'){C(x,.15,z,.24,.23,.24,'#a36e43');E(x,.32,z,.29,.21,.29,'#c49358');for(let k=0;k<3;k++)E(x+(k-1)*.07,.40,z,.045,.035,.045,'#51435e');}
 else{C(x,.11,z,.28,.09,.28,'#c28c53');for(let k=0;k<3;k++)E(x+(k-1)*.07,.16,z+.03,.035,.025,.035,'#62402d');}}
 return true;
 case 'fresh-1':
 B(0,.06,0,.91,.10,.70,'#272b2c');E(0,.35,0,.68,.60,.60,'#bc773b');for(const s of [-1,1]){E(s*.31,.25,.16,.22,.23,.40,'#d1914b',s*.30);E(s*.27,.42,-.12,.18,.28,.28,'#aa6331');}return true;
 case 'fresh-2':
 B(0,.05,0,.92,.08,.80,dark);for(let i=0;i<8;i++){let x=(i%4-1.5)*.21,z=(Math.floor(i/4)-.5)*.35;C(x,.19,z,.19,.24,.19,'#263b31');C(x,.32,z,.17,.025,.17,'#f4e9d6');C(x,.34,z,.08,.03,.08,i%2?'#e19770':'#79a34f');}return true;
 case 'fresh-3':case 'fresh-4':
 for(let i=0;i<3;i++){let x=(i-1)*.29;C(x,.24,0,.26,.45,.26,p.color);C(x,.48,0,.29,.035,.29,cream);}return true;
 case 'food-1':
 E(-.17,.20,0,.54,.27,.82,'#cf9959');E(-.17,.32,0,.28,.20,.76,'#9e4633');B(-.17,.43,0,.05,.025,.58,'#e3bd3e');C(.30,.39,.04,.29,.70,.29,'#f0eee6');C(.30,.75,.04,.32,.04,.32,red);B(.30,.88,.04,.035,.25,.035,red);return true;
 case 'food-2':
 // wedge approximation: overlapping rounded dough and cheese forms
 E(0,.10,0,.83,.14,.78,'#c38a4b');E(0,.17,0,.72,.08,.69,'#e6bb63');for(const [x,z] of [[-.18,-.10],[.18,.1],[0,.23]])C(x,.23,z,.13,.035,.13,'#a93c30');return true;
 case 'food-3':
 C(0,.23,0,.48,.44,.48,cream);for(let i=0;i<4;i++)E(0,.49+i*.10,0,.46-i*.085,.18,.46-i*.085,'#e8c3ca');return true;
 case 'clothing-1':case 'clothing-2':case 'clothing-3':
 for(let i=0;i<5;i++){let c=i%2?p.color:'#a5a7aa';B(0,.09+i*.12,0,.76,.11,.56,c);B(-.20,.10+i*.12,.15,.24,.10,.23,c);}return true;
 case 'misc-2':
 B(0,.32,0,.78,.62,.56,p.color);B(0,.34,.29,.65,.035,.025,dark);R(0,.71,0,.28,.12,.07,dark);return true;
 case 'dairy-3':
 B(0,.07,0,.93,.12,.69,'#b4a78e');for(let i=0;i<12;i++)E((i%4-1.5)*.21,.23,(Math.floor(i/4)-1)*.20,.17,.28,.17,i%2?'#dbccb1':'#e9dec9');return true;
 default:return false;
 }
}
