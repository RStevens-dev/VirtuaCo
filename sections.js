// Pure, testable spatial scheduling. A section is a 12 m grid cell.
export const CELL=12;
export function cellOf(x,z){return [Math.floor(x/CELL),Math.floor(z/CELL)];}
export function rankSlots(slots,pos,yaw,velocity={x:0,z:0},tolerance={}){
 const [cx,cz]=cellOf(pos.x,pos.z),fx=-Math.sin(yaw),fz=-Math.cos(yaw);
 const forward=Math.max(0,Math.min(132,Number(tolerance.forward??36))),side=Math.max(0,Math.min(132,Number(tolerance.side??18)));
 const speed=Math.hypot(velocity.x,velocity.z),mx=speed>.2?velocity.x/speed:fx,mz=speed>.2?velocity.z/speed:fz;
 return slots.map(slot=>{
  const [sx,sz]=cellOf(slot.x,slot.z),ring=Math.max(Math.abs(sx-cx),Math.abs(sz-cz)),dx=slot.x-pos.x,dz=slot.z-pos.z,d=Math.hypot(dx,dz);
  const view=d>.01?(dx*fx+dz*fz)/d:1,move=d>.01?(dx*mx+dz*mz)/d:1;
  const priority=d-7*Math.max(0,view)-5*Math.max(0,move);
  const along=dx*fx+dz*fz,lateral=Math.abs(dx*fz-dz*fx),motionAlong=dx*mx+dz*mz,motionSide=Math.abs(dx*mz-dz*mx);
  const rear=Math.min(8,forward),near=d<=4;
  const inView=along>=-rear&&along<=forward&&lateral<=side;
  const inMotion=speed>.2&&motionAlong>=0&&motionAlong<=forward&&motionSide<=side;
  return {slot,ring,d,view,move,priority,eligible:near||inView||inMotion};
 }).sort((a,b)=>a.priority-b.priority||a.d-b.d);
}
export function residentPlan(ranked,existing,{limit=48,byteLimit=20_000_000,keepRadius=20,bytesOf=()=>250000}={}){
 const desired=new Set();let bytes=0;
 // Retain near assets first regardless of look direction, with a hard budget.
 const retained=ranked.filter(r=>existing.has(r.slot.id)&&r.d<=keepRadius&&(r.eligible||r.d<=8)).sort((a,b)=>a.d-b.d);
 const candidates=[...retained,...ranked.filter(r=>r.eligible)];
 for(const r of candidates){const id=r.slot.id;if(desired.has(id))continue;const n=bytesOf(id);if(desired.size>=limit||bytes+n>byteLimit)continue;desired.add(id);bytes+=n;}
 return desired;
}

// Only replace residents when a fully decoded incoming asset needs space.
// Use physical distance, not gaze, and require meaningful improvement.
export function evictionPlan(resident,ranked,incomingId,incomingBytes,{limit,gpuLimit,byteLimit,bytesOf=()=>0,protectRadius=12,margin=8}){
 const incoming=ranked.find(r=>r.slot.id===incomingId);if(!incoming||incomingBytes>gpuLimit||bytesOf(incomingId)>byteLimit)return null;
 let count=resident.size,decoded=0,compressed=0;for(const [id,r] of resident){decoded+=r.bytes;compressed+=bytesOf(id);}
 const fits=()=>count+1<=limit&&decoded+incomingBytes<=gpuLimit&&compressed+bytesOf(incomingId)<=byteLimit;
 if(fits())return [];
 const victims=ranked.filter(r=>resident.has(r.slot.id)&&r.d>protectRadius&&r.d>incoming.d+margin).sort((a,b)=>b.d-a.d);
 const plan=[];for(const r of victims){const id=r.slot.id;plan.push(id);count--;decoded-=resident.get(id).bytes;compressed-=bytesOf(id);if(fits())return plan;}
 return null;
}
