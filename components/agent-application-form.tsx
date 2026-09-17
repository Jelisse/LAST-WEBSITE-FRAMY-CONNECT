'use client';
import { useEffect, useState } from 'react';
import Link from './hard-link';
import { SourceImage } from './source-image';
import {
  applicationAge,
  applicationLabels,
  type ApplicationData,
} from '@/lib/agent-application';
export type ApplicationView = {
  id: string;
  owner_id: string;
  data: ApplicationData;
  status: string;
  version: number;
  review_note: string;
  updated_at: string;
  files: { id: string; kind: string }[];
};
const fileKinds = [
  ['portrait', 'A sua fotografia'],
  ['id-front', 'BI — frente'],
  ['id-back', 'BI — verso'],
];
export function AgentApplicationForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [app, setApp] = useState<ApplicationView | null>(null),
    [data, setData] = useState<ApplicationData>({
      name,
      email,
      phone: '',
      whatsapp: '',
      birthDate: '',
      city: '',
      occupation: '',
      description: '',
      consent: false,
    });
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function load() {
    const r = await fetch('/api/agent-applications', { cache: 'no-store' });
    const b = (await r.json()) as {
      error: string;
      application: ApplicationView;
    };
    if (!r.ok) throw Error(b.error);
    setApp(b.application);
    if (b.application) setData(b.application.data);
  }
  useEffect(() => {
    void load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function action(action: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/agent-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: app?.version ?? 0, data }),
      });
      const b = (await r.json()) as {
        error: string;
        application: ApplicationView;
      };
      if (!r.ok) throw Error(b.error);
      setApp(b.application);
      setData(b.application.data);
      setNotice(
        action === 'submit'
          ? 'Candidatura submetida com sucesso. Acompanhe a análise nesta página.'
          : 'Dados guardados. Adicione as fotografias e submeta a candidatura.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(kind: string, file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (file.size > 8 * 1024 * 1024)
        throw Error('Cada fotografia deve ter até 8 MB.');
      const r = await fetch('/api/application-files?kind=' + kind, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const b = (await r.json()) as {
        error: string;
        application: ApplicationView;
      };
      if (!r.ok) throw Error(b.error);
      await load();
      setNotice('Fotografia guardada de forma privada.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const editable = !app || ['DRAFT', 'NEEDS_INFO'].includes(app.status);
  const unsaved = !!app && JSON.stringify(data) !== JSON.stringify(app.data);
  if (loading) return <p>A carregar a sua candidatura…</p>;
  return (
    <div className="application-form">
      {error && (
        <p role="alert" className="product-save-error">
          {error}
        </p>
      )}
      {notice && <output className="product-save-notice">{notice}</output>}
      {app && (
        <div className="application-status">
          <strong>{applicationLabels[app.status]}</strong>
          <p>Referência: {app.id}</p>
          {app.review_note && <p>Mensagem da gestão: {app.review_note}</p>}
          {app.status === 'APPROVED' && (
            <Link className="btn btn-primary" href="/entrar">
              Entrar no painel de agente
            </Link>
          )}
        </div>
      )}
      {editable ? (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action('save');
            }}
          >
            <fieldset disabled={busy} className="application-fields">
              <legend>1. Dados pessoais e actividade</legend>
              <label>
                Nome completo
                <input
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                />
              </label>
              <label>
                Email da conta
                <input type="email" value={email} readOnly />
                <small>
                  O contacto da candidatura fica associado à sua conta.
                </small>
              </label>
              <label>
                Data de nascimento
                <input
                  required
                  type="date"
                  value={data.birthDate}
                  onChange={(e) =>
                    setData({ ...data, birthDate: e.target.value })
                  }
                />
                <small>Mínimo de 18 anos para se candidatar.</small>
              </label>
              <label>
                Cidade ou localidade
                <input
                  required
                  maxLength={120}
                  autoComplete="address-level2"
                  value={data.city}
                  onChange={(e) => setData({ ...data, city: e.target.value })}
                />
              </label>
              <label>
                Contacto telefónico
                <input
                  required
                  type="tel"
                  maxLength={25}
                  placeholder="+258 …"
                  autoComplete="tel"
                  value={data.phone}
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                />
              </label>
              <label>
                WhatsApp
                <input
                  required
                  type="tel"
                  maxLength={25}
                  placeholder="+258 …"
                  value={data.whatsapp}
                  onChange={(e) =>
                    setData({ ...data, whatsapp: e.target.value })
                  }
                />
              </label>
              <label className="application-wide">
                Profissão ou actividade
                <input
                  required
                  maxLength={160}
                  value={data.occupation}
                  onChange={(e) =>
                    setData({ ...data, occupation: e.target.value })
                  }
                />
              </label>
              <label className="application-wide">
                Conte-nos o que faz e como gostaria de representar a Framy
                <textarea
                  required
                  minLength={20}
                  maxLength={2000}
                  rows={5}
                  value={data.description}
                  onChange={(e) =>
                    setData({ ...data, description: e.target.value })
                  }
                />
              </label>
              <label className="application-wide application-consent">
                <input
                  required
                  type="checkbox"
                  checked={data.consent}
                  onChange={(e) =>
                    setData({ ...data, consent: e.target.checked })
                  }
                />
                Autorizo a utilização dos meus dados e documentos pela gestão da
                Framy para analisar esta candidatura. Li a política de
                privacidade.
              </label>
              <p className="application-wide">
                <Link href="/privacidade">Consultar privacidade</Link>. A
                fotografia e o BI não são publicados no perfil. A aprovação
                depende da análise da gestão e não constitui contrato de
                trabalho.
              </p>
              {data.birthDate && applicationAge(data.birthDate) < 18 && (
                <p className="application-wide" role="alert">
                  Só pode avançar quando tiver pelo menos 18 anos.
                </p>
              )}
              <button className="btn btn-primary" disabled={busy} type="submit">
                {busy ? 'A guardar…' : 'Guardar e continuar'}
              </button>
            </fieldset>
          </form>
          {app && (
            <section className="application-documents">
              <h2>2. Fotografias e identificação</h2>
              <p>
                Envie imagens legíveis, sem cortar os dados do documento. PNG,
                JPG ou WebP, até 8 MB por fotografia. Num telemóvel compatível,
                pode usar a câmara directamente.
              </p>
              <div className="application-files-grid">
                {fileKinds.map(([kind, label]) => {
                  const file = app.files.find((f) => f.kind === kind);
                  return (
                    <div key={kind}>
                      <h3>{label}</h3>
                      {file && (
                        <SourceImage
                          src={'/api/application-files/' + file.id}
                          alt={label}
                          width={260}
                          height={180}
                        />
                      )}
                      <label>
                        Escolher ficheiro
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={busy || unsaved}
                          onChange={(e) =>
                            void upload(kind, e.target.files?.[0])
                          }
                        />
                      </label>
                      <label>
                        Tirar fotografia
                        <input
                          type="file"
                          accept="image/*"
                          capture={kind === 'portrait' ? 'user' : 'environment'}
                          disabled={busy || unsaved}
                          onChange={(e) =>
                            void upload(kind, e.target.files?.[0])
                          }
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
                <h2>3. Confirmar candidatura</h2>
                {unsaved && <p role="alert">Guarde as alterações dos dados pessoais antes de carregar fotografias ou submeter.</p>}
              <p>
                Depois de submeter, os dados ficam bloqueados durante a análise.
                Guarde quaisquer alterações antes de continuar.
              </p>
              <button
                className="btn btn-primary"
                disabled={
                  busy ||
                  app.files.length !== 3 ||
                  JSON.stringify(data) !== JSON.stringify(app.data)
                }
                onClick={() => void action('submit')}
              >
                Submeter candidatura
              </button>
            </section>
          )}
        </>
      ) : (
        <p>
          Acompanhe o resultado nesta página. Para esclarecimentos ou eliminação
          de documentos, contacte{' '}
          <a href="mailto:support@framyconnect.co.mz">
            support@framyconnect.co.mz
          </a>
          .
        </p>
      )}
    </div>
  );
}
