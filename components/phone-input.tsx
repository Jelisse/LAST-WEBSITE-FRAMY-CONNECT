'use client';
import { useId, useState, type InputHTMLAttributes } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { SourceImage } from './source-image';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { useI18n } from './language-provider';

import {
  phoneRegions as regions,
  splitPhoneNumber,
  joinPhoneNumber,
} from '@/lib/phone-number';

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & { value?: string; onValueChange?: (value: string) => void };
export function PhoneInput({
  value,
  onValueChange,
  name,
  id,
  required,
  disabled,
  maxLength = 40,
  ...props
}: Props) {
  const { t, locale } = useI18n();
  const generated = useId();
  const [local, setLocal] = useState('');
  const [chosen, setChosen] = useState('MZ');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = value ?? local;
  const { region, code, number } = splitPhoneNumber(current, chosen);
  const update = (next: string) => {
    setLocal(next);
    onValueChange?.(next);
  };
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  return (
    <span className="phone-input">
      {name && (
        <input type="hidden" name={name} value={current} disabled={disabled} />
      )}
      <button
        className="phone-country-button"
        type="button"
        aria-label={
          t('País e indicativo') +
          ': ' +
          (region === 'other' ? t('Outro indicativo') : names.of(region)) +
          ' ' +
          code
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setQuery('');
          setOpen(true);
        }}
      >
        {region === 'other' ? (
          <Globe size={22} aria-hidden="true" />
        ) : (
          <SourceImage
            src={'/flags/' + region.toLowerCase() + '.svg'}
            width={24}
            height={18}
            alt=""
          />
        )}
        <span>{code || '+'}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="phone-country-dialog">
          <DialogTitle>{t('País e indicativo')}</DialogTitle>
          <DialogDescription>
            {t('Escolha o país ou pesquise pelo nome ou indicativo.')}
          </DialogDescription>
          <input
            type="search"
            aria-label={t('Pesquisar país ou indicativo')}
            placeholder={t('Pesquisar país ou indicativo')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="phone-country-list">
            {regions
              .filter((item) =>
                (names.of(item.region) + ' ' + item.region + ' ' + item.code)
                  .toLocaleLowerCase(locale)
                  .includes(query.trim().toLocaleLowerCase(locale)),
              )
              .map((item) => (
                <button
                  key={item.region}
                  type="button"
                  aria-pressed={region === item.region}
                  onClick={() => {
                    setChosen(item.region);
                    update(number ? item.code + number.replace(/^\+/, '') : '');
                    setOpen(false);
                  }}
                >
                  <SourceImage
                    src={'/flags/' + item.region.toLowerCase() + '.svg'}
                    width={28}
                    height={21}
                    alt=""
                  />
                  <span>{names.of(item.region)}</span>
                  <small>{item.code}</small>
                  {region === item.region && (
                    <Check size={16} aria-hidden="true" />
                  )}
                </button>
              ))}
            <button
              type="button"
              aria-pressed={region === 'other'}
              onClick={() => {
                setChosen('other');
                update(number ? '+' + number.replace(/^\+/, '') : '');
                setOpen(false);
              }}
            >
              <Globe size={24} aria-hidden="true" />
              <span>{t('Outro indicativo')}</span>
              <small>+</small>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <input
        aria-label={t('Número de telefone')}
        {...props}
        id={id ?? generated}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        required={required}
        maxLength={Math.max(1, maxLength - code.length)}
        value={number}
        placeholder={region === 'other' ? '+…' : t('Número de telefone')}
        onChange={(event) => {
          const entered = event.target.value;
          update(joinPhoneNumber(entered, code));
        }}
      />
    </span>
  );
}
