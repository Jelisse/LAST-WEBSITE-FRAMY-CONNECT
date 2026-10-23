import { PublicHeader } from '@/components/public-header';
import { SiteFooter } from '@/components/site-shell';
import { ProblemPaths } from '@/components/problem-paths';
import { PlanComparison, PlanQuestions } from '@/components/plan-comparison';
import { getManagedPlans } from '@/lib/server-plans';
import { getTranslations } from '@/lib/server-i18n';
import { publicPageRobots } from '@/lib/server-site';
import Link from '@/components/hard-link';
import {
  ArrowUpRight,
  ContactRound,
  QrCode,
  Heart,
  Layers,
  Globe2,
  RefreshCw,
  Users,
} from 'lucide-react';
import '../public-marketing.css';
import '../why-framy.css';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Porquê Framy Connect'),
    description: t(
      'Do primeiro encontro ao próximo contacto. Descubra a Framy para profissionais, criadores e equipas, e compare os quatro planos.',
    ),
    robots: publicPageRobots(),
  };
}
export default async function WhyFramy() {
  const t = await getTranslations();
  const plans = await getManagedPlans();
  return (
    <div className="framy-public phase-one">
      <PublicHeader why />
      <main id="main">
        <section className="why-hero why-section">
          <div>
            <span className="public-eyebrow">{t('PORQUÊ FRAMY CONNECT')}</span>
            <h1>
              {t('Conhecer é só o começo.')}
              <em>{t('Dê à conversa um próximo passo.')}</em>
            </h1>
            <p>
              {t(
                'Na obra, no consultório, na loja ou num evento: apresente o seu trabalho e torne mais simples voltar a encontrá-lo. Um perfil que pode actualizar, partilhar e fazer crescer com a sua equipa.',
              )}
            </p>
            <div className="public-actions">
              <Link className="public-button" href="#problemas">
                {t('Encontrar o meu caminho')}
                <ArrowUpRight size={17} />
              </Link>
              <Link
                className="public-button public-button-outline"
                href="#comparar-planos"
              >
                {t('Comparar planos')}
              </Link>
            </div>
          </div>
          <div className="why-connection-story">
            <span className="why-story-eyebrow">
              {t('O SEU MUNDO, NUM TOQUE.')}
            </span>
            <div className="why-story-card">
              <ContactRound size={32} />
              <strong>
                {t('O seu nome. O seu trabalho. Os seus caminhos.')}
              </strong>
              <p>{t('Contactos · Portefólio · Redes sociais')}</p>
              <div className="why-story-channels">
                <QrCode />
                <span>QR</span>
                <span>NFC</span>
                <span>Link</span>
              </div>
            </div>
            <div className="why-next-step">
              <Heart size={22} />
              <strong>{t('Encontrar. Seguir. Contactar.')}</strong>
              <span>{t('A próxima escolha fica com quem o conhece.')}</span>
            </div>
            <small>
              {t('Ilustração do percurso, não uma garantia de resultados.')}
            </small>
          </div>
        </section>
        <section
          className="why-section why-reasons"
          aria-label={t('O que torna a Framy útil no seu dia a dia')}
        >
          {[
            {
              icon: Layers,
              title: 'Uma apresentação, vários caminhos.',
              text: 'Os seus contactos, canais e trabalho reunidos num perfil.',
            },
            {
              icon: RefreshCw,
              title: 'Informação que pode acompanhar a sua evolução.',
              text: 'Actualize o conteúdo mantendo o endereço que já partilhou.',
            },
            {
              icon: Globe2,
              title: 'Comece onde os seus clientes estão.',
              text: 'Partilhe por link ou QR. NFC é uma opção, não uma obrigação.',
            },
            {
              icon: Users,
              title: 'Um caminho do individual para a equipa.',
              text: 'Comece com Personal; organize colaboradores e campanhas por proposta.',
            },
          ].map((r) => (
            <article key={r.title}>
              <r.icon size={26} />
              <h2>{t(r.title)}</h2>
              <p>{t(r.text)}</p>
            </article>
          ))}
        </section>
        <ProblemPaths details />
        <section className="why-section why-change">
          <span className="public-eyebrow">
            {t('DA INFORMAÇÃO ESPALHADA A UM PRÓXIMO PASSO CLARO')}
          </span>
          <h2>
            {t('A diferença está no que acontece depois da apresentação.')}
          </h2>
          <div>
            {[
              [
                'Um número numa conversa.',
                'Um perfil com os caminhos para o seu trabalho e os seus canais.',
              ],
              [
                'Dados impressos que ficaram antigos.',
                'Conteúdo actualizado no mesmo endereço do perfil.',
              ],
              [
                'Pedidos dispersos depois do evento.',
                'Contactos de campanha e relatórios para uma equipa autorizada.',
              ],
            ].map(([before, after]) => (
              <article key={before}>
                <span>{t('Situação habitual')}</span>
                <p>{t(before)}</p>
                <ArrowUpRight aria-hidden="true" />
                <strong>{t('Com a Framy')}</strong>
                <p>{t(after)}</p>
              </article>
            ))}
          </div>
        </section>
        <PlanComparison plans={plans} />
        <PlanQuestions />
        <section className="why-section why-final">
          <h2>{t('A sua próxima conexão já tem por onde continuar.')}</h2>
          <p>
            {t(
              'Crie o seu perfil gratuito ou converse com a Framy sobre a sua equipa.',
            )}
          </p>
          <div className="public-actions">
            <Link className="public-button" href="/perfil?plans=1">
              {t('Criar o meu perfil gratuito')}
              <ArrowUpRight size={16} />
            </Link>
            <Link
              className="public-button public-button-outline"
              href="/contacto"
            >
              {t('Falar com a Framy')}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
