import { redirect } from 'next/navigation';
import { sessionAccount } from '@/lib/server-auth';
import { dashboardFor, type AccountRole } from '@/lib/auth-policy';
export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  role: AccountRole;
};
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const a = await sessionAccount();
  return a
    ? {
        userId: a.id,
        displayName: a.name,
        fullName: a.name,
        email: a.email,
        role: a.role,
      }
    : null;
}
export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (!user) redirect(chatGPTSignInPath(returnTo));
  const role = returnTo.startsWith('/manager')
    ? 'manager'
    : returnTo === '/agent'
      ? 'agent'
      : returnTo === '/cofounder'
        ? 'director'
        : 'customer';
  if (user.role !== role) redirect(dashboardFor(user.role));
  return user;
}
export function chatGPTSignInPath(returnTo: string) {
  return '/entrar?return_to=' + encodeURIComponent(returnTo);
}
export function chatGPTSignOutPath(_returnTo = '/') {
  return '/sair';
}
