import { database } from '@/lib/server-db';
import { corporatePlan } from '@/lib/server-corporate';
import {
  companyCardProfile,
  companyPresentation,
  companyTemplate,
  companyCard,
} from '@/lib/company-cards';
import { MobileProfile } from '@/components/mobile-profile';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Framy Connect',
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  const row = await database()
    .prepare(
      `SELECT c.published_json,t.template_json,o.owner_id FROM corporate_cards c JOIN corporate_templates t ON t.organisation_id=c.organisation_id JOIN corporate_active_organisations o ON o.id=c.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=c.account_id AND m.active=1 WHERE c.id=? AND c.published_json IS NOT NULL`,
    )
    .bind(id)
    .first<{
      published_json: string;
      template_json: string;
      owner_id: string;
    }>();
  if (!row) notFound();
  try {
    await corporatePlan(row.owner_id);
  } catch {
    notFound();
  }
  return (
    <main id="main" className="standalone-mobile-profile">
      <MobileProfile
        profile={companyCardProfile(
          companyCard(JSON.parse(row.published_json)),
          companyTemplate(JSON.parse(row.template_json)),
          id,
        )}
        companyTemplate={companyPresentation(
          companyTemplate(JSON.parse(row.template_json)),
        )}
        published
        measure={false}
      />
    </main>
  );
}
