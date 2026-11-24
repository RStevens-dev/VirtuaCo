// Pure geometry rules shared by both near and distant product representations.
export function fitProduct(pixelW,pixelH,maxW,maxH){
 const scale=Math.min(maxW/Math.max(1,pixelW),maxH/Math.max(1,pixelH)),w=pixelW*scale,h=pixelH*scale;
 return {w,h,d:Math.min(.24,Math.max(.045,Math.min(w,h)*.36))};
}
export function shelfFace(alongX,face){const side=face==='left'?-1:1;return alongX?{nx:0,nz:side,rot:side===1?0:Math.PI}:{nx:side,nz:0,rot:side*Math.PI/2};}
export function productFacings(width,itemWidth){const n=Math.max(1,Math.min(3,Math.floor((width+.001)/itemWidth)));const pitch=Math.min(itemWidth*1.06,(width-itemWidth)/Math.max(1,n-1));return Array.from({length:n},(_,i)=>(i-(n-1)/2)*pitch);}
export function atlasCell(index){const cell=96,cols=20,capacity=400,tile=index%capacity;return {page:Math.floor(index/capacity),x:(tile%cols)*cell+2,y:Math.floor(tile/cols)*cell+2,size:cell-4};}
