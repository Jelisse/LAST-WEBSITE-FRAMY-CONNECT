export const publicNavigation = [
  {
    id: 'solutions',
    label: 'Soluções',
    groups: [
      {
        label: 'Para si',
        links: [
          { label: 'Profissionais independentes', href: '/porque-framy' },
          { label: 'Criadores e influenciadores', href: '/porque-framy' },
          { label: 'Criar perfil gratuito', href: '/entrar?mode=register' },
        ],
      },
      {
        label: 'Para a sua equipa',
        links: [
          { label: 'Para empresas', href: '/para-empresas' },
          { label: 'Planos', href: '/#planos' },
          {
            label: 'Falar com vendas',
            href: 'mailto:sales@framyconnect.co.mz',
          },
        ],
      },
    ],
  },
  {
    id: 'platform',
    label: 'Plataforma',
    groups: [
      {
        label: 'Apresente-se',
        links: [
          { label: 'Perfil digital', href: '/exemplo' },
          { label: 'Produtos NFC', href: '/produtos' },
          { label: 'Como funciona', href: '/#como-funciona' },
        ],
      },
      {
        label: 'Ligue a sua equipa',
        links: [
          { label: 'Cartões da empresa', href: '/corporativo/cartoes' },
          { label: 'Assinaturas de email', href: '/corporativo/assinaturas' },
          { label: 'Fundos virtuais', href: '/corporativo/fundos' },
          { label: 'Integrações', href: '/corporativo/integracoes' },
        ],
      },
    ],
  },
  {
    id: 'resources',
    label: 'Recursos',
    groups: [
      {
        label: 'Descobrir',
        links: [
          { label: 'Sobre nós', href: '/sobre' },
          { label: 'Como funciona', href: '/#como-funciona' },
          { label: 'Embaixadores Framy', href: '/embaixadores' },
        ],
      },
      {
        label: 'Apoio',
        links: [
          { label: 'Centro de ajuda', href: '/ajuda' },
          { label: 'Acompanhar a minha encomenda', href: '/acompanhar' },
          { label: 'Contactar a Framy', href: '/contacto' },
        ],
      },
      {
        label: 'Confiança',
        links: [
          { label: 'Privacidade', href: '/privacidade' },
          { label: 'Termos de utilização', href: '/termos' },
        ],
      },
    ],
  },
] as const;
