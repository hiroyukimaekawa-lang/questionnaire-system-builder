import { getPublicSurvey } from '@/lib/data';
import { ThanksPanel } from '@/components/survey/ThanksPanel';
import { googleReviewMode } from '@/lib/survey';
import {isGoogleReviewScoreGated} from '@/lib/google-review';

export const metadata = { robots: { index: false, follow: false } };

export default async function Thanks({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ 'sales-test'?: string }> }) {
  const { slug } = await params;
  const testMode = slug === 'survey-1793862622762' && (await searchParams)['sales-test'] === '1';
  const data = await getPublicSurvey(slug);
  if (!data) {
    return <main className="survey-phone" style={{ padding: 24 }}>現在このアンケートは公開されていません。</main>;
  }
  const config = data.version.config;
  const reviewMode = googleReviewMode(config);
  return (
    <main className="survey-phone thanks-page" style={{ background: config.backgroundColor }}>
      <ThanksPanel
        slug={slug}
        text={config.completionText}
        reviewUrl={reviewMode === 'disabled' ? null : config.googleReviewUrl}
        reviewMode={reviewMode}
        primaryColor={config.primaryColor}
        reviewPromptText={config.googleReviewPromptText}
        scoreGated={isGoogleReviewScoreGated(config)}
        salesTestMode={testMode}
      />
    </main>
  );
}
