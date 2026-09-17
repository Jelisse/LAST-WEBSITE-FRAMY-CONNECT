import type { AccountRole } from './auth-policy';
export const roleLabels = {
  customer: 'Cliente',
  agent: 'Agente',
  manager: 'Gestor',
  director: 'Direcção',
};
export function canAdministerRole(actor: AccountRole, target: AccountRole) {
  return actor === 'director' || (actor === 'manager' && target !== 'director');
}
export function mayChangeAccount(
  actor: { id: string; role: AccountRole },
  target: { id: string; role: AccountRole },
  nextRole: AccountRole,
) {
  return (
    actor.id !== target.id &&
    canAdministerRole(actor.role, target.role) &&
    canAdministerRole(actor.role, nextRole)
  );
}
