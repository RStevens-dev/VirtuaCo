"""Acquire selected full-size OFF photographs, preserving provenance and existing runtime assets."""
import concurrent.futures, hashlib, io, json, pathlib, re, urllib.request
from PIL import Image, ImageOps
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'retail-source'
PATTERN=re.compile(r'https://images\.openfoodfacts\.org/images/products/([0-9/]+)/front(?:_[a-z]{2})?\.\d+\.400\.jpg')
Image.MAX_IMAGE_PIXELS=40_000_000
def acquire(p):
    url=p.get('image') or ''
    m=PATTERN.fullmatch(url)
    if not m or m[1].replace('/','').lstrip('0')!=p['upc'].lstrip('0') or p.get('imageLicense')!='CC-BY-SA-3.0':
        return p['upc'],{'status':'invalid_source'}
    full=url.removesuffix('400.jpg')+'full.jpg'
    try:
        req=urllib.request.Request(full,headers={'User-Agent':'VirtuaCo/1.0 (https://github.com/RStevens-dev/VirtuaCo)'})
        with urllib.request.urlopen(req,timeout=30) as res:
            if res.geturl()!=full: raise ValueError('Unexpected redirect')
            raw=res.read(20_000_001)
        if len(raw)>20_000_000:raise ValueError('Download exceeds 20 MB')
        with Image.open(io.BytesIO(raw)) as src:
            im=ImageOps.exif_transpose(src).convert('RGB')
        original=list(im.size)
        im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
        buf=io.BytesIO();im.save(buf,format='WEBP',quality=90,method=4)
        data=buf.getvalue();name=hashlib.sha256(data).hexdigest()[:24]+'.webp'
        return p['upc'],{'status':'acquired','source':p['source'],'image':full,'catalogImage':url,'license':p['imageLicense'],'originalDimensions':original,'storedDimensions':list(im.size),'originalSHA256':hashlib.sha256(raw).hexdigest(),'file':name,'bytes':len(data)},data
    except Exception as ex:return p['upc'],{'status':'failed','error':str(ex)[:250],'image':full}
def main():
    records=json.loads((ROOT/'data/open-food-facts.json').read_text())['products']
    candidates=sorted((p for p in records if p.get('image')),key=lambda p:p['upc'])
    OUT.mkdir(parents=True,exist_ok=True)
    previous=json.loads((OUT/'index.json').read_text()).get('entries',{}) if (OUT/'index.json').exists() else {}
    entries={};total=0
    pending=[]
    for p in candidates:
        e=previous.get(p['upc'],{})
        if e.get('status')=='acquired' and e.get('catalogImage')==p['image'] and re.fullmatch(r'[a-f0-9]{24}\.webp',e.get('file','')) and (OUT/e['file']).is_file() and hashlib.sha256((OUT/e['file']).read_bytes()).hexdigest()[:24]+'.webp'==e['file']:
            entries[p['upc']]=e;total+=e['bytes']
        else:pending.append(p)
    print('Reusing',len(entries),'verified files; retrying',len(pending),flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(acquire,pending):
            upc,entry,*payload=result
            if payload:
                if total+entry['bytes']>100_000_000:
                    entry={'status':'budget_exceeded','image':entry['image']}
                else:
                    (OUT/entry['file']).write_bytes(payload[0]);total+=entry['bytes']
            entries[upc]=entry
    good=[e for e in entries.values() if e['status']=='acquired']
    summary={'attempted':len(candidates),'acquired':len(good),'higherThan400':sum(max(e['originalDimensions'])>400 for e in good),'atLeast1024':sum(max(e['originalDimensions'])>=1024 for e in good),'bytes':total,'missingCatalogImages':len(records)-len(candidates)}
    (OUT/'index.json').write_text(json.dumps({'version':1,'summary':summary,'attribution':'Open Food Facts contributors; CC BY-SA 3.0; resized WebP derivatives','entries':entries},indent=2))
    print(json.dumps(summary),flush=True)
    if not good:raise SystemExit('No originals acquired')
if __name__=='__main__':main()
