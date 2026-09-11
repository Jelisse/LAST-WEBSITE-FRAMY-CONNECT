export type AccountRole = 'customer' | 'manager' | 'agent' | 'director';
export function dashboardFor(role: AccountRole) {
  return {
    customer: '/dashboard',
    manager: '/manager',
    agent: '/agent',
    director: '/cofounder',
  }[role];
}
export function loginDestination(role: AccountRole, requested: string) {
  if (
    role === 'customer' &&
    /^\/encomendar\/[a-z0-9-]+(?:\?[^#]*)?$/.test(requested)
  )
    return requested;
  if (role === 'customer' && ['/perfil', '/dashboard'].includes(requested))
    return requested;
  return dashboardFor(role);
}
