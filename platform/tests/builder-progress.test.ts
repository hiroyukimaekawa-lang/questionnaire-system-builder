import test from 'node:test';
import assert from 'node:assert/strict';
import {builderPhaseForStep} from '../lib/builder/progress';

test('Builder stepを7段階へ分類する',()=>{
  for(const step of ['purpose','purposeDetail'])assert.equal(builderPhaseForStep(step),1);
  for(const step of ['storeName','businessType'])assert.equal(builderPhaseForStep(step),2);
  for(const step of ['startingPoint','template'])assert.equal(builderPhaseForStep(step),3);
  for(const step of ['questions','questionsConfirmed'])assert.equal(builderPhaseForStep(step),4);
  for(const step of ['anonymous','introText','mainColor','logoMode','logoUrl'])assert.equal(builderPhaseForStep(step),5);
  for(const step of ['googleReviewEnabled','googleReviewUrl'])assert.equal(builderPhaseForStep(step),6);
  for(const step of ['completionText','summary'])assert.equal(builderPhaseForStep(step),7);
});
test('未知stepは安全にSTEP 1へfallbackする',()=>assert.equal(builderPhaseForStep('unknown'),1));
