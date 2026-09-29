import type {AssistantAuthOk} from './auth';

// draftVersionId is never trusted from the client - a spoofed id would leak which
// draft an employee is looking at into a request context that doesn't belong to
// them. The server looks it up itself from surveyId using the caller's own
// authenticated, RLS-scoped Supabase client, the same one authorizeAssistantRequest
// already established (RLS on `surveys` already governs whether this admin/sales
// user may see this survey at all - the same access any other staff page allows).
export async function resolveDraftVersionId(s: AssistantAuthOk['s'], surveyId: string | undefined): Promise<string | undefined> {
  if (!surveyId) return undefined;
  const {data} = await s.from('surveys').select('current_draft_version_id').eq('id', surveyId).maybeSingle();
  return data?.current_draft_version_id ?? undefined;
}
