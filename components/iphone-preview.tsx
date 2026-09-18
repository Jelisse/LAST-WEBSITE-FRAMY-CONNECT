'use client';
import { useI18n } from '@/components/language-provider';
import type { ReactNode } from 'react';
import { BatteryFull, Signal, Wifi } from 'lucide-react';

/** Editor-only device chrome. Published profiles never import this wrapper. */
export function IPhonePreview({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="iphone-preview">
      <div className="iphone-device">
        <span className="iphone-action-key" aria-hidden="true" />
        <span className="iphone-volume-keys" aria-hidden="true" />
        <span className="iphone-power-key" aria-hidden="true" />
        <div className="iphone-display">
          <div className="iphone-status" aria-hidden="true">
            <span>9:41</span>
            <span className="iphone-island" />
            <span className="iphone-status-icons">
              <Signal />
              <Wifi />
              <BatteryFull />
            </span>
          </div>
          <section
            className="iphone-screen"

            aria-label={t('Pré-visualização do perfil no iPhone 17')}
          >
            {children}
          </section>
          <div className="iphone-home-area" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
      <p className="iphone-preview-caption">
        {t('iPhone 17 ')}
        <span>·</span>
        {t(' Deslize na lista para ver mais links')}
      </p>
    </div>
  );
}
