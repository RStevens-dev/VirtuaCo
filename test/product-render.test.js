import test from 'node:test';
import assert from 'node:assert/strict';
import {fitProduct,shelfFace,productFacings,atlasCell,packageType,merchDepartment,assignMerchandise,packageLayout} from '../product-render.js';
test('fit preserves photo aspect and stays within allocated shelf space',()=>{const a=fitProduct(400,200,.6,.7);assert.equal(a.w,.6);assert.equal(a.h,.3);assert.ok(a.d>0);const b=fitProduct(100,400,.6,.7);assert.equal(b.h,.7);assert.equal(b.w,.175);});
test('left and right longitudinal rack faces point outward',()=>{assert.equal(shelfFace(false,'right').nx,1);assert.equal(shelfFace(false,'left').nx,-1);assert.equal(shelfFace(true,'left').nz,-1);});
test('facings stay within width and never duplicate model identity',()=>{const a=productFacings(1.2,.3);assert.ok(a.length>=2);assert.ok(a.every(x=>Math.abs(x)+.15<=.6));assert.deepEqual(productFacings(.3,.3),[0]);});
test('atlas cells are padded and grow to another page',()=>{const a=atlasCell(0),b=atlasCell(400);assert.equal(a.page,0);assert.equal(b.page,1);assert.ok(a.x>0&&a.y>0&&a.size<96);});

test('representative forms distinguish wine, deli, water and jars',()=>{assert.equal(packageType({name:'Sauvignon Blanc'}),'wine');assert.equal(packageType({name:'Roasted Chicken Swiss Roller Tray'}),'tray');assert.equal(packageType({name:'Purified Water',size:'40 x 16.9 fl oz'}),'case');assert.equal(packageType({name:'Peanut Butter Pretzels'}),'jar');assert.equal(packageType({name:'Paper Towels'}),'bale');});
test('food names override misleading imported categories',()=>{assert.equal(merchDepartment({name:'Organic Whole Brazil Nuts',category:'beverages'}),'snacks');assert.equal(merchDepartment({name:'Sauvignon Blanc',category:'pantry'}),'drinks');assert.equal(merchDepartment({name:'Olive Oil',category:'beverages'}),'pantry');});
test('no unrelated aisle fallback; local evidence and usable visuals rank first',()=>{const fixtures=[{zone:{category:'electronics'}},{zone:{category:'drinks'}}];const products=[{id:'a',name:'Sauvignon Blanc',image:'x'},{id:'b',name:'Sauvignon Blanc',image:'x',regionalListing:true},{id:'c',name:'Olive oil',image:'x'}];const out=assignMerchandise(products,fixtures);assert.equal(out.has(fixtures[0]),false);assert.deepEqual(out.get(fixtures[1]).map(p=>p.id),['b','a']);});
test('display geometry fits bay and prevents intersecting facings',()=>{for(const type of ['wine','jar','tray','case','bale','box','bag','can','tub','carton','bottle']){const g=packageLayout(type,1.1,.62);assert.ok(g.w<=1.1&&g.d<=.62&&g.h<=1.55);assert.ok(g.offsets.every(x=>Math.abs(x)+g.w/2<=.551));}});

test('visual QA regression: milk, nuts, frozen chicken and poke use correct forms and departments',()=>{
 const cases=[['Lowfat Milk','jug','dairy'],['Honey Roasted Macadamia Nuts','jar','snacks'],['Lightly Breaded Chicken Breast Chunks','bag','frozen'],['Ahi Tuna Spicy Poke','tray','meat'],['Whey Protein Creamy Chocolate','bag','health']];
 for(const [name,shape,dept] of cases){assert.equal(packageType({name}),shape,name);assert.equal(merchDepartment({name}),dept,name);}
});
test('six hero facings remain bounded by allocated shelf width',()=>{const g=packageLayout('wine',1.5,.6,true);assert.equal(g.offsets.length,6);assert.ok(g.offsets.every(x=>Math.abs(x)+g.w/2<=.75001));});
