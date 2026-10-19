'use client';
import type { WorkspaceData } from '@/lib/profile-types';
import { useI18n } from './language-provider';
export function TrialNotice({membership}:{membership:WorkspaceData['membership']}) {
 const {t,locale}=useI18n();const free=['personal','free-30',''].includes(membership.planId);
 return <aside className="trial-notice"><strong>{t(free?'Individual gratuito, sem prazo':'O seu plano de perfil digital')}</strong><p>{free?t('Sem subscrição, sem expiração e sem renovação. Produtos físicos são pagos separadamente.'):membership.expiresAt?t('Período pago até {0}. A renovação exige novo pagamento confirmado.',[new Date(membership.expiresAt).toLocaleDateString(locale)]):t('Consulte as condições do seu plano.')}</p></aside>;
}
