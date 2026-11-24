"""Find ABO asset candidates, never approve an approximate identity automatically."""
import gzip,io,json,pathlib,re,tarfile,urllib.request,unicodedata
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE='https://amazon-berkeley-objects.s3.amazonaws.com/'
def norm(s):return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKC',str(s)).lower()).strip()
def vals(v):
    if isinstance(v,list):return [str(x.get('value','')) if isinstance(x,dict) else str(x) for x in v]
    return [str(v)] if v else []
def main():
    products=[]
    for file in (ROOT/'data').glob('*.json'):
        if file.name not in ('open-food-facts.json','orlando-listings.json','costco-official.json','costco-products.json'):continue
        products.extend(json.loads(file.read_text()).get('products',[]))
    brands={};codes={}
    for p in products:
        if p.get('brand'):brands.setdefault(norm(p['brand']),[]).append(p)
        for key in ('upc','gtin','modelNumber','model_number','model'):
            v=p.get(key)
            if isinstance(v,str) and len(norm(v))>=5:codes.setdefault(norm(v),[]).append(p)
    candidates=[];scanned=0;brand_hits=0
    req=urllib.request.Request(BASE+'archives/abo-listings.tar',headers={'User-Agent':'VirtuaCo/1.0'})
    with urllib.request.urlopen(req,timeout=120) as res,tarfile.open(fileobj=res,mode='r|*') as archive:
        for member in archive:
            if not member.isfile() or not re.fullmatch(r'listings_\d+\.json\.gz',pathlib.PurePosixPath(member.name).name):continue
            with gzip.GzipFile(fileobj=archive.extractfile(member)) as stream:
                for line in stream:
                    row=json.loads(line);scanned+=1
                    brand=vals(row.get('brand'));names=vals(row.get('item_name'))
                    models=vals(row.get('model_number'))
                    ids=vals(row.get('external_product_id'))+vals(row.get('upc'))+vals(row.get('ean'))+models
                    possible={}
                    for value in ids:
                        for p in codes.get(norm(value),[]):possible[p.get('upc') or p.get('regionalId') or p['name']]=(p,'identifier_candidate')
                    for value in brand:
                        for p in brands.get(norm(value),[]):
                            if any(norm(p['name'])==norm(n) for n in names):possible.setdefault(p.get('upc') or p.get('regionalId') or p['name'],(p,'exact_title_brand_review'))
                        if norm(value) in brands:brand_hits+=1
                    for key,(p,reason) in possible.items():
                        candidates.append({'retailId':key,'retailName':p['name'],'retailSource':p.get('source'),'itemId':row.get('item_id'),'brand':brand,'titles':names,'models':models,'imageId':row.get('main_image_id'),'otherImages':row.get('other_image_id',[]),'model3dId':row.get('3dmodel_id'),'spinId':row.get('spin_id'),'reason':reason,'approved':False})
    if scanned<140000:raise SystemExit(f'Incomplete metadata scan: {scanned}')
    result={'version':1,'source':BASE+'index.html','license':'CC-BY-4.0','summary':{'scanned':scanned,'retailRecords':len(products),'brandHits':brand_hits,'candidates':len(candidates),'approved':0},'candidates':candidates}
    (ROOT/'data'/'abo-candidates.json').write_text(json.dumps(result,indent=2));print(json.dumps(result['summary']))
if __name__=='__main__':main()
