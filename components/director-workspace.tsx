'use client';
import { useState, useEffect, type ReactNode } from 'react';
import { StaffSidebar } from './staff-sidebar';
import { DashboardTools } from './mobile-navigation';
import { useI18n } from './language-provider';
const labels: Record<string, string> = {
  overview: 'Visão geral',
  accounts: 'Contas e acessos',
  applications: 'Candidaturas',
  products: 'Produtos e planos',
};
export function DirectorWorkspace({
  overview,
  accounts,
  applications,
  products,
}: Record<'overview' | 'accounts' | 'applications' | 'products', ReactNode>) {
  const { t } = useI18n();
  const [section, setSection] = useState('overview');
  useEffect(() => {
    const sync = () => {
      const next = window.location.hash.replace('#director-', '');
      setSection(Object.hasOwn(labels, next) ? next : 'overview');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const contents: Record<string, ReactNode> = {
    overview,
    accounts,
    applications,
    products,
  };
  return (
    <div className="staff-role-shell director-role-shell">
      <StaffSidebar
        area="director"
        activeSection={section}
        onSectionChange={(next) => {
          setSection(next);
          requestAnimationFrame(() => {
            const heading = document.getElementById('director-title');
            heading?.focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: 'instant' });
          });
        }}
      />
      <main id="main" className="staff-page" data-guidance-panel={section}>
        <DashboardTools navigation={null} />
        <h1 id="director-title" tabIndex={-1}>
          {t(labels[section])}
        </h1>
        {Object.entries(contents).map(([id, content]) => (
          <section key={id} id={'director-' + id} hidden={id !== section}>
            {content}
          </section>
        ))}
      </main>
    </div>
  );
}
