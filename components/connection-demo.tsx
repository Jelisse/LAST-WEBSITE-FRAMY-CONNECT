'use client';

import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from './hard-link';
import {
  ArrowUpRight,
  Check,
  ContactRound,
  QrCode,
  Users,
  BarChart3,
  MousePointer2,
} from 'lucide-react';
import { MobileProfile } from './mobile-profile';
import { demoProfile } from '@/lib/demo-profile';
import { useI18n } from './language-provider';

const modes = [
  {
    label: 'O seu perfil',
    icon: ContactRound,
    title: 'Uma apresentação que acompanha a sua evolução.',
    description:
      'Contactos, serviços e trabalho num perfil que pode actualizar e partilhar por link, NFC ou QR.',
    action: 'Ver perfil de exemplo',
    href: '/exemplo',
  },
  {
    label: 'A sua equipa',
    icon: Users,
    title: 'Pessoas organizadas. Uma equipa mais próxima.',
    description:
      'Convide colaboradores por email e organize equipas depois da aprovação da sua empresa pela Framy.',
    action: 'Conhecer a solução para empresas',
    href: '/para-empresas',
  },
  {
    label: 'A sua campanha',
    icon: BarChart3,
    title: 'Veja a actividade de cada campanha.',
    description:
      'Use links de campanha para acompanhar aberturas, cliques e contactos recebidos com consentimento.',
    action: 'Explorar campanhas e relatórios',
    href: '/para-empresas#campanhas',
  },
] as const;

export function ConnectionDemo({
  initialMode = 0,
  company = false,
}: {
  initialMode?: 0 | 1 | 2;
  company?: boolean;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(initialMode);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const mode = modes[selected];
  const href =
    company && selected > 0
      ? selected === 1
        ? '#como-comecar'
        : '#campanhas'
      : mode.href;
  return (
    <div className="connection-demo">
      <div
        className="connection-demo-tabs"
        role="tablist"
        aria-label={t('Explore a Framy Connect')}
      >
        {modes.map((item, index) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={selected === index}
            aria-controls={`${id}-panel`}
            tabIndex={selected === index ? 0 : -1}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            onClick={() => setSelected(index as 0 | 1 | 2)}
            onKeyDown={(event) => {
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? 2
                    : event.key === 'ArrowRight'
                      ? (index + 1) % 3
                      : event.key === 'ArrowLeft'
                        ? (index + 2) % 3
                        : null;
              if (next !== null) {
                event.preventDefault();
                setSelected(next as 0 | 1 | 2);
                buttons.current[next]?.focus();
              }
            }}
          >
            <item.icon size={17} aria-hidden="true" />
            {t(item.label)}
          </button>
        ))}
      </div>
      <div
        className="connection-demo-panel"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${selected}`}
        tabIndex={0}
      >
        <div className="connection-stage" data-mode={selected}>
          {selected === 0 ? (
            <>
              <div className="connection-live-profile">
                <MobileProfile
                  profile={demoProfile(t)}
                  published
                  preview
                  measure={false}
                />
              </div>
              <div className="connection-result connection-ready">
                <div className="connection-result-icon">
                  <Check size={22} aria-hidden="true" />
                </div>
                <strong>{t('Pronto para se conectar')}</strong>
                <p>{t('Um perfil. Várias formas de partilhar.')}</p>
                <div className="connection-channels">
                  <span>NFC</span>
                  <span>QR</span>
                  <span>{t('Link')}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="connection-profile">
                <div className="connection-profile-cover">
                  <span>FRAMY CONNECT</span>
                  <QrCode size={30} aria-hidden="true" />
                </div>
                <Image
                  src="/home/ana-matavele.webp"
                  alt={t('Retrato fictício de demonstração')}
                  width={92}
                  height={92}
                  unoptimized
                  className="connection-portrait"
                />
                <strong>Ana Matavele</strong>
                <span>{t('Relações com clientes')}</span>
                <div className="connection-profile-link">
                  <ContactRound size={16} aria-hidden="true" />
                  {t('Contactos e serviços')}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </div>
                <div className="connection-profile-link">
                  <QrCode size={16} aria-hidden="true" />
                  {t('Partilhar o perfil')}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </div>
                <small>{t('O Seu Mundo, Num Toque.')}</small>
              </div>
              <div className="connection-result" key={selected}>
                {selected === 1 ? (
                  <>
                    <div className="connection-result-icon">
                      <Users size={22} aria-hidden="true" />
                    </div>
                    <strong>{t('Equipa do evento')}</strong>
                    <p>{t('Convide. Organize. Acompanhe.')}</p>
                    <div className="connection-person">
                      <span>AM</span>
                      <span>
                        Ana Matavele<small>{t('Equipa comercial')}</small>
                      </span>
                      <Check size={16} aria-hidden="true" />
                    </div>
                    <div className="connection-person">
                      <span>JC</span>
                      <span>
                        João Costa<small>{t('Equipa comercial')}</small>
                      </span>
                      <Check size={16} aria-hidden="true" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="connection-result-icon">
                      <MousePointer2 size={22} aria-hidden="true" />
                    </div>
                    <strong>{t('Campanha de demonstração')}</strong>
                    <div className="connection-chart" aria-hidden="true">
                      {[32, 48, 38, 70, 55, 90, 76].map((height, i) => (
                        <span key={i} style={{ height: `${height}%` }} />
                      ))}
                    </div>
                    <p>{t('Aberturas, cliques e contactos recebidos.')}</p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <div className="connection-demo-caption">
          <small>
            {t('Demonstração ilustrativa · Pessoas e dados fictícios')}
          </small>
          <h2>{t(mode.title)}</h2>
          <p>{t(mode.description)}</p>
          <Link href={href}>
            {t(company && selected === 1 ? 'Como começar' : mode.action)}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
