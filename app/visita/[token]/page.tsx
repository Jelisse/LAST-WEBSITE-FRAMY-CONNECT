import { notFound } from 'next/navigation';
import { publicVisitorBook } from '@/lib/server-visitor-book';
import { VisitorRegistration } from '@/components/visitor-registration';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Livro de visitas',
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const b = await publicVisitorBook((await params).token);
  if (!b) notFound();
  return (
    <VisitorRegistration
      token={b.public_id}
      logoUrl={b.logo_url || ''}
      organisation={b.organisation_name || ''}
      reception={b.name}
      welcome={b.welcome}
      days={b.retention_days}
      purposes={JSON.parse(b.purposes_json)}
      departments={JSON.parse(b.departments_json)}
    />
  );
}
