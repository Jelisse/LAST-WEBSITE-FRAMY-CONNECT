import { getTranslations } from '@/lib/server-i18n';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { Workspace } from '@/components/workspace';
import Link from '@/components/hard-link';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Minha Conta'),
    robots: { index: false, follow: false },
  };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ compra?: string }>;
}) {
  const user = await requireChatGPTUser('/dashboard');
  const query = await searchParams;
  const t = await getTranslations();
  const purchase =
    query.compra &&
    [
      'card',
      'pvc',
      'wood',
      'metal',
      'keychain',
      'keychain-leather',
      'kit',
    ].includes(query.compra)
      ? query.compra
      : null;
  return (
    <>
      {purchase && (
        <aside className="section-wrap purchase-maintenance">
          <p>
            {t(
              'Guarde e publique o seu perfil. Depois volte à compra para confirmar a entrega e o pagamento.',
            )}
          </p>
          <Link
            className="btn btn-primary"
            href={'/comprar?formato=' + purchase}
          >
            {t('Voltar à compra')}
          </Link>
        </aside>
      )}
      <Workspace displayName={user.fullName ?? 'Olá'} />
    </>
  );
}
