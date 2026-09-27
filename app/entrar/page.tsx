import { LoginForm } from '@/components/login-form';
import './style.css';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; return_to?: string }>;
}) {
  const params = await searchParams;
  const purchaseReturn = typeof params.return_to === 'string' && /^\/encomendar\/[a-z0-9-]+$/.test(params.return_to)
    ? params.return_to : undefined;
  return <LoginForm initialRegister={params.mode === 'register'} purchaseReturn={purchaseReturn} />;
}
