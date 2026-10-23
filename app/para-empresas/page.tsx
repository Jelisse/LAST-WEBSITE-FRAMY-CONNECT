import Link from '@/components/hard-link';
import { PublicHeader } from '@/components/public-header';
import { PublicTrust } from '@/components/public-solutions';
import { ConnectionDemo } from '@/components/connection-demo';
import { SiteFooter } from '@/components/site-shell';
import { getTranslations } from '@/lib/server-i18n';
import { publicPageRobots } from '@/lib/server-site';
import {
  ArrowUpRight,
  Users,
  ScanLine,
  ContactRound,
  BarChart3,
} from 'lucide-react';
import '../public-marketing.css';

export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Framy para empresas'),
    description: t(
      'Organize colaboradores, campanhas e contactos com consentimento. Conheça as ferramentas corporativas da Framy Connect e configure a sua empresa.',
    ),
    robots: publicPageRobots(),
  };
}

export default async function CompanyPage() {
  const t = await getTranslations();
  return (
    <div className="framy-public phase-one">
      <PublicHeader company />
      <main id="main">
        <section className="public-hero">
          <div className="public-hero-copy">
            <span className="public-eyebrow">{t('FRAMY PARA EMPRESAS')}</span>
            <h1>
              {t('A sua equipa no terreno.')}{' '}
              <em>{t('Os resultados mais perto.')}</em>
            </h1>
            <p>
              {t(
                'Organize colaboradores, lance campanhas e acompanhe os contactos que a sua equipa recebe. Um espaço para ligar as pessoas ao trabalho da sua empresa.',
              )}
            </p>
            <div className="public-actions">
              <Link className="public-button" href="/corporativo/configurar">
                {t('Configurar a minha empresa')}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <a
                className="public-button public-button-outline"
                href="#como-comecar"
              >
                {t('Como começar')}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
            <p className="public-hero-note">
              {t(
                'Submeta os dados sem pagamento. A Framy revê o pedido e aprova o acesso às ferramentas da equipa.',
              )}
            </p>
            <Link className="public-text-link" href="/contacto">
              {t('Falar com a Framy')}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <ConnectionDemo initialMode={1} company />
        </section>
        <section className="public-section" id="campanhas">
          <div className="public-section-intro">
            <span className="public-eyebrow">
              {t('UMA VISÃO PARTILHADA DO TRABALHO')}
            </span>
            <h2>{t('Dê à sua equipa um caminho claro para se conectar.')}</h2>
            <p>
              {t(
                'Da entrada de um colaborador à análise de uma campanha, cada ferramenta tem um papel definido.',
              )}
            </p>
          </div>
          <div className="public-feature-grid public-company-features">
            {[
              {
                icon: Users,
                title: 'Pessoas e equipas',
                text: 'Envie convites por email. Depois da aceitação, organize colaboradores e atribua funções na sua organização.',
              },
              {
                icon: ScanLine,
                title: 'Campanhas e eventos',
                text: 'Crie campanhas, associe colaboradores e partilhe os links ou códigos QR de cada participação.',
              },
              {
                icon: ContactRound,
                title: 'Contactos com consentimento',
                text: 'Receba contactos voluntários nas campanhas. Os líderes consultam os contactos da empresa; cada colaborador vê os seus.',
              },
              {
                icon: BarChart3,
                title: 'Relatórios da equipa',
                text: 'Consulte aberturas, cliques e contactos recebidos. Compare equipas e acompanhe a actividade por período e campanha.',
              },
            ].map((item) => (
              <article key={item.title}>
                <item.icon size={28} aria-hidden="true" />
                <h3>{t(item.title)}</h3>
                <p>{t(item.text)}</p>
              </article>
            ))}
          </div>
          <p className="public-measurement-note">
            {t(
              'A medição usa os links de campanha. Aberturas e cliques são acções, não pessoas únicas, seguidores ou vendas confirmadas.',
            )}
          </p>
        </section>
        <section
          className="public-section public-business-band"
          id="como-comecar"
        >
          <div className="public-section-intro">
            <span className="public-eyebrow">{t('COMEÇAR COM CLAREZA')}</span>
            <h2>{t('Da sua conta à primeira campanha.')}</h2>
            <p>
              {t(
                'Pode continuar a usar o seu perfil Individual gratuito enquanto prepara a empresa.',
              )}
            </p>
          </div>
          <ol className="public-steps">
            {[
              [
                'Crie a sua conta',
                'Escolha Corporativo ou abra a configuração da empresa na sua conta existente.',
              ],
              [
                'Apresente a sua empresa',
                'Indique os dados da empresa, o número de colaboradores, as equipas e os produtos pretendidos. Guarde o rascunho ou submeta para análise.',
              ],
              [
                'Receba a aprovação',
                'A Framy analisa o pedido e define a capacidade aprovada. As ferramentas abrem no sistema após aprovação; as condições comerciais são acordadas à parte.',
              ],
              [
                'Convide e comece',
                'Envie convites ou pedidos de autorização por email. Depois da aceitação e activação, organize a equipa e crie a primeira campanha.',
              ],
            ].map(([title, text], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </li>
            ))}
          </ol>
          <Link className="public-button" href="/corporativo/configurar">
            {t('Começar a configuração')}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </section>
        <section className="public-section">
          <div className="public-section-intro">
            <span className="public-eyebrow">
              {t('NO DIA A DIA DA SUA EMPRESA')}
            </span>
            <h2>{t('Diferentes equipas. Conexões com propósito.')}</h2>
          </div>
          <div className="public-use-cases">
            {[
              [
                'Revistas e comunicação',
                'Organize a equipa de um evento, partilhe perfis e receba contactos de leitores e parceiros que escolhem deixar os seus dados.',
              ],
              [
                'Vendas e promotores',
                'Atribua campanhas aos promotores e veja a actividade de cada equipa e os contactos que precisam de seguimento.',
              ],
              [
                'Serviços e negócios locais',
                'Apresente os profissionais e os seus serviços. Use campanhas para acompanhar o interesse nas acções da sua empresa.',
              ],
            ].map(([title, text]) => (
              <article key={title}>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="public-section public-company-faq">
          <div className="public-section-intro">
            <h2>{t('Antes de começar')}</h2>
          </div>
          {[
            [
              'Preciso de comprar cartões para configurar a empresa?',
              'Não. Pode submeter a configuração antes de comprar produtos. Cartões, porta-chaves, design e entrega têm condições próprias.',
            ],
            [
              'A aprovação confirma um pagamento?',
              'Não. A aprovação abre as ferramentas da organização. O preço, os produtos e as condições do plano são acordados separadamente, sem débitos automáticos.',
            ],
            [
              'Os colaboradores precisam de aceitar?',
              'Sim. O convite liga a conta à empresa após aceitação pelo email indicado. A autorização para o líder criar um novo acesso também exige consentimento por email.',
            ],
            [
              'O que acontece ao perfil pessoal do colaborador?',
              'A associação à empresa preserva a conta e o perfil pessoal existentes. A suspensão do acesso à organização não desactiva a conta pessoal.',
            ],
            [
              'Os dados vão automaticamente para um CRM?',
              'Actualmente os contactos podem ser consultados e exportados em CSV. Não há sincronização automática com CRM nesta solução.',
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>{t(question)}</summary>
              <p>{t(answer)}</p>
            </details>
          ))}
        </section>
        <PublicTrust />
        <section className="public-section public-final-cta">
          <span className="public-eyebrow">{t('O SEU MUNDO, NUM TOQUE.')}</span>
          <h2>{t('Comece com as pessoas da sua empresa.')}</h2>
          <p>
            {t('Conte-nos o que precisa e prepare o espaço da sua equipa.')}
          </p>
          <div className="public-actions">
            <Link className="public-button" href="/corporativo/configurar">
              {t('Configurar a minha empresa')}
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <Link className="public-text-link" href="/contacto">
              {t('Falar com a Framy')}
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
