import { getPublicSurvey } from '@/lib/data';
import { ThanksPanel } from '@/components/survey/ThanksPanel';
import { googleReviewMode } from '@/lib/survey';

export const metadata = { robots: { index: false, follow: false } };

export default async function Thanks({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicSurvey(slug);
  if (!data) {
    return <main className="survey-phone" style={{ padding: 24 }}>現在このアンケートは公開されていません。</main>;
  }
  const config = data.version.config;
  return (
    <main className="survey-phone" style={{ padding: '10vh 16px', background: config.backgroundColor }}>
      <ThanksPanel
        slug={slug}
        text={config.completionText}
        reviewUrl={googleReviewMode(config)==='all'?config.googleReviewUrl:null}
        primaryColor={config.primaryColor}
      />
    </main>
  );
}
