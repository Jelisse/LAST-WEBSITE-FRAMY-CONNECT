import { UsersRound, ClipboardList, ShoppingBag } from 'lucide-react';
import { getTranslations } from '@/lib/server-i18n';
import { DashboardTools } from '@/components/mobile-navigation';
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
  const user = await requireChatGPTUser('/cofounder');
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
    <main id="main" className="staff-page">
      <header>
        <DashboardTools />
        <div>
          <h1>
            {t('Direcção · ')}
            {user.displayName}
          </h1>
          <p>
            {t(
              'Visão geral do negócio. As operações e as finanças são geridas pelo Gestor.',
            )}
          </p>
        </div>
      </header>
      <article>
        <h2>{t('Agentes activos')}</h2>
        <p>{agents?.total ?? 0}</p>
      </article>
      <details className="staff-section">
        <summary>
          <UsersRound size={20} aria-hidden="true" />
          {t('Contas e acessos')}
        </summary>
        <AccountManager />
      </details>
      <details className="staff-section">
        <summary>
          <ClipboardList size={20} aria-hidden="true" />
          {t('Candidaturas')}
        </summary>
        <ApplicationManager />
      </details>
      <details className="staff-section">
        <summary>
          <ShoppingBag size={20} aria-hidden="true" />
          {t('Produtos e planos')}
        </summary>
        <ProductManager />
      </details>
      <h2>{t('Pedidos por etapa')}</h2>
      {counts.results.length ? (
        counts.results.map((c) => (
          <article key={c.status}>
            <h2>{t(orderLabels[c.status] ?? c.status)}</h2>
            <p>
              {c.total}
              {t(' pedidos')}
            </p>
          </article>
        ))
      ) : (
        <p>{t('Ainda não existem pedidos.')}</p>
      )}
    </main>
  );
}
