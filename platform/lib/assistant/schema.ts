import {z} from 'zod';

export const assistantPageTypeSchema = z.enum(['manage_list', 'survey_editor', 'survey_builder', 'responses', 'analytics', 'users', 'account', 'unknown']);
export const assistantEnvironmentSchema = z.enum(['development', 'preview', 'production']);

export const assistantContextSchema = z.object({
  system: z.literal('questionnaire'),
  pagePath: z.string().max(300),
  pageType: assistantPageTypeSchema,
  surveyId: z.string().max(100).optional(),
  draftVersionId: z.string().max(100).optional(),
  userRole: z.enum(['admin', 'sales']),
  activeSection: z.string().max(100).optional(),
  environment: assistantEnvironmentSchema,
  appCommitSha: z.string().max(64).optional(),
});

export const assistantMessageSchema = z.object({role: z.enum(['user', 'assistant']), content: z.string().max(2000)});

export const improvementProposalDraftSchema = z.object({
  category: z.enum(['bug', 'ux_improvement', 'feature_request']),
  summary: z.string().min(1).max(300),
  currentBehavior: z.string().max(2000),
  expectedBehavior: z.string().max(2000),
  reproductionSteps: z.array(z.string().max(500)).max(20),
  affectedArea: z.array(z.string().max(100)).max(20),
  possibleRootCause: z.string().max(1000).optional(),
  implementationProposal: z.string().max(2000),
  risk: z.enum(['low', 'medium', 'high', 'critical']),
  regressionTests: z.array(z.string().max(300)).max(50),
});
