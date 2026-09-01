export type Role = 'admin' | 'sales';
export type SurveyStatus = 'draft' | 'published' | 'unpublished' | 'archived';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'rating_10' | 'textarea' | 'text';

export interface SurveyConfig {
  title: string; description: string; introText: string; anonymousText: string;
  completionText: string; submitLabel: string; primaryColor: string;
  backgroundColor: string; logoUrl: string | null; iconUrl: string | null;
  googleReviewUrl: string | null;
}
export interface QuestionOption { id?: string; label: string; value: string; sortOrder: number }
export interface SurveyQuestion {
  id: string; type: QuestionType; title: string; description: string;
  required: boolean; sortOrder: number; settings: { minLabel?: string; maxLabel?: string; placeholder?: string };
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
  sourceSurveyId?: string;
}

export type BuilderInputType = 'choice' | 'text' | 'url' | 'color' | 'question_review' | 'summary';
export interface BuilderStep {
  id: string;
  question: string;
  reason: string;
  required: boolean;
  inputType: BuilderInputType;
  options?: Array<{ value: string; label: string; description?: string }>;
}
