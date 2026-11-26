import {createHash} from 'node:crypto';

// Server-computed, stable per-user sessionStorage key. sessionStorage is scoped to
// the browser tab/origin, not to who's currently logged in - if employee A logs
// out and employee B logs into the same tab without closing it, a hardcoded key
// would let B read A's conversation. Keying by a hash of the user id (rather than
// the raw id) avoids putting an internal identifier directly into localStorage-
// adjacent browser storage for no reason; it's not a secret, just unnecessary to
// expose verbatim.
export function assistantHistoryStorageKey(userId: string): string {
  return `internal-assistant:history:${createHash('sha256').update(userId).digest('hex').slice(0, 16)}`;
}
