const stories = [
  {
    id: 'trabalho',
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
    tag: 'CONTACTOS SEM REIMPRESSÕES',
    title: 'Mudou o número. O seu cartão pode continuar consigo.',
    pain: 'Um novo contacto, um novo projecto ou um novo serviço não deveria obrigar a refazer toda a apresentação sempre que a informação muda.',
    solution:
      'Actualize o conteúdo mantendo o mesmo endereço do perfil. Um QR ou produto NFC ligado a esse endereço continua a abrir a informação publicada. Os produtos físicos são opcionais e pagos à parte.',
    moment: 'Comece com um link ou QR. Escolha o produto quando fizer sentido.',
    plan: 'Todos os planos',
  },
] as const;

const presentation = [
  {
    slug: 'profissionais',
    image: '/solutions/professionals.webp',
    title: 'Mostre o trabalho por trás do seu nome.',
    summary:
      'Contactos, projectos e serviços. Uma apresentação que continua depois da reunião.',
    imageAlt: 'Profissionais a apresentar um projecto num atelier.',
    benefits: [
      'Contactos e portefólio no mesmo perfil',
      'Vitrine com até 6 produtos ou serviços',
      'Formulário de contacto e caixa de entrada',
    ],
    demoMode: 0,
    corporate: false,
    professional: true,
  },
  {
    slug: 'criadores',
    image: '/solutions/creators.webp',
    title: 'Da conversa ao seu conteúdo, num toque.',
    summary:
      'Ajude quem o conhece a encontrar os seus canais e escolher onde o seguir.',
    imageAlt: 'Criadora a partilhar conteúdo num encontro criativo.',
    benefits: [
      'Redes sociais num só lugar',
      'Partilha por link, NFC e código QR',
      'Conteúdo actualizável a qualquer momento',
    ],
    demoMode: 0,
    corporate: false,
    professional: false,
  },
  {
    slug: 'consultorios',
    image: '/solutions/clinics.webp',
    title: 'Torne mais simples encontrar o seu consultório.',
    summary:
      'Apresente o contacto de marcação, a localização e o horário com clareza.',
    imageAlt: 'Profissional de saúde a receber uma pessoa na recepção.',
    benefits: [
      'Contacto de marcação fácil de encontrar',
      'Morada, direcções e horário',
      'Informação pública sempre actualizada',
    ],
    demoMode: 0,
    corporate: false,
    professional: true,
  },
  {
    slug: 'eventos',
    image: '/solutions/events.webp',
    title: 'Continue a conversa depois do evento.',
    summary:
      'Reúna os contactos da campanha e prepare o próximo passo da sua equipa.',
    imageAlt: 'Profissionais a trocar contactos num evento empresarial.',
    benefits: [
      'Links por colaborador e campanha',
      'Contactos recolhidos com consentimento',
      'Relatórios e exportação CSV',
    ],
    demoMode: 2,
    corporate: true,
    professional: false,
  },
  {
    slug: 'equipas',
    image: '/solutions/teams.webp',
    title: 'Ligue a sua equipa às oportunidades.',
    summary:
      'Organize pessoas, permissões e campanhas num espaço da sua empresa.',
    imageAlt: 'Equipa a colaborar num escritório luminoso.',
    benefits: [
      'Convites e permissões de colaboradores',
      'Organização por equipas',
      'Campanhas e contactos com consentimento',
    ],
    demoMode: 1,
    corporate: true,
    professional: false,
  },
  {
    slug: 'contactos-actualizados',
    image: '/solutions/updates.webp',
    title: 'Mude a informação. Mantenha a ligação.',
    summary:
      'Actualize o perfil e mantenha o endereço que já partilhou por link, QR ou NFC.',
    imageAlt: 'Profissional a actualizar o perfil no telemóvel.',
    benefits: [
      'O mesmo endereço do perfil',
      'Contactos actualizados sem reimpressão',
      'Produtos NFC opcionais',
    ],
    demoMode: 0,
    corporate: false,
    professional: false,
  },
] as const;

export const solutionPaths = stories.map((story, index) => ({
  ...story,
  ...presentation[index],
  href: `/solucoes/${presentation[index].slug}`,
}));
export type SolutionPath = (typeof solutionPaths)[number];
export function solutionBySlug(slug: string) {
  return solutionPaths.find((path) => path.slug === slug);
}
