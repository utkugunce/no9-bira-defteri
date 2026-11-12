import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addDays, brewPlan} from './schedule.js';

const batch = {started:'2026-11-01',fermentDays:14,conditionDays:14,bottled:null};
test('unbottled beer shows first sip if bottled on the target date',()=>{
 assert.deepEqual(brewPlan(batch),{bottleTarget:'2026-11-15',firstSip:'2026-11-29',estimated:true});
});
test('actual late or early bottling replaces the target in the drinking plan',()=>{
 assert.equal(brewPlan({...batch,bottled:'2026-11-20'}).firstSip,'2026-12-04');
 assert.equal(brewPlan(batch,'2026-11-12').firstSip,'2026-11-26');
 assert.equal(brewPlan({...batch,bottled:'2026-11-20'}).estimated,false);
});
test('custom maturation days are respected across a year boundary',()=>{
 assert.equal(brewPlan({...batch,started:'2026-12-01',conditionDays:30}).firstSip,'2027-01-14');
});
test('calendar arithmetic handles leap days and DST without losing a day',()=>{
 assert.equal(addDays('2028-02-28',2),'2028-03-01');
 assert.equal(addDays('2026-03-28',2),'2026-03-30');
});
