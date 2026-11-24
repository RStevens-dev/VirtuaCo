// Grid routing, analog input and spatial audio; independent of the renderer.
export function routeGrid(start,end,width,depth,blocked,step=.8){
 const nx=Math.ceil(width/step),nz=Math.ceil(depth/step),key=(x,z)=>z*nx+x,cell=p=>[Math.max(0,Math.min(nx-1,Math.floor(p.x/step))),Math.max(0,Math.min(nz-1,Math.floor(p.z/step)))],point=(x,z)=>({x:(x+.5)*step,z:(z+.5)*step});
 const [sx,sz]=cell(start),[ex,ez]=cell(end),goal=key(ex,ez),first=key(sx,sz),queue=[[sx,sz]],parents=new Map([[first,-1]]);
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i],k=key(x,z);if(k===goal){let result=[];for(let n=k;n!==-1;n=parents.get(n))result.push(point(n%nx,Math.floor(n/nx)));return result.reverse().slice(1);}
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){let a=x+dx,b=z+dz,n=key(a,b),p=point(a,b);if(a<0||b<0||a>=nx||b>=nz||parents.has(n)||blocked(p.x,p.z))continue;parents.set(n,k);queue.push([a,b]);}}
 return [];
}
export function analog(dx,dy,radius=42){let n=Math.hypot(dx,dy),scale=n>radius?radius/n:1;return {x:dx*scale/radius,y:dy*scale/radius};}
export function orderStops(start,stops){let p=start,remaining=[...stops],ordered=[];while(remaining.length){remaining.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));p=remaining.shift();ordered.push(p);}return ordered;}
export function ambientAudio(){let ctx,osc,gain;return {toggle(){if(ctx){ctx.close();ctx=null;return false;}const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return false;ctx=new AC();osc=ctx.createOscillator();gain=ctx.createGain();osc.type='sine';osc.frequency.value=58;gain.gain.value=.018;osc.connect(gain).connect(ctx.destination);osc.start();return true;},update(cold){if(ctx){osc.frequency.setTargetAtTime(cold?62:54,ctx.currentTime,.3);gain.gain.setTargetAtTime(cold?.035:.012,ctx.currentTime,.5);}}};}
