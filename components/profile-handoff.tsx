'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Copy, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function ProfileHandoff({
  username,
  published,
  operations = false,
}: {
  username?: string | null;
  published: boolean;
  operations?: boolean;
}) {
  const [origin, setOrigin] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const url = username ? `${origin}/${username}` : '';
  return (
    <section
      className={`profile-handoff ${operations ? 'operations-profile-handoff panel' : ''}`}
      aria-label="Link do perfil"
    >
      <div>
        <Link2 size={20} />
        <h3>{operations ? 'Link do perfil do cliente' : 'O seu link Framy'}</h3>
        <span>{published ? 'Publicado' : 'Por publicar'}</span>
      </div>
      {url ? (
        <>
          <label
            className="sr-only"
            htmlFor={
              operations ? 'operations-profile-url' : 'customer-profile-url'
            }
          >
            Endereço do perfil
          </label>
          <input
            id={operations ? 'operations-profile-url' : 'customer-profile-url'}
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
          />
          <div className="profile-handoff-actions">
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
              <Copy size={16} /> Copiar link
            </Button>
            {published && (
              <a href={url} target="_blank" rel="noreferrer">
                Abrir perfil <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </>
      ) : (
        <p>Guarde um nome de utilizador para gerar o link.</p>
      )}
      {!published && username && (
        <p>Publique o perfil para disponibilizar este link em Operações.</p>
      )}
      {message && <output>{message}</output>}
    </section>
  );
}
