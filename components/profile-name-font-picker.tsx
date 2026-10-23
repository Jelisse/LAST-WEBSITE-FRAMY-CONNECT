'use client';
import { useId } from 'react';
import { useI18n } from './language-provider';
import {
  nameFonts,
  nameFont,
  nameFontStyle,
  type NameFont,
} from '@/lib/profile-name-font';
export function ProfileNameFontPicker({
  value,
  name,
  onChange,
  disabled = false,
}: {
  value?: NameFont;
  name: string;
  onChange: (font: NameFont) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <fieldset className="profile-name-font-picker" disabled={disabled}>
      <legend>{t('Tipo de letra do nome')}</legend>
      <div>
        {nameFonts.map((font) => (
          <label key={font.value} aria-label={t(font.label)}>
            <input
              type="radio"
              name={id}
              value={font.value}
              checked={nameFont(value) === font.value}
              onChange={() => onChange(font.value)}
            />
            <span className="profile-name-font-option">
              <span
                className="profile-name-font-sample"
                style={nameFontStyle(font.value)}
              >
                {name || t('O seu nome')}
              </span>
              <span>{t(font.label)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
