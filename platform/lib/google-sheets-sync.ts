import type { AnswerValue, SurveyVersion } from '@/types/database';

type PublicSurvey = {
  survey: {
    id: string;
    name: string;
    slug: string;
    industry: string;
    status: string;
  };
  version: SurveyVersion;
};

type CompletionResult = {
  needsFollowUp?: boolean;
};

export type GoogleSheetsPayload = {
  store: {
    id: string;
    name: string;
    industry: string;
    slug: string;
    status: string;
    googleReviewUrl: string;
  };
  response: {
    id: string;
    submittedAt: string;
    surveyName: string;
    version: number;
    averageScore: number | null;
    totalScore: number | null;
    reviewEligible: boolean;
    needsFollowUp: boolean;
  };
  answers: Array<{
    questionId: string;
    questionTitle: string;
    questionType: string;
    value: AnswerValue;
    score: number | null;
  }>;
  events: Array<{
    id: string;
    createdAt: string;
    type: string;
    metadata: Record<string, unknown>;
  }>;
};

export function buildGoogleSheetsPayload({
  publicSurvey,
  answers,
  responseId,
  submittedAt,
  completion,
  reviewEligible,
}: {
  publicSurvey: PublicSurvey;
  answers: Record<string, AnswerValue>;
  responseId: string;
  submittedAt: string;
  completion: CompletionResult;
  reviewEligible: boolean;
}): GoogleSheetsPayload {
  let scoreTotal = 0;
  let scoreCount = 0;

  const answerRows = publicSurvey.version.questions.flatMap((question) => {
    const value = answers[question.id];
    if (value === undefined || value === null || value === '') return [];
    const score = question.type === 'rating_10' && typeof value === 'number' ? value : null;
    if (score !== null) {
      scoreTotal += score;
      scoreCount += 1;
    }
    return [{
      questionId: question.id,
      questionTitle: question.title,
      questionType: question.type,
      value,
      score,
    }];
  });

  const averageScore = scoreCount ? Math.round((scoreTotal / scoreCount) * 100) / 100 : null;
  const config = publicSurvey.version.config;

  return {
    store: {
      id: publicSurvey.survey.id,
      name: publicSurvey.survey.name,
      industry: publicSurvey.survey.industry,
      slug: publicSurvey.survey.slug,
      status: publicSurvey.survey.status,
      googleReviewUrl: config.googleReviewUrl || '',
    },
    response: {
      id: responseId,
      submittedAt,
      surveyName: config.title?.trim() || `${publicSurvey.survey.name} アンケート`,
      version: publicSurvey.version.version,
      averageScore,
      totalScore: scoreCount ? scoreTotal : null,
      reviewEligible,
      needsFollowUp: completion.needsFollowUp === true,
    },
    answers: answerRows,
    events: [{
      id: crypto.randomUUID(),
      createdAt: submittedAt,
      type: 'response_submitted',
      metadata: {
        reviewEligible,
        needsFollowUp: completion.needsFollowUp === true,
      },
    }],
  };
}

export type GoogleSheetsSyncAttempt = {
  attempted: boolean;
  ok: boolean;
  error?: string;
};

export async function sendGoogleSheetsPayload(payload: GoogleSheetsPayload): Promise<GoogleSheetsSyncAttempt> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim();
  if (!url || !secret) return { attempted: false, ok: false, error: 'Google Sheets webhook is not configured.' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret, ...payload }),
      redirect: 'follow',
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) return { attempted: true, ok: false, error: `Webhook HTTP ${response.status}: ${raw.slice(0, 300)}` };

    let result: { ok?: boolean; error?: string } = {};
    try {
      result = JSON.parse(raw) as { ok?: boolean; error?: string };
    } catch {
      return { attempted: true, ok: false, error: `Webhook returned non-JSON: ${raw.slice(0, 300)}` };
    }
    if (result.ok !== true) return { attempted: true, ok: false, error: result.error || 'Google Sheets webhook rejected the payload.' };
    return { attempted: true, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Google Sheets sync error.';
    return { attempted: true, ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
