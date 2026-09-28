import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolveAnalyticsRange} from '../lib/analytics-range';
const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');
const NOW=new Date('2026-09-27T10:00:00+09:00');

test('range=customだけ（from/toなし）でもcrashせず、RPCへnull/nullの安全なfallbackを渡す',()=>{const r=resolveAnalyticsRange({range:'custom'},NOW);assert.equal(r.custom,true);assert.equal(r.from,null);assert.equal(r.to,null);assert.equal(r.rangeOrderError,false);assert.equal(r.customReady,false)});

test('fromだけ指定してもcrashしない',()=>{const r=resolveAnalyticsRange({range:'custom',from:'2026-09-01'},NOW);assert.equal(r.from,null);assert.equal(r.to,null);assert.equal(r.rangeOrderError,false)});

test('toだけ指定してもcrashしない',()=>{const r=resolveAnalyticsRange({range:'custom',to:'2026-09-30'},NOW);assert.equal(r.from,null);assert.equal(r.to,null);assert.equal(r.rangeOrderError,false)});

test('fromがinvalidな文字列でもcrashせずfallbackする',()=>{const r=resolveAnalyticsRange({range:'custom',from:'invalid',to:'2026-09-30'},NOW);assert.equal(r.from,null);assert.equal(r.to,null);assert.equal(r.rangeOrderError,false);assert.equal(r.customReady,false)});

test('存在しない日付(2月30日)でもDateのオーバーフローで別日付として通さずfallbackする',()=>{const r=resolveAnalyticsRange({range:'custom',from:'2026-02-30',to:'2026-09-30'},NOW);assert.equal(r.from,null);assert.equal(r.to,null)});

test('開始日>終了日でもcrashせず、rangeOrderErrorを立てて安全にfallbackする',()=>{const r=resolveAnalyticsRange({range:'custom',from:'2026-09-30',to:'2026-09-01'},NOW);assert.equal(r.rangeOrderError,true);assert.equal(r.customReady,false);assert.equal(r.from,null);assert.equal(r.to,null)});

test('正常なfrom/toではAsia/Tokyo境界のISO文字列をRPCへ渡し、終了日は翌日00:00のexclusive upper boundにする',()=>{const r=resolveAnalyticsRange({range:'custom',from:'2026-09-01',to:'2026-09-30'},NOW);assert.equal(r.customReady,true);assert.equal(r.rangeOrderError,false);assert.equal(r.from,'2026-09-01T00:00:00+09:00');assert.equal(r.to,new Date('2026-10-01T00:00:00+09:00').toISOString())});

test('開始日=終了日（単日指定）も正常に扱う',()=>{const r=resolveAnalyticsRange({range:'custom',from:'2026-09-15',to:'2026-09-15'},NOW);assert.equal(r.customReady,true);assert.equal(r.to,new Date('2026-09-16T00:00:00+09:00').toISOString())});

test('range=7/30/90/allは既存どおりでcustom分岐の影響を受けない（回帰なし）',()=>{const r30=resolveAnalyticsRange({range:'30'},NOW);assert.equal(r30.custom,false);assert.equal(r30.to,null);assert.equal(typeof r30.from,'string');const rAll=resolveAnalyticsRange({range:'all'},NOW);assert.equal(rAll.from,null);assert.equal(rAll.to,null);const r7=resolveAnalyticsRange({range:'7'},NOW);assert.equal(r7.from,new Date('2026-09-21T00:00:00+09:00').toISOString())});

test('未知のrange値(例: month/3m)でもNumber()にcrashせず30日fallbackする',()=>{const r=resolveAnalyticsRange({range:'month'},NOW);assert.equal(typeof r.from,'string');assert.equal(r.from,new Date('2026-08-29T00:00:00+09:00').toISOString());const r2=resolveAnalyticsRange({range:'3m'},NOW);assert.equal(r2.from,r.from)});

test('rangeOrderError時はフォーム付近にvalidation messageを表示し、画面全体を落とすthrowはしない',async()=>{const page=await read('../app/admin/manage/[id]/analytics/page.tsx');assert.match(page,/rangeOrderError\?<p className="error" role="alert">/);assert.doesNotMatch(page,/if\(rangeOrderError\)throw/)});

test('分析ページはresolveAnalyticsRange()を使いNumber(range)を直接RPC境界計算に使わない',async()=>{const page=await read('../app/admin/manage/[id]/analytics/page.tsx');assert.match(page,/resolveAnalyticsRange\(query\)/);assert.doesNotMatch(page,/start\.setUTCDate\(start\.getUTCDate\(\)-Number\(range\)/)});
