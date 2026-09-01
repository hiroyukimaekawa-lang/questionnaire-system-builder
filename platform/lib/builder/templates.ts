import type { BuilderBusinessType, BuilderTemplate, SurveyQuestion } from '@/types/database';

const option = (label: string, value: string, sortOrder: number) => ({ label, value, sortOrder });
const question = (id: string, type: SurveyQuestion['type'], title: string, sortOrder: number, required = true, options: SurveyQuestion['options'] = []): SurveyQuestion => ({
  id, type, title, description: '', required, sortOrder,
  settings: type === 'rating_10' ? { minLabel: '非常に不満', maxLabel: '非常に満足' } : type === 'textarea' ? { placeholder: '率直なご意見をお聞かせください。' } : {},
  options,
});

export const builderTemplates: Record<Exclude<BuilderTemplate, 'custom'>, { label: string; businessType: BuilderBusinessType; questions: SurveyQuestion[] }> = {
  clinic_standard: {
    label: 'クリニック標準', businessType: 'clinic', questions: [
      question('clinic-purpose', 'single_choice', '本日のご来院目的を教えてください。', 0, true, [option('診察', 'consultation', 0), option('検査', 'exam', 1), option('診察と検査', 'both', 2), option('その他', 'other', 3)]),
      question('clinic-care', 'rating_10', '診療内容には満足いただけましたか？', 1),
      question('clinic-staff', 'rating_10', 'スタッフの対応には満足いただけましたか？', 2),
      question('clinic-reason', 'single_choice', '当院を選ばれた理由を教えてください。', 3, false, [option('自宅・職場から近い', 'nearby', 0), option('Google検索・マップ', 'google', 1), option('紹介', 'referral', 2), option('その他', 'other', 3)]),
      question('clinic-comment', 'textarea', 'ご意見・ご要望をお聞かせください。', 4, false),
    ],
  },
  restaurant_standard: {
    label: '飲食店標準', businessType: 'restaurant', questions: [
      question('restaurant-use', 'single_choice', '本日はどのようにご利用いただきましたか？', 0, true, [option('店内飲食', 'dine-in', 0), option('テイクアウト', 'takeout', 1), option('その他', 'other', 2)]),
      question('restaurant-food', 'rating_10', 'お料理・ドリンクはいかがでしたか？', 1),
      question('restaurant-staff', 'rating_10', 'スタッフの接客はいかがでしたか？', 2),
      question('restaurant-space', 'rating_10', '店内の雰囲気・居心地はいかがでしたか？', 3),
      question('restaurant-comment', 'textarea', '本日のご利用について、率直なご感想をお聞かせください。', 4, false),
    ],
  },
  salon_standard: {
    label: '美容室標準', businessType: 'salon', questions: [
      question('salon-menu', 'single_choice', '本日はどのメニューをご利用されましたか？', 0, true, [option('カット', 'cut', 0), option('カラー', 'color', 1), option('パーマ', 'perm', 2), option('その他', 'other', 3)]),
      question('salon-finish', 'rating_10', '仕上がりはいかがでしたか？', 1),
      question('salon-staff', 'rating_10', 'スタッフの対応はいかがでしたか？', 2),
      question('salon-space', 'rating_10', '店内の雰囲気はいかがでしたか？', 3),
      question('salon-comment', 'textarea', 'ご感想・ご要望をお聞かせください。', 4, false),
    ],
  },
};

export function templateForBusiness(type: BuilderBusinessType): Exclude<BuilderTemplate, 'custom'> | null {
  return type === 'clinic' ? 'clinic_standard' : type === 'restaurant' ? 'restaurant_standard' : type === 'salon' ? 'salon_standard' : null;
}

export function cloneTemplate(id: Exclude<BuilderTemplate, 'custom'>): SurveyQuestion[] {
  return structuredClone(builderTemplates[id].questions);
}
