'use client';
import { useI18n } from '@/components/language-provider';

import { useEffect, useState } from 'react';
import { applicationAge, applicationLabels } from '@/lib/agent-application';
import type { ApplicationView } from './agent-application-form';
export function ApplicationManager() {
  const { t } = useI18n();
  const [items, setItems] = useState<ApplicationView[]>([]),
    [selected, setSelected] = useState<ApplicationView | null>(null),
    [note, setNote] = useState(''),
    [verified, setVerified] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  async function load() {
    const r = await fetch('/api/agent-applications?review=1', {
      cache: 'no-store',
    });
    const b = (await r.json()) as {
      error: string;
      applications: ApplicationView[];
    };
    if (!r.ok) throw Error(b.error);
    setItems(b.applications);
  }
  useEffect(() => {
    void load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function review(status: string) {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/agent-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          id: selected.id,
          version: selected.version,
          status,
          note,
          identityVerified: verified,
        }),
      });
      const b = (await r.json()) as {
        error: string;
        applications: ApplicationView[];
      };
      if (!r.ok) throw Error(b.error);
      setSelected(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel application-manager">
      <h2>{t('Candidaturas a agente')}</h2>
      <p>
        {t(
          'Analise os dados e documentos antes de decidir. As decisões e consultas de documentos ficam registadas.',
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {loading ? (
        <p>{t('A carregar…')}</p>
      ) : selected ? (
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            {t('Voltar às candidaturas')}
          </button>
          <h3>{selected.data.name}</h3>
          <dl>
            {[
              ['Estado', applicationLabels[selected.status]],
              ['Email', selected.data.email],
              ['Telefone', selected.data.phone],
              ['WhatsApp', selected.data.whatsapp],
              [
                'Nascimento',
                selected.data.birthDate +
                  ' (' +
                  applicationAge(selected.data.birthDate) +
                  ' anos)',
              ],
              ['Localidade', selected.data.city],
              ['Actividade', selected.data.occupation],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{t(label)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>{selected.data.description}</p>
          <div className="product-form-actions">
            {selected.files.map((f) => (
              <a
                className="btn btn-outline"
                key={f.id}
                href={'/api/application-files/' + f.id}
                target="_blank"
                rel="noreferrer"
              >
                {f.kind === 'portrait'
                  ? t('Fotografia')
                  : f.kind === 'id-front'
                    ? t('BI — frente')
                    : t('BI — verso')}
              </a>
            ))}
          </div>
          {selected.status === 'SUBMITTED' && (
            <fieldset disabled={busy}>
              <label>
                {t('Mensagem para o candidato')}
                <textarea
                  rows={4}
                  maxLength={1500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <label className="application-consent">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />
                {t('Verifiquei o BI, os dados e a idade mínima de 18 anos.')}
              </label>
              <p>
                {t(
                  'A aprovação activa o acesso de agente nesta conta e termina as sessões existentes. O candidato entra novamente com a sua palavra-passe; os seus dados de cliente são preservados.',
                )}
              </p>
              <div className="product-form-actions">
                <button
                  className="btn btn-primary"
                  disabled={!verified}
                  onClick={() => void review('APPROVED')}
                >
                  {t('Aprovar e activar agente')}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => void review('NEEDS_INFO')}
                >
                  {t('Pedir informação')}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => void review('REJECTED')}
                >
                  {t('Não aprovar')}
                </button>
              </div>
            </fieldset>
          )}
          {selected.review_note && (
            <p>
              {t('Mensagem enviada: ')}
              {selected.review_note}
            </p>
          )}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load()
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
          >
            {t('Actualizar')}
          </button>
          <div className="application-list">
            {items.length ? (
              items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setSelected(item);
                    setNote('');
                    setVerified(false);
                    setError('');
                  }}
                >
                  <strong>{item.data.name}</strong>
                  <span>{t(applicationLabels[item.status])}</span>
                  <small>
                    {item.data.city} ·{' '}
                    {new Date(item.updated_at).toLocaleDateString(t.locale)}
                  </small>
                </button>
              ))
            ) : (
              <p>{t('Ainda não existem candidaturas submetidas.')}</p>
            )}
          </div>
          <small>
            {t(
              'São apresentadas as 100 candidaturas mais recentemente actualizadas.',
            )}
          </small>
        </>
      )}
    </section>
  );
}
