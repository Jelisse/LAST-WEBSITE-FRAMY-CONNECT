'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/components/language-provider';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  const { t } = useI18n();
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label={t('A carregar…')}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
