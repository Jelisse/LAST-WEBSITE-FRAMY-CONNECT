import Link from './hard-link';
import { getTranslations } from '@/lib/server-i18n';
import {
  DraftingCompass,
  Camera,
  Stethoscope,
  Users,
  CalendarDays,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
export const problemPaths = [
  {
    id: 'trabalho',
    icon: DraftingCompass,
    tag: 'PROFISSIONAIS INDEPENDENTES',
    title: 'O seu trabalho não cabe num cartão.',
    pain: 'Uma visita à obra. Uma reunião. Uma recomendação. O potencial cliente fica com o seu número, mas não encontra os projectos que mostram o que sabe fazer.',
    solution:
      'Arquitectos, designers e fotógrafos: apresente contactos, website e portefólio num só perfil. Com Professional, acrescente uma vitrine de serviços e receba pedidos de contacto.',
    moment:
      'Depois da visita à obra, o seu próximo projecto ainda pode começar.',
    plan: 'Personal ou Professional',
  },
  {
    id: 'criadores',
    icon: Camera,
    tag: 'CRIADORES E INFLUENCIADORES',
    title: 'Conheceram-no na vida real. Ajude-os a encontrá-lo online.',
    pain: 'No lançamento, na rua ou num evento, ditar um nome de utilizador pode interromper a conversa. Quem está a começar precisa de tornar o próximo passo simples.',
    solution:
      'Reúna Instagram, TikTok, Facebook e outros canais em ícones fáceis de reconhecer. Partilhe o perfil por QR, link ou NFC e deixe cada pessoa escolher onde o seguir.',
    moment: 'Uma conversa no evento. Um caminho directo para o seu conteúdo.',
    plan: 'Comece com Personal',
  },
  {
    id: 'consultorio',
    icon: Stethoscope,
    tag: 'CONSULTÓRIOS E SAÚDE',
    title: 'O contacto certo, antes da próxima marcação.',
    pain: 'Quando telefone, localização e horários estão espalhados, uma pessoa pode precisar de várias mensagens só para saber como contactar o consultório.',
    solution:
      'Médicos e profissionais de saúde: disponibilize informação profissional e o contacto de marcação. Professional permite acrescentar morada, direcções e horário.',
    moment: 'Informação pública do consultório, apresentada com clareza.',
    plan: 'Professional',
  },
  {
    id: 'eventos',
    icon: CalendarDays,
    tag: 'FEIRAS E NETWORKING',
    title: 'A feira acaba. O seguimento começa.',
    pain: 'Entre cartões, mensagens e notas, pode ser difícil organizar quem pediu mais informações e a quem dar seguimento depois de uma feira ou reunião comercial.',
    solution:
      'Nas campanhas Business e Enterprise, partilhe links por colaborador e recolha contactos com consentimento. Consulte os resultados e exporte os dados em CSV para preparar o seguimento.',
    moment: 'Da conversa no stand à próxima conversa com a sua equipa.',
    plan: 'Business ou Enterprise',
  },
  {
    id: 'equipas',
    icon: Users,
    tag: 'EMPRESAS EM MOÇAMBIQUE',
    title: 'Cada colaborador abre uma porta. A equipa precisa de contexto.',
    pain: 'Quando cada vendedor guarda contactos no seu próprio telemóvel, a gestão pode perder contexto sobre as campanhas e os pedidos recebidos pela equipa.',
    solution:
      'Organize colaboradores, permissões e campanhas num espaço da empresa. Os contactos enviados pelos formulários de campanha ficam acessíveis aos responsáveis autorizados, com relatórios por equipa.',
    moment: 'Para equipas no terreno, na loja e nos eventos da empresa.',
    plan: 'Business: 3–50 · Enterprise: 51–500',
  },
  {
    id: 'actualizar',
    icon: RefreshCw,
    tag: 'CONTACTOS SEM REIMPRESSÕES',
    title: 'Mudou o número. O seu cartão pode continuar consigo.',
    pain: 'Um novo contacto, um novo projecto ou um novo serviço não deveria obrigar a refazer toda a apresentação sempre que a informação muda.',
    solution:
      'Actualize o conteúdo mantendo o mesmo endereço do perfil. Um QR ou produto NFC ligado a esse endereço continua a abrir a informação publicada. Os produtos físicos são opcionais e pagos à parte.',
    moment: 'Comece com um link ou QR. Escolha o produto quando fizer sentido.',
    plan: 'Todos os planos',
  },
] as const;
export async function ProblemPaths({ details = false }: { details?: boolean }) {
  const t = await getTranslations();
  return (
    <section className="why-section problem-paths" id="problemas">
      <div className="why-heading">
        <span className="public-eyebrow">
          {t('DO SEU DIA A DIA PARA A PRÓXIMA CONEXÃO')}
        </span>
        <h2>{t('O que está a tentar resolver?')}</h2>
        <p>
          {t(
            'Comece pela situação que conhece. Descubra como a Framy pode ajudar e escolha o plano adequado.',
          )}
        </p>
      </div>
      <div className="problem-grid">
        {problemPaths.map((p) => (
          <article key={p.id}>
            <div className="problem-category">
              <p.icon size={20} aria-hidden="true" />
              <span>{t(p.tag)}</span>
            </div>
            <h3>{t(p.title)}</h3>
            <p>{t(p.pain)}</p>
            <Link href={`/porque-framy#${p.id}`}>
              {t('Encontrar o meu caminho')}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
      {details && (
        <div className="problem-stories">
          {problemPaths.map((p, i) => (
            <article id={p.id} key={p.id}>
              <div className="problem-story-moment">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <p.icon size={36} aria-hidden="true" />
                <h3>{t(p.moment)}</h3>
                <small>
                  {t('Situação ilustrativa, não um testemunho de cliente.')}
                </small>
              </div>
              <div>
                <span className="public-eyebrow">{t(p.tag)}</span>
                <h3>{t(p.title)}</h3>
                <p>{t(p.solution)}</p>
                {p.id === 'consultorio' && (
                  <p className="why-note">
                    {t(
                      'O perfil não é um sistema de marcações nem um processo clínico. Não envie sintomas, exames ou dados de saúde pelos formulários de contacto.',
                    )}
                  </p>
                )}
                {p.id === 'criadores' && (
                  <p className="why-note">
                    {t(
                      'A pessoa escolhe seguir o seu canal. A Framy não adiciona seguidores automaticamente nem garante crescimento.',
                    )}
                  </p>
                )}
                <strong>{t(p.plan)}</strong>
                <div className="public-actions">
                  <Link
                    className="public-button"
                    href={
                      i === 3 || i === 4
                        ? '/corporativo/configurar'
                        : '/perfil?plans=1'
                    }
                  >
                    {t(
                      i === 3 || i === 4
                        ? 'Configurar a minha empresa'
                        : 'Criar o meu perfil gratuito',
                    )}
                    <ArrowUpRight size={16} />
                  </Link>
                  <Link className="public-text-link" href="#comparar-planos">
                    {t('Comparar planos')}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
