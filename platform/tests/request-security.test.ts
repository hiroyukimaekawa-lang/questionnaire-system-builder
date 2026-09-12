import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLimitedJson} from '../lib/request-security';

test('Content-Lengthなしの分割送信も上限まで読み取る',async()=>{
  const request=new Request('https://example.com/api/responses',{method:'POST',body:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{"ok":'));controller.enqueue(new TextEncoder().encode('true}'));controller.close();}}),duplex:'half'} as RequestInit);
  assert.deepEqual(await parseLimitedJson(request,20),{ok:true});
});

test('Content-Lengthがなくても実データが上限を超えれば拒否する',async()=>{
  const request=new Request('https://example.com/api/responses',{method:'POST',body:'{"value":"too large"}'});
  await assert.rejects(()=>parseLimitedJson(request,8),/REQUEST_BODY_TOO_LARGE/);
});
