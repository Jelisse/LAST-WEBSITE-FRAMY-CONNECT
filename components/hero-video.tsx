'use client';
import { useI18n } from './language-provider';
import { useEffect, useRef, useState } from 'react';
export function HeroVideo({ sources }: { sources: string[] }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const source = sources[index];
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPaused(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (ref.current) {
      ref.current.defaultPlaybackRate = 1.8;
      ref.current.playbackRate = 1.8;
    }
    if (paused) ref.current?.pause();
    else void ref.current?.play().catch((error: DOMException) => {
      if (!cancelled && error.name !== 'AbortError') setPaused(true);
    });
    return () => { cancelled = true; };
  }, [paused, source]);
  return <>
    <video ref={ref} key={sources[index]} src={sources[index]} autoPlay={!paused} muted playsInline
      preload="metadata" aria-label={t('Demonstração dos produtos Framy Connect')}
      onEnded={() => setIndex((i) => (i + 1) % sources.length)}
      onError={() => setPaused(true)} />
    <button type="button" className="home-video-control" onClick={() => setPaused(!paused)}
      aria-label={t(paused ? 'Reproduzir vídeo' : 'Pausar vídeo')}>{paused ? '▶' : 'Ⅱ'}</button>
  </>;
}
