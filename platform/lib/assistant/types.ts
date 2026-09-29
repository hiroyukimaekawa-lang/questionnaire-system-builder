// Shared types for the internal Help/Improvement assistant (V1).
//
// These types are the seam between the questionnaire app and whatever answers
// questions or classifies intent - currently a deterministic, no-external-call
// fallback provider (see fallback-provider.ts), later a CRESTIX AI OS provider.
// Nothing questionnaire-specific about intent classification or improvement
// proposals should leak into a specific AI vendor's SDK; only
// QuestionnaireAssistantProvider crosses that boundary.

export type AssistantPageType =
  | 'manage_list'
  | 'survey_editor'
  | 'survey_builder'
  | 'responses'
  | 'analytics'
  | 'users'
  | 'account'
  | 'unknown';

export type AssistantEnvironment = 'development' | 'preview' | 'production';

// Automatically generated when the assistant opens - never typed by the employee.
// Deliberately excludes anything that could carry respondent PII or secrets:
// no answers, no respondent names, no cookies/tokens, no raw DOM content.
export interface QuestionnaireAssistantContext {
  system: 'questionnaire';
  pagePath: string;
  pageType: AssistantPageType;
  surveyId?: string;
  draftVersionId?: string;
  userRole: 'admin' | 'sales';
  activeSection?: string;
  environment: AssistantEnvironment;
  appCommitSha?: string;
}

// Classified internally only; never shown to the employee as a label.
export type AssistantIntent = 'help' | 'bug' | 'ux_improvement' | 'feature_request';

export interface AssistantIntentResult {
  intent: AssistantIntent;
  confidence: number;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ImprovementRisk = 'low' | 'medium' | 'high' | 'critical';

// What the provider proposes before the context is attached. Kept separate from
// ImprovementProposal so a provider never has to fabricate a context of its own.
export interface ImprovementProposalDraft {
  category: Exclude<AssistantIntent, 'help'>;
  summary: string;
  currentBehavior: string;
  expectedBehavior: string;
  reproductionSteps: string[];
  affectedArea: string[];
  possibleRootCause?: string;
  implementationProposal: string;
  risk: ImprovementRisk;
  regressionTests: string[];
}

export interface ImprovementProposal extends ImprovementProposalDraft {
  context: QuestionnaireAssistantContext;
}

export interface AssistantReply {
  message: string;
  // true once enough has been gathered to offer the confirmation buttons
  // (never true for plain 'help' replies - help never becomes an Improvement Request).
  readyForConfirmation: boolean;
  proposal?: ImprovementProposalDraft;
}

export interface HelpAnswerInput {
  message: string;
  context: QuestionnaireAssistantContext;
  history: AssistantMessage[];
}

export interface IntentAnalysisInput {
  message: string;
  history: AssistantMessage[];
}

export interface ImprovementAnalysisInput {
  history: AssistantMessage[];
  context: QuestionnaireAssistantContext;
}

// The only interface questionnaire code is allowed to depend on for "the AI part".
// Swap the implementation (fallback-provider.ts today, a CrestixAiOsProvider later)
// without touching the chat UI, the API routes, or the improvement-request flow.
export interface QuestionnaireAssistantProvider {
  answerHelp(input: HelpAnswerInput): Promise<AssistantReply>;
  analyzeIntent(input: IntentAnalysisInput): Promise<AssistantIntentResult>;
  analyzeImprovement(input: ImprovementAnalysisInput): Promise<ImprovementProposalDraft>;
}
