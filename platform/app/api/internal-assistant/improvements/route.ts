import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authorizeAssistantRequest, isAssistantAuthError} from '@/lib/assistant/auth';
import {isInternalAssistantEnabled} from '@/lib/feature-flags';
import {checkRateLimit} from '@/lib/assistant/rate-limit';
import {resolveDraftVersionId} from '@/lib/assistant/resolve-draft-version';
import {assistantContextSchema, improvementProposalDraftSchema} from '@/lib/assistant/schema';
import {parseLimitedJson} from '@/lib/request-security';

const submitSchema = z.object({
  proposal: improvementProposalDraftSchema,
  context: assistantContextSchema,
});

// A confirmed "改善要望として送る" tap from the drawer - never called automatically
// by the chat turn itself (see docs/INTERNAL_ASSISTANT.md: help/bug/ux/feature
// conversations never create a request on their own).
export async function POST(request: Request) {
  // Checked before anything else - including auth - so a disabled environment
  // never reaches a Supabase query or an improvement_requests insert.
  if (!isInternalAssistantEnabled()) return NextResponse.json({error: '利用できません。'}, {status: 404});

  const auth = await authorizeAssistantRequest();
  if (isAssistantAuthError(auth)) return NextResponse.json({error: auth.error}, {status: auth.status});

  if (!checkRateLimit(`improvements:${auth.user.id}`)) {
    return NextResponse.json({error: '送信回数が多すぎます。少し時間をおいて再度お試しください。'}, {status: 429});
  }

  const idempotencyKey = request.headers.get('x-idempotency-key')?.trim().slice(0, 100) || null;

  let input: z.infer<typeof submitSchema>;
  try {
    input = submitSchema.parse(await parseLimitedJson(request, 20_000));
  } catch {
    return NextResponse.json({error: '入力内容を確認してください。'}, {status: 400});
  }

  const s = auth.s;
  // Server-resolved from surveyId, same as the chat route - never trust the
  // client-supplied draftVersionId.
  const context = {
    ...input.context,
    userRole: auth.role,
    draftVersionId: await resolveDraftVersionId(auth.s, input.context.surveyId),
  };

  if (idempotencyKey) {
    const {data: existing} = await s
      .from('improvement_requests')
      .select('id')
      .eq('reporter_user_id', auth.user.id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing) return NextResponse.json({id: existing.id, duplicate: true}, {status: 200});
  }

  const {data, error} = await s
    .from('improvement_requests')
    .insert({
      reporter_user_id: auth.user.id,
      status: 'submitted',
      category: input.proposal.category,
      message: input.proposal.summary,
      proposal: input.proposal,
      context,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505' && idempotencyKey) {
      const {data: existing} = await s
        .from('improvement_requests')
        .select('id')
        .eq('reporter_user_id', auth.user.id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) return NextResponse.json({id: existing.id, duplicate: true}, {status: 200});
    }
    return NextResponse.json({error: '送信できませんでした。もう一度お試しください。'}, {status: 500});
  }

  return NextResponse.json({id: data.id, duplicate: false}, {status: 201});
}
