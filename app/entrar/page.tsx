import { LoginForm } from '@/components/login-form';
import { loginDestination } from '@/lib/auth-policy';
import './style.css';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; return_to?: string }>;
}) {
  const params = await searchParams;
  const purchaseReturn =
    typeof params.return_to === 'string' &&
    loginDestination('customer', params.return_to) === params.return_to &&
    /^(\/comprar|\/encomendar\/|\/checkout\/retorno)/.test(params.return_to)
      ? params.return_to
      : undefined;
  return (
    <LoginForm
      initialRegister={params.mode === 'register'}
      purchaseReturn={purchaseReturn}
      corporateReturn={/^\/corporativo\/configurar(?:\?offer=(?:business|enterprise))?$/.test(
        params.return_to ?? '',
      )}
      profilePlan={
        params.return_to === '/perfil?billing=1'
          ? 'Professional'
          : params.return_to === '/dashboard' || params.return_to === '/perfil'
            ? 'Personal'
            : undefined
      }
    />
  );
}
