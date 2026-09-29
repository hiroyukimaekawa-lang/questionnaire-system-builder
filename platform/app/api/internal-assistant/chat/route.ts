import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authorizeAssistantRequest, isAssistantAuthError} from '@/lib/assistant/auth';
import {runConversationTurn} from '@/lib/assistant/conversation';
import {fallbackAssistantProvider} from '@/lib/assistant/fallback-provider';
import {checkRateLimit} from '@/lib/assistant/rate-limit';
import {assistantContextSchema, assistantMessageSchema} from '@/lib/assistant/schema';
import {parseLimitedJson} from '@/lib/request-security';

const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(assistantMessageSchema).max(20).default([]),
  context: assistantContextSchema,
});

export async function POST(request: Request) {
  const auth = await authorizeAssistantRequest();
  if (isAssistantAuthError(auth)) return NextResponse.json({error: auth.error}, {status: auth.status});

  if (!checkRateLimit(`chat:${auth.user.id}`)) {
    return NextResponse.json({error: '送信回数が多すぎます。少し時間をおいて再度お試しください。'}, {status: 429});
  }

  let input: z.infer<typeof chatSchema>;
  try {
    input = chatSchema.parse(await parseLimitedJson(request, 50_000));
  } catch {
    return NextResponse.json({error: '入力内容を確認してください。'}, {status: 400});
  }

  // The verified server-side role always wins over whatever the client sent -
  // context is metadata for the reply, never an authorization input.
  const context = {...input.context, userRole: auth.role};

  const {reply} = await runConversationTurn({
    message: input.message,
    history: input.history,
    context,
    provider: fallbackAssistantProvider,
  });

  return NextResponse.json(reply, {status: 200});
}
