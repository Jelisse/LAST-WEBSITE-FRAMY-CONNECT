'use client';
import { useState } from 'react';
import { useI18n } from './language-provider';
export type CorporateAccountRequest = {
  id: string;
  corporateStatus?: string;
  corporateCompany?: string;
  corporatePeople?: number;
  corporateDetails?: string;
  corporateVersion?: number;
  corporateSeats?: number | null;
};
export function CorporateApproval({
  account: a,
  busy,
  save,
}: {
  account: CorporateAccountRequest;
  busy: boolean;
  save: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [seats, setSeats] = useState(
    a.corporateSeats || a.corporatePeople || 1,
  );
  const [details, setDetails] = useState<Record<
      string,
      string | number
    > | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  return (
    <details
      className="corporate-approval"
      onToggle={async (e) => {
        if (!e.currentTarget.open || details || loading) return;
        setLoading(true);
        setError('');
        try {
          const r = await fetch(
            '/api/corporate-request?' + new URLSearchParams({ owner: a.id }),
            { cache: 'no-store', signal: AbortSignal.timeout(15000) },
          );
          const b = (await r.json()) as {
            error?: string;
            request?: { details_json: string };
          };
          if (!r.ok || !b.request)
            throw Error(b.error || 'Não foi possível carregar.');
          setDetails(JSON.parse(b.request.details_json));
        } catch {
          setError('Não foi possível carregar.');
        } finally {
          setLoading(false);
        }
      }}
    >
      <summary>
        {t('Corporativo')} ·{' '}
        {t(
          (
            {
              draft: 'Rascunho',
              submitted: 'Aguarda aprovação',
              approved: 'Aprovado',
              suspended: 'Suspenso',
            } as Record<string, string>
          )[a.corporateStatus || 'draft'],
        )}
      </summary>
      <strong>{a.corporateCompany}</strong>
      {loading && <p>{t('A carregar…')}</p>}
      {error && <p role="alert">{t(error)}</p>}
      <dl>
        {Object.entries({
          people: 'Número de trabalhadores',
          phone: 'Telefone de contacto',
          location: 'Localização da empresa',
          sector: 'Sector de actividade',
          teams: 'Equipas',
          goals: 'Objectivos e campanhas',
          products: 'Produtos NFC pretendidos',
        }).map(([key, label]) => (
          <div key={key}>
            <dt>{t(label)}</dt>
            <dd>{details?.[key] || '—'}</dd>
          </div>
        ))}
      </dl>
      {['submitted', 'suspended'].includes(a.corporateStatus || '') && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save({
              action: 'corporate-approve',
              id: a.id,
              version: a.corporateVersion,
              seats,
            });
          }}
        >
          <label>
            {t('Limite de trabalhadores aprovado')}
            <input
              type="number"
              required
              min={1}
              max={500}
              value={seats}
              disabled={busy || loading || !details}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </label>
          <button disabled={busy || loading || !details}>
            {t('Aprovar Corporativo')}
          </button>
        </form>
      )}
      {a.corporateStatus === 'approved' && (
        <button
          disabled={busy || loading || !details}
          onClick={() =>
            void save({
              action: 'corporate-suspend',
              id: a.id,
              version: a.corporateVersion,
            })
          }
        >
          {t('Suspender Corporativo')}
        </button>
      )}
      <small>
        {t(
          'A aprovação desbloqueia a equipa. Preços, produtos e pagamento são acordados separadamente; não há cobrança automática.',
        )}
      </small>
    </details>
  );
}
