import { CorporateInvite } from '@/components/corporate-invite';
export const metadata = {
  title: 'Confirmar convite | Framy Connect',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default function Page() {
  return <CorporateInvite />;
}
