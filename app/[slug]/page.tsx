import { notFound } from 'next/navigation';
import Link from 'next/link';
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
        text: 'Para questões sobre o seu perfil, use support@framyconnect.co.mz. Esta prévia de desenvolvimento não aceita pagamentos nem confirma encomendas comerciais.',
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
        text: 'O perfil apresenta apenas os contactos cuja visibilidade activou. Nesta fase, a prévia inteira é privada e o acesso ao perfil depende também das permissões do site.',
      },
      {
        title: 'Como funciona o espaço de teste?',
        text: 'Os pedidos e pagamentos são simulados. Pode percorrer as etapas de produção e entrega sem qualquer cobrança, movimentação de stock real ou instrução a um agente.',
      },
    ],
  },
  privacidade: {
    title: 'A sua identidade. A sua escolha.',
    eyebrow: 'PRIVACIDADE DA PRÉVIA',
    intro:
      'Esta versão é um ambiente de desenvolvimento privado. A política comercial definitiva será publicada antes do lançamento.',
    blocks: [
      {
        title: 'Dados que escolhe guardar',
        text: 'O editor guarda o seu nome, título, nome de utilizador, contactos e link. O email e o telefone não aparecem no perfil publicado sem a sua escolha explícita.',
      },
      {
        title: 'Acesso e publicação',
        text: 'O acesso ao espaço guardado é associado à sua sessão da prévia. Publicar um perfil não altera o acesso privado do site nem activa a indexação em motores de pesquisa.',
      },
      {
        title: 'Pedidos de teste',
        text: 'Os pedidos, nomes de agentes e evidências inseridos são dados de simulação. Use exemplos e não carregue documentos de identificação ou dados de pagamento.',
      },
      {
        title: 'Retirar um perfil',
        text: 'Pode retirar a publicação no editor. Para questões sobre os seus dados, contacte support@framyconnect.co.mz.',
      },
    ],
  },
  termos: {
    title: 'Antes de começar.',
    eyebrow: 'CONDIÇÕES DA PRÉVIA',
    intro:
      'Esta versão permite avaliar o produto em desenvolvimento e não constitui uma loja comercial activa.',
    blocks: [
      {
        title: 'Sem compras reais',
        text: 'Preços, custos, pagamentos e entregas no espaço de teste são exclusivamente demonstrativos. Não constituem propostas comerciais nem recibos fiscais.',
      },
      {
        title: 'Funcionalidades em preparação',
        text: 'O sistema de autenticação comercial, integração de pagamentos, gestão de stock, regras fiscais e permissões operacionais definitivas serão concluídos antes do lançamento.',
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
      `SELECT published_json FROM profiles WHERE username=? AND published_json IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sandbox_memberships m WHERE m.owner_id=profiles.owner_id AND m.plan_id='free-30' AND m.trial_expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    )
    .bind(slug)
    .first<{ published_json: string }>();
  if (!row) notFound();
  const p = JSON.parse(row.published_json) as Profile;
  return (
    <main id="main" className="standalone-mobile-profile">
      <MobileProfile profile={p} published />
    </main>
  );
}
