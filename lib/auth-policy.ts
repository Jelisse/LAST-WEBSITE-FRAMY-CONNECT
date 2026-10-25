export type AccountRole = 'customer' | 'manager' | 'agent' | 'director';
export function dashboardFor(role: AccountRole) {
  return {
    customer: '/dashboard',
    manager: '/manager',
    agent: '/agent',
    director: '/cofounder',
  }[role];
}
export function accountDestination(
  role: AccountRole,
  requested: string,
  registering = false,
) {
  const destination = loginDestination(role, requested);
  if (registering && role === 'customer' && destination === '/perfil?billing=1')
    return '/perfil?onboarding=1&plan=professional-v2';
  if (
    registering &&
    role === 'customer' &&
    (destination === '/dashboard' || destination.startsWith('/perfil'))
  )
    return '/perfil?onboarding=1';
  return destination;
}
export function loginDestination(role: AccountRole, requested: string) {
  if (
    ['customer', 'agent'].includes(role) &&
    /^\/acompanhar(?:\?referencia=(?:[a-f0-9]{32}|FC-(?:OR|PY)-\d{2}-\d{4}-\d{4}))?$/.test(
      requested,
    )
  )
    return requested;
  if (
    ['customer', 'agent'].includes(role) &&
    /^\/corporativo\/configurar(?:\?offer=(?:business|enterprise))?$/.test(
      requested,
    )
  )
    return requested;
  if (
    ['customer', 'agent'].includes(role) &&
    [
      '/embaixadores',
      '/corporativo',
      '/corporativo/aceitar',
      '/corporativo/equipa',
      '/corporativo/cartoes',
      '/corporativo/assinaturas',
      '/corporativo/fundos',
      '/corporativo/directorio',
      '/corporativo/integracoes',
      '/corporativo/campanhas',
      '/corporativo/contactos',
      '/corporativo/guia',
    ].includes(requested)
  )
    return requested;
  if (
    role === 'customer' &&
    (/^\/comprar(?:\?formato=(?:card|pvc|wood|metal|keychain|keychain-leather|kit))?$/.test(
      requested,
    ) ||
      /^\/checkout\/retorno(?:\?payment=[a-zA-Z0-9-]+)?$/.test(requested))
  )
    return requested;
  if (
    role === 'customer' &&
    /^\/pagamento\/retorno(?:\?order=[a-zA-Z0-9-]+)?$/.test(requested)
  )
    return requested;
  if (
    role === 'customer' &&
    /^\/encomendar\/[a-z0-9-]+(?:\?[^#]*)?$/.test(requested)
  )
    return requested;
  if (
    role === 'customer' &&
    [
      '/perfil',
      '/perfil?tools=1',
      '/perfil?plans=1',
      '/perfil?billing=1',
      '/perfil?onboarding=1&plan=professional-v2',
      '/dashboard',
      '/aplicar',
    ].includes(requested)
  )
    return requested;
  return dashboardFor(role);
}
