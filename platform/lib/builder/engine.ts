import type { BuilderBusinessType, BuilderContext, BuilderStep } from '@/types/database';
import { cloneTemplate, templateForBusiness } from './templates';
import { getThemeTemplate, themeIdForBusiness } from '@/lib/theme/templates';

export interface BuilderEngine {
  getNextStep(context: BuilderContext): BuilderStep | null;
  getMissingFields(context: BuilderContext): string[];
  isComplete(context: BuilderContext): boolean;
  applyAnswer(context: BuilderContext, stepId: string, value: unknown): BuilderContext;
}

const purposeOptions = [
  ['satisfaction', '顧客満足度を確認したい'], ['improvement', '店舗改善の意見を集めたい'],
  ['patient', '医院・クリニックの患者アンケート'], ['google_review', 'Google口コミ導線として使用したい'], ['other', 'その他'],
] as const;

export class RuleBasedBuilderEngine implements BuilderEngine {
  getNextStep(c: BuilderContext): BuilderStep | null {
    if (!c.purpose) { const descriptions:Record<string,string>={satisfaction:'お客様の満足度を確認します',improvement:'改善点やご要望を収集します',patient:'診療内容やスタッフ対応を確認します',google_review:'回答後に口コミページをご案内します',other:'目的を自由に設定します'}; return { id: 'purpose', question: 'これからアンケートを作成します。まず、どのような目的で使用するアンケートですか？', reason: '目的に合う質問構成と確認項目を選ぶためです。', required: true, inputType: 'choice', options: purposeOptions.map(([value, label]) => ({ value, label, description:descriptions[value] })) }; }
    if (c.purpose === 'other' && !c.purposeDetail) return { id: 'purposeDetail', question: 'どのような目的か、ひとことで教えてください。', reason: '目的に沿う構成を確認するためです。', required: true, inputType: 'text' };
    if (!c.storeName) return { id: 'storeName', question: 'どの店舗・医院のアンケートですか？', reason: 'アンケートの表示名と確認画面に使用します。', required: true, inputType: 'text' };
    if (!c.businessType) return { id: 'businessType', question: '業種を教えてください。', reason: '業種別のおすすめ質問を提案するためです。', required: true, inputType: 'choice', options: [['clinic','クリニック'],['restaurant','飲食店'],['salon','美容室'],['other','その他']].map(([value,label])=>({value,label})) };
    if (!c.startingPoint) return { id: 'startingPoint', question: 'すでにアンケート内容は決まっていますか？', reason: '決まっている内容を聞き直さず、必要な確認だけに絞るためです。', required: true, inputType: 'choice', options: [['decided','ほぼ決まっている'],['partial','一部だけ決まっている'],['none','何も決まっていない']].map(([value,label])=>({value,label})) };
    if (!c.template) {
      const recommended = templateForBusiness(c.businessType);
      const options = recommended ? [{ value: recommended, label: 'おすすめ構成を使用', description: '業種に合う質問をまとめて用意します。' }, { value: 'custom', label: c.startingPoint === 'decided' ? '決まっている内容を使う' : '自分で作る' }] : [{ value: 'custom', label: '自分で作る' }];
      return { id: 'template', question: recommended ? 'おすすめ構成を用意しました。どの方法で質問を決めますか？' : '質問構成を自分で作成しますか？', reason: '質問文をゼロから入力する負担を減らすためです。', required: true, inputType: 'choice', options };
    }
    if (c.template === 'custom' && !c.questionsConfirmed) return { id: 'questions', question: '質問構成を作成してください。', reason: '質問文・回答形式・必須設定を自由に組み合わせられます。', required: true, inputType: 'question_builder' };
    if (!c.questions?.length) return { id: 'questions', question: '最初の質問を入力してください。作成後の通常編集画面でも追加・調整できます。', reason: 'アンケート生成には1問以上必要です。', required: true, inputType: 'text' };
    if (!c.questionsConfirmed) return { id: 'questionsConfirmed', question: '質問を1件ずつ確認してください。この構成で進めますか？', reason: '生成前に質問文・種類・必須設定を確認するためです。', required: true, inputType: 'question_review', options: [{ value: 'confirmed', label: 'この構成で進む' }] };
    if (c.anonymous === undefined) return { id: 'anonymous', question: 'このアンケートは匿名にしますか？', reason: '冒頭説明と個人情報の扱いを確定するためです。', required: true, inputType: 'choice', options: [{value:'true',label:'匿名にする'},{value:'false',label:'匿名にしない'}] };
    if (!c.introText) return { id: 'introText', question: 'アンケート冒頭の文章はこちらでいかがですか？', reason: '回答者へ目的と匿名性をわかりやすく伝えるためです。', required: true, inputType: 'text' };
    if (!c.mainColor) return { id: 'mainColor', question: '店舗のメインカラーはありますか？', reason: '公開画面のボタンや見出しに反映します。', required: true, inputType: 'color', options: [{value:'#5E969E',label:'おすすめ'}] };
    if (!c.logoMode) return { id: 'logoMode', question: 'ロゴを使用しますか？', reason: 'ヘッダーの表示方法を確定するためです。', required: true, inputType: 'choice', options: [{value:'none',label:'ロゴなし'},{value:'icon',label:'アイコンのみ'},{value:'upload',label:'ロゴをアップロード'}] };
    if (c.logoMode === 'upload' && !c.logoUrl) return { id: 'logoUrl', question: '使用するロゴ画像を選択してください。', reason: '公開画面に表示するロゴを確定するためです。', required: true, inputType: 'url' };
    if (c.googleReviewEnabled === undefined) return { id: 'googleReviewEnabled', question: 'Google口コミページへの導線を設置しますか？', reason: '完了画面の導線を全回答者に同条件で表示するためです。', required: true, inputType: 'choice', options: [{value:'true',label:'設置する'},{value:'false',label:'今は設定しない'}] };
    if (c.googleReviewEnabled && !c.googleReviewUrl) return { id: 'googleReviewUrl', question: 'Google口コミページのURLを入力してください。', reason: '完了画面のボタンの遷移先に使用します。', required: true, inputType: 'url' };
    if (!c.completionText) return { id: 'completionText', question: '回答後に表示する文章はこちらでいかがですか？', reason: '回答完了を明確に伝えるためです。', required: true, inputType: 'text' };
    return { id: 'summary', question: '作成内容の確認', reason: '正式データを保存する前の最終確認です。', required: true, inputType: 'summary' };
  }

  getMissingFields(c: BuilderContext): string[] {
    const missing: string[] = [];
    if (!c.purpose) missing.push('purpose'); if (!c.storeName) missing.push('storeName'); if (!c.businessType) missing.push('businessType');
    if (!c.startingPoint) missing.push('startingPoint'); if (!c.questions?.length) missing.push('questions'); if (!c.questionsConfirmed) missing.push('questionsConfirmed');
    if (c.anonymous === undefined) missing.push('anonymous'); if (!c.introText) missing.push('introText'); if (!c.mainColor) missing.push('mainColor'); if (!c.logoMode) missing.push('logoMode');
    if (c.logoMode === 'upload' && !c.logoUrl) missing.push('logoUrl'); if (c.googleReviewEnabled === undefined) missing.push('googleReviewEnabled');
    if (c.googleReviewEnabled && !c.googleReviewUrl) missing.push('googleReviewUrl'); if (!c.completionText) missing.push('completionText');
    return missing;
  }

  isComplete(c: BuilderContext) { return this.getMissingFields(c).length === 0; }

  applyAnswer(context: BuilderContext, stepId: string, value: unknown): BuilderContext {
    const next = { ...context, [stepId]: value } as BuilderContext;
    if (stepId === 'businessType' && context.businessType !== value) { delete next.template; delete next.questions; delete next.questionsConfirmed; const themeId=themeIdForBusiness(value as BuilderBusinessType);const theme=getThemeTemplate(themeId);next.themeId=themeId;next.mainColor=theme.config.primaryColor;next.introText=theme.config.introText;next.completionText=theme.config.completionText; }
    if (stepId === 'template') {
      if (value !== 'custom') { next.questions = cloneTemplate(value as Exclude<BuilderContext['template'], 'custom' | undefined>); const themeId=themeIdForBusiness(next.businessType??'other');const theme=getThemeTemplate(themeId);next.themeId=themeId;next.mainColor=theme.config.primaryColor;next.introText=theme.config.introText;next.completionText=theme.config.completionText; }
      delete next.questionsConfirmed;
    }
    if (stepId === 'questions') {
      if (Array.isArray(value)) {
        next.questions = (value as BuilderContext['questions'])?.map((question, index) => ({ ...question, sortOrder: index }));
        if (next.template === 'custom') next.questionsConfirmed = Boolean(next.questions?.length);
      } else {
        next.questions = [{ id: crypto.randomUUID(), type: 'text', title: String(value), description: '', required: true, sortOrder: 0, settings: {}, options: [] }];
      }
    }
    if (stepId === 'questionsConfirmed') next.questionsConfirmed = value === 'confirmed' || value === true;
    if (stepId === 'anonymous' || stepId === 'googleReviewEnabled') (next as Record<string, unknown>)[stepId] = value === true || value === 'true';
    if (stepId === 'googleReviewEnabled' && !(next.googleReviewEnabled)) delete next.googleReviewUrl;
    if (stepId === 'logoMode' && value !== 'upload') delete next.logoUrl;
    return next;
  }
}

export const ruleBasedBuilderEngine = new RuleBasedBuilderEngine();

export const defaultIntroText = (anonymous: boolean) => anonymous
  ? 'こちらのアンケートは匿名です。今後のサービス改善のため、率直なご意見をお聞かせください。'
  : '今後のサービス改善のため、率直なご意見をお聞かせください。';
export const defaultCompletionText = 'ご回答ありがとうございました。いただいたご意見は、今後より良いサービスづくりに活用させていただきます。';
