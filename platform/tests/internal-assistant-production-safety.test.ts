import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantHistoryStorageKey} from '../lib/assistant/storage-key';
import {resolveDraftVersionId} from '../lib/assistant/resolve-draft-version';
import type {AssistantAuthOk} from '../lib/assistant/auth';

// --- 3/4: per-user sessionStorage key (deterministic + distinct per user) ---
// The actual sessionStorage read/write happens in a client component with no
// jsdom available in this test runner, so what's verified here is the pure
// function the key is built from: same user -> same key across renders/reopens
// (same-user persistence), different users -> different keys (cross-user
// isolation) - see tests/internal-assistant-security.test.ts for the source-level
// proof that AssistantDrawer actually uses this key instead of a fixed string.

test('4: same-user session history persistence - the storage key is deterministic for a given user', () => {
  const userId = 'a0000000-0000-4000-8000-000000000002';
  assert.equal(assistantHistoryStorageKey(userId), assistantHistoryStorageKey(userId));
});

test('3: cross-user session history isolation - different users get different storage keys', () => {
  const keyA = assistantHistoryStorageKey('a0000000-0000-4000-8000-000000000002');
  const keyB = assistantHistoryStorageKey('a0000000-0000-4000-8000-000000000003');
  assert.notEqual(keyA, keyB);
});

test('the storage key never contains the raw user id verbatim', () => {
  const userId = 'a0000000-0000-4000-8000-000000000002';
  assert.equal(assistantHistoryStorageKey(userId).includes(userId), false);
});

test('the storage key is namespaced so it cannot collide with an unrelated sessionStorage key', () => {
  assert.match(assistantHistoryStorageKey('any-user'), /^internal-assistant:history:[0-9a-f]{16}$/);
});

// --- 6/7: server-authoritative draftVersionId resolution ---

function fakeSupabase(row: {current_draft_version_id: string | null} | null) {
  const calls: {table?: string; column?: string; value?: string} = {};
  return {
    from(table: string) {
      calls.table = table;
      return {
        select() {
          return {
            eq(column: string, value: string) {
              calls.column = column;
              calls.value = value;
              return {
                async maybeSingle() {
                  return {data: row};
                },
              };
            },
          };
        },
      };
    },
    calls,
  };
}

test('6: resolveDraftVersionId looks up the survey by id and returns its current_draft_version_id', async () => {
  const client = fakeSupabase({current_draft_version_id: 'draft-xyz'});
  const result = await resolveDraftVersionId(client as unknown as AssistantAuthOk['s'], 'survey-abc');
  assert.equal(result, 'draft-xyz');
  assert.equal(client.calls.table, 'surveys');
  assert.equal(client.calls.column, 'id');
  assert.equal(client.calls.value, 'survey-abc');
});

test('6: resolveDraftVersionId returns undefined when surveyId is absent - never guesses one', async () => {
  const client = fakeSupabase({current_draft_version_id: 'draft-xyz'});
  const result = await resolveDraftVersionId(client as unknown as AssistantAuthOk['s'], undefined);
  assert.equal(result, undefined);
  assert.equal(client.calls.table, undefined, 'must not query at all without a surveyId');
});

test('6: resolveDraftVersionId returns undefined when the survey/RLS lookup finds nothing', async () => {
  const client = fakeSupabase(null);
  const result = await resolveDraftVersionId(client as unknown as AssistantAuthOk['s'], 'survey-not-visible');
  assert.equal(result, undefined);
});

test('7: a client-supplied draftVersionId is structurally impossible to use - the resolver only ever takes surveyId as input', () => {
  // resolveDraftVersionId's signature has no draftVersionId parameter at all; the
  // only way a draftVersionId reaches the reply/proposal is through this function,
  // called with surveyId. See internal-assistant-security.test.ts for the
  // corresponding route-source proof that input.context.draftVersionId is never read.
  assert.equal(resolveDraftVersionId.length, 2);
});
