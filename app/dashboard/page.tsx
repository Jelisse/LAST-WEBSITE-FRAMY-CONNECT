import { env } from 'cloudflare:workers';
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
  searchParams: Promise<{ compra?: string; pagamento?: string }>;
}) {
  const user = await requireChatGPTUser('/dashboard');
  const query = await searchParams;
  const t = await getTranslations();
  const paidProduct =
    query.pagamento && /^[a-zA-Z0-9-]{1,80}$/.test(query.pagamento)
      ? await env.DB.prepare(
          "SELECT id FROM paysuite_payments WHERE id=? AND owner_id=? AND kind='product' AND status='paid'",
        )
          .bind(query.pagamento, user.userId)
          .first<{ id: string }>()
      : null;
  return (
    <>
      {paidProduct && (
        <aside className="section-wrap post-purchase-banner">
          <span className="eyebrow">{t('PAGAMENTO CONFIRMADO')}</span>
          <h2>{t('Configure o perfil do seu produto')}</h2>
          <p>
            {t(
              'Adicione os seus dados e escolha Publicar perfil. A ligação à encomenda é automática; não precisa de voltar a pagar.',
            )}
          </p>
          <Link
            className="home-text-link"
            href={
              '/checkout/retorno?payment=' + encodeURIComponent(paidProduct.id)
            }
          >
            {t('Ver confirmação da encomenda')}
          </Link>
        </aside>
      )}
      <Workspace displayName={user.fullName ?? 'Olá'} />
    </>
  );
}
