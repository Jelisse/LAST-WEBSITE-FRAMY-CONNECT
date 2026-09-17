export type Product = {
  id: string;
  name: string;
  category: string;
  icon: string;
  tagline: string;
  description: string;
  amount: number;
  cost: number;
  audience: string;
  available: boolean;
  imageUrl: string;
  version: number;
  published?: boolean;
  images?: string[];
  availabilityConfigured?: boolean;
};
const seedProducts = [
  {
    id: 'pvc',
    name: 'Cartão NFC PVC Personalizado',
    category: 'Cartões',
    icon: 'card',
    tagline: 'O seu cartão, impresso e personalizado.',
    description:
      'Cartão NFC em PVC de 85,5 × 54 mm. Inclui impressão a cores na frente e no verso, personalização com o seu logótipo, nome e email, e configuração NFC e QR para o seu perfil.',
    amount: 95000,
    cost: 0,
    audience: 'Profissionais',
    available: true,
  },
  {
    id: 'wood',
    name: 'Wooden Business Cards',
    category: 'Cartões',
    icon: 'card',
    tagline: 'Uma apresentação com um toque natural.',
    description:
      'Um cartão NFC em madeira que liga uma apresentação natural ao seu perfil digital.',
    amount: 0,
    cost: 0,
    audience: 'Profissionais',
    available: false,
  },
  {
    id: 'metal',
    name: 'Metal NFC Card',
    category: 'Cartões',
    icon: 'card',
    tagline: 'Uma presença que se sente.',
    description:
      'Um cartão de metal para apresentar a sua identidade, os seus contactos e o seu trabalho num único toque.',
    amount: 45000,
    cost: 12000,
    audience: 'Profissionais',
    available: true,
  },
  {
    id: 'keychain',
    name: 'NFC Keychain',
    category: 'Acessórios',
    icon: 'key',
    tagline: 'As suas conexões. Sempre consigo.',
    description:
      'Leve a sua identidade nas chaves e partilhe o seu perfil quando surgir uma nova oportunidade.',
    amount: 50000,
    cost: 8000,
    audience: 'Indivíduos',
    available: true,
  },
  {
    id: 'tag',
    name: 'NFC Tag',
    category: 'Acessórios',
    icon: 'tag',
    tagline: 'Pequeno formato. Novas possibilidades.',
    description:
      'Uma etiqueta conectada ao seu perfil digital, para integrar nos objectos que o acompanham.',
    amount: 20000,
    cost: 5000,
    audience: 'Indivíduos',
    available: true,
  },
  {
    id: 'sticker',
    name: 'NFC Sticker',
    category: 'Acessórios',
    icon: 'sticker',
    tagline: 'Cole. Toque. Partilhe.',
    description:
      'Um autocolante NFC para dar acesso simples à sua identidade digital.',
    amount: 15000,
    cost: 3500,
    audience: 'Criadores',
    available: true,
  },
  {
    id: 'bracelet',
    name: 'NFC Bracelet',
    category: 'Acessórios',
    icon: 'watch',
    tagline: 'A sua identidade, ao pulso.',
    description: 'Uma pulseira que mantém o seu perfil ao alcance de um toque.',
    amount: 35000,
    cost: 9000,
    audience: 'Criadores',
    available: true,
  },
  {
    id: 'event',
    name: 'Smart Event Badge',
    category: 'Para organizações',
    icon: 'badge',
    tagline: 'Encontros com mais possibilidades.',
    description:
      'Conte-nos sobre o seu evento para definirmos a experiência de identificação e partilha.',
    amount: 0,
    cost: 0,
    audience: 'Instituições',
    available: false,
  },
  {
    id: 'menu',
    name: 'Restaurant QR Menu',
    category: 'Para organizações',
    icon: 'menu',
    tagline: 'O seu menu, à mão.',
    description:
      'Uma solução de acesso ao menu digital do seu restaurante. Configuração e conteúdo sob consulta.',
    amount: 0,
    cost: 0,
    audience: 'Organizações',
    available: false,
  },
  {
    id: 'review',
    name: 'Google Review Stand',
    category: 'Para organizações',
    icon: 'star',
    tagline: 'Dê espaço à opinião dos seus clientes.',
    description:
      'Um ponto de acesso ao perfil de avaliações do seu negócio, com configuração sob consulta.',
    amount: 0,
    cost: 0,
    audience: 'Organizações',
    available: false,
  },
  {
    id: 'catalog',
    name: 'Digital Catalog',
    category: 'Para organizações',
    icon: 'book',
    tagline: 'O seu trabalho merece ser descoberto.',
    description:
      'Apresente a sua oferta num catálogo digital. Estrutura e funcionalidades definidas com a sua equipa.',
    amount: 0,
    cost: 0,
    audience: 'Criadores',
    available: false,
  },
  {
    id: 'employee',
    name: 'Employee Card',
    category: 'Para organizações',
    icon: 'badge',
    tagline: 'Quem representa a sua organização.',
    description:
      'Identidades para equipas. Gestão, emissão e permissões são definidas para cada organização.',
    amount: 0,
    cost: 0,
    audience: 'Organizações',
    available: false,
  },
];
export const products: Product[] = seedProducts.map((p) => ({
  ...p,
  available: p.id === 'keychain',
  published: true,
  imageUrl: `/products/${p.id}.png`,
  version: 0,
}));
export type PublicProduct = Omit<Product, 'cost'>;
export function publicProduct({
  cost: _cost,
  ...product
}: Product): PublicProduct {
  return { ...product, amount: product.available ? product.amount : 0 };
}
export function money(minor: number) {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
  }).format(minor / 100);
}
