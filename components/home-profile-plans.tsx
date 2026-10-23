'use client';
import { useState } from 'react';
import { Check, ArrowUpRight, Users, UserRound, Building2 } from 'lucide-react';
import Link from './hard-link';
import { useI18n } from './language-provider';
import { launchOffers, companyQuote, usdPrice } from '@/lib/launch-offers';
import { planPrice, planAnnualMeticais } from '@/lib/plan-pricing';
import { planFeatures } from '@/lib/plan-features';
import type { ManagedPlan } from '@/lib/domain';
export function HomeProfilePlans({
  plans,
  billingAvailable,
  annualAvailable = false,
  onSelect,
  current,
  busy = false,
}: {
  plans: ManagedPlan[];
  billingAvailable: boolean;
  annualAvailable?: boolean;
  onSelect?: (id: string) => void;
  current?: string;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [seats, setSeats] = useState(5);
  const professional = plans.find(
    (p) => p.id === 'professional-v2' && p.active,
  );
  const personal = plans.find((p) => p.id === 'personal');
  const annual = cycle === 'annual';
  const quote = companyQuote(
    seats <= 50 ? 'business' : 'enterprise',
    seats,
    cycle,
  );
  const benefits: Record<string, { title: string; items: string[] }[]> = {
    personal: [
      {
        title: 'Perfil e partilha',
        items: [
          `${personal?.links ?? 8} links à sua escolha`,
          `${personal?.bio ?? 200} caracteres de biografia`,
          'Email, telefone, WhatsApp e redes sociais',
          'Partilha por link, NFC e código QR',
          'Guardar contacto no telemóvel (vCard)',
        ],
      },
    ],
    'professional-v2': [
      {
        title: 'Tudo no Personal, mais',
        items: [
          `${professional?.links ?? 20} links à sua escolha`,
          `${professional?.bio ?? 600} caracteres de biografia`,
          ...(professional && planFeatures(professional).showcase
            ? ['Vitrine com até 6 produtos ou serviços']
            : []),
          ...(professional && planFeatures(professional).whatsapp
            ? ['WhatsApp com mensagem personalizada']
            : []),
          ...(professional && planFeatures(professional).location
            ? ['Morada, direcções e horário']
            : []),
        ],
      },
      {
        title: 'Contactos e resultados',
        items: [
          ...(professional && planFeatures(professional).enquiries
            ? ['Formulário de contacto e caixa de entrada']
            : []),
          ...(professional && planFeatures(professional).analytics
            ? ['Estatísticas de visitas e cliques']
            : []),
        ],
      },
    ],
    business: [
      {
        title: 'Perfis e equipa',
        items: [
          'Perfis Professional incluídos na proposta',
          'Convites e permissões de colaboradores',
          'Organização por equipas',
        ],
      },
      {
        title: 'Campanhas e contactos',
        items: [
          'Campanhas e contactos com consentimento',
          'Relatórios da equipa e exportação CSV',
          'Configuração inicial incluída',
        ],
      },
    ],
    enterprise: [
      {
        title: 'Tudo no Business, mais',
        items: [
          'Capacidade e condições acordadas em contrato',
          'Apoio à entrada e ao lançamento da equipa',
          'Contacto Framy designado',
          'Integrações e formação sob orçamento',
        ],
      },
    ],
  };
  return (
    <section
      className="launch-pricing"
      aria-label={t('Planos para o seu perfil digital')}
    >
      <fieldset className="launch-cycle" aria-label={t('Periodicidade')}>
        <button
          type="button"
          aria-pressed={!annual}
          onClick={() => setCycle('monthly')}
        >
          {t('Mensal')}
        </button>
        <button
          type="button"
          aria-pressed={annual}
          onClick={() => setCycle('annual')}
        >
          {t('Anual')} <span>{t('2 meses grátis')}</span>
        </button>
      </fieldset>
      <div className="launch-audiences">
        <div>
          <h3>{t('Para indivíduos')}</h3>
          <p>{t('Uma pessoa. O seu perfil.')}</p>
        </div>
        <div>
          <h3>{t('Para organizações')}</h3>
          <p>{t('Perfis e ferramentas para a sua equipa.')}</p>
        </div>
      </div>
      <div className="launch-grid">
        {launchOffers.map((offer, index) => {
          const company = index > 1;
          const free = index === 0;
          const price = annual ? offer.annualCents : offer.monthlyCents;
          const plan = free ? personal : professional;
          const canBuy =
            !!plan &&
            (free ||
              (billingAvailable &&
                (annual
                  ? annualAvailable && plan.annualEnabled !== false
                  : plan.monthlyEnabled !== false)));
          const label = free
            ? 'Começar gratuitamente'
            : company
              ? 'Pedir proposta'
              : 'Escolher Profissional';
          return (
            <article
              key={offer.id}
              className={`launch-card launch-${offer.id}${index === 2 ? ' launch-popular' : ''}`}
            >
              <div className="launch-card-title">
                <h3>{offer.name}</h3>
                {index === 2 && (
                  <span className="launch-badge">{t('Mais popular')}</span>
                )}
              </div>
              <p className="launch-users">
                {company ? <Users size={19} /> : <UserRound size={19} />}{' '}
                {company
                  ? `${offer.min}–${offer.max} ${t('colaboradores')}`
                  : t('1 pessoa')}
              </p>
              <div className="launch-price">
                <strong>
                  {free ? (
                    t('Gratuito')
                  ) : (
                    <>
                      {' '}
                      {index === 3 && <small>{t('A partir de')} </small>}
                      {usdPrice(price)}
                    </>
                  )}
                </strong>
                <span>
                  {free
                    ? t('Para sempre')
                    : t(
                        company
                          ? annual
                            ? 'por colaborador / ano'
                            : 'por colaborador / mês'
                          : annual
                            ? 'por ano'
                            : 'por mês',
                      )}
                </span>
              </div>
              <p className="launch-position">
                {t(
                  [
                    'Os seus contactos e redes sociais, num só lugar.',
                    'Apresente os seus serviços, portefólio e trabalho.',
                    'Organize a sua equipa e acompanhe cada conexão.',
                    'Uma implementação à medida da sua organização.',
                  ][index],
                )}
              </p>
              {onSelect && !company && canBuy ? (
                <button
                  type="button"
                  className="launch-cta"
                  disabled={busy || current === offer.id}
                  onClick={() => onSelect(offer.id)}
                >
                  {t(current === offer.id ? 'Plano actual' : label)}
                  <ArrowUpRight size={16} />
                </button>
              ) : (
                <Link
                  className="launch-cta"
                  href={
                    company
                      ? `/corporativo/configurar?offer=${offer.id}`
                      : free
                        ? '/perfil?plans=1'
                        : canBuy
                          ? '/perfil?plans=1'
                          : '/contacto'
                  }
                >
                  {t(
                    !company && !free && !canBuy ? 'Contactar a Framy' : label,
                  )}
                  <ArrowUpRight size={16} />
                </Link>
              )}
              <p className="launch-local">
                {free
                  ? t('Sem cartão de crédito. Sem prazo.')
                  : company
                    ? t('Proposta e facturação aprovadas pela Framy.')
                    : plan
                      ? t('Pagamento em Moçambique: {0}', [
                          planPrice(
                            annual
                              ? { meticais: planAnnualMeticais(plan) }
                              : plan,
                            t.locale,
                          ),
                        ])
                      : t('Pagamento local sob confirmação.')}
              </p>
              {benefits[offer.id].map((group) => (
                <div className="launch-features" key={group.title}>
                  <h4>{t(group.title)}</h4>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>
                        <Check size={15} aria-hidden="true" />
                        <span>{t(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          );
        })}
      </div>
      <div className="launch-estimator">
        <div>
          <Building2 size={22} />
          <h3>{t('Calcule a sua equipa')}</h3>
        </div>
        <label>
          {t('Perfis de colaboradores')}
          <input
            type="number"
            min={3}
            max={500}
            value={seats}
            onChange={(event) => {
              const n = Number(event.target.value);
              setSeats(Number.isInteger(n) ? Math.min(500, Math.max(3, n)) : 3);
            }}
          />
        </label>
        <p aria-live="polite" aria-atomic="true">
          <strong>
            {seats <= 50 ? 'Business' : 'Enterprise'} ·{' '}
            {seats > 50 && t('A partir de')} {usdPrice(quote.totalCents)} /{' '}
            {t(annual ? 'ano' : 'mês')}
          </strong>
          <span>
            {t(
              'Uma conta de proprietário para administração incluída. O perfil do proprietário conta como lugar pago, se necessário.',
            )}
          </span>
        </p>
      </div>
      <p className="launch-notes">
        {t(
          'Preços de referência em USD. Em Moçambique, o pagamento usa os valores em meticais publicados pela gestão. Impostos aplicáveis são indicados na proposta ou no pagamento. Produtos NFC, entrega e design personalizado são pagos separadamente.',
        )}
      </p>
      <p className="launch-notes">
        {t(
          'Sem débito automático. Empresas: confirme o número de perfis e a proposta com a Framy. CRM, Wallet, leitura de cartões e início de sessão empresarial não estão incluídos no lançamento.',
        )}
      </p>
    </section>
  );
}
