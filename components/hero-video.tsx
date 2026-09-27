'use client';
import { useI18n } from './language-provider';
import { useEffect, useRef, useState } from 'react';
export function HeroVideo({ sources }: { sources: string[] }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const source = sources[index];
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const update = () =>
      setPaused(preference.matches || !!connection?.saveData);
    update();
    preference.addEventListener('change', update);
    let intersecting = false;
    const visibility = () => {
      const inView = intersecting && document.visibilityState === 'visible';
      setVisible(inView);
      if (inView && !preference.matches && !connection?.saveData)
        setLoaded(true);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        visibility();
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      preference.removeEventListener('change', update);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (ref.current) {
      ref.current.defaultPlaybackRate = 1.8;
      ref.current.playbackRate = 1.8;
    }
    if (paused || !visible || !loaded) ref.current?.pause();
    else
      void ref.current?.play().catch((error: DOMException) => {
        if (!cancelled && error.name !== 'AbortError') setPaused(true);
      });
    return () => {
      cancelled = true;
    };
  }, [paused, visible, loaded, source]);
  return (
    <>
      <video
        ref={ref}
        src={loaded ? source : undefined}
        muted
        playsInline
        preload="none"
        aria-label={t('Demonstração dos produtos Framy Connect')}
        onEnded={() => setIndex((i) => (i + 1) % sources.length)}
        onError={() => setPaused(true)}
      />
      <button
        type="button"
        className="home-video-control"
        onClick={() => {
          if (paused) setLoaded(true);
          setPaused(!paused);
        }}
        aria-label={t(paused ? 'Reproduzir vídeo' : 'Pausar vídeo')}
      >
        {paused ? '▶' : 'Ⅱ'}
      </button>
    </>
  );
}
