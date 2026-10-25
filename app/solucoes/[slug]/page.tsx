import { notFound } from 'next/navigation';
import Link from '@/components/hard-link';
import { SourceImage } from '@/components/source-image';
import { PublicHeader } from '@/components/public-header';
import { SiteFooter } from '@/components/site-shell';
import { ConnectionDemo } from '@/components/connection-demo';
import { SolutionCards } from '@/components/solution-cards';
import { solutionBySlug, solutionPaths } from '@/lib/solution-paths';
import { testimonialFor } from '@/lib/solution-testimonials';
import { getTranslations } from '@/lib/server-i18n';
import { publicPageRobots } from '@/lib/server-site';
import { ArrowLeft, ArrowUpRight, Check } from 'lucide-react';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const path = solutionBySlug((await params).slug);
  if (!path)
    return { title: 'Framy Connect', robots: { index: false, follow: false } };
  const t = await getTranslations();
  return {
    title: t(path.title),
    description: t(path.summary),
    robots: publicPageRobots(),
  };
}
export default async function SolutionPage({ params }: Props) {
  const path = solutionBySlug((await params).slug);
  if (!path) notFound();
  const t = await getTranslations();
  const testimonial = testimonialFor(path.slug);
  const primaryHref = path.corporate
    ? '/corporativo/configurar?offer=business'
    : path.professional
      ? '/perfil?billing=1'
      : '/perfil';
  const primaryLabel = path.corporate
    ? 'Configurar a minha equipa'
    : path.professional
      ? 'Explorar Professional'
      : 'Criar o meu perfil gratuito';
  const steps = path.corporate
    ? [
        [
          'Configure a sua equipa',
          'Indique a empresa e a dimensão da equipa para preparar a proposta.',
        ],
        [
          'Prepare a campanha',
          'Após a aprovação, organize colaboradores e crie os links da campanha.',
        ],
        [
          'Partilhe e acompanhe',
          'Consulte actividade, contactos enviados com consentimento e relatórios.',
        ],
      ]
    : [
        ['Crie o seu perfil', 'Adicione o seu nome, apresentação e imagem.'],
        [
          'Escolha o que partilhar',
          'Reúna os contactos e links que quer tornar públicos.',
        ],
        [
          'Publique e partilhe',
          'Partilhe o seu endereço por link ou QR. Pode escolher um produto NFC mais tarde.',
        ],
      ];
  const questions = [
    [
      'Preciso de comprar um produto NFC?',
      'Não. Pode começar por link ou QR. Os produtos físicos são opcionais e pagos separadamente.',
    ],
    path.corporate
      ? [
          'Como começo com a minha equipa?',
          'Escolha Business ou Enterprise e preencha a configuração da empresa. A equipa Framy confirma a proposta e a activação.',
        ]
      : [
          'Posso começar gratuitamente?',
          'Sim. Personal é gratuito, sem prazo. Professional é opcional e as soluções para equipas dependem de proposta.',
        ],
    path.corporate
      ? [
          'Quem vê os contactos da campanha?',
          'Os responsáveis autorizados da empresa, segundo as permissões existentes. A recolha pede consentimento.',
        ]
      : [
          'Posso actualizar os meus contactos?',
          'Sim. Pode editar a fotografia, os contactos e os links em A minha identidade. O endereço do perfil mantém-se, para continuar a usar o mesmo cartão.',
        ],
  ];
  const action = (
    <Link className="public-button" href={primaryHref}>
      {t(primaryLabel)}
      <ArrowUpRight size={18} aria-hidden="true" />
    </Link>
  );
  return (
    <div className="framy-public phase-one solution-page">
      <PublicHeader />
      <main id="main">
        <section className="solution-page-hero solution-section">
          <div>
            <Link className="solution-back" href="/#problemas">
              <ArrowLeft size={16} aria-hidden="true" />
              {t('Todas as soluções')}
            </Link>
            <span className="public-eyebrow">{t(path.tag)}</span>
            <h1>{t(path.title)}</h1>
            <p>{t(path.summary)}</p>
            <div className="public-actions">
              {action}
              <Link className="public-text-link" href="#demonstracao">
                {t('Veja a Framy em acção')}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <figure>
            <SourceImage
              loading="eager"
              fetchPriority="high"
              src={path.image}
              srcSet={`${path.image.replace('.webp', '-small.webp')} 480w, ${path.image} 1200w`}
              sizes="(max-width: 800px) 100vw, 50vw"
              width={1200}
              height={800}
              alt={t(path.imageAlt)}
            />
            <figcaption>
              {t('Fotografias ilustrativas geradas por IA.')}
            </figcaption>
          </figure>
        </section>
        <section className="solution-section solution-explanation">
          <div>
            <span className="public-eyebrow">{t('A sua situação')}</span>
            <h2>{t(path.moment)}</h2>
            <p>{t(path.pain)}</p>
          </div>
          <div>
            <span className="public-eyebrow">{t('Como a Framy ajuda')}</span>
            <p>{t(path.solution)}</p>
            <ul>
              {path.benefits.map((benefit) => (
                <li key={benefit}>
                  <Check size={18} aria-hidden="true" />
                  {t(benefit)}
                </li>
              ))}
            </ul>
            <small>
              {t(
                path.corporate
                  ? 'Business para 3–50 pessoas. Enterprise para 51–500. Activação e condições mediante proposta.'
                  : 'Comece com Personal gratuito. As ferramentas adicionais dependem do plano escolhido.',
              )}
            </small>
          </div>
        </section>
        <section className="solution-section solution-demo" id="demonstracao">
          <div>
            <span className="public-eyebrow">{t('Veja a Framy em acção')}</span>
            <h2>{t('Uma situação do seu dia a dia')}</h2>
            <p>{t(path.moment)}</p>
            {path.id === 'consultorio' && (
              <p className="solution-note">
                {t(
                  'O perfil não é um sistema de marcações nem um processo clínico. Não envie sintomas, exames ou dados de saúde pelos formulários de contacto.',
                )}
              </p>
            )}
            {path.id === 'criadores' && (
              <p className="solution-note">
                {t(
                  'A pessoa escolhe seguir o seu canal. A Framy não adiciona seguidores automaticamente nem garante crescimento.',
                )}
              </p>
            )}
          </div>
          <ConnectionDemo initialMode={path.demoMode} />
        </section>
        {testimonial && (
          <section className="solution-section solution-testimonial">
            <span className="public-eyebrow">{t('Testemunho de cliente')}</span>
            <blockquote>{testimonial.quote}</blockquote>
            <p>
              <strong>{testimonial.name}</strong> · {testimonial.role}
            </p>
          </section>
        )}
        <section className="solution-section solution-steps">
          <h2>{t('Comece em três passos')}</h2>
          <ol>
            {steps.map(([title, text], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="solution-section solution-plan">
          <div>
            <span className="public-eyebrow">
              {t('O plano para o seu próximo passo')}
            </span>
            <h2>{t(path.plan)}</h2>
            <p>
              {t(
                path.corporate
                  ? 'Business para 3–50 pessoas. Enterprise para 51–500. Activação e condições mediante proposta.'
                  : path.professional
                    ? 'Professional acrescenta ferramentas para apresentar o seu trabalho. O preço e as condições são confirmados antes do pagamento.'
                    : 'Personal gratuito, sem prazo. Planos pagos são opcionais.',
              )}
            </p>
          </div>
          <div className="public-actions">
            {action}
            <Link
              className="public-text-link"
              href={
                path.corporate
                  ? '/corporativo/configurar?offer=enterprise'
                  : path.professional
                    ? '/perfil'
                    : '/#planos'
              }
            >
              {t(
                path.corporate
                  ? 'Preparar Enterprise'
                  : path.professional
                    ? 'Começar gratuitamente'
                    : 'Comparar planos',
              )}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section className="solution-section solution-questions">
          <h2>{t('Perguntas sobre esta solução')}</h2>
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>{t(question)}</summary>
              <p>{t(answer)}</p>
            </details>
          ))}
        </section>
        <section className="solution-section solution-closing">
          <h2>{t('A sua próxima conexão já tem por onde continuar.')}</h2>
          <div className="public-actions">{action}<Link className="public-text-link" href="/#problemas">{t('Todas as soluções')}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        </section>
        <section className="solution-section solution-related">
          <h2>{t('Também pode fazer sentido para si')}</h2>
          <SolutionCards
            paths={solutionPaths
              .filter((p) => p.id !== path.id)
              .sort(
                (a, b) =>
                  Number(b.corporate === path.corporate) -
                  Number(a.corporate === path.corporate),
              )
              .slice(0, 2)}
            t={t}
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
