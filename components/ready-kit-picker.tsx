'use client';
import Link from '@/components/hard-link';
import { Check, Expand } from 'lucide-react';
import { useState } from 'react';
import { SourceImage } from './source-image';
import { useI18n } from './language-provider';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
export const readyKits = [
  { id: 'black', name: 'Kit Preto', image: '/home/kit-gift-box.png' },
  {
    id: 'orange',
    name: 'Kit Laranja e Branco',
    image: '/home/kit-white-orange-cutout.webp',
  },
] as const;
export function ReadyKitPicker({
  value,
  onChange,
}: {
  value: 'black' | 'orange';
  onChange: (id: 'black' | 'orange') => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<(typeof readyKits)[number] | null>(
    null,
  );
  return (
    <>
      <fieldset
        className="ready-kit-options"
        aria-label={t('Escolha o seu kit NFC')}
      >
        {readyKits.map((kit) => (
          <article
            key={kit.id}
            className={
              value === kit.id
                ? 'ready-kit-option is-selected'
                : 'ready-kit-option'
            }
          >
            <button
              className="ready-kit-select"
              type="button"
              aria-pressed={value === kit.id}
              onClick={() => onChange(kit.id)}
            >
              <SourceImage
                src={kit.image}
                alt={t(kit.name)}
                width={620}
                height={500}
              />
              <span>
                <strong>{t(kit.name)}</strong>
                {value === kit.id && (
                  <Check size={18} aria-label={t('Escolhido')} />
                )}
              </span>
              <small>{t('Cartão NFC + porta-chaves + caixa')}</small>
              <small className="ready-kit-price">
                {t('Preço e disponibilidade sob consulta')}
              </small>
            </button>
            <button
              className="ready-kit-expand"
              type="button"
              aria-haspopup="dialog"
              onClick={() => setExpanded(kit)}
            >
              <Expand size={16} /> {t('Ver o kit completo')}
            </button>
          </article>
        ))}
      </fieldset>
      <p className="ready-kit-note">
        {t('Preço e disponibilidade do kit a confirmar pela Framy.')}
      </p>
      <Link
        className="purchase-secondary-link"
        href="/contacto?assunto=encomenda"
      >
        {t('Precisa de um kit personalizado? Fale com a Framy')} ↗
      </Link>
      <Dialog
        open={!!expanded}
        onOpenChange={(open) => {
          if (!open) setExpanded(null);
        }}
      >
        <DialogContent className="purchase-preview-dialog ready-kit-dialog">
          <DialogTitle>{expanded && t(expanded.name)}</DialogTitle>
          <DialogDescription>
            {t('Inclui cartão NFC, porta-chaves e caixa a condizer.')}
          </DialogDescription>
          {expanded && (
            <SourceImage
              src={expanded.image}
              alt={t(expanded.name)}
              width={900}
              height={700}
            />
          )}
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              if (expanded) onChange(expanded.id);
              setExpanded(null);
            }}
          >
            {t('Escolher este kit')} <Check size={18} />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
