'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useI18n } from './language-provider';
export function CompanyShare({ id, name }: { id: string; name: string }) {
  const { t } = useI18n();
  const [qr, setQr] = useState(''),
    [message, setMessage] = useState('');
  const path = '/equipa/' + id;
  const url = () => new URL(path, location.origin).href;
  return (
    <section className="company-share">
      <h4>{t('O seu cartão está pronto para partilhar')}</h4>
      <p>
        {t(
          'Este link abre o cartão. Para recolher contactos associados a uma campanha, use o link de campanha.',
        )}
      </p>
      <div className="company-actions">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url());
              setMessage('Link copiado.');
            } catch {
              setMessage(
                'Não foi possível copiar. Abra o cartão para copiar o endereço.',
              );
            }
          }}
        >
          {t('Copiar link')}
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              const { default: QRCode } = await import('qrcode');
              setQr(await QRCode.toDataURL(url(), { width: 300, margin: 3 }));
            } catch {
              setMessage('Não foi possível gerar o QR. Tente novamente.');
            }
          }}
        >
          {t('Mostrar QR')}
        </button>
        <a href={path} target="_blank" rel="noreferrer">
          {t('Testar cartão')}
        </a>
        <button
          type="button"
          onClick={() =>
            window.open(
              'https://wa.me/?text=' + encodeURIComponent(name + ' — ' + url()),
              '_blank',
              'noopener,noreferrer',
            )
          }
        >
          {t('Partilhar no WhatsApp')}
        </button>
      </div>
      {qr && (
        <>
          <Image
            unoptimized
            src={qr}
            width="240"
            height="240"
            alt={t('QR do cartão')}
          />
          <a href={qr} download="framy-qr.png">
            {t('Descarregar QR')}
          </a>
          <button type="button" onClick={() => setQr('')}>
            {t('Fechar QR')}
          </button>
        </>
      )}
      {message && <output>{t(message)}</output>}
    </section>
  );
}
