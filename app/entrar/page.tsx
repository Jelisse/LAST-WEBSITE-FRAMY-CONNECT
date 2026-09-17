import { LoginForm } from '@/components/login-form';
import './style.css';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm initialRegister={params.mode === 'register'} />;
}
