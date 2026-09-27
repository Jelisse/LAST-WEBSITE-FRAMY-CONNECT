'use client';
import Link from '@/components/hard-link';
import type { WorkspaceData } from '@/lib/profile-types';
import { useI18n } from './language-provider';
export function TrialNotice({
  membership,
}: {
  membership: WorkspaceData['membership'];
}) {
  const { t, locale } = useI18n();
  if (
    membership.mode === 'paid' ||
    membership.accessState === 'basic' ||
    membership.accessState === 'grace'
  )
    return (
      <aside className="trial-notice">
        <strong>O seu plano de perfil digital</strong>
        <p>
          {membership.accessState === 'basic'
            ? 'A página pública mostra apenas nome, fotografia e um contacto. Os restantes dados continuam guardados.'
            : membership.accessState === 'grace'
              ? 'Está nos 7 dias de tolerância. Renove para manter todas as funcionalidades.'
              : `Plano pago até ${membership.expiresAt ? new Intl.DateTimeFormat(locale).format(new Date(membership.expiresAt)) : '—'}. Sem renovação automática.`}
        </p>
        <Link href="/perfil?tools=1">Gerir plano e renovação →</Link>
      </aside>
    );
  return (
    <aside className="trial-notice">
      <strong>{t('O seu plano de perfil digital')}</strong>
      <p>
        {membership.launchExtended
          ? t(
              'O seu acesso foi prolongado sem cobrança enquanto os planos mensais não estão disponíveis. Os seus links e dados mantêm-se guardados.',
            )
          : membership.expiresAt
            ? t('Experiência de 30 dias até {0}. Sem renovação automática.', [
                new Intl.DateTimeFormat(locale).format(
                  new Date(membership.expiresAt),
                ),
              ])
            : t(
                'Os 30 dias começam quando activa o perfil digital. O produto físico é comprado separadamente.',
              )}
      </p>
      {membership.billingAvailable &&
        membership.daysRemaining !== null &&
        membership.daysRemaining !== undefined &&
        membership.daysRemaining <= 7 && (
          <p>
            Faltam {membership.daysRemaining} dias.{' '}
            <Link href="/perfil?tools=1">Gerir renovação →</Link>
          </p>
        )}
      {!membership.launchExtended && !membership.billingAvailable && (
        <p>
          {t(
            'Enquanto as adesões mensais não abrirem, o acesso será prolongado sem cobrança. Não precisa de eliminar links.',
          )}
        </p>
      )}
    </aside>
  );
}
