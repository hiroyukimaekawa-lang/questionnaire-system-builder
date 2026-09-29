import {findKnowledgeMatch} from './knowledge-match';
import {classifyConversationIntent} from './intent';
import type {
  AssistantIntentResult,
  AssistantPageType,
  AssistantReply,
  HelpAnswerInput,
  ImprovementAnalysisInput,
  ImprovementProposalDraft,
  ImprovementRisk,
  IntentAnalysisInput,
  QuestionnaireAssistantProvider,
} from './types';

const NO_MATCH_REPLY = '現在の仕様からは確認できません。改善要望または確認事項として整理しますか？';

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

// Pages that touch business logic (identity/response/auth) carry more regression
// risk than a pure copy/UI question - a deliberately simple, explainable mapping,
// not a substitute for a human triage.
function inferRisk(pageType: AssistantPageType): ImprovementRisk {
  if (pageType === 'users') return 'high';
  if (pageType === 'survey_editor' || pageType === 'survey_builder' || pageType === 'responses') return 'medium';
  return 'low';
}

const EXPECTED_BEHAVIOR_BY_CATEGORY: Record<ImprovementProposalDraft['category'], string> = {
  bug: '報告された不具合が発生しないこと',
  ux_improvement: '報告された分かりにくさが改善されること',
  feature_request: '要望された機能が利用できること',
};

// Deterministic, no-external-call implementation of QuestionnaireAssistantProvider.
// This is the entire V1 "AI" - see docs/AI_OS_INTEGRATION.md for why this boundary
// exists and how a CrestixAiOsProvider replaces it later without touching the chat
// UI, API routes, or improvement-request flow.
export class FallbackAssistantProvider implements QuestionnaireAssistantProvider {
  async analyzeIntent(input: IntentAnalysisInput): Promise<AssistantIntentResult> {
    return classifyConversationIntent(input.history, input.message);
  }

  async answerHelp(input: HelpAnswerInput): Promise<AssistantReply> {
    const match = findKnowledgeMatch(input.message, input.context.pageType);
    return {
      message: match ? match.answer : NO_MATCH_REPLY,
      readyForConfirmation: false,
    };
  }

  async analyzeImprovement(input: ImprovementAnalysisInput): Promise<ImprovementProposalDraft> {
    const userMessages = input.history.filter(m => m.role === 'user').map(m => m.content.trim()).filter(Boolean);
    const latest = userMessages[userMessages.length - 1] ?? '';
    const {intent} = classifyConversationIntent(input.history, latest);
    const category = intent === 'help' ? 'ux_improvement' : intent;
    const affectedArea = [input.context.pageType, input.context.activeSection].filter((v): v is string => Boolean(v));
    return {
      category,
      summary: truncate(latest, 120) || '(要ヒアリング)',
      currentBehavior: userMessages.join(' / ') || '(未入力)',
      expectedBehavior: EXPECTED_BEHAVIOR_BY_CATEGORY[category],
      reproductionSteps: category === 'bug' ? userMessages : [],
      affectedArea: affectedArea.length ? affectedArea : ['unknown'],
      implementationProposal: '(開発担当による調査が必要です)',
      risk: inferRisk(input.context.pageType),
      regressionTests: [],
    };
  }
}

export const fallbackAssistantProvider = new FallbackAssistantProvider();
