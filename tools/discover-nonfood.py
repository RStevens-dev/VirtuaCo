"""Discover US Kirkland non-food products, with provenance; do not change live catalogue."""
import json,pathlib,re,time,urllib.request,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[1]
def valid(code):
    return bool(re.fullmatch(r'\d{8}|\d{12,14}',code)) and sum(int(c)*(3 if i%2 else 1) for i,c in enumerate(code[::-1]))%10==0
def category(n,default):
    n=n.lower()
    for pattern,cat in [(r'diaper|napp|baby|wipes','baby'),(r'toilet paper|bath tissue|paper towel|facial tissue','paper'),(r'detergent|laundry|dishwash|cleaner|bleach|disinfect','clean'),(r'pet|dog|cat litter','pet'),(r'shampoo|conditioner|soap|toothpaste|mouthwash|razor|lotion|skin|deodorant','health'),(r'foil|wrap|storage|tableware|cup|plate','home')]:
        if re.search(pattern,n):return cat
    return default
def search(domain,default):
    products={};page=1;count=None
    while count is None or (page-1)*100<count:
        q=urllib.parse.urlencode({'action':'process','json':1,'page_size':100,'page':page,'tagtype_0':'brands','tag_contains_0':'contains','tag_0':'kirkland-signature','tagtype_1':'countries','tag_contains_1':'contains','tag_1':'united-states','fields':'code,product_name,brands,quantity,countries_tags,image_front_url,stores'})
        req=urllib.request.Request('https://'+domain+'/cgi/search.pl?'+q,headers={'User-Agent':'VirtuaCo/1.0 (https://github.com/RStevens-dev/VirtuaCo)'})
        with urllib.request.urlopen(req,timeout=60) as res:d=json.load(res)
        count=int(d['count'])
        rows=d['products']
        if not rows and (page-1)*100<count:raise ValueError('Incomplete search page')
        for p in rows:
            code=str(p.get('code',''));name=(p.get('product_name') or '').strip();brand=p.get('brands') or ''
            if not valid(code) or not name or 'kirkland' not in brand.lower() or 'en:united-states' not in p.get('countries_tags',[]):continue
            image=p.get('image_front_url') or None
            if image:
                u=urllib.parse.urlparse(image)
                if u.scheme!='https' or u.hostname not in ('images.openfoodfacts.org','images.openbeautyfacts.org','images.openproductsfacts.org') or not u.path.startswith('/images/products/'):image=None
                elif ''.join(u.path.split('/')[3:-1])!=code:image=None
            products[code]={'upc':code,'name':name,'brand':brand,'size':p.get('quantity'),'category':category(name,default),'source':'https://'+domain+'/product/'+code,'sourceLicense':'ODbL-1.0','image':image,'imageLicense':'CC-BY-SA-3.0' if image else None,'storesReported':p.get('stores'),'scope':'US product identity; local availability unverified'}
        page+=1;time.sleep(7)
    return list(products.values())
def main():
    results={};products={}
    for domain,default in [('world.openproductsfacts.org','misc'),('world.openbeautyfacts.org','health')]:
        try:
            rows=search(domain,default);results[domain]={'status':'ok','records':len(rows),'withImages':sum(bool(x['image']) for x in rows)}
            for row in rows:products.setdefault(row['upc'],row)
        except Exception as e:results[domain]={'status':'failed','error':str(e)[:300]}
    out={'version':1,'sources':results,'summary':{'records':len(products),'withImages':sum(bool(x['image']) for x in products.values())},'products':list(products.values())}
    (ROOT/'data'/'nonfood-candidates.json').write_text(json.dumps(out,indent=2));print(json.dumps(out['summary']),json.dumps(results))
    if not any(r['status']=='ok' for r in results.values()):raise SystemExit('Both sources failed')
if __name__=='__main__':main()
