import type {AssistantIntent, AssistantIntentResult, AssistantMessage} from './types';

// V1 heuristic classifier (no external LLM call yet - see docs/AI_OS_INTEGRATION.md).
// Order matters: an explicit malfunction report ("戻ってしまう", "動かない") is a bug
// even if it also sounds like a complaint; a request to add something new is a
// feature request even if phrased as a complaint about what's missing; a complaint
// about clarity/ease of use with no malfunction and nothing new being requested is a
// ux improvement; anything else defaults to help (the majority of questions).
const BUG_KEYWORDS = ['戻って', '動かない', 'エラー', 'できません', '反映されない', 'バグ', '壊れ', '直らない', 'おかしい'];
const FEATURE_KEYWORDS = ['してほしい', 'ほしい', '追加できる', 'できるようにしたい', '対応してほしい', '機能がほしい', '送れるように', 'できないか'];
const UX_KEYWORDS = ['分かりづらい', 'わかりづらい', 'わかりにくい', '分かりにくい', '使いづらい', '見づらい', '見にくい', 'ここが使いづらい'];

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
}

export function classifyIntent(message: string): AssistantIntentResult {
  const text = message.trim();
  if (includesAny(text, BUG_KEYWORDS)) return { intent: 'bug', confidence: 0.6 };
  if (includesAny(text, FEATURE_KEYWORDS)) return { intent: 'feature_request', confidence: 0.6 };
  if (includesAny(text, UX_KEYWORDS)) return { intent: 'ux_improvement', confidence: 0.6 };
  return { intent: 'help', confidence: 0.5 };
}

// A conversation can start as "help" but reveal a bug/request once the employee
// elaborates; take the most recent non-help signal over the running conversation.
export function classifyConversationIntent(history: AssistantMessage[], latestMessage: string): AssistantIntentResult {
  const userMessages = [...history.filter(m => m.role === 'user').map(m => m.content), latestMessage];
  for (let i = userMessages.length - 1; i >= 0; i -= 1) {
    const result = classifyIntent(userMessages[i]);
    if (result.intent !== 'help') return result;
  }
  return classifyIntent(latestMessage);
}

// Minimum signal, in V1, before the assistant offers the confirmation buttons: at
// least one clarifying round has happened, or the report is already detailed enough
// on its own. This intentionally never fires for 'help' (see analyzeImprovement).
export function isReadyForConfirmation(intent: AssistantIntent, history: AssistantMessage[], latestMessage: string): boolean {
  if (intent === 'help') return false;
  const userTurns = history.filter(m => m.role === 'user').length + 1;
  return userTurns >= 2 || latestMessage.trim().length >= 40;
}
