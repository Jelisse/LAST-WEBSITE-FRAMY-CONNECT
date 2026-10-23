import type { ManagedPlan } from './domain';
import { planFeatures } from './plan-features.ts';
export type ComparisonRow = { label: string; values: (boolean | string)[] };
export function planComparison(plans: ManagedPlan[]) {
  const personal = plans.find((p) => p.id === 'personal');
  const professional = plans.find(
    (p) => p.id === 'professional-v2' && p.active,
  );
  const enabled = professional ? planFeatures(professional) : null;
  const quoted = 'Na proposta';
  return [
    {
      title: 'Perfil e partilha',
      rows: [
        { label: 'Perfis incluídos', values: ['1', '1', '3–50', '51–500'] },
        {
          label: 'Links por perfil',
          values: [
            String(personal?.links ?? 8),
            String(professional?.links ?? 20),
            quoted,
            quoted,
          ],
        },
        {
          label: 'Caracteres de biografia',
          values: [
            String(personal?.bio ?? 200),
            String(professional?.bio ?? 600),
            quoted,
            quoted,
          ],
        },
        {
          label: 'Email, telefone e redes sociais',
          values: [true, true, true, true],
        },
        {
          label: 'Partilha por link e código QR',
          values: [true, true, true, true],
        },
        {
          label: 'Guardar contacto no telemóvel (vCard)',
          values: [true, true, true, true],
        },
        {
          label: 'Partilha por produto NFC compatível',
          values: [
            'Produto à parte',
            'Produto à parte',
            'Produto à parte',
            'Produto à parte',
          ],
        },
      ],
    },
    {
      title: 'Trabalho, serviços e contactos',
      rows: [
        {
          label: 'Vitrine de produtos ou serviços',
          values: [false, !!enabled?.showcase, quoted, quoted],
        },
        {
          label: 'WhatsApp com mensagem personalizada',
          values: [false, !!enabled?.whatsapp, quoted, quoted],
        },
        {
          label: 'Morada, direcções e horário',
          values: [false, !!enabled?.location, quoted, quoted],
        },
        {
          label: 'Formulário de contacto e caixa de entrada',
          values: [false, !!enabled?.enquiries, quoted, quoted],
        },
        {
          label: 'Estatísticas de visitas e cliques',
          values: [false, !!enabled?.analytics, quoted, quoted],
        },
      ],
    },
    {
      title: 'Equipas e campanhas',
      rows: [
        {
          label: 'Espaço da empresa e convites',
          values: [false, false, 'Após aprovação', 'Após aprovação'],
        },
        {
          label: 'Papéis de proprietário, líder e colaborador',
          values: [false, false, true, true],
        },
        {
          label: 'Organização por equipas',
          values: [false, false, true, true],
        },
        {
          label: 'Links e QR de campanha por colaborador',
          values: [false, false, true, true],
        },
        {
          label: 'Recolha de contactos com consentimento',
          values: [false, false, true, true],
        },
        {
          label: 'Relatórios da equipa e exportação CSV',
          values: [false, false, true, true],
        },
      ],
    },
    {
      title: 'Entrada, apoio e condições',
      rows: [
        { label: 'Centro de ajuda', values: [true, true, true, true] },
        {
          label: 'Configuração inicial da empresa',
          values: [false, false, true, true],
        },
        {
          label: 'Apoio ao lançamento da equipa',
          values: [false, false, quoted, true],
        },
        {
          label: 'Contacto Framy designado',
          values: [false, false, false, true],
        },
        {
          label: 'Formação e integrações específicas',
          values: [false, false, 'Orçamento separado', 'Orçamento separado'],
        },
        { label: 'Débito automático', values: [false, false, false, false] },
      ],
    },
  ] as { title: string; rows: ComparisonRow[] }[];
}
