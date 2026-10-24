'use client';
import { useI18n } from './language-provider';
import Link from '@/components/hard-link';
import { ArrowRight } from 'lucide-react';
export function PaidProfileNext({
  payment,
}: {
  payment: {
    id: string;
    status: string;
    kind: string;
    profileExists?: boolean;
    profileReady?: boolean;
  };
}) {
  const { t } = useI18n();
  if (payment.status !== 'paid' || payment.kind !== 'product') return null;
  const existing = payment.profileExists || payment.profileReady;
  return (
    <div className="payment-profile-next">
      <span className="eyebrow">{t(' PRÓXIMO PASSO · PERFIL DIGITAL ')}</span>
      <h3>
        {t(
          payment.profileReady
            ? 'O seu perfil já está publicado'
            : existing
              ? 'Continue a preparar o seu perfil'
              : 'Agora, prepare o seu perfil',
        )}
      </h3>
      <p>
        {t(
          payment.profileReady
            ? 'Pode rever os seus contactos e links. O produto fica associado ao perfil da sua conta.'
            : 'Adicione a sua fotografia, os contactos e os links que quer partilhar. Ao publicar, o perfil fica ligado à sua encomenda.',
        )}
      </p>
      {!existing && (
        <p className="payment-next-note">
          {t(
            'O perfil Personal é gratuito. Os planos pagos são opcionais e não estão incluídos nesta compra.',
          )}
        </p>
      )}
      <Link
        className="btn btn-primary"
        href={'/perfil?pagamento=' + encodeURIComponent(payment.id)}
      >
        {t(
          existing
            ? 'Continuar a configurar o perfil'
            : 'Continuar: criar e configurar perfil',
        )}{' '}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <p className="payment-next-note">
        {t('O cartão e o porta-chaves podem partilhar o mesmo perfil.')}
      </p>
      <p className="payment-next-note">
        {t(
          ' Pode continuar mais tarde na sua conta. Não precisa de repetir o pagamento. ',
        )}
      </p>
    </div>
  );
}
