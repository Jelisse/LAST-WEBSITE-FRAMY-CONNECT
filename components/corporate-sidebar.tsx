'use client';
import { useState } from 'react';
import {
  BarChart3,
  Users,
  Megaphone,
  ContactRound,
  CircleHelp,
  Building2,
  UserRound,
  ShieldCheck,
  ArrowUpRight,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import Link from './hard-link';
import { useI18n } from './language-provider';
import {
  corporateSections,
  corporateSectionURL,
  type CorporateSection,
} from '@/lib/corporate-navigation';
const icons = {
  reports: BarChart3,
  team: Users,
  campaigns: Megaphone,
  contacts: ContactRound,
  guide: CircleHelp,
};
export function CorporateSidebar({
  current,
  organisation = '',
}: {
  current: CorporateSection | 'company';
  organisation?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <aside className={'corporate-sidebar' + (open ? ' is-open' : '')}>
      <button
        type="button"
        className="corporate-sidebar-toggle"
        aria-expanded={open}
        aria-controls="corporate-side-links"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <X size={20} aria-hidden="true" />
        ) : (
          <Menu size={20} aria-hidden="true" />
        )}
        <span>{t('Navegação corporativa')}</span>
        <ChevronRight
          size={18}
          className="corporate-sidebar-chevron"
          aria-hidden="true"
        />
      </button>
      <nav id="corporate-side-links" aria-label={t('Navegação corporativa')}>
        <p className="corporate-sidebar-label">{t('Corporativo')}</p>
        {corporateSections.map((section) => {
          const Icon = icons[section.id];
          return (
            <Link
              key={section.id}
              href={corporateSectionURL(section.path, organisation)}
              aria-current={current === section.id ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{t(section.label)}</span>
              <ChevronRight
                size={16}
                className="corporate-sidebar-chevron"
                aria-hidden="true"
              />
            </Link>
          );
        })}
        <Link
          href="/corporativo/configurar"
          aria-current={current === 'company' ? 'page' : undefined}
          onClick={() => setOpen(false)}
        >
          <Building2 size={21} aria-hidden="true" />
          <span>{t('Empresa')}</span>
          <ChevronRight
            size={16}
            className="corporate-sidebar-chevron"
            aria-hidden="true"
          />
        </Link>
        <div className="corporate-sidebar-account">
          <p className="corporate-sidebar-label">{t('A minha conta')}</p>
          <Link href="/perfil">
            <UserRound size={21} aria-hidden="true" />
            <span>{t('Perfil')}</span>
          </Link>
          <Link href="/seguranca">
            <ShieldCheck size={21} aria-hidden="true" />
            <span>{t('Segurança da conta')}</span>
          </Link>
          <Link href="/">
            <ArrowUpRight size={21} aria-hidden="true" />
            <span>{t('Página inicial')}</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
