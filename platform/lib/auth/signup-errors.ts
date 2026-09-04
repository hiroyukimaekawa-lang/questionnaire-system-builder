import {isAuthError,isAuthWeakPasswordError} from '@supabase/supabase-js';

export const SIGNUP_GENERIC_ERROR='登録を受け付けられませんでした。入力内容を確認し、時間をおいて再度お試しください。';
export const SIGNUP_RATE_LIMIT_ERROR='現在、新規登録が集中しています。1分ほど待ってから再度お試しください。';
export const SIGNUP_WEAK_PASSWORD_ERROR='パスワードの強度が不十分です。より複雑なパスワードを設定してください。';
export const SIGNUP_ALREADY_REGISTERED_ERROR='このメールアドレスは既に登録されています。ログインをお試しください。';
export const SIGNUP_INVALID_EMAIL_ERROR='メールアドレスの形式を確認してください。';
export const SIGNUP_DISABLED_ERROR='現在、新規登録を受け付けていません。管理者にお問い合わせください。';

const RATE_LIMIT_CODES=new Set(['over_email_send_rate_limit','over_request_rate_limit']);
const ALREADY_REGISTERED_CODES=new Set(['user_already_exists','email_exists','identity_already_exists']);
const INVALID_EMAIL_CODES=new Set(['email_address_invalid','validation_failed']);
const SIGNUP_DISABLED_CODES=new Set(['signup_disabled','email_provider_disabled']);

/**
 * Classifies a Supabase Auth signUp() failure by status/code/name
 * (never by matching on the free-text message) into a Japanese message safe to show users.
 */
export function signupErrorMessage(error:unknown):string{
  if(isAuthWeakPasswordError(error))return SIGNUP_WEAK_PASSWORD_ERROR;
  if(!isAuthError(error))return SIGNUP_GENERIC_ERROR;
  const {status,code}=error;
  if(status===429||(code&&RATE_LIMIT_CODES.has(code)))return SIGNUP_RATE_LIMIT_ERROR;
  if(code&&ALREADY_REGISTERED_CODES.has(code))return SIGNUP_ALREADY_REGISTERED_ERROR;
  if(code&&INVALID_EMAIL_CODES.has(code))return SIGNUP_INVALID_EMAIL_ERROR;
  if(code&&SIGNUP_DISABLED_CODES.has(code))return SIGNUP_DISABLED_ERROR;
  return SIGNUP_GENERIC_ERROR;
}
