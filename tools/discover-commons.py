"""Inventory Wikimedia Commons product photographs and their individual licensing evidence."""
import json,pathlib,urllib.parse,urllib.request,re,time
ROOT=pathlib.Path(__file__).resolve().parents[1]
API='https://commons.wikimedia.org/w/api.php'
def request(params):
    url=API+'?'+urllib.parse.urlencode(params)
    req=urllib.request.Request(url,headers={'User-Agent':'VirtuaCo/1.0 (https://github.com/RStevens-dev/VirtuaCo)'})
    with urllib.request.urlopen(req,timeout=45) as res:return json.load(res)
def main():
    entries=[];continuation={}
    while True:
        data=request({'action':'query','format':'json','generator':'categorymembers','gcmtitle':'Category:Kirkland Signature products','gcmtype':'file','gcmlimit':50,'prop':'imageinfo','iiprop':'url|size|extmetadata|sha1','iiextmetadatafilter':'LicenseShortName|LicenseUrl|Artist|Credit|AttributionRequired|Restrictions|ImageDescription|DateTimeOriginal',**continuation})
        if 'error' in data:raise ValueError(data['error'])
        for p in data.get('query',{}).get('pages',{}).values():
            info=(p.get('imageinfo') or [{}])[0]
            meta={k:v.get('value') for k,v in info.get('extmetadata',{}).items()}
            license_url=meta.get('LicenseUrl') or ''
            license_ok=bool(re.fullmatch(r'https?://creativecommons\.org/(?:licenses/(?:by|by-sa)/[0-9.]+|publicdomain/zero/1\.0)/?',license_url))
            entries.append({'title':p['title'],'pageId':p['pageid'],'source':info.get('descriptionurl'),'image':info.get('url'),'width':info.get('width'),'height':info.get('height'),'sha1':info.get('sha1'),'metadata':meta,'licenseCandidate':license_ok,'approved':False,'reviewRequired':['exact product identity and pack size','packaging revision','third-party artwork rights','author and attribution','image suitability']})
        continuation=data.get('continue')
        if not continuation:break
        time.sleep(2)
    result={'version':1,'summary':{'files':len(entries),'licenseCandidates':sum(e['licenseCandidate'] for e in entries),'approved':0},'entries':entries}
    (ROOT/'data'/'commons-candidates.json').write_text(json.dumps(result,indent=2));print(json.dumps(result['summary']))
    if not entries:raise SystemExit('No Commons files found')
if __name__=='__main__':main()
