'use client';
import { useState, type ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { useI18n } from './language-provider';
export function PurchasePreview({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <div className="purchase-inspect-preview">
      {children}
      <button
        type="button"
        className="purchase-preview-expand"
        onClick={() => setOpen(true)}
        aria-label={t('Ampliar imagem') + ': ' + label}
      >
        <Maximize2 size={16} aria-hidden="true" /> {t('Ampliar imagem')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="purchase-preview-dialog">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {t(
              'Imagem ilustrativa. A equipa confirma a arte antes da produção.',
            )}
          </DialogDescription>
          <div className="purchase-preview-large">{children}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
