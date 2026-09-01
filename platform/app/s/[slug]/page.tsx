import { permanentRedirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LegacyPublicSurvey({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/${slug}`);
}
