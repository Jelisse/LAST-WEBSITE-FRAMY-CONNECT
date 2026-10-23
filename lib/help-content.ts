export const helpTopics = [
  {
    id: 'perfil',
    title: 'Perfil e publicação',
    description: 'Criar, editar e partilhar a sua identidade.',
    href: '/perfil',
    action: 'Abrir o meu perfil',
    articles: [
      [
        'Como altero os meus contactos?',
        'Abra A minha identidade, edite os dados e a visibilidade dos contactos, guarde o rascunho e publique a versão actualizada. O endereço do perfil mantém-se.',
      ],
      [
        'O meu perfil não aparece. O que verifico?',
        'Confirme que publicou o perfil e que o plano está activo. Abra o link publicado noutro navegador. Se continuar indisponível, envie o endereço do perfil à equipa Framy.',
      ],
    ],
  },
  {
    id: 'nfc',
    title: 'NFC, QR e partilha',
    description: 'Ligar o seu cartão à próxima conversa.',
    href: '/exemplo',
    action: 'Ver um perfil de exemplo',
    articles: [
      [
        'O telemóvel não lê o cartão NFC. E agora?',
        'Desbloqueie o telemóvel, confirme a compatibilidade e active o NFC quando necessário. Aproxime o cartão da zona de leitura e experimente retirar a capa. Pode sempre partilhar o link ou o QR do perfil.',
      ],
      [
        'Quem recebe precisa de instalar uma aplicação?',
        'Não. O link ou QR abre o perfil publicado no navegador. É necessária ligação à internet; a leitura NFC depende do telemóvel e das suas definições.',
      ],
    ],
  },
  {
    id: 'encomendas',
    title: 'Encomendas e pagamentos',
    description: 'Consultar o estado e pedir ajuda com uma compra.',
    href: '/acompanhar',
    action: 'Acompanhar a minha encomenda',
    articles: [
      [
        'Como consulto o estado da minha encomenda?',
        'Abra o acompanhamento e introduza a referência da encomenda. Para recuperar detalhes da compra, use o navegador onde comprou ou a conta associada. Se precisar de ajuda, indique a referência ao contactar a Framy.',
      ],
      [
        'Paguei, mas a encomenda ainda não está confirmada.',
        'Consulte primeiro o estado da encomenda. A confirmação depende da verificação pelo prestador de pagamentos. Se continuar pendente, contacte a Framy com a referência e a data do pagamento antes de tentar pagar novamente.',
      ],
    ],
  },
  {
    id: 'conta',
    title: 'Acesso e planos',
    description: 'Recuperar o acesso e encontrar o plano certo.',
    href: '/recuperar',
    action: 'Recuperar acesso à conta',
    articles: [
      [
        'Não consigo entrar na minha conta.',
        'Use Recuperar acesso com o email da conta e siga as instruções apresentadas. Verifique também a pasta de spam. Se não receber a mensagem, contacte a Framy; nunca envie a sua palavra-passe ou códigos de acesso.',
      ],
      [
        'O perfil gratuito exige a compra de um cartão?',
        'Não. Pode começar com Personal e partilhar por link ou QR. Os produtos físicos são opcionais. Consulte os planos para comparar as ferramentas e os valores publicados.',
      ],
    ],
  },
  {
    id: 'equipas',
    title: 'Empresas e campanhas',
    description: 'Organizar colaboradores, convites e contactos.',
    href: '/corporativo',
    action: 'Abrir o espaço da empresa',
    articles: [
      [
        'Como começo com a minha equipa?',
        'Configure a empresa e peça uma proposta Business ou Enterprise. Depois da aprovação, os responsáveis autorizados podem gerir a equipa e os convites segundo as condições acordadas.',
      ],
      [
        'Onde encontro os contactos de uma campanha?',
        'Entre no espaço da empresa com a conta autorizada e consulte os contactos e relatórios da campanha. Os dados recolhidos com consentimento podem ser exportados em CSV. O acesso depende do seu papel na empresa.',
      ],
      [
        'O convite da empresa não chegou ou expirou.',
        'Confirme o email com o responsável da empresa e verifique o spam. Use o convite mais recente: um reenvio substitui o link anterior. Se o erro continuar, contacte a Framy indicando a empresa e a mensagem apresentada.',
      ],
      [
        'Como mantenho os cartões da equipa consistentes?',
        'Os responsáveis autorizados configuram a aparência, informação e permissões no Modelo da empresa. Reveja a pré-visualização antes de guardar e actualizar os cartões. Cada colaborador confirma os contactos pessoais que publica.',
      ],
      [
        'Preciso de ajuda com o HubSpot ou ferramentas da equipa.',
        'Abra Integrações para verificar o estado do HubSpot e rever os contactos elegíveis antes de transferir. Nas assinaturas e fundos, confira a pré-visualização antes de descarregar. Se houver um erro, indique a ferramenta e a mensagem apresentada; não envie tokens ou palavras-passe.',
      ],
    ],
  },
  {
    id: 'privacidade',
    title: 'Privacidade e problemas técnicos',
    description: 'Controlar a visibilidade e comunicar um problema.',
    href: '/privacidade',
    action: 'Consultar a política de privacidade',
    articles: [
      [
        'Como controlo o que fica público?',
        'Na edição do perfil, reveja a visibilidade de cada contacto antes de publicar. Pode retirar a publicação no seu espaço. Consulte a política de privacidade ou contacte a Framy para questões sobre os seus dados.',
      ],
      [
        'Que informação ajuda a resolver um erro?',
        'Indique a página, o que tentou fazer, a mensagem de erro e o modelo do telemóvel ou navegador. Pode anexar uma captura de ecrã ao email, ocultando dados privados. Não envie palavras-passe, códigos, dados de cartão ou informação clínica.',
      ],
    ],
  },
] as const;
