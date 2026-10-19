'use client';
import { useI18n } from './language-provider';
import Link from './hard-link';
import { ArrowUpRight } from 'lucide-react';

export function CorporatePlan() {
  const { t } = useI18n();
  return <article className="home-plan corporate-plan">
    <span className="home-plan-label">{t('Para empresas e equipas')}</span>
    <h3>{t('Corporativo')}</h3>
    <p>{t('Uma proposta à medida do número de colaboradores e das necessidades da empresa.')}</p>
    <div className="home-plan-price">{t('Sob consulta')}</div>
    <ul>
      <li>{t('Preço e limites definidos na proposta')}</li>
      <li>{t('Produtos, personalização e apoio a combinar')}</li>
    </ul>
    <Link className="home-text-link" href="/corporativo/configurar">{t('Configurar a minha empresa')} <ArrowUpRight size={18} aria-hidden="true" /></Link>
  </article>;
}
