import Link from './hard-link';
import { getTranslations } from '@/lib/server-i18n';
import {
  ArrowUpRight,
  ContactRound,
  Users,
  BarChart3,
  ScanLine,
  ShieldCheck,
  Globe2,
} from 'lucide-react';

export async function PublicSolutions() {
  const t = await getTranslations();
  return (
    <>
      <section
        className="public-section public-value-strip"
        aria-label={t('Da apresentação ao próximo contacto')}
      >
        {[
          {
            icon: ContactRound,
            title: 'Apresente-se com confiança',
            text: 'Os seus contactos e o seu trabalho, sempre actualizáveis.',
          },
          {
            icon: Users,
            title: 'Dê espaço à sua equipa',
            text: 'Colaboradores, equipas e campanhas num espaço da empresa.',
          },
          {
            icon: BarChart3,
            title: 'Aprenda com cada campanha',
            text: 'Acompanhe actividade e contactos recebidos com consentimento.',
          },
        ].map((item) => (
          <div key={item.title}>
            <item.icon size={25} aria-hidden="true" />
            <h2>{t(item.title)}</h2>
            <p>{t(item.text)}</p>
          </div>
        ))}
      </section>
      <section className="public-section" id="solucoes">
        <div className="public-section-intro">
          <span className="public-eyebrow">
            {t('FEITO PARA AS SUAS CONEXÕES')}
          </span>
          <h2>{t('Comece por si. Cresça com a sua equipa.')}</h2>
          <p>
            {t(
              'Escolha o caminho que faz sentido para si. Os produtos NFC são opcionais para começar a partilhar o seu perfil.',
            )}
          </p>
        </div>
        <div className="public-audiences">
          <article>
            <ContactRound size={30} aria-hidden="true" />
            <span className="public-eyebrow">{t('PARA SI')}</span>
            <h3>{t('A sua próxima apresentação começa aqui.')}</h3>
            <p>
              {t(
                'Reúna contactos, redes sociais e trabalho num perfil digital. Comece com o plano Personal gratuito, sem prazo.',
              )}
            </p>
            <Link className="public-button" href="/perfil?plans=1">
              {t('Criar o meu perfil gratuito')}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link className="public-text-link" href="/exemplo">
              {t('Ver perfil de exemplo')}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </article>
          <article className="public-company-card">
            <Users size={30} aria-hidden="true" />
            <span className="public-eyebrow">{t('PARA A SUA EMPRESA')}</span>
            <h3>{t('Cada pessoa aproxima a sua empresa de alguém.')}</h3>
            <p>
              {t(
                'Organize colaboradores e campanhas. Receba contactos com consentimento e acompanhe os resultados da equipa.',
              )}
            </p>
            <Link className="public-button" href="/para-empresas">
              {t('Conhecer a solução para empresas')}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link className="public-text-link" href="/corporativo/configurar">
              {t('Configurar a minha empresa')}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>
      <section className="public-section public-business-band" id="empresas">
        <div className="public-section-intro">
          <span className="public-eyebrow">
            {t('CONEXÕES QUE A SUA EQUIPA PODE ACOMPANHAR')}
          </span>
          <h2>{t('Do primeiro encontro à visão da equipa.')}</h2>
          <p>
            {t(
              'Perfis apresentam as pessoas. Links de campanha identificam a actividade. Relatórios ajudam o líder a decidir o próximo passo.',
            )}
          </p>
          <Link className="public-text-link" href="/para-empresas">
            {t('Explorar a Framy para empresas')}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="public-feature-grid">
          {[
            {
              icon: Users,
              title: 'Pessoas e equipas',
              text: 'Convites por email, funções e acessos da organização.',
            },
            {
              icon: ScanLine,
              title: 'Campanhas e eventos',
              text: 'Links e códigos QR por colaborador e campanha.',
            },
            {
              icon: ContactRound,
              title: 'Contactos com consentimento',
              text: 'Recolha voluntária de contactos e exportação em CSV.',
            },
            {
              icon: BarChart3,
              title: 'Relatórios da equipa',
              text: 'Gráficos de actividade e comparação entre equipas.',
            },
          ].map((item) => (
            <article key={item.title}>
              <item.icon size={24} aria-hidden="true" />
              <h3>{t(item.title)}</h3>
              <p>{t(item.text)}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export async function PublicTrust() {
  const t = await getTranslations();
  return (
    <section className="public-section public-trust">
      <div className="public-section-intro">
        <span className="public-eyebrow">{t('CLAREZA EM CADA PASSO')}</span>
        <h2>{t('Tecnologia simples. Apoio próximo.')}</h2>
      </div>
      <div className="public-trust-grid">
        <article>
          <Globe2 size={25} aria-hidden="true" />
          <h3>{t('Abre no navegador')}</h3>
          <p>
            {t(
              'Quem recebe o perfil não precisa de instalar uma aplicação. A partilha por NFC requer um telemóvel compatível; o QR oferece outra opção.',
            )}
          </p>
        </article>
        <article>
          <ShieldCheck size={25} aria-hidden="true" />
          <h3>{t('Visibilidade sob o seu controlo')}</h3>
          <p>
            {t(
              'Escolha os contactos publicados no seu perfil. A recolha de contactos em campanhas pede consentimento.',
            )}
          </p>
          <Link className="public-text-link" href="/privacidade">
            {t('Privacidade')}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </article>
        <article>
          <Users size={25} aria-hidden="true" />
          <h3>{t('Apoio da Framy')}</h3>
          <p>
            {t(
              'Converse connosco sobre a configuração, os produtos e a solução para a sua equipa.',
            )}
          </p>
          <Link className="public-text-link" href="/contacto">
            {t('Contactar a Framy')}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </article>
      </div>
    </section>
  );
}
