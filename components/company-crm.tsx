'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Plug, ExternalLink } from 'lucide-react';
import { useI18n } from './language-provider';
type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string | null;
};
type Info = {
  ready: boolean;
  owner: boolean;
  connected: boolean;
  version: number;
  leads: Lead[];
};
export function CompanyCRM({
  organisation,
  role,
}: {
  organisation: string;
  role: string;
}) {
  const { t } = useI18n(),
    [data, setData] = useState<Info | null>(null),
    [token, setToken] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [review, setReview] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [results, setResults] = useState<
      { id: string; status: string; existing?: boolean }[]
    >([]),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (role !== 'leader') return;
    const abort = new AbortController();
    fetch('/api/company-crm?' + new URLSearchParams({ organisation }), {
      cache: 'no-store',
      signal: abort.signal,
    })
      .then(async (r) => {
        const b = (await r.json()) as Info & { error?: string };
        if (!r.ok) throw Error(b.error);
        setData(b);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [organisation, revision, role]);
  const act = async (action: string) => {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/company-crm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organisation,
            action,
            version: data?.version,
            ...(action === 'connect' ? { token } : {}),
            ...(action === 'sync' ? { leads: selected, confirm: true } : {}),
          }),
        }),
        b = (await r.json()) as {
          error?: string;
          results?: { id: string; status: string; existing?: boolean }[];
        };
      if (!r.ok) throw Error(b.error);
      setToken('');
      setResults(b.results || []);
      setReview(false);
      setSelected([]);
      setRevision((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  };
  if (role !== 'leader')
    return (
      <div className="tool-empty">
        <Plug />
        <h2>{t('Integrações geridas pela empresa')}</h2>
        <p>{t('Peça ao responsável da empresa para configurar o HubSpot.')}</p>
      </div>
    );
  return (
    <>
      <div className="tool-intro">
        <Plug />
        <div>
          <h2>HubSpot</h2>
          <p>
            {t(
              'Da conversa ao acompanhamento, sem voltar a escrever contactos.',
            )}
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="tool-alert">
          {t(error)}
        </p>
      )}
      {!data ? (
        <div>
          <p>{t('A carregar…')}</p>
          {error && (
            <button
              onClick={() => {
                setError('');
                setRevision((x) => x + 1);
              }}
            >
              {t('Tentar novamente')}
            </button>
          )}
        </div>
      ) : (
        <>
          <section className="tool-help">
            <h3>
              {t(data.connected ? 'HubSpot ligado' : 'Ligar a sua empresa')}
            </h3>
            <p>
              {t(
                'O piloto transfere contactos seleccionados. Os contactos existentes são reconhecidos pelo email e não são alterados.',
              )}
            </p>
            <p>
              {t(
                'São enviados apenas nome, email e telefone. Notas internas e permissões de marketing não são transferidas.',
              )}
            </p>
            {!data.ready ? (
              <output>
                {t('A configuração segura do CRM está pendente no servidor.')}
              </output>
            ) : data.owner ? (
              <>
                {!data.connected && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act('connect');
                    }}
                  >
                    <label>
                      {t('Token de acesso da aplicação privada HubSpot')}
                      <input
                        type="password"
                        autoComplete="off"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        minLength={20}
                        maxLength={512}
                        required
                      />
                    </label>
                    <small>
                      {t(
                        'Permissões necessárias: crm.objects.contacts.read e crm.objects.contacts.write. O token fica encriptado no servidor.',
                      )}
                    </small>
                    <button disabled={busy}>{t('Verificar e ligar')}</button>
                  </form>
                )}
                {data.connected && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            'Desligar o HubSpot? Os contactos já enviados continuam no CRM.',
                          ),
                        )
                      )
                        void act('disconnect');
                    }}
                  >
                    {t('Desligar HubSpot')}
                  </button>
                )}
                <a
                  href="https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('Configurar uma aplicação HubSpot')}{' '}
                  <ExternalLink size={15} />
                </a>
              </>
            ) : (
              <p>
                {t(
                  'Apenas o proprietário pode ligar ou desligar a conta HubSpot.',
                )}
              </p>
            )}
          </section>
          {!!results.length && (
            <section className="tool-help" aria-live="polite">
              <h3>{t('Resultado da transferência')}</h3>
              {results.map((r) => (
                <p key={r.id}>
                  {data.leads.find((l) => l.id === r.id)?.name || t('Contacto')}
                  :{' '}
                  {t(
                    r.status === 'sent'
                      ? r.existing
                        ? 'Já existe no HubSpot'
                        : 'Enviado ao HubSpot'
                      : r.status === 'already-processed'
                        ? 'Já processado ou em curso'
                        : r.status === 'uncertain'
                          ? 'Resultado por confirmar. Verifique o HubSpot antes de tentar novamente.'
                          : r.status === 'credentials'
                            ? 'Credenciais HubSpot inválidas.'
                            : r.status === 'limited'
                              ? 'HubSpot ocupado. Tente mais tarde.'
                              : 'Não foi possível transferir este contacto.',
                  )}
                </p>
              ))}
            </section>
          )}
          {data.connected && (
            <section className="tool-help">
              <h3>{t('Escolher contactos')}</h3>
              <p>
                {t(
                  'Até 5 contactos por transferência. São apresentados os 100 contactos mais recentes dos últimos 90 dias.',
                )}
              </p>
              <div className="tool-crm-leads">
                {data.leads.map((l) => (
                  <label key={l.id}>
                    <input
                      type="checkbox"
                      disabled={
                        busy ||
                        l.status === 'sent' ||
                        (selected.length >= 5 && !selected.includes(l.id))
                      }
                      checked={selected.includes(l.id)}
                      onChange={(e) => {
                        setReview(false);
                        setSelected(
                          e.target.checked
                            ? [...selected, l.id]
                            : selected.filter((id) => id !== l.id),
                        );
                      }}
                    />
                    <span>
                      <strong>{l.name}</strong>
                      <small>
                        {l.email}
                        {l.phone ? ' · ' + l.phone : ''}
                      </small>
                    </span>
                    {l.status === 'sent' && <CheckCircle2 size={18} />}
                  </label>
                ))}
              </div>
              {!data.leads.length && (
                <p>{t('Ainda não há contactos elegíveis para transferir.')}</p>
              )}
              {!review ? (
                <button
                  disabled={busy || !selected.length}
                  onClick={() => setReview(true)}
                >
                  {t('Rever transferência')} ({selected.length})
                </button>
              ) : (
                <div className="tool-review">
                  <h4>{t('Confirmar transferência para HubSpot')}</h4>
                  {data.leads
                    .filter((l) => selected.includes(l.id))
                    .map((l) => (
                      <p key={l.id}>
                        {l.name} · {l.email}
                        {l.phone ? ' · ' + l.phone : ''}
                      </p>
                    ))}
                  <label>
                    <input type="checkbox" required id="crm-transfer-consent" />
                    {t(
                      'Confirmo que estes contactos podem ser partilhados com o CRM da empresa para acompanhamento.',
                    )}
                  </label>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        (
                          document.getElementById(
                            'crm-transfer-consent',
                          ) as HTMLInputElement
                        )?.checked
                      )
                        void act('sync');
                      else setError('Confirme a autorização de transferência.');
                    }}
                  >
                    {t(busy ? 'A transferir…' : 'Confirmar e transferir')}
                  </button>
                  <button disabled={busy} onClick={() => setReview(false)}>
                    {t('Cancelar')}
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
