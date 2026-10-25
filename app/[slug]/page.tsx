import { AboutPage } from '@/components/about-page';
import { publishedProfile } from '@/lib/server-profile-access';
import { getTranslations } from '@/lib/server-i18n';
import { activeProfileSQL } from '@/lib/entitlement';
import { siteURL, publicPageRobots } from '@/lib/server-site';
import { notFound } from 'next/navigation';
import Link from '@/components/hard-link';
import { Mail, ArrowUpRight } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { MobileProfile } from '@/components/mobile-profile';
import { database } from '@/lib/server-db';
import type { Profile } from '@/lib/domain';
export const dynamic = 'force-dynamic';
const pages: Record<
  string,
  {
    title: string;
    eyebrow: string;
    intro: string;
    blocks: { title: string; text: string }[];
  }
> = {
  privacidade: {
    title: 'Privacidade e utilização dos dados',
    eyebrow: 'PRIVACIDADE',
    intro:
      'Conheça os dados utilizados para gerir a sua conta, publicar o seu perfil e acompanhar as suas encomendas.',
    blocks: [
      {
        title: 'Compras sem conta',
        text: 'Pode comprar produtos físicos sem criar conta. Guardamos o nome, email, contacto e dados de entrega para gerir a encomenda. Um cookie necessário, inacessível a scripts e válido por 30 dias, permite recuperar a compra neste navegador. A referência recente fica no dispositivo e a tentativa de pagamento neste separador. A referência pública mostra apenas o progresso. Dados pessoais e recuperação do pagamento exigem o navegador da compra, a conta associada ou um link enviado ao email do comprador, válido por 30 minutos.',
      },
      {
        title: 'Cookies e armazenamento no dispositivo',
        text: 'A sessão utiliza um cookie necessário, protegido contra acesso por scripts, que expira após 24 horas. A preferência de idioma é guardada durante um ano. A configuração da compra fica neste separador por até 30 minutos e é removida ao terminar sessão. As estatísticas são opcionais: só começam após Permitir, e Recusar mantém o website funcional. Guardamos essa escolha por 180 dias; depois pedimos novamente. Pode retirar a autorização nas Preferências de estatísticas. Os perfis usam apenas totais diários de cliques, sem identificadores de visitantes. Respeitamos os sinais de não rastrear e de privacidade global do navegador.',
      },
      {
        title: 'Pedidos de informação e equipas',
        text: 'Ao enviar um pedido pelo perfil, autoriza a entrega do seu nome, email e mensagem ao titular. As mensagens ficam disponíveis durante 90 dias e podem ser eliminadas pelo titular. O convite para equipa só dá acesso ao nome, endereço e estado de publicação do perfil após aceitação; permite aplicar a cor da marca. Pode sair da equipa a qualquer momento. Domínios personalizados exigem prova de propriedade e validação HTTPS.',
      },
      {
        title: 'Medição dos perfis digitais',
        text: 'Os perfis contam cliques por dia, sem cookies analíticos, identificadores de visitantes ou registos individuais de eventos. Os cartões da empresa também contam visitas agregadas quando permite estatísticas; não identificam visitantes únicos. Cliques repetidos contam novamente. Os totais diários são conservados por até 90 dias; o total público de conexões preserva o histórico e acrescenta novos cliques. O histórico anterior foi recolhido com consentimento. Limites de segurança podem usar um código do IP por uma hora para prevenir abuso; não integra os relatórios. Respeitamos os sinais de não rastrear e de privacidade global.',
      },
      {
        title: 'Dados que escolhe guardar',
        text: 'Guardamos os dados da conta, o perfil, as fotografias e os designs que envia. O email e o telefone do perfil só são publicados quando activa a respectiva visibilidade.',
      },
      {
        title: 'Acesso e publicação',
        text: 'A conta e os rascunhos exigem sessão. Os perfis publicados são acessíveis pelo seu endereço enquanto o plano estiver activo. Retirar a publicação impede novas consultas; conteúdos já partilhados ou copiados por terceiros podem permanecer fora do serviço.',
      },
      {
        title: 'Encomendas e pagamentos',
        text: 'Contactos de entrega e encomendas são consultados pelo titular e pela gestão. O agente atribuído recebe os dados necessários à execução e entrega. O pagamento é efectuado no prestador externo; não introduza dados de cartão ou códigos de pagamento em mensagens ou designs.',
      },
      {
        title: 'Candidaturas e documentos privados',
        text: 'Os dados pessoais, fotografia e BI da candidatura são consultados pelo candidato e pela gestão autorizada para análise. Os documentos não são publicados. Pode pedir correcção ou eliminação pelo apoio. A gestão decide manualmente sobre a candidatura.',
      },
      {
        title: 'Visitas aos produtos',
        text: 'Com autorização para estatísticas, contamos visitas às páginas dos produtos. Um identificador aleatório neste separador evita repetições no mesmo dia; não guardamos o IP nesta estatística. Os registos têm conservação de até 90 dias e o painel apresenta os últimos 30 dias.',
      },
      {
        title: 'Estatísticas opcionais do website',
        text: 'Com a sua autorização, medimos páginas públicas, etapas da compra, tempos de carregamento, origem por domínio, campanha, categoria de dispositivo e país aproximado. Um identificador aleatório agrupa a sessão e expira após 30 minutos sem actividade. Não incluímos nomes, emails, formulários ou parâmetros privados dos endereços. Pode recusar ou retirar a autorização nas Preferências de estatísticas no rodapé. O sinal de não rastrear do navegador é respeitado. Os registos são eliminados automaticamente após 90 dias nas limpezas periódicas. Os relatórios são reservados à gestão.',
      },
      {
        title: 'Retirar um perfil',
        text: 'Pode retirar a publicação no editor e terminar sessões em Segurança da conta. Para pedir correcção ou eliminação de dados e esclarecimentos sobre conservação, contacte info@framyconnect.co.mz. Os ficheiros carregados são conservados enquanto necessários ao perfil ou encomenda.',
      },
    ],
  },
  termos: {
    title: 'Antes de começar.',
    eyebrow: 'CONDIÇÕES DO SERVIÇO',
    intro:
      'Consulte as condições do perfil digital e confirme os detalhes da sua encomenda antes de efectuar o pagamento.',
    blocks: [
      {
        title: 'Perfil digital e produto físico',
        text: 'O plano Individual é gratuito, sem prazo e sem renovação. Profissional e Corporativo são planos pagos, com períodos mensais ou anuais disponibilizados pelo gestor. Cada renovação exige pagamento confirmado; não há débito automático. Após o período pago e 7 dias de tolerância, o perfil usa os limites do Individual gratuito. O conteúdo excedente permanece guardado em privado. Produtos físicos, design e entrega são pagos separadamente. Um pedido de pagamento não é comprovativo de pagamento.',
      },
      {
        title: 'Entrega, cancelamento e apoio',
        text: 'Confirme com a equipa o custo e prazo de entrega e as condições de cancelamento, personalização e devolução antes de pagar. Guarde a referência da encomenda e da transacção. Para apoio, contacte info@framyconnect.co.mz.',
      },
    ],
  },
  aplicar: {
    title: 'Faça parte da próxima conexão.',
    eyebrow: 'TORNE-SE AGENTE',
    intro:
      'Ajude a levar as identidades Framy Connect às pessoas da sua região.',
    blocks: [
      {
        title: 'O que fará',
        text: 'Preparar produtos, programar o link correcto, testar cada unidade e acompanhar a entrega ao cliente.',
      },
      {
        title: 'O que precisa',
        text: 'Um smartphone compatível, atenção ao detalhe e disponibilidade para seguir os procedimentos de qualidade. A região, formação e comissão serão acordadas antes da activação.',
      },
      {
        title: 'Manifeste o seu interesse',
        text: 'A candidatura com verificação de documentos ainda está em preparação. Pode contactar info@framyconnect.co.mz indicando o seu nome e região. Não envie documentos de identificação nesta prévia.',
      },
    ],
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations();
  return {
    title: t(
      slug === 'sobre'
        ? 'Sobre a Framy Connect'
        : (pages[slug]?.title ?? 'Identidade digital'),
    ),
    description:
      slug === 'sobre'
        ? t(
            'Conheça a Framy Connect: perfis digitais, produtos NFC opcionais e ferramentas para pessoas e equipas em Moçambique.',
          )
        : undefined,
    robots:
      slug === 'sobre' || pages[slug]
        ? publicPageRobots()
        : { index: false, follow: false },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getTranslations();
  const { slug } = await params;
  if (slug === 'sobre') return <AboutPage />;
  const page = pages[slug];
  if (page)
    return (
      <>
        <SiteHeader />
        <main id="main" className="section-wrap information-page">
          <span className="eyebrow">{t(page.eyebrow)}</span>
          <h1>{t(page.title)}</h1>
          <p className="page-intro">{t(page.intro)}</p>
          <div className="information-blocks">
            {page.blocks.map((b) => (
              <section
                key={b.title}
                id={
                  b.title === 'Cookies e armazenamento no dispositivo'
                    ? 'cookies'
                    : undefined
                }
              >
                <h2>{t(b.title)}</h2>
                <p>{t(b.text)}</p>
              </section>
            ))}
          </div>
          {['contacto', 'aplicar'].includes(slug) && (
            <a
              className="btn btn-primary"
              href={`mailto:info@framyconnect.co.mz?subject=${encodeURIComponent(slug === 'aplicar' ? 'Interesse em ser agente Framy Connect' : 'Informações Framy Connect')}`}
            >
              <Mail size={20} />
              {t(' Escrever um email ')}
              <ArrowUpRight size={20} />
            </a>
          )}
          {slug === 'contacto' && (
            <Link className="text-link" href="https://wa.me/258846847629">
              {t('O nosso WhatsApp')}
              <ArrowUpRight size={19} />
            </Link>
          )}
        </main>
        <SiteFooter />
      </>
    );
  if (!/^[a-z0-9_]{3,40}$/.test(slug)) notFound();
  const row = await database()
    .prepare(
      `SELECT owner_id,published_json FROM profiles WHERE username=? AND published_json IS NOT NULL AND ${activeProfileSQL}`,
    )
    .bind(slug, new Date().toISOString(), new Date().toISOString())
    .first<{ owner_id: string; published_json: string }>();
  if (!row) notFound();
  const p = await publishedProfile(
    row.owner_id,
    JSON.parse(row.published_json) as Profile,
  );
  return (
    <main id="main" className="standalone-mobile-profile">
      <MobileProfile profile={p} published brandHref={siteURL()?.href ?? '/'} />
    </main>
  );
}
