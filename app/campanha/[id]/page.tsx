import { CorporateCampaign } from '@/components/corporate-campaign';
export const metadata = {
  title: 'Contacto da equipa | Framy Connect',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CorporateCampaign id={id} />;
}
