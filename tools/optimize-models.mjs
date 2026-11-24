import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplify,textureCompress} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const catalog=JSON.parse(await fs.readFile('assets/catalog.json','utf8'));
const variants={};let total=0;
await fs.mkdir('assets/lod',{recursive:true});
for(const [i,p] of catalog.products.entries()){
 const name=p.scan;
 if(!/^[\w.-]+$/.test(name))throw Error('Invalid filename');
 const source=path.join('assets/models',name+'.glb');
 const lods={};
 for(const [tier,ratio,size] of [['low',.035,64],['medium',.20,128],['high',.55,256]]){
  const doc=await io.read(source);
  // Decode original compression; write portable uncompressed quantized source geometry.
  for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();
  await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio,error:tier==='low'?.12:tier==='medium'?.035:.01}),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[size,size]}));
  const file='assets/lod/'+name+'-'+tier+'.glb';
  await io.write(file,doc);
  const stat=await fs.stat(file);const check=await io.read(file);
  if(!check.getRoot().listMeshes().length)throw Error('Empty optimized model '+file);
  lods[tier]={url:'./'+file,bytes:stat.size};total+=stat.size;
 }
 variants[p.id]=lods;
 if(i%25===0)console.log(i+1,'/',catalog.products.length,'processed');
}
if(Object.keys(variants).length!==catalog.count)throw Error('Incomplete LOD library');
await fs.writeFile('assets/lod-index.json',JSON.stringify({version:1,count:catalog.count,bytes:total,variants}));
console.log('Validated',catalog.count*3,'variants,',total,'bytes');
