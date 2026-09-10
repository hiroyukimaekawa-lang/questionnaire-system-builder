'use server';

import { safeGoogleReviewUrl } from '@/lib/google-review';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { completionSettingsConfig } from '@/lib/config';
import {
  parseCompletionRulesJson,
  parseGoogleReviewRuleJson,
  validateGoogleReviewRuleForQuestions,
  validateRulesForQuestions,
} from '@/lib/completion-validation';
import type { GoogleReviewMode, SurveyQuestion } from '@/types/database';

async function staff() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('ログインが必要です。');
  const { data: profile } = await s.from('profiles').select('role,is_active').eq('id', user.id).single();
  if (!profile?.is_active || (profile.role !== 'admin' && profile.role !== 'sales')) throw new Error('権限がありません。');
  return s;
}

function reviewMode(value: FormDataEntryValue | null): GoogleReviewMode {
  if (value === 'all' || value === 'score') return value;
  return 'disabled';
}

export async function saveCompletionSettingsAction(
  surveyId: string,
  versionId: string,
  _: unknown,
  form: FormData,
) {
  try {
    const s = await staff();
    const { data: survey } = await s.from('surveys').select('id').eq('id', surveyId).neq('status', 'archived').maybeSingle();
    if (!survey) return { error: 'アンケートを更新できませんでした。' };

    const mode = reviewMode(form.get('googleReviewMode'));
    const reviewUrl = String(form.get('googleReviewUrl') || '').trim();
    if (reviewUrl) {
      if (!safeGoogleReviewUrl(reviewUrl)) return { error: 'Google口コミURLはhttp/https形式で入力してください。' };
    }
    if (mode !== 'disabled' && !reviewUrl) return { error: 'Google口コミURLを入力してください。' };

    const completionRules = parseCompletionRulesJson(String(form.get('completionRules') || '[]'));
    const [{ data: version }, { data: rows }] = await Promise.all([
      s.from('survey_versions').select('config').eq('id', versionId).eq('survey_id', surveyId).eq('status', 'draft').single(),
      s.from('questions').select('id,type,title,description,required,sort_order,settings,question_options(id,label,value,sort_order)').eq('survey_version_id', versionId),
    ]);
    if (!version) return { error: '下書きが見つかりません。' };

    const questions: SurveyQuestion[] = (rows ?? []).map((question: any) => ({
      id: question.id,
      type: question.type,
      title: question.title,
      description: question.description,
      required: question.required,
      sortOrder: question.sort_order,
      settings: question.settings ?? {},
      options: (question.question_options ?? []).map((option: any) => ({
        id: option.id,
        label: option.label,
        value: option.value,
        sortOrder: option.sort_order,
      })),
    }));

    const completionValidation = validateRulesForQuestions(completionRules, questions);
    if (completionValidation) return { error: completionValidation };

    const googleReviewRule = mode === 'score'
      ? parseGoogleReviewRuleJson(String(form.get('googleReviewRule') || ''))
      : null;
    if (googleReviewRule) {
      const reviewValidation = validateGoogleReviewRuleForQuestions(googleReviewRule, questions);
      if (reviewValidation) return { error: reviewValidation };
    }

    const config = completionSettingsConfig(version.config, mode, reviewUrl, completionRules, googleReviewRule);
    if(form.has('reviewTextQuestionId')) {
      const id=String(form.get('reviewTextQuestionId')||'');
      if(id!=='__legacy') {
        if(id&&!questions.some(q=>q.id===id&&q.type==='textarea'))return {error:'口コミ用文章の質問を選び直してください。'};
        config.reviewTextQuestionId=id||null;
      }
    }
    const { error } = await s.from('survey_versions').update({ config }).eq('id', versionId).eq('survey_id', surveyId).eq('status', 'draft');
    if (error) throw error;

    revalidatePath(`/admin/surveys/${surveyId}`);
    return { success: '回答後設定を下書き保存しました。公開画面へ反映するには「変更内容を公開する」を押してください。' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '回答後設定を保存できませんでした。' };
  }
}
