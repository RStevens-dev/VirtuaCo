import test from 'node:test';
import assert from 'node:assert/strict';
import {fitProduct,shelfFace,productFacings,atlasCell} from '../product-render.js';
test('fit preserves photo aspect and stays within allocated shelf space',()=>{const a=fitProduct(400,200,.6,.7);assert.equal(a.w,.6);assert.equal(a.h,.3);assert.ok(a.d>0);const b=fitProduct(100,400,.6,.7);assert.equal(b.h,.7);assert.equal(b.w,.175);});
test('left and right longitudinal rack faces point outward',()=>{assert.equal(shelfFace(false,'right').nx,1);assert.equal(shelfFace(false,'left').nx,-1);assert.equal(shelfFace(true,'left').nz,-1);});
test('facings stay within width and never duplicate model identity',()=>{const a=productFacings(1.2,.3);assert.ok(a.length>=2);assert.ok(a.every(x=>Math.abs(x)+.15<=.6));assert.deepEqual(productFacings(.3,.3),[0]);});
test('atlas cells are padded and grow to another page',()=>{const a=atlasCell(0),b=atlasCell(400);assert.equal(a.page,0);assert.equal(b.page,1);assert.ok(a.x>0&&a.y>0&&a.size<96);});
