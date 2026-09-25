'use client';
import { MediaUploadBox } from './media-upload-box';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from './language-provider';
import { heroSlots, type HeroMedia, type HeroSlot } from '@/lib/hero-media';
const labels: Record<HeroSlot, string> = {
  video1: 'Vídeo 1 — Cartão',
  video2: 'Vídeo 2 — Porta-chaves',
  card: 'Verso do cartão',
  cardFront: 'Frente do cartão',
  keychain: 'Imagem do porta-chaves',
  tapCard: 'Toque NFC — Frente do cartão',
  tapProfile: 'Toque NFC — Perfil no telemóvel',
  scanCard: 'Leitura QR — Verso do cartão',
};
export function HeroManager() {
  const { t } = useI18n();
  const [media, setMedia] = useState<HeroMedia | null>(null);
  const [files, setFiles] = useState<Partial<Record<HeroSlot, File>>>({});
  const [previews, setPreviews] = useState<Partial<HeroMedia>>({});
  const [busy, setBusy] = useState<HeroSlot | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/hero-media', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw Error('Não foi possível carregar.');
        setMedia(await r.json());
      })
      .catch((e) => setError(e.message));
  }, []);
  const previewUrls = useRef<Partial<HeroMedia>>({});
  useEffect(
    () => () => {
      Object.values(previewUrls.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    },
    [],
  );
  function selectFile(slot: HeroSlot, file?: File) {
    const previous = previewUrls.current[slot];
    if (previous) URL.revokeObjectURL(previous);
    const url = file ? URL.createObjectURL(file) : undefined;
    previewUrls.current[slot] = url;
    setPreviews((current) => ({ ...current, [slot]: url }));
    setFiles((current) => ({ ...current, [slot]: file }));
  }
  async function save(slot: HeroSlot) {
    const file = files[slot];
    if (!file) return;
    setBusy(slot);
    setError('');
    setMessage('');
    try {
      const r = await fetch(`/api/hero-media?slot=${slot}`, {
        method: 'POST',
        body: file,
      });
      const data = (await r.json()) as { url: string; error?: string };
      if (!r.ok) throw Error(data.error || 'Não foi possível guardar.');
      setMedia((current) => current && { ...current, [slot]: data.url });
      selectFile(slot);
      setMessage('Alteração publicada na página inicial.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="manager-card">
      <h2>{t('Imagens da página inicial')}</h2>
      <p>
        {t(
          'Os dois vídeos passam em sequência, sem som. Pré-visualize cada ficheiro e publique a alteração.',
        )}
      </p>
      <p>
        {t(
          'Em Como funciona, altere o cartão NFC, o perfil e o cartão QR. O cartão QR aparece também na câmara do telemóvel.',
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {message && <output>{t(message)}</output>}
      {!media && !error && <p>{t('A carregar…')}</p>}
      <div className="hero-manager-grid">
        {media &&
          heroSlots.map((slot) => {
            const video = slot.startsWith('video');
            const src = previews[slot] || media[slot];
            return (
              <div key={slot} className="hero-manager-item">
                <MediaUploadBox
                  title={t(labels[slot])}
                  src={src}
                  mediaType={video ? 'video' : 'image'}
                  fileName={files[slot]?.name}
                  disabled={!!busy}
                  accept={
                    video ? 'video/mp4' : 'image/png,image/jpeg,image/webp'
                  }
                  hint={t(
                    video
                      ? 'MP4 até 25 MB. Formato vertical recomendado.'
                      : 'PNG, JPG ou WebP até 8 MB. Fundo transparente recomendado.',
                  )}
                  onRemove={files[slot] ? () => selectFile(slot) : undefined}
                  onFiles={([file]) => {
                    if (file && file.size > (video ? 25 : 8) * 1024 * 1024) {
                      selectFile(slot);
                      setError(
                        video
                          ? 'O vídeo deve ter até 25 MB.'
                          : 'A imagem deve ter até 8 MB.',
                      );
                      return;
                    }
                    setError('');
                    setMessage('');
                    selectFile(slot, file);
                  }}
                />
                <button
                  className="manager-primary"
                  disabled={!!busy || !files[slot]}
                  onClick={() => void save(slot)}
                >
                  {t(busy === slot ? 'A guardar…' : 'Publicar alteração')}
                </button>
              </div>
            );
          })}
      </div>
    </section>
  );
}
