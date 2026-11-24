#!/usr/bin/env python3
"""Download retail scans, validate GLB containers, and build an auditable local catalog.
Only successfully validated files enter the manifest. Uses standard library only.
"""
import argparse, concurrent.futures, hashlib, json, pathlib, re, struct, time, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE="https://huggingface.co/datasets/codepawl/scanned-objects-glb/resolve/main/"
CATEGORIES={"shoe":"clothing","clothing":"clothing","toy":"season","board game":"misc","media":"misc","bag":"misc","household":"home","kitchen":"home","electronics":"electronics","food and drink":"pantry","health and beauty":"health","bottles and cups":"home","baby gear":"baby","other":"misc"}
def fetch(url,limit=16_000_000):
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"VirtuaCo-asset-import/1.0"})
            with urllib.request.urlopen(req,timeout=45) as res:
                data=res.read(limit+1)
            if len(data)>limit:raise ValueError("asset exceeds size limit")
            return data
        except Exception:
            if attempt==2:raise
            time.sleep(2**attempt)
def validate_glb(data):
    if len(data)<20:raise ValueError("short GLB")
    magic,version,length=struct.unpack_from("<4sII",data)
    if magic!=b"glTF" or version!=2 or length!=len(data):raise ValueError("invalid GLB header")
    pos=12;doc=None;binary=False
    while pos<len(data):
        if pos+8>len(data):raise ValueError("truncated chunk")
        n,typ=struct.unpack_from("<II",data,pos);pos+=8
        if n%4 or pos+n>len(data):raise ValueError("bad chunk")
        if typ==0x4e4f534a:doc=json.loads(data[pos:pos+n])
        if typ==0x004e4942:binary=True
        pos+=n
    if not doc or not doc.get("meshes") or not binary:raise ValueError("missing geometry")
    if any(b.get("uri") for b in doc.get("buffers",[])) or any(i.get("uri") for i in doc.get("images",[])):raise ValueError("external resource in GLB")
    supported={"EXT_meshopt_compression","KHR_mesh_quantization","KHR_materials_unlit","KHR_texture_transform","KHR_materials_specular","KHR_materials_clearcoat","KHR_materials_transmission","KHR_materials_ior","KHR_materials_sheen","KHR_materials_emissive_strength","EXT_texture_webp"}
    if set(doc.get("extensionsRequired",[]))-supported:raise ValueError("unsupported required extension")
    return doc
def select(rows,limit):
    groups={}
    for r in rows:
        key=r.get("id","");file=r.get("file","");cat=r.get("category","")
        if not re.fullmatch(r"[A-Za-z0-9_.-]+",key) or file!=f"objects/{key}/{key}.glb" or r.get("license")!="CC-BY-4.0" or not r.get("name"):continue
        if not 0<r.get("pack_bytes",0)<=1_500_000:continue
        # Avoid unreviewed weapon-shaped items; keep everyday retail assortment.
        if re.search(r"\b(gun|rifle|pistol|ammo|ammunition|sword|weapon)\b",r["name"],re.I):continue
        groups.setdefault(cat,[]).append(r)
    for group in groups.values():group.sort(key=lambda x:(x["pack_bytes"],x["id"]))
    result=[]
    while len(result)<limit and any(groups.values()):
        for cat,group in sorted(groups.items()):
            if group and len(result)<limit:result.append(group.pop(0))
    return result
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--count",type=int,default=500);args=parser.parse_args()
    if not 1<=args.count<=1000:parser.error("count must be 1–1000")
    rows=[json.loads(l) for l in fetch(BASE+"metadata.jsonl").decode().splitlines() if l.strip()]
    candidates=select(rows,min(1033,args.count+100))
    out=ROOT/"assets"/"models";out.mkdir(parents=True,exist_ok=True)
    def download(r):
        key=r["id"];path=out/(key+".glb")
        try:
            data=path.read_bytes() if path.exists() else fetch(BASE+r["file"],1_500_000)
            validate_glb(data)
            if not path.exists():path.write_bytes(data)
            return {"id":"gso-"+key,"scan":key,"name":r["name"],"category":CATEGORIES.get(r["category"],"misc"),"size":"Display sample","price":9.99,"color":"#758b94","shape":"scan","stock":48,"url":"./assets/models/"+path.name,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"license":"CC-BY-4.0","credit":"Google Research / Google LLC; GLB conversion by CodePawl","source":r.get("source") or "https://fuel.gazebosim.org/1.0/GoogleResearch/models/"+key,"original":BASE+r["file"],"dimensions":r.get("size_metres")}
        except Exception as e:
            print("SKIPPED",key,str(e),flush=True);return None
    entries=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for offset in range(0,len(candidates),20):
            for item in pool.map(download,candidates[offset:offset+20]):
                if item and len(entries)<args.count:entries.append(item)
            print(f"Validated {len(entries)} / {args.count}",flush=True)
            if len(entries)>=args.count:break
    if len(entries)!=args.count:raise SystemExit(f"Only {len(entries)} validated; refusing partial publication")
    wanted={e["url"].rsplit("/",1)[-1] for e in entries}
    for p in out.glob("*.glb"):
        if p.name not in wanted:p.unlink()
    if sum(e["bytes"] for e in entries)>700_000_000:raise SystemExit("Asset budget exceeded")
    manifest=ROOT/"assets"/"catalog.json"
    manifest.write_text(json.dumps({"version":1,"count":len(entries),"products":entries},indent=2)+"\n")
    print("SUCCESS",len(entries),"GLBs",sum(e["bytes"] for e in entries),"bytes",flush=True)
if __name__=="__main__":main()
