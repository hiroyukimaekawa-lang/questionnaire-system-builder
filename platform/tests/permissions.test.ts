import test from 'node:test';import assert from 'node:assert/strict';import {can} from '../lib/auth/permissions';
test('Adminはユーザー管理とアーカイブが可能',()=>{assert.equal(can('admin','manage_users'),true);assert.equal(can('admin','archive'),true)});
test('Salesは通常運用が可能で管理者操作は不可',()=>{assert.equal(can('sales','publish'),true);assert.equal(can('sales','csv'),true);assert.equal(can('sales','archive'),false);assert.equal(can('sales','manage_users'),false)});
