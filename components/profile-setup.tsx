'use client';
import { Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useI18n } from './language-provider';
import type { Profile } from '@/lib/domain';

export const setupSteps = [
  'Quem é',
  'Contactos e links',
  'Aparência',
  'Rever e publicar',
];
export function ProfileSetupNavigation({
  step,
  busy,
  onStep,
  status,
}: {
  step: number;
  busy: boolean;
  status?: string;
  onStep: (step: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="profile-setup-navigation">
      <div className="setup-heading">
        <div className="setup-heading-tools">
          {status && <span className="flow-draft-status">{status}</span>}
        </div>
      </div>
      <nav aria-label={t('Passos de configuração')}>
        <ol>
          {setupSteps.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                aria-current={step === index ? 'step' : undefined}
                disabled={busy}
                onClick={() => onStep(index)}
              >
                <span>{index + 1}</span>
                {t(label)}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
export function ProfileSetupReview({
  profile,
  published,
  dirty,
  onStep,
}: {
  profile: Profile;
  published: boolean;
  dirty: boolean;
  onStep: (step: number) => void;
}) {
  const { t } = useI18n();
  const rows = [
    {
      step: 0,
      title: 'A sua apresentação',
      text: [profile.name, profile.title, profile.bio]
        .filter(Boolean)
        .join(' · '),
    },
    {
      step: 1,
      title: 'Contactos visíveis',
      text:
        [
          profile.showEmail ? profile.email : '',
          profile.showPhone ? profile.phone : '',
          profile.website,
        ]
          .filter(Boolean)
          .join(' · ') ||
        t(
          'Email e telefone ocultos; reveja os outros links na pré-visualização.',
        ),
    },
    {
      step: 2,
      title: 'Fotografia e aparência',
      text: profile.photoUrl
        ? t('Fotografia adicionada. Confirme o aspecto na pré-visualização.')
        : t('Sem fotografia. Pode publicar assim e adicioná-la mais tarde.'),
    },
  ];
  return (
    <section className="profile-setup-review">
      <span className="setup-eyebrow">{t('ANTES DE PARTILHAR')}</span>
      <h3>
        {t(
          published && !dirty
            ? 'O seu perfil está publicado.'
            : 'Confirme o que vai ficar público.',
        )}
      </h3>
      <p>
        {t(
          'A pré-visualização mostra os contactos visíveis e as ferramentas disponíveis no seu plano. Reveja também os seus links e traduções.',
        )}
      </p>
      <ul>
        {rows.map((row) => (
          <li key={row.title}>
            <Check size={18} aria-hidden="true" />
            <div>
              <strong>{t(row.title)}</strong>
              <p>{row.text}</p>
            </div>
            <button type="button" onClick={() => onStep(row.step)}>
              {t('Editar')}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="setup-privacy">
        <ShieldCheck size={20} aria-hidden="true" />
        <p>
          {t(
            'Quem tiver o endereço poderá consultar a versão publicada. Guardar rascunho não altera essa versão. Pode retirar a publicação mais tarde.',
          )}
        </p>
      </div>
    </section>
  );
}
