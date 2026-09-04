import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {AuthApiError,AuthWeakPasswordError,AuthRetryableFetchError} from '@supabase/supabase-js';
import {
  signupErrorMessage,
  SIGNUP_GENERIC_ERROR,
  SIGNUP_RATE_LIMIT_ERROR,
  SIGNUP_WEAK_PASSWORD_ERROR,
  SIGNUP_ALREADY_REGISTERED_ERROR,
  SIGNUP_INVALID_EMAIL_ERROR,
  SIGNUP_DISABLED_ERROR,
} from '../lib/auth/signup-errors';

const source=(path:string)=>readFileSync(join(import.meta.dirname,'..',path),'utf8');

test('429 (over_email_send_rate_limit) は専用メッセージになる',()=>{
  assert.equal(signupErrorMessage(new AuthApiError('email rate limit exceeded',429,'over_email_send_rate_limit')),SIGNUP_RATE_LIMIT_ERROR);
});

test('429 (over_request_rate_limit) も専用メッセージになる',()=>{
  assert.equal(signupErrorMessage(new AuthApiError('rate limit exceeded',429,'over_request_rate_limit')),SIGNUP_RATE_LIMIT_ERROR);
});

test('codeが未知でもstatus 429なら専用メッセージになる（message部分一致に依存しない）',()=>{
  assert.equal(signupErrorMessage(new AuthApiError('Too Many Requests',429,undefined)),SIGNUP_RATE_LIMIT_ERROR);
  assert.equal(signupErrorMessage(new AuthRetryableFetchError('Too Many Requests',429)),SIGNUP_RATE_LIMIT_ERROR);
});

test('weak_passwordは強度不足メッセージになる',()=>{
  assert.equal(signupErrorMessage(new AuthWeakPasswordError('Password is too weak',422,['length'])),SIGNUP_WEAK_PASSWORD_ERROR);
});

test('登録済みメールは案内メッセージになる',()=>{
  assert.equal(signupErrorMessage(new AuthApiError('User already registered',422,'user_already_exists')),SIGNUP_ALREADY_REGISTERED_ERROR);
  assert.equal(signupErrorMessage(new AuthApiError('User already registered',422,'email_exists')),SIGNUP_ALREADY_REGISTERED_ERROR);
});

test('不正なメールアドレスは形式エラーメッセージになる',()=>{
  assert.equal(signupErrorMessage(new AuthApiError('Unable to validate email address',400,'email_address_invalid')),SIGNUP_INVALID_EMAIL_ERROR);
});

test('signup_disabledは案内メッセージになる',()=>{
  assert.equal(signupErrorMessage(new AuthApiError('Signups not allowed',422,'signup_disabled')),SIGNUP_DISABLED_ERROR);
});

test('未分類のAuthApiErrorやネットワークエラーは汎用エラーにfallbackする',()=>{
  assert.equal(signupErrorMessage(new AuthApiError('unexpected',500,'unexpected_failure')),SIGNUP_GENERIC_ERROR);
  assert.equal(signupErrorMessage(new TypeError('Failed to fetch')),SIGNUP_GENERIC_ERROR);
  assert.equal(signupErrorMessage(null),SIGNUP_GENERIC_ERROR);
});

test('分類はerror.status/error.codeのみを見て、error.messageの文字列一致には依存しない',()=>{
  const source_=source('lib/auth/signup-errors.ts');
  assert.doesNotMatch(source_,/error\.message/);
  assert.match(source_,/error\.status|status===429/);
});

test('SignupFormは新しいエラー分類とsuccessメッセージを使い、passwordやtokenをログに出さない',()=>{
  const signup=source('components/admin/SignupForm.tsx');
  assert.match(signup,/signupErrorMessage\(caught\)/);
  assert.match(signup,/登録が完了しました。そのままログインしてアンケートシステムを利用できます。/);
  assert.doesNotMatch(signup,/メール確認が必要な場合は/);
  assert.doesNotMatch(signup,/管理者の承認/);
  assert.doesNotMatch(signup,/SERVICE_ROLE|console\.|token/);
});

test('pending中はsubmitがdisabledのまま維持され、429を自動retryするloopは存在しない',()=>{
  const signup=source('components/admin/SignupForm.tsx');
  assert.match(signup,/if\(pending\|\|disabled\)return/);
  assert.doesNotMatch(signup,/setTimeout|setInterval|while\s*\(/);
});
