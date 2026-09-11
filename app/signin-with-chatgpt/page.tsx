import { redirect } from 'next/navigation';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const p = await searchParams;
  redirect(
    '/entrar?return_to=' + encodeURIComponent(p.return_to ?? '/dashboard'),
  );
}
