"""Offline image quality review and conservative edge-connected background isolation.
Never invent side artwork; keep the original source archive unchanged."""
import hashlib,io,json,pathlib,math
from collections import deque
from PIL import Image,ImageFilter,ImageStat
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'assets'/'retail-source'
OUT=ROOT/'assets'/'retail-refined'
SIDE=2048;CELL=256
def process(im):
    im=im.convert('RGB')
    # Inspect at bounded resolution, then map conservative crop back to source.
    probe=im.copy();probe.thumbnail((256,256))
    w,h=probe.size;px=list(probe.getdata())
    corners=[px[0],px[w-1],px[(h-1)*w],px[-1]]
    bg=tuple(sorted(c[k] for c in corners)[1] for k in range(3))
    uniform=max(max(abs(c[k]-bg[k]) for k in range(3)) for c in corners)<=22
    mask=bytearray(w*h);q=deque()
    if uniform and min(bg)>=190:
        def add(i):
            if not mask[i] and max(abs(px[i][k]-bg[k]) for k in range(3))<=24:
                mask[i]=1;q.append(i)
        for x in range(w):add(x);add((h-1)*w+x)
        for y in range(h):add(y*w);add(y*w+w-1)
        while q:
            i=q.popleft();x=i%w;y=i//w
            if x:add(i-1)
            if x+1<w:add(i+1)
            if y:add(i-w)
            if y+1<h:add(i+w)
    ratio=sum(mask)/(w*h)
    action='unchanged_review_required'
    if .05<=ratio<=.65:
        alpha=Image.frombytes('L',(w,h),bytes(0 if x else 255 for x in mask))
        box=alpha.getbbox()
        if box and (box[2]-box[0])>=w*.3 and (box[3]-box[1])>=h*.3:
            crop=(math.floor(box[0]*im.width/w),math.floor(box[1]*im.height/h),math.ceil(box[2]*im.width/w),math.ceil(box[3]*im.height/h))
            im=im.crop(crop);action='conservative_border_crop'
    # Retain opaque artwork: segmentation confidence is not sufficient for alpha cutouts.
    edges=probe.convert('L').filter(ImageFilter.FIND_EDGES)
    sharpness=round(ImageStat.Stat(edges.crop((1,1,w-1,h-1))).stddev[0],2) if min(w,h)>3 else 0
    colors=[c for c in px if max(c)-min(c)>18 and 25<sum(c)/3<235]
    if not colors:colors=px
    palette=tuple(round(sum(c[k] for c in colors)/len(colors)) for k in range(3))
    im.thumbnail((CELL-8,CELL-8),Image.Resampling.LANCZOS)
    return im,{'processing':action,'backgroundFraction':round(ratio,3),'sharpnessProxy':sharpness,'color':'#%02x%02x%02x'%palette,'manualReviewRequired':True}
def main():
    source=json.loads((SRC/'index.json').read_text())
    entries={};pages=[];errors=[]
    for upc,e in sorted(source['entries'].items()):
        if e.get('status')!='acquired':continue
        try:
            raw=(SRC/e['file']).read_bytes()
            if hashlib.sha256(raw).hexdigest()[:24]+'.webp'!=e['file']:raise ValueError('Source hash mismatch')
            with Image.open(io.BytesIO(raw)) as im:art,quality=process(im)
            i=len(entries);page=i//64;tile=i%64
            if page==len(pages):pages.append(Image.new('RGB',(SIDE,SIDE),'#faf9f3'))
            x=tile%8*CELL+4;y=tile//8*CELL+4
            pages[page].paste(art,(x,y))
            entries['upc-'+upc]={'page':page,'x':x,'y':y,'w':art.width,'h':art.height,'source':e['source'],'image':e['image'],'catalogImage':e['catalogImage'],'license':e['license'],'originalSHA256':e['originalSHA256'],**quality}
        except Exception as ex:errors.append({'upc':upc,'error':str(ex)[:200]})
    if len(entries)<source['summary']['acquired']*.95:raise SystemExit('Insufficient refined coverage')
    OUT.mkdir(parents=True,exist_ok=True);files=[]
    for im in pages:
        buf=io.BytesIO();im.save(buf,format='WEBP',quality=88,method=5);data=buf.getvalue();name=hashlib.sha256(data).hexdigest()[:20]+'.webp'
        (OUT/name).write_bytes(data);files.append({'url':'./assets/retail-refined/'+name,'bytes':len(data)})
    total=sum(f['bytes'] for f in files)
    if total>15_000_000:raise SystemExit('Refined atlas download budget exceeded')
    summary={'processed':len(entries),'cropped':sum(e['processing']=='conservative_border_crop' for e in entries.values()),'reviewRequired':len(entries),'pages':len(files),'bytes':total,'decodedBytesPerPage':SIDE*SIDE*4,'errors':len(errors)}
    (OUT/'index.json').write_text(json.dumps({'version':1,'width':SIDE,'height':SIDE,'cell':CELL,'pages':files,'entries':entries,'summary':summary,'errors':errors,'attribution':'Open Food Facts contributors; CC BY-SA 3.0; resized and conservatively cropped photographs'},indent=2))
    print(json.dumps(summary),flush=True)
if __name__=='__main__':main()
