'use client';
import type { Profile } from '@/lib/domain';
import {
  defaultBusiness,
  profileColors,
  profileColorHex,
} from '@/lib/profile-business';
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
        <label>
          {t('WhatsApp público')}
          <input
            disabled={features?.whatsapp === false}
            type="tel"
            value={business.whatsapp}
            maxLength={24}
            placeholder="+258840000000"
            onChange={(e) => update('whatsapp', e.target.value)}
          />
        </label>
        <label>
          {t('Mensagem para iniciar a conversa')}
          <textarea
            disabled={features?.whatsapp === false}
            value={business.message}
            maxLength={300}
            rows={2}
            placeholder={t(
              'Olá, gostaria de saber mais sobre os seus serviços.',
            )}
            onChange={(e) => update('message', e.target.value)}
          />
        </label>
        <label>
          {t('Endereço do negócio')}
          <input
            disabled={features?.location === false}
            value={business.address}
            maxLength={240}
            placeholder={t('Rua, cidade e país')}
            onChange={(e) => update('address', e.target.value)}
          />
        </label>
        <label>
          {t('Horário de atendimento')}
          <textarea
            disabled={features?.location === false}
            value={business.hours}
            maxLength={240}
            rows={2}
            placeholder={t('Segunda a sexta: 08:00–17:00')}
            onChange={(e) => update('hours', e.target.value)}
          />
        </label>
        <fieldset className="profile-color-picker">
          <legend>{t('Cor do perfil')}</legend>
          <div>
            {profileColors.map((color) => (
              <label key={color.value}>
                <input
                  type="radio"
                  name={`profile-color-${profile.username}`}
                  value={color.value}
                  checked={business.accent === color.value}
                  onChange={() => update('accent', color.value)}
                />
                <span
                  className="profile-color-swatch"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                />
                <span>{t(color.label)}</span>
              </label>
            ))}
          </div>
          <label className="profile-custom-color">
            <span>{t('Cor personalizada')}</span>
            <input
              type="color"
              value={profileColorHex(business.accent)}
              onChange={(e) => update('accent', e.target.value)}
            />
            <output>{profileColorHex(business.accent).toUpperCase()}</output>
          </label>
        </fieldset>
        <label>
          {t('Apresentação')}
          <select
            value={business.layout}
            onChange={(e) => update('layout', e.target.value)}
          >
            <option value="portrait">{t('Fotografia em destaque')}</option>
            <option value="compact">{t('Compacta')}</option>
          </select>
        </label>
      </div>
      <p>
        {t(
          'Use apenas contactos e endereços que deseja tornar públicos. Guarde e publique para aplicar as alterações.',
        )}
      </p>
    </section>
  );
}
