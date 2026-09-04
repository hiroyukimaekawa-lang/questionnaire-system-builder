import test from 'node:test';import assert from 'node:assert/strict';import {authDestination} from '../lib/auth/routing';
test('未ログインのadminアクセスだけloginへ送る',()=>{assert.equal(authDestination('/admin',false),'/login');assert.equal(authDestination('/admin/surveys/new',false),'/login')});
test('loginは認証状態にかかわらず自動redirectしない',()=>{assert.equal(authDestination('/login',false),null);assert.equal(authDestination('/login',true),null)});
test('signupは未ログインでも公開',()=>assert.equal(authDestination('/signup',false),null));
test('ログイン済みユーザーはadminへ進める',()=>assert.equal(authDestination('/admin',true),null));
test('auth routeと公開アンケートは未ログインでも公開',()=>{assert.equal(authDestination('/auth/confirm',false),null);assert.equal(authDestination('/shop-slug',false),null)});
