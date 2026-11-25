"""Acquire nonfood and Commons review candidates without approving their use."""
import json,pathlib,re,urllib.request,urllib.parse,hashlib,io,time
from PIL import Image,ImageOps
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'assets'/'external-review'
Image.MAX_IMAGE_PIXELS=40_000_000
def fetch(url,hosts):
    u=urllib.parse.urlsplit(url)
    if u.scheme!='https' or u.hostname not in hosts:raise ValueError('Source host rejected')
    req=urllib.request.Request(url,headers={'User-Agent':'VirtuaCo/1.0 (https://github.com/RStevens-dev/VirtuaCo)'})
    with urllib.request.urlopen(req,timeout=30) as res:
        if urllib.parse.urlsplit(res.geturl()).hostname not in hosts:raise ValueError('Redirect host rejected')
        raw=res.read(20_000_001)
    if len(raw)>20_000_000:raise ValueError('Too large')
    with Image.open(io.BytesIO(raw)) as src:im=ImageOps.exif_transpose(src).convert('RGB')
    dims=list(im.size);im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
    buf=io.BytesIO();im.save(buf,format='WEBP',quality=88);data=buf.getvalue()
    name=hashlib.sha256(data).hexdigest()[:24]+'.webp';(OUT/name).write_bytes(data)
    return {'status':'acquired','file':name,'dimensions':dims,'storedDimensions':list(im.size),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(data)}
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    records=[]
    for p in json.loads((ROOT/'data/nonfood-candidates.json').read_text())['products']:
        if not p.get('image') or p.get('imageLicense')!='CC-BY-SA-3.0':continue
        records.append({**p,'kind':'nonfood','url':p['image'].removesuffix('400.jpg')+'full.jpg','hosts':['images.openproductsfacts.org','images.openbeautyfacts.org','images.openfoodfacts.org']})
    for p in json.loads((ROOT/'data/commons-candidates.json').read_text())['entries']:
        if not p.get('licenseCandidate') or not p.get('image') or not re.search(r'\.(jpg|jpeg|png|webp)$',p['title'],re.I):continue
        records.append({**p,'kind':'commons','url':p['image'],'hosts':['upload.wikimedia.org']})
    entries=[]
    for p in records:
        try:e=fetch(p['url'],p['hosts'])
        except Exception as exc:e={'status':'failed','error':str(exc)[:200]}
        entries.append({**p,**e,'approved':False})
        time.sleep(2)
    summary={'attempted':len(records),'acquired':sum(e['status']=='acquired' for e in entries),'approved':0}
    (OUT/'index.json').write_text(json.dumps({'version':1,'summary':summary,'entries':entries},indent=2));print(json.dumps(summary))
if __name__=='__main__':main()
