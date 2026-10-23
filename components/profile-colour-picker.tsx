'use client';
import type { Profile } from '@/lib/domain';
import {
  defaultBusiness,
  profileColors,
  profileTheme,
} from '@/lib/profile-business';
import { useI18n } from './language-provider';
export function ProfileColourPicker({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (profile: Profile) => void;
}) {
  const { t } = useI18n();
  const business = { ...defaultBusiness, ...profile.business };
  const update = (_key: string, accent: typeof business.accent) =>
    onChange({ ...profile, business: { ...business, accent } });
  return (
    <fieldset className="profile-color-picker">
      <legend>{t('Cor do perfil')}</legend>
      <div>
        {profileColors.map((color) => (
          <label key={color.value}>
            <input
              type="radio"
              name={`profile-color-${profile.username}`}
              value={color.value}
              checked={profileTheme(business.accent).value === color.value}
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
    </fieldset>
  );
}
