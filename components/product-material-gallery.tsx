'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { SourceImage } from './source-image';
import { useI18n } from './language-provider';
import type { ProductPhoto } from '@/lib/product-gallery';

export function ProductMaterialGallery({ frames, name }: {
  frames: ProductPhoto[][];
  name: string;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (frames.length < 2 || paused || hovered || focused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((value) => (value + 1) % frames.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [frames.length, paused, hovered, focused, reducedMotion]);
  const frame = frames[index % Math.max(1, frames.length)] ?? [];
  const move = (step: number) => {
    setPaused(true);
    setIndex((value) => (value + step + frames.length) % frames.length);
  };
  return (
    // Hover and descendant focus only pause rotation; all actions use native buttons.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <fieldset className="product-material-gallery" aria-label={name}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className={`home-solution-photo${frame.length > 1 ? ' is-pair' : ''}`}>
        {frame.length ? frame.map((photo) => (
          <SourceImage key={photo.id} src={photo.src} alt={`${name} · ${t(photo.material)}`}
            width={600} height={600} sizes="(max-width: 700px) 90vw, 400px" />
        )) : <div className="home-photo-placeholder">{t('Fotografia do produto em preparação')}</div>}
      </div>
      <div className="product-gallery-caption">
        <span>{t('Materiais disponíveis')}{frame.length > 0 && <> · {frame.map((photo) => t(photo.material)).join(' / ')}</>}</span>
        {frames.length > 1 && <div className="product-gallery-controls">
          <button type="button" onClick={() => move(-1)} aria-label={t('Material anterior')}><ChevronLeft size={16} /></button>
          {!reducedMotion && <button type="button" onClick={() => setPaused(!paused)} aria-label={t(paused ? 'Retomar fotografias' : 'Pausar fotografias')}>
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>}
          <button type="button" onClick={() => move(1)} aria-label={t('Material seguinte')}><ChevronRight size={16} /></button>
        </div>}
      </div>
    </fieldset>
  );
}
