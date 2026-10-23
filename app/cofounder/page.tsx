import { DirectorWorkspace } from '@/components/director-workspace';
import { getTranslations } from '@/lib/server-i18n';
import { ApplicationManager } from '@/components/application-manager';
import { ProductManager } from '@/components/product-manager';
import { AccountManager } from '@/components/account-manager';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { orderLabels } from '@/lib/domain';
import '../entrar/style.css';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const t = await getTranslations();
  await requireChatGPTUser('/cofounder');
  const counts = await database()
    .prepare(
      "SELECT json_extract(data_json,'$.status') AS status,COUNT(*) AS total FROM sandbox_orders GROUP BY status",
    )
    .all<{ status: string; total: number }>();
  const agents = await database()
    .prepare(
      "SELECT COUNT(*) AS total FROM manager_records WHERE kind='agent' AND json_extract(data_json,'$.active')=1",
    )
    .first<{ total: number }>();
  return (
    <DirectorWorkspace
      overview={
        <>
          <p>
            {t(
              'Visão geral do negócio. As operações e as finanças são geridas pelo Gestor.',
            )}
          </p>
          <article>
            <h2>{t('Agentes activos')}</h2>
            <p>{agents?.total ?? 0}</p>
          </article>
          <h2>{t('Pedidos por etapa')}</h2>
          {counts.results.length ? (
            counts.results.map((c) => (
              <article key={c.status}>
                <h3>{t(orderLabels[c.status] ?? c.status)}</h3>
                <p>
                  {c.total}
                  {t(' pedidos')}
                </p>
              </article>
            ))
          ) : (
            <p>{t('Ainda não existem pedidos.')}</p>
          )}
        </>
      }
      accounts={<AccountManager />}
      applications={<ApplicationManager />}
      products={<ProductManager />}
    />
  );
}
