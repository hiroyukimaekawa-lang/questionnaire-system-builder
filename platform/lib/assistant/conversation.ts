import {isReadyForConfirmation} from './intent';
import type {
  AssistantIntent,
  AssistantIntentResult,
  AssistantMessage,
  AssistantReply,
  ImprovementProposalDraft,
  QuestionnaireAssistantContext,
  QuestionnaireAssistantProvider,
} from './types';

// Bug/ux/feature reports are never turned into an Improvement Request from a single
// message - the employee sees one short clarifying question first (see spec section
// 15/16/17). This is app-level conversation flow, not something a provider decides,
// which keeps QuestionnaireAssistantProvider limited to classification/analysis.
const CLARIFYING_QUESTION: Record<Exclude<AssistantIntent, 'help'>, string> = {
  bug: 'もう少し詳しく教えてください。どの画面で、どのような操作をしたときに発生しますか？',
  ux_improvement: '現在開いている画面のどの部分について、どのように分かりにくいと感じましたか？',
  feature_request: 'どのような場面でその機能を使いたいか、もう少し教えてください。',
};

function confirmationMessage(draft: ImprovementProposalDraft): string {
  return [
    '以下の内容で改善要望として送れます。',
    '',
    `タイトル: ${draft.summary}`,
    `現在の状態: ${draft.currentBehavior}`,
    `ご要望: ${draft.expectedBehavior}`,
  ].join('\n');
}

export interface ConversationTurnInput {
  message: string;
  history: AssistantMessage[];
  context: QuestionnaireAssistantContext;
  provider: QuestionnaireAssistantProvider;
}

export interface ConversationTurnResult {
  intent: AssistantIntentResult;
  reply: AssistantReply;
}

export async function runConversationTurn(input: ConversationTurnInput): Promise<ConversationTurnResult> {
  const {message, history, context, provider} = input;
  const intent = await provider.analyzeIntent({message, history});

  if (intent.intent === 'help') {
    const reply = await provider.answerHelp({message, context, history});
    return {intent, reply};
  }

  const nextHistory: AssistantMessage[] = [...history, {role: 'user', content: message}];
  const ready = isReadyForConfirmation(intent.intent, history, message);
  if (!ready) {
    return {intent, reply: {message: CLARIFYING_QUESTION[intent.intent], readyForConfirmation: false}};
  }

  const draft = await provider.analyzeImprovement({history: nextHistory, context});
  return {intent, reply: {message: confirmationMessage(draft), readyForConfirmation: true, proposal: draft}};
}
