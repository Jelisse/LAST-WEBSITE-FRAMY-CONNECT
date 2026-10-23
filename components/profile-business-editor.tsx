'use client';
import { PhoneInput } from './phone-input';
import type { Profile } from '@/lib/domain';
import { defaultBusiness } from '@/lib/profile-business';
import { useI18n } from './language-provider';
export function ProfileBusinessEditor({
  profile,
  onChange,
  features,
}: {
  profile: Profile;
  features?: { whatsapp: boolean; location: boolean };
  onChange: (profile: Profile) => void;
}) {
  const { t } = useI18n();
  const business = { ...defaultBusiness, ...profile.business };
  const update = (key: string, value: string) =>
    onChange({ ...profile, business: { ...business, [key]: value } });
  return (
    <section className="profile-business-editor">
      <h3>{t('O seu negócio, num toque')}</h3>
      <p>
        {t(
          'Estes campos são opcionais e aparecem no perfil publicado. Não ocupam os seus links.',
        )}
      </p>
      {(features?.whatsapp === false || features?.location === false) && (
        <p>
          {t(
            'Os campos desactivados não estão incluídos no seu plano. Os dados guardados são preservados.',
          )}
        </p>
      )}
      <div className="profile-business-fields">
        {features?.whatsapp !== false && (
          <>
            <label>
              {t('WhatsApp público')}
              <PhoneInput
                value={business.whatsapp}
                maxLength={24}
                placeholder="+258840000000"
                onValueChange={(value) => update('whatsapp', value)}
              />
            </label>
            <label>
              {t('Mensagem para iniciar a conversa')}
              <textarea
                value={business.message}
                maxLength={300}
                rows={2}
                placeholder={t(
                  'Olá, gostaria de saber mais sobre os seus serviços.',
                )}
                onChange={(e) => update('message', e.target.value)}
              />
            </label>
          </>
        )}
        {features?.location !== false && (
          <>
            <label>
              {t('Endereço do negócio')}
              <input
                value={business.address}
                maxLength={240}
                placeholder={t('Rua, cidade e país')}
                onChange={(e) => update('address', e.target.value)}
              />
            </label>
            <label>
              {t('Horário de atendimento')}
              <textarea
                value={business.hours}
                maxLength={240}
                rows={2}
                placeholder={t('Segunda a sexta: 08:00–17:00')}
                onChange={(e) => update('hours', e.target.value)}
              />
            </label>
          </>
        )}
      </div>
      <p>
        {t(
          'Use apenas contactos e endereços que deseja tornar públicos. Guarde e publique para aplicar as alterações.',
        )}
      </p>
    </section>
  );
}
