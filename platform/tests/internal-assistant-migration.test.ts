import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root = join(import.meta.dirname, '..');
const source = (path: string) => readFileSync(join(root, path), 'utf8');

test('27: improvement_requests migration defines the minimum columns and RLS from spec', () => {
  const migration = source('supabase/migrations/20260929070000_internal_assistant_improvements.sql');
  for (const column of ['id uuid primary key', 'reporter_user_id uuid not null references public.profiles(id)', 'status text not null default', 'category text not null check', 'message text not null', 'proposal jsonb not null', 'context jsonb not null', 'idempotency_key text', 'created_at timestamptz', 'updated_at timestamptz']) {
    assert.ok(migration.includes(column), `expected migration to define: ${column}`);
  }
  assert.match(migration, /alter table public\.improvement_requests enable row level security/);
  assert.match(migration, /using \(reporter_user_id = auth\.uid\(\) or public\.is_admin\(\)\)/);
  assert.match(migration, /with check \(public\.is_staff\(\) and reporter_user_id = auth\.uid\(\)\)/);
  assert.match(migration, /using \(public\.is_admin\(\)\)\s*\n\s*with check \(public\.is_admin\(\)\)/);
  assert.match(migration, /revoke all on table public\.improvement_requests from anon/);
});

test('improvement_requestsのRPC signatureや既存migrationを変更していない(forward-onlyの新規migrationのみ)', () => {
  const migration = source('supabase/migrations/20260929070000_internal_assistant_improvements.sql');
  assert.doesNotMatch(migration, /submit_survey_response|publish_survey/);
  // The two identity-mode migrations already applied to Production stay untouched.
  const untouched = ['20260929064859_survey_identity_mode.sql', '20260929064903_fix_legacy_identity_compat.sql'];
  for (const file of untouched) assert.doesNotMatch(source(`supabase/migrations/${file}`), /improvement_requests/);
});

test('DBテスト(pgTAP)が18assertion分のRLS/カラム検証を計画している', () => {
  const dbTest = source('supabase/tests/database/internal_assistant_improvements.test.sql');
  assert.match(dbTest, /select plan\(18\)/);
  assert.match(dbTest, /throws_ok/);
  assert.match(dbTest, /has_table_privilege\('anon', 'public\.improvement_requests', 'select'\)/);
});
