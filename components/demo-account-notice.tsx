'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from './language-provider';
export function DemoAccountNotice() {
  const path = usePathname(),
    { t } = useI18n();
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!/^\/(dashboard|perfil|corporativo|seguranca)(\/|$)/.test(path || ''))
      return;
    const c = new AbortController();
    void fetch('/api/demo-access', { cache: 'no-store', signal: c.signal })
      .then((r) => r.json())
      .then((b) =>
        setLabel((b as { demo: { label: string } | null }).demo?.label || ''),
      )
      .catch(() => {});
    return () => c.abort();
  }, [path]);
  return label ? (
    <aside className="demo-account-notice" role="note">
      <strong>{label}</strong> —{' '}
      {t(
        'Conta de demonstração. Use apenas dados fictícios. Pagamentos e emails no site são reais.',
      )}
    </aside>
  ) : null;
}
