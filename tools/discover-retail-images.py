"""Inventory all available OFF photographs, without assuming their physical orientation."""
import json,pathlib,re,time,urllib.request,urllib.error
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

def retry_delay(header):
    try:return max(60,int(header))
    except (ValueError,TypeError):
        try:return max(60,int((parsedate_to_datetime(header)-datetime.now(timezone.utc)).total_seconds()))
        except (ValueError,TypeError,OverflowError):return 120
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'data'/'retail-image-candidates.json'
def discover(upc):
    url=f'https://world.openfoodfacts.org/api/v2/product/{upc}.json?fields=code,images'
    req=urllib.request.Request(url,headers={'User-Agent':'VirtuaCo/1.0 (https://github.com/RStevens-dev/VirtuaCo)'})
    with urllib.request.urlopen(req,timeout=20) as res: data=json.load(res)
    p=data.get('product',{})
    if str(p.get('code'))!=upc: raise ValueError('Product absent or barcode mismatch')
    padded=upc.zfill(13)
    path='/'.join([padded[:3],padded[3:6],padded[6:9],padded[9:]])
    base='https://images.openfoodfacts.org/images/products/'+path+'/'
    images=p.get('images') or {}
    raw=images.get('uploaded',images)
    selected=images.get('selected',images)
    items=[]
    for key,v in raw.items():
        if not str(key).isdigit() or not isinstance(v,dict):continue
        dim=v.get('sizes',{}).get('full',{})
        items.append({'id':key,'url':base+key+'.jpg','role':'unclassified','width':dim.get('w'),'height':dim.get('h')})
    # Legacy v2 selected keys; nested newer schema is also accepted.
    for key,v in selected.items():
        if not isinstance(v,dict):continue
        pairs=[(key,v)] if re.fullmatch(r'(front|nutrition|ingredients|packaging)(_[a-z]{2})?',key) and 'rev' in v else [(key+'_'+lang,meta) for lang,meta in v.items() if isinstance(meta,dict) and re.fullmatch('[a-z]{2}',lang) and key in ('front','nutrition','ingredients','packaging')]
        for k,meta in pairs:
            rev=str(meta.get('rev',''))
            if not rev.isdigit():continue
            dim=meta.get('sizes',{}).get('full',{})
            items.append({'id':k,'url':base+k+'.'+rev+'.full.jpg','role':k.split('_')[0],'rawId':meta.get('imgid'),'width':dim.get('w'),'height':dim.get('h')})
    return {'status':'ok','source':'https://world.openfoodfacts.org/product/'+upc,'license':'CC-BY-SA-3.0','images':items}
def main():
    products=json.loads((ROOT/'data/open-food-facts.json').read_text())['products']
    entries=json.loads(OUT.read_text()).get('entries',{}) if OUT.exists() else {}
    # Resume successful records; retry errors. Prioritize missing catalogue photos.
    started=time.monotonic(); attempts=0; throttles=0
    for p in sorted(products,key=lambda p:(bool(p.get('image')),p['upc'])):
        upc=p['upc']
        if not re.fullmatch(r'\d{8,14}',upc) or entries.get(upc,{}).get('status')=='ok':continue
        if time.monotonic()-started>2700:break
        while True:
            attempts+=1
            try:
                entries[upc]=discover(upc);throttles=0;break
            except urllib.error.HTTPError as e:
                entries[upc]={'status':'failed','error':str(e)[:180]}
                if e.code!=429:break
                throttles+=1
                delay=max(retry_delay(e.headers.get('Retry-After')),120*2**(throttles-1))
                print('Rate limited; server cooldown',delay,'seconds',flush=True)
                if throttles>=4 or time.monotonic()-started+delay>2700:break
                time.sleep(delay)
            except Exception as e:
                entries[upc]={'status':'failed','error':str(e)[:180]};break
        if throttles:break
        time.sleep(7)
    print('Requests this run:',attempts,flush=True)
    ok=[e for e in entries.values() if e['status']=='ok']
    summary={'products':len(products),'checked':len(ok),'withImages':sum(bool(e['images']) for e in ok),'candidates':sum(len(e['images']) for e in ok),'previouslyMissingWithCandidates':sum(bool(entries.get(p['upc'],{}).get('images')) for p in products if not p.get('image'))}
    OUT.write_text(json.dumps({'version':1,'summary':summary,'entries':entries},indent=2))
    print(json.dumps(summary),flush=True)
    if not ok:raise SystemExit('No successful metadata requests')
if __name__=='__main__':main()
