import {
  LayoutDashboard,
  Boxes,
  Users,
  Wallet,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react';
export const managerSections = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'operations', label: 'Operações', icon: Boxes },
  { id: 'accounts', label: 'Contas e acessos', icon: Users },
  { id: 'subscriptions', label: 'Subscrições digitais', icon: Wallet },
  { id: 'finance', label: 'Financeiro', icon: Wallet },
  { id: 'ambassadors', label: 'Embaixadores', icon: Users },
  { id: 'catalog', label: 'Produtos', icon: ShoppingBag },
  { id: 'applications', label: 'Candidaturas', icon: Users },
  { id: 'analytics', label: 'Análise do website', icon: ArrowUpRight },
  { id: 'hero', label: 'Página inicial', icon: LayoutDashboard },
];
