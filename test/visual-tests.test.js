import test from 'node:test';
import assert from 'node:assert/strict';
import {views,selectCases} from '../visual-tests.js';
test('five distinct repeatable angles',()=>{assert.equal(views.length,5);assert.equal(new Set(views.map(v=>v.id)).size,5);assert.ok(views.every(v=>Number.isFinite(v.angle)&&v.distance>0));});
test('select ten distinct ready products, prioritize variety and local evidence',()=>{const displays=Array.from({length:15},(_,i)=>({product:{id:'p'+i,regionalListing:i===14},ready:true,type:i%2?'jar':'box'}));displays.push({...displays[0]},{product:{id:'missing'},ready:false,type:'wine'});const result=selectCases(displays);assert.equal(result.length,10);assert.equal(new Set(result.map(d=>d.product.id)).size,10);assert.equal(result[0].product.id,'p14');assert.notEqual(result[0].type,result[1].type);assert.ok(result.every(d=>d.ready));});
test('insufficient rendered products never fabricate test cases',()=>{assert.equal(selectCases([]).length,0);assert.equal(selectCases([{product:{id:'a'},type:'jar',ready:true}]).length,1);});
