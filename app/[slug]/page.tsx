import { activeProfileSQL } from '@/lib/entitlement';
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
  sobre: {
    title: 'Conectar começa por si.',
    eyebrow: 'QUEM SOMOS',
    intro:
      'A Framy Connect nasce para tornar a identidade simples, acessível e pronta para ser partilhada.',
    blocks: [
      {
        title: 'A nossa visão',
        text: 'Fazer do toque a linguagem universal da identidade, para cada pessoa e cada instituição à qual pertence.',
      },
      {
        title: 'A nossa missão',
        text: 'Ligar pessoas ao que as representa: os seus contactos, o seu trabalho e as suas conquistas. Um perfil que pode actualizar, ligado aos produtos que o acompanham.',
      },
      {
        title: 'Moçambique primeiro',
        text: 'Desenhamos uma experiência em português, orientada às pessoas, aos criadores e às organizações do nosso mercado.',
      },
    ],
  },
  contacto: {
    title: 'Vamos conectar-nos.',
    eyebrow: 'CONTACTO',
    intro:
      'Conte-nos o que precisa. Um cartão, uma equipa inteira ou uma nova ideia para o seu negócio.',
    blocks: [
      {
        title: 'Conversas que abrem possibilidades',
        text: 'Para informações sobre produtos e soluções, contacte info@framyconnect.co.mz. O envio é feito pela sua aplicação de email.',
      },
      {
        title: 'Apoio ao cliente',
        text: 'Para questões sobre o seu perfil, use support@framyconnect.co.mz. Indique a referência da encomenda ao contactar a equipa. O pagamento é confirmado após verificação no prestador.',
      },
    ],
  },
  ajuda: {
    title: 'Um toque mais simples.',
    eyebrow: 'AJUDA',
    intro: 'As respostas para começar a partilhar a sua identidade.',
    blocks: [
      {
        title: 'Preciso de uma aplicação?',
        text: 'Um perfil publicado abre no navegador através do seu link. A leitura NFC depende de um telemóvel compatível e das respectivas definições.',
      },
      {
        title: 'Posso alterar os meus contactos?',
        text: 'Sim. No seu espaço, edite os dados, guarde o rascunho e publique a versão actualizada. O nome de utilizador fica reservado na primeira gravação.',
      },
      {
        title: 'Quem vê os meus dados?',
        text: 'O perfil apresenta apenas os contactos cuja visibilidade activou. Quem tem o endereço pode consultar um perfil publicado enquanto o período gratuito estiver activo. Pode retirar a publicação no seu painel.',
      },
      {
        title: 'Como acompanho uma encomenda?',
        text: 'Depois de confirmar o pedido, consulte a referência e o estado na sua conta. A produção começa após confirmação do pagamento e atribuição à equipa. Reservas não pagas expiram após 24 horas.',
      },
    ],
  },
  privacidade: {
    title: 'A sua identidade. A sua escolha.',
    eyebrow: 'PRIVACIDADE',
    intro:
      'Conheça os dados utilizados para gerir a sua conta, publicar o seu perfil e acompanhar as suas encomendas.',
    blocks: [
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
        title: 'Retirar um perfil',
        text: 'Pode retirar a publicação no editor e terminar sessões em Segurança da conta. Para pedir correcção ou eliminação de dados e esclarecimentos sobre conservação, contacte support@framyconnect.co.mz. Os ficheiros carregados são conservados enquanto necessários ao perfil ou encomenda.',
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
        text: 'O perfil digital tem um período gratuito de 30 dias, sem renovação automática. Os produtos físicos são pagos separadamente. O pedido registado aguarda confirmação do pagamento; não constitui recibo de pagamento.',
      },
      {
        title: 'Entrega, cancelamento e apoio',
        text: 'Confirme com a equipa o custo e prazo de entrega e as condições de cancelamento, personalização e devolução antes de pagar. Guarde a referência da encomenda e da transacção. Para apoio, contacte support@framyconnect.co.mz.',
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
  return {
    title: pages[slug]?.title ?? 'Identidade digital',
    robots: { index: false, follow: false },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = pages[slug];
  if (page)
    return (
      <>
        <SiteHeader />
        <main id="main" className="section-wrap information-page">
          <span className="eyebrow">{page.eyebrow}</span>
          <h1>{page.title}</h1>
          <p className="page-intro">{page.intro}</p>
          <div className="information-blocks">
            {page.blocks.map((b) => (
              <section key={b.title}>
                <h2>{b.title}</h2>
                <p>{b.text}</p>
              </section>
            ))}
          </div>
          {['contacto', 'aplicar'].includes(slug) && (
            <a
              className="btn btn-primary"
              href={`mailto:info@framyconnect.co.mz?subject=${encodeURIComponent(slug === 'aplicar' ? 'Interesse em ser agente Framy Connect' : 'Informações Framy Connect')}`}
            >
              <Mail size={20} /> Escrever um email <ArrowUpRight size={20} />
            </a>
          )}
          <Link className="text-link" href="/produtos">
            Descobrir produtos <ArrowUpRight size={19} />
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  if (!/^[a-z0-9_]{3,40}$/.test(slug)) notFound();
  const row = await database()
    .prepare(
      `SELECT published_json FROM profiles WHERE username=? AND published_json IS NOT NULL AND ${activeProfileSQL}`,
    )
    .bind(slug, new Date().toISOString(), new Date().toISOString())
    .first<{ published_json: string }>();
  if (!row) notFound();
  const p = JSON.parse(row.published_json) as Profile;
  return (
    <main id="main" className="standalone-mobile-profile">
      <MobileProfile profile={p} published />
    </main>
  );
}
