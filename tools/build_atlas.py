#!/usr/bin/env python3
"""Build one small texture atlas from source renders of the exact imported scans."""
import concurrent.futures,io,json,pathlib,urllib.request
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE="https://huggingface.co/datasets/codepawl/scanned-objects-glb/resolve/main/"
products=json.loads((ROOT/"assets/catalog.json").read_text())["products"]
TILE=96; COLS=22; ROWS=(len(products)+COLS-1)//COLS
atlas=Image.new("RGBA",(COLS*TILE,ROWS*TILE))
def get(p):
    url=BASE+"thumbs/"+p["scan"]+".webp"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url,timeout=25) as r: data=r.read(2_000_000)
            im=Image.open(io.BytesIO(data)).convert("RGBA")
            im.thumbnail((TILE-6,TILE-6),Image.Resampling.LANCZOS)
            return im
        except Exception as e: error=e
    print("Thumbnail unavailable",p["id"],error,flush=True)
    return None
entries={}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for i,im in enumerate(pool.map(get,products)):
        if im is None:continue
        x=i%COLS*TILE+(TILE-im.width)//2;y=i//COLS*TILE+(TILE-im.height)//2
        atlas.alpha_composite(im,(x,y))
        entries[products[i]["id"]]={"x":i%COLS*TILE,"y":i//COLS*TILE,"w":TILE,"h":TILE}
        if i%50==0:print(i,"processed",flush=True)
if len(entries)!=len(products):raise SystemExit(f"Only {len(entries)} of {len(products)} thumbnails; not publishing incomplete atlas")
atlas.save(ROOT/"assets/merch-atlas.webp",quality=82,method=6)
(ROOT/"assets/merch-atlas.json").write_text(json.dumps({"width":atlas.width,"height":atlas.height,"entries":entries},separators=(",",":")))
print("Built atlas",atlas.size,len(entries),"products")
