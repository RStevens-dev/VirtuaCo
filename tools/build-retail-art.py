"""Build immutable, licensed product art locally; never scrape Costco."""
import concurrent.futures, hashlib, io, json, pathlib, urllib.request
from PIL import Image, ImageChops, ImageOps, ImageStat
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'retail-art'
CELL=128; SIDE=2048; COLS=SIDE//CELL
def read(path): return json.loads((ROOT/path).read_text())
def fetch(p):
    url=p.get('image','')
    if p.get('imageLicense')!='CC-BY-SA-3.0' or not url.startswith('https://images.openfoodfacts.org/images/products/'): return None
    if p.get('source')!='https://world.openfoodfacts.org/product/'+str(p.get('upc','')): return None
    try:
        request=urllib.request.Request(url,headers={'User-Agent':'VirtuaCo/1.0 (github.com/RStevens-dev/VirtuaCo)'})
        with urllib.request.urlopen(request,timeout=20) as response: data=response.read(4_000_001)
        if len(data)>4_000_000: return None
        im=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB')
        im.thumbnail((512,512))
        # Crop only nearly uniform light borders, never erase arbitrary backgrounds.
        bg=Image.new('RGB',im.size,im.getpixel((0,0)))
        if min(bg.getpixel((0,0)))>220:
            box=ImageChops.difference(im,bg).convert('L').point(lambda v:255 if v>25 else 0).getbbox()
            if box and (box[2]-box[0])*(box[3]-box[1])>im.width*im.height*.20: im=im.crop(box)
        original=im.size
        im.thumbnail((CELL-4,CELL-4),Image.Resampling.LANCZOS)
        rgb=tuple(round(x) for x in ImageStat.Stat(im).mean)
        return p,im,original,rgb,hashlib.sha256(data).hexdigest()
    except Exception as e:
        print('Skipped',p.get('upc'),str(e),flush=True);return None
def main():
    records=read('data/open-food-facts.json')['products']
    candidates=sorted((p for p in records if p.get('image')),key=lambda p:p['upc'])
    pages=[];entries={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(fetch,candidates):
            if not result:continue
            p,im,original,rgb,sha=result
            i=len(entries);page=i//(COLS*COLS);tile=i%(COLS*COLS)
            if page==len(pages):pages.append(Image.new('RGB',(SIDE,SIDE),'#faf9f3'))
            x=tile%COLS*CELL+2;y=tile//COLS*CELL+2
            pages[page].paste(im,(x,y))
            entries['upc-'+p['upc']]={'page':page,'x':x,'y':y,'w':im.width,'h':im.height,'original':original,'color':'#%02x%02x%02x'%rgb,'source':p['source'],'image':p['image'],'license':p['imageLicense'],'sha256':sha}
    if not entries or len(entries)<len(candidates)*.7:raise SystemExit('Insufficient image coverage; preserving previous build')
    OUT.mkdir(parents=True,exist_ok=True)
    files=[]
    for page,im in enumerate(pages):
        tmp=io.BytesIO();im.save(tmp,format='WEBP',quality=86,method=6);data=tmp.getvalue();name=hashlib.sha256(data).hexdigest()[:20]+'.webp';(OUT/name).write_bytes(data);files.append({'url':'./assets/retail-art/'+name,'bytes':len(data)})
    if len(pages)*SIDE*SIDE*4>32*1024*1024:raise SystemExit('Atlas GPU budget exceeded')
    if sum(p['bytes'] for p in files)>10_000_000:raise SystemExit('Atlas download budget exceeded')
    (OUT/'index.json').write_text(json.dumps({'version':1,'width':SIDE,'height':SIDE,'pages':files,'entries':entries,'attribution':'Open Food Facts contributors; cropped photographs CC BY-SA 3.0'},separators=(',',':')))
    for file in OUT.glob('*.webp'):
        if file.name not in {p['url'].split('/')[-1] for p in files}:file.unlink()
    print('Published',len(entries),'images',len(pages),'pages',sum(p['bytes'] for p in files),'bytes')
if __name__=='__main__':main()
