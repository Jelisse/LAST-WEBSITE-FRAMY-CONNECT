export const guidanceStorageKey = 'framy-first-use-v1';
export function guidanceScope(path: string, panel = '') {
  const role = /^\/manager/.test(path)
    ? 'manager'
    : /^\/cofounder/.test(path)
      ? 'director'
      : /^\/agent/.test(path)
        ? 'agent'
        : /^\/corporativo/.test(path)
          ? 'company'
          : 'customer';
  const section =
    panel || path.split('/').filter(Boolean).slice(1).join('-') || 'overview';
  return `${role}:${section.replace(/[^a-z0-9-]/gi, '').slice(0, 60)}`;
}
export function readGuidance(raw: string | null): string[] {
  try {
    const values: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(values)
      ? values
          .filter(
            (v): v is string =>
              typeof v === 'string' && /^[a-z0-9:-]{1,120}$/i.test(v),
          )
          .slice(-200)
      : [];
  } catch {
    return [];
  }
}
export const guidanceTips = [
  {
    id: 'preview',
    selector: '.preview-mobile-toggle',
    message:
      'Toque em Mostrar para ver as alterações. Use Ampliar para abrir o perfil completo.',
    mobile: true,
  },
  {
    id: 'expand',
    selector: '.editor-preview-toolbar button[aria-haspopup="dialog"]',
    message:
      'Abra a pré-visualização completa sem perder as alterações do formulário.',
  },
  {
    id: 'steps',
    selector: '.profile-setup-navigation nav',
    message:
      'Use estes passos para editar uma parte de cada vez. Reveja antes de publicar.',
  },
  {
    id: 'company',
    selector: '.corporate-organisation select',
    message:
      'Escolha a empresa antes de gerir os seus cartões, contactos ou ferramentas.',
  },
  {
    id: 'tabs',
    selector: '.company-tabs, .growth-tabs, .agent-toolbar nav',
    message:
      'Estas secções organizam as ferramentas deste painel. Escolha a tarefa que pretende realizar.',
  },
  {
    id: 'menu',
    selector: '.role-menu-trigger, .workspace-mobile-navigation button',
    message: 'Abra este menu para encontrar as outras áreas da sua conta.',
    global: true,
  },
  {
    id: 'navigation',
    selector: '.app-sidebar-collapse',
    message:
      'Recolha o menu para ganhar espaço. Os ícones mantêm as ferramentas acessíveis.',
    global: true,
  },
  {
    id: 'panel',
    selector: 'main h1, .corporate-hero h1, #director-title',
    message:
      'Use o menu lateral para mudar de tarefa. As acções e os resultados desta área aparecem neste painel.',
  },
] as const;

export function tipPosition(
  rect: { left: number; top: number; bottom: number; width: number },
  viewportWidth: number,
  viewportHeight: number,
) {
  const width = Math.min(310, viewportWidth - 24);
  const left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12));
  const above = rect.bottom + 175 > viewportHeight - 12;
  return {
    width,
    left,
    top: above ? Math.max(84, rect.top - 160) : rect.bottom + 10,
    above,
    arrow: Math.max(
      18,
      Math.min(width - 24, rect.left + rect.width / 2 - left),
    ),
  };
}
