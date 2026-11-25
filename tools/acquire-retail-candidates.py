"""Acquire candidate images into a review-only library; no live catalogue changes."""
import concurrent.futures,hashlib,io,json,pathlib,re,time,urllib.request,urllib.error
from PIL import Image,ImageOps,ImageFilter,ImageStat
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'retail-candidates'
Image.MAX_IMAGE_PIXELS=40_000_000
def get(task):
    key,entry=task
    try:
        req=urllib.request.Request(entry['url'],headers={'User-Agent':'VirtuaCo/1.0 (https://github.com/RStevens-dev/VirtuaCo)'})
        with urllib.request.urlopen(req,timeout=25) as res:
            if res.geturl()!=entry['url']:raise ValueError('Unexpected redirect')
            raw=res.read(20_000_001)
        if len(raw)>20_000_000:raise ValueError('Image exceeds size limit')
        with Image.open(io.BytesIO(raw)) as src:im=ImageOps.exif_transpose(src).convert('RGB')
        original=list(im.size)
        im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
        probe=im.copy();probe.thumbnail((256,256))
        sharp=round(ImageStat.Stat(probe.convert('L').filter(ImageFilter.FIND_EDGES)).stddev[0],2)
        buf=io.BytesIO();im.save(buf,format='WEBP',quality=88,method=3)
        data=buf.getvalue();filename=hashlib.sha256(data).hexdigest()[:24]+'.webp'
        return key,{**entry,'status':'acquired','file':filename,'bytes':len(data),'dimensions':original,'storedDimensions':list(im.size),'sha256':hashlib.sha256(raw).hexdigest(),'sharpnessProxy':sharp,'approved':False},data
    except Exception as exc:return key,{**entry,'status':'failed','error':str(exc)[:200]},None
def main():
    src=json.loads((ROOT/'data/retail-image-candidates.json').read_text())
    OUT.mkdir(parents=True,exist_ok=True)
    existing=json.loads((OUT/'index.json').read_text()).get('entries',{}) if (OUT/'index.json').exists() else {}
    tasks={}
    for upc,e in src['entries'].items():
        if e.get('status')!='ok' or e.get('license')!='CC-BY-SA-3.0':continue
        for im in e['images']:
            url=im['url'];m=re.fullmatch(r'https://images\.openfoodfacts\.org/images/products/([0-9/]+)/(\d+|(?:front|nutrition|ingredients|packaging)(?:_[a-z]{2})?\.\d+\.full)\.jpg',url)
            if not m or m[1].replace('/','').lstrip('0')!=upc.lstrip('0'):continue
            tasks[upc+':'+im['id']]={**im,'upc':upc,'source':e['source'],'license':e['license']}
    entries={};pending=[];total=0;files=set()
    for key,e in tasks.items():
        old=existing.get(key,{})
        filename=old.get('file','')
        if old.get('status')=='acquired' and old.get('url')==e['url'] and re.fullmatch('[a-f0-9]{24}\\.webp',filename) and (OUT/filename).is_file() and hashlib.sha256((OUT/filename).read_bytes()).hexdigest()[:24]+'.webp'==filename:
            entries[key]=old
            if filename not in files:total+=old['bytes'];files.add(filename)
        else:pending.append((key,e))
    pending.sort(key=lambda t:(t[1]['role']!='front',t[1]['upc'],t[0]))
    # Small bounded groups permit saving partial progress and stopping on throttling.
    start=time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for offset in range(0,len(pending),12):
            if time.monotonic()-start>2400:break
            throttle=False
            for key,e,data in pool.map(get,pending[offset:offset+12]):
                if data:
                    if e['file'] not in files and total+len(data)>250_000_000:
                        entries[key]={**tasks[key],'status':'budget_exceeded'};continue
                    if e['file'] not in files:
                        (OUT/e['file']).write_bytes(data);files.add(e['file']);total+=len(data)
                if '429' in e.get('error',''):throttle=True
                entries[key]=e
            if throttle:break
            time.sleep(2)
    good=[e for e in entries.values() if e.get('status')=='acquired']
    summary={'candidates':len(tasks),'acquired':len(good),'uniqueFiles':len(files),'failed':sum(e.get('status')=='failed' for e in entries.values()),'remaining':len(tasks)-len(good),'bytes':total,'approved':0}
    (OUT/'index.json').write_text(json.dumps({'version':1,'summary':summary,'entries':entries},indent=2))
    print(json.dumps(summary),flush=True)
if __name__=='__main__':main()
