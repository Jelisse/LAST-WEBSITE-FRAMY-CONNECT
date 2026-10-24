'use client';
import { useI18n } from './language-provider';
import { contactLinks } from '@/lib/support-contact';
export function PurchaseQuotation({ summary }: { summary: string }) {
  const { t } = useI18n();
  const links = contactLinks('sales', t('Pedido de cotação'), summary);
  return (
    <section className="purchase-quotation" aria-labelledby="quotation-title">
      <h3 id="quotation-title">{t('Vamos confirmar a sua cotação')}</h3>
      <p>
        {t(
          'Esta configuração precisa de confirmação de preço ou disponibilidade. Não será cobrado nenhum valor agora.',
        )}
      </p>
      <details>
        <summary>{t('Ver mensagem preparada')}</summary>
        <p className="quotation-message">{summary}</p>
      </details>
      <p>
        {t(
          'Abra a mensagem para rever e enviar à equipa. Os ficheiros não são anexados automaticamente.',
        )}
      </p>
      <div className="purchase-step-actions">
        <a
          className="btn btn-primary"
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('Pedir cotação por WhatsApp')} ↗
        </a>
        <a className="purchase-secondary-link" href={links.mailto}>
          {t('Pedir por email')}
        </a>
      </div>
    </section>
  );
}
