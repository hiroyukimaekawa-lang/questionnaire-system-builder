import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');

test('最新回答は横型テーブルで1回答=1行、1質問=1列として表示する',async()=>{const page=await read('../app/admin/manage/[id]/analytics/page.tsx');assert.match(page,/className="latest-responses-table"/);assert.match(page,/<thead>/);assert.match(page,/<tbody>/);assert.match(page,/latestRows\.map\(\(r:any\)=><tr key=\{r\.id\}>/);assert.match(page,/latestCols\.map\(\(q:any\)=><th key=\{q\.id\}>\{q\.title\}<\/th>/)});

test('最新5件は最新responseのsurvey_version_idを基準に同一versionだけへ絞り込む',async()=>{const page=await read('../app/admin/manage/[id]/analytics/page.tsx');assert.match(page,/const baselineVersionId=latest\.responses\[0\]\?\.survey_version_id/);assert.match(page,/latestRows=latest\.responses\.filter\(\(r:any\)=>r\.survey_version_id===baselineVersionId\)/);assert.match(page,/latestCols=latest\.questions\.filter\(\(q:any\)=>q\.survey_version_id===baselineVersionId\)\.sort\(\(a:any,b:any\)=>a\.sort_order-b\.sort_order\)/)});

test('既存回答データは削除・変更せず responseData(id,1,5) をそのまま再利用する',async()=>{const page=await read('../app/admin/manage/[id]/analytics/page.tsx');assert.match(page,/responseData\(id,1,5\)/);assert.doesNotMatch(page,/\.delete\(/);assert.doesNotMatch(page,/\.update\(/)});

test('各セルはdisplayAnswer()を再利用し未回答は—にする',async()=>{const page=await read('../app/admin/manage/[id]/analytics/page.tsx');assert.match(page,/const text=\(answer\?displayAnswer\(answer,q\):''\)\|\|'—'/)});

test('合計・平均列と「すべての回答を見る」リンクを維持する',async()=>{const page=await read('../app/admin/manage/[id]/analytics/page.tsx');assert.match(page,/<th className="col-score">合計<\/th><th className="col-score">平均<\/th>/);assert.match(page,/<td className="col-score">\{r\.total_score\?\?'—'\}<\/td><td className="col-score">\{r\.average_score\?\?'—'\}<\/td>/);assert.match(page,/href=\{`\/admin\/manage\/\$\{id\}\/responses`\}/)});

test('回答が0件の場合はテーブルではなく空状態メッセージを表示する',async()=>{const page=await read('../app/admin/manage/[id]/analytics/page.tsx');assert.match(page,/latestRows\.length>0\?<div className="latest-responses-table-wrap">/);assert.match(page,/:<p className="muted">回答はまだありません。<\/p>/)});

test('最新回答テーブルはカード内部のみ横スクロールしページ全体を横スクロールさせない',async()=>{const css=await read('../app/admin.css');assert.match(css,/\.latest-responses-table-wrap\{overflow-x:auto/);assert.doesNotMatch(css,/\.latest-responses-table-wrap\{[^}]*overflow-y/);assert.doesNotMatch(css,/\.latest-responses-table\{[^}]*overflow-y/)});

test('モバイルで回答日時列とヘッダーをstickyにしタップで横スクロールできる',async()=>{const css=await read('../app/admin.css');assert.match(css,/\.latest-responses-table thead th\{position:sticky;top:0/);assert.match(css,/\.latest-responses-table th:first-child\{position:sticky;left:0/);assert.match(css,/\.latest-responses-table td:first-child\{position:sticky;left:0/)});

test('日本語セルはbreak-allを使わずグローバルnowrapを明示的に上書きする',async()=>{const css=await read('../app/admin.css');assert.match(css,/\.latest-responses-table\{[^}]*line-break:strict;word-break:normal/);assert.match(css,/\.latest-responses-table thead th\{[^}]*white-space:normal/);assert.doesNotMatch(css,/\.latest-responses-table[^{]*\{[^}]*word-break:break-all/)});

test('td自体はdisplay:-webkit-boxにせず内側のspanだけを行クランプしてtable行崩れを防ぐ',async()=>{const [page,css]=await Promise.all([read('../app/admin/manage/[id]/analytics/page.tsx'),read('../app/admin.css')]);assert.match(page,/<span className="cell-clamp">\{text\}<\/span>/);assert.doesNotMatch(css,/\.latest-responses-table tbody td\{[^}]*display:-webkit-box/);assert.match(css,/\.latest-responses-table tbody td \.cell-clamp\{display:-webkit-box/)});
