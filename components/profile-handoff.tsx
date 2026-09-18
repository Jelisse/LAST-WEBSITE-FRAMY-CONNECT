'use client';
import { useI18n } from '@/components/language-provider';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Copy, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function ProfileHandoff({
  username,
  published,
  operations = false,
  approvedUrl,
}: {
  username?: string | null;
  published: boolean;
  operations?: boolean;
  approvedUrl?: string;
}) {
  const { t } = useI18n();
  const [origin, setOrigin] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    const update = () => setOrigin(window.location.origin);
    window.addEventListener('popstate', update);
    queueMicrotask(update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  const url =
    approvedUrl ||
    (username && origin ? `${origin}/${encodeURIComponent(username)}` : '');
  return (
    <section
      className={`profile-handoff ${operations ? 'operations-profile-handoff panel' : ''}`}
      aria-label={t('Link do perfil')}
    >
      <div>
        <Link2 size={20} />
        <h3>
          {operations
            ? t('Link do perfil do cliente')
            : t('Pré-visualizar perfil')}
        </h3>
        <span>{published ? t('Publicado') : t('Por publicar')}</span>
      </div>
      {url ? (
        <>
          {operations && (
            <>
              <label
                className="sr-only"
                htmlFor={
                  operations ? 'operations-profile-url' : 'customer-profile-url'
                }
              >
                {t('Endereço do perfil')}
              </label>
              <input
                id={
                  operations ? 'operations-profile-url' : 'customer-profile-url'
                }
                readOnly
                value={url}
                onFocus={(event) => event.target.select()}
              />
            </>
          )}
          <div className="profile-handoff-actions">
            {operations && (
              <Button
                variant="outline"
                type="button"
                disabled={!published}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setMessage('Link copiado.');
                  } catch {
                    setMessage('Seleccione e copie o endereço acima.');
                  }
                }}
              >
                <Copy size={16} />
                {t(' Copiar link')}
              </Button>
            )}
            {published && (
              <a href={url} target="_blank" rel="noreferrer">
                {t('Pré-visualizar perfil ')}
                <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </>
      ) : (
        <p>
          {operations
            ? t('O cliente ainda não criou o perfil para este pedido.')
            : t('Guarde o perfil para gerar o link.')}
        </p>
      )}
      {!published && username && (
        <p>
          {t(
            'O perfil ainda não está publicado. Aguarde a publicação antes de codificar o NFC.',
          )}
        </p>
      )}
      {message && <output>{t(message)}</output>}
    </section>
  );
}
