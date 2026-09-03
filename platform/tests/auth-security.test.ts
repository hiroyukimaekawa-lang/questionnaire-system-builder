import test from 'node:test';import assert from 'node:assert/strict';import {canDemoteAdmin,safeNextPath,validatePassword} from '../lib/auth/security';
test('safeNextPath accepts internal paths',()=>assert.equal(safeNextPath('/admin/account/update-password?ok=1'),'/admin/account/update-password?ok=1'));
test('safeNextPath rejects unsafe URLs',()=>{assert.equal(safeNextPath('https://evil.example'),'/admin');assert.equal(safeNextPath('//evil.example'),'/admin');assert.equal(safeNextPath('javascript:alert(1)'),'/admin')});
test('password validation',()=>{assert.match(validatePassword('short')??'',/8文字/);assert.match(validatePassword('long-password','different')??'',/一致/);assert.equal(validatePassword('long-password','long-password'),null)});
test('last admin protection',()=>{assert.equal(canDemoteAdmin('admin','sales',1),false);assert.equal(canDemoteAdmin('admin','sales',2),true)});
