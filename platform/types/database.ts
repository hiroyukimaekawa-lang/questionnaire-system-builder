export type Role = 'admin' | 'sales';
export type SurveyStatus = 'draft' | 'published' | 'unpublished' | 'archived';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'rating_10' | 'textarea' | 'text';
export type SurveyThemeId = 'clinic-clean' | 'restaurant-clean' | 'salon-clean';
export type HeroBackgroundType = 'solid' | 'soft-gradient';
export type GoogleReviewMode = 'disabled' | 'all';
export type RuleOperator = 'gte' | 'lte' | 'eq';

export interface RuleCondition { questionId: string; operator: RuleOperator; value: number }
export interface CompletionRule {
  id: string;
  logic: 'and' | 'or';
  conditions: RuleCondition[];
  completionMessage?: string;
  needsFollowUp?: boolean;
}

export interface SurveyConfig {
  title: string; description: string; introText: string; anonymousText: string;
  completionText: string; submitLabel: string; primaryColor: string;
  backgroundColor: string; logoUrl: string | null; iconUrl: string | null;
  googleReviewUrl: string | null;
  googleReviewMode?: GoogleReviewMode;
  completionRules?: CompletionRule[];
  themeId?: SurveyThemeId; secondaryColor?: string; heroBackgroundType?: HeroBackgroundType;
  heroTitle?: string; heroSubtitle?: string; logoMode?: BuilderLogoMode;
  cardRadius?: number; buttonLabel?: string;
  accentColor?: string; heroOverlayColor?: string; heroTextColor?: string;
  buttonBackground?: string; buttonTextColor?: string; cardBackground?: string;
  logoBadgeBackground?: string;
}
export interface QuestionOption { id?: string; label: string; value: string; sortOrder: number }
export interface SurveyQuestion {
  id: string; type: QuestionType; title: string; description: string;
  required: boolean; sortOrder: number; settings: { minLabel?: string; maxLabel?: string; placeholder?: string; presentation?: 'radio' | 'select'; maxScore?: 5 | 10 };
  options: QuestionOption[];
}
export interface SurveyVersion { id: string; surveyId: string; version: number; status: 'draft'|'published'|'superseded'; config: SurveyConfig; questions: SurveyQuestion[] }
export interface SurveySummary { id: string; name: string; slug: string; industry: string; status: SurveyStatus; ownerName: string | null; updatedAt: string; publishedAt: string | null; responseCount: number }
export type AnswerValue = string | string[] | number;

export type BuilderPurpose = 'satisfaction' | 'improvement' | 'patient' | 'google_review' | 'other';
export type BuilderBusinessType = 'clinic' | 'restaurant' | 'salon' | 'other';
export type BuilderStartingPoint = 'decided' | 'partial' | 'none';
export type BuilderLogoMode = 'none' | 'icon' | 'upload';
export type BuilderTemplate = 'clinic_standard' | 'restaurant_standard' | 'salon_standard' | 'custom';

export interface BuilderContext {
  purpose?: BuilderPurpose;
  purposeDetail?: string;
  storeName?: string;
  businessType?: BuilderBusinessType;
  startingPoint?: BuilderStartingPoint;
  template?: BuilderTemplate;
  questions?: SurveyQuestion[];
  questionsConfirmed?: boolean;
  anonymous?: boolean;
  introText?: string;
  mainColor?: string;
  logoMode?: BuilderLogoMode;
  logoUrl?: string | null;
  googleReviewEnabled?: boolean;
  googleReviewUrl?: string | null;
  completionText?: string;
  themeId?: SurveyThemeId;
  sourceSurveyId?: string;
}

export type BuilderInputType = 'choice' | 'text' | 'url' | 'color' | 'question_builder' | 'question_review' | 'summary';
export interface BuilderStep {
  id: string;
  question: string;
  reason: string;
  required: boolean;
  inputType: BuilderInputType;
  options?: Array<{ value: string; label: string; description?: string }>;
}
