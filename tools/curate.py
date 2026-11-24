#!/usr/bin/env python3
"""Opt-in curator: fetch one barcode at a time, inspect photo, then approve explicitly.
Usage: python3 tools/curate.py SKU BARCODE --contact you@example.com
Add --approve only after checking the image and underlying packaging rights.
"""
import argparse,json,re,time,urllib.request,pathlib
p=argparse.ArgumentParser()
p.add_argument("sku");p.add_argument("barcode");p.add_argument("--contact",required=True);p.add_argument("--approve",action="store_true")
a=p.parse_args()
if not re.fullmatch(r"[0-9]{8,14}",a.barcode) or not re.fullmatch(r"[a-z]+-[0-9]+",a.sku):p.error("Invalid SKU or barcode")
root=pathlib.Path(__file__).resolve().parents[1]
req=urllib.request.Request("https://world.openfoodfacts.org/api/v2/product/"+a.barcode+".json?fields=code,product_name,brands,image_front_url",headers={"User-Agent":"VirtuaCo/0.2 ("+a.contact+")"})
# Enforce conservative spacing across successive invocations.
stamp=root/".curator-last-request"
if stamp.exists():time.sleep(max(0,5-(time.time()-float(stamp.read_text()))))
stamp.write_text(str(time.time()))
with urllib.request.urlopen(req,timeout=20) as r:data=json.load(r)
item=data.get("product",{})
image=item.get("image_front_url","")
from urllib.parse import urlparse
u=urlparse(image)
if not item.get("product_name") or u.scheme!="https" or u.hostname not in {"images.openfoodfacts.org","static.openfoodfacts.org"}:raise SystemExit("No eligible image found")
entry={"name":item["product_name"],"image":image,"source":"https://world.openfoodfacts.org/product/"+a.barcode,"credit":"Open Food Facts contributors","license":"CC-BY-SA-3.0"}
print(json.dumps(entry,indent=2,ensure_ascii=False))
if a.approve:
 path=root/"photos.js";src=path.read_text()
 match=re.search(r"export const photoManifest=(\{.*?\});",src,re.S)
 if not match:raise SystemExit("Manifest not found")
 manifest=json.loads(match.group(1));manifest[a.sku]=entry
 path.write_text(src[:match.start(1)]+json.dumps(manifest,indent=2,ensure_ascii=False)+src[match.end(1):])
 print("Manifest updated. Commit after reviewing attribution and rights.")
else:print("Preview only; no manifest changes. Verify image matches the intended product and rights before approving.")
