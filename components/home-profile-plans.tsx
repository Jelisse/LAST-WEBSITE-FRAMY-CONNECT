import Link from '@/components/hard-link';
import {
  ArrowUpRight,
  UserRound,
  BriefcaseBusiness,
  Building2,
  Check,
  Minus,
} from 'lucide-react';
import { getTranslations } from '@/lib/server-i18n';
import { planPrice } from '@/lib/plan-pricing';
import type { ManagedPlan } from '@/lib/domain';

export async function HomeProfilePlans({
  plans,
  billingAvailable,
}: {
  plans: ManagedPlan[];
  billingAvailable: boolean;
}) {
  const t = await getTranslations();
  const individual = plans
    .filter((p) => p.id !== 'free-30')
    .sort(
      (a, b) =>
        Number(a.id === 'professional-v2') - Number(b.id === 'professional-v2'),
    );
  return (
    <div className="home-solutions-grid home-profile-plans">
      {individual.map((plan) => {
        const recommended = plan.id === 'professional-v2';
        const Icon = recommended ? BriefcaseBusiness : UserRound;
        const features = [
          `${t('Até ')}${plan.links}${t(' links à sua escolha')}`,
          plan.bio > 0
            ? t('Biografia até {0} caracteres', [plan.bio])
            : t('Contactos essenciais, sem biografia'),
          ...[
            'Fotografia, nome e título no perfil',
            'Email e telefone com controlo de visibilidade',
            'WhatsApp com mensagem personalizada',
            'Morada, direcções e horário',
            'Cores personalizadas e dois estilos de perfil',
            'Links para redes sociais, website e portefólio',
            'Partilha por link, NFC e código QR',
            'Guardar contacto no telemóvel (vCard)',
            'Actualizar os dados sem substituir o produto',
            'Cartão e porta-chaves ligados ao mesmo perfil.',
          ].map((feature) => t(feature)),
        ];
        const advanced = [
          'Vitrine com até 6 produtos ou serviços',
          'Formulário de contacto e caixa de entrada',
          'Conteúdos do perfil em inglês',
          'Estatísticas de visitas e cliques',
          'Gestão de equipa: até 25 membros e convites',
          'Domínio próprio, sujeito a configuração técnica',
        ];
        return (
          <article
            className={`home-solution home-profile-plan${recommended ? ' is-recommended' : ''}`}
            key={plan.id}
          >
            <div className="home-solution-label">
              {t(
                recommended
                  ? 'Recomendado para profissionais'
                  : 'Para o seu dia a dia',
              )}
            </div>
            <div className="home-plan-visual" aria-hidden="true">
              <span>
                <Icon size={48} strokeWidth={1.3} />
              </span>
            </div>
            <div className="home-solution-copy">
              <h3>{t(plan.name)}</h3>
              <p className="home-plan-description">
                {t(
                  recommended
                    ? 'Para profissionais: apresente serviços e portefólio e acompanhe as visitas e os cliques no seu perfil.'
                    : 'Para pessoas e criadores: reúna contactos, redes sociais e conteúdos num perfil fácil de partilhar.',
                )}
              </p>
              <div className="home-solution-price">
                <strong>
                  {planPrice(plan, t.locale)}
                  <small>{t(' / mês')}</small>
                </strong>
                <span>
                  {t('Mensal · por perfil')}
                  {!billingAvailable && ` · ${t('Adesões em breve')}`}
                </span>
              </div>
              <ul className="home-plan-inclusions">
                {features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="home-plan-feature-heading">{t('Ferramentas profissionais')}</p>
              <ul className="home-plan-inclusions home-plan-advanced">
                {advanced.map((feature) => (
                  <li key={feature} className={recommended ? '' : 'is-unavailable'}>
                    {recommended ? <Check size={16} aria-hidden="true" /> : <Minus size={16} aria-hidden="true" />}
                    <span>{t(feature)}{!recommended && <small>{t('Não incluído')}</small>}</span>
                  </li>
                ))}
              </ul>
              {recommended && <p className="home-plan-conditions">{t('Equipa: subscrição por perfil. Domínio adquirido separadamente e sujeito a activação técnica.')}</p>}
              <Link
                className={recommended ? 'home-primary' : 'home-secondary'}
                href="/perfil?plans=1"
              >
                {t('Explorar plano')}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </article>
        );
      })}
      <article className="home-solution home-profile-plan">
        <div className="home-solution-label">
          {t('Para empresas e equipas')}
        </div>
        <div className="home-plan-visual" aria-hidden="true">
          <span>
            <Building2 size={48} strokeWidth={1.3} />
          </span>
        </div>
        <div className="home-solution-copy">
          <h3>{t('Corporativo')}</h3>
          <p className="home-plan-description">
            {t(
              'Para instituições e organizações: apresente contactos, serviços e recursos, com uma proposta adequada às suas necessidades.',
            )}
          </p>
          <div className="home-solution-price">
            <strong>{t('Sob consulta')}</strong>
            <span>{t('Uma solução à medida da sua equipa')}</span>
          </div>
          <ul className="home-plan-inclusions">
            {[
              'Número de perfis e limites definidos na proposta',
              'Funcionalidades digitais acordadas na proposta',
              'Cartões, porta-chaves e materiais a escolher',
              'Design e apoio à configuração a combinar',
              'Preço e condições de renovação sob consulta',
            ].map((feature) => (
              <li key={feature}>
                <Check size={16} aria-hidden="true" />
                <span>{t(feature)}</span>
              </li>
            ))}
          </ul>
          <Link className="home-secondary" href="/contacto">
            {t('Solicitar proposta')}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </article>
    </div>
  );
}
