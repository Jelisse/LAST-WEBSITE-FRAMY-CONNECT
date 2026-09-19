'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Keep the device locked to the viewport, independent of the form's height. */
export function FixedCheckoutPreview({ children }: { children: ReactNode }) {
  const slot = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ left: number; width: number } | null>(null);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)');
    const update = () => {
      if (!media.matches || !slot.current) { setFrame(null); return; }
      const rect = slot.current.getBoundingClientRect();
      const width = Math.min(rect.width, 320, Math.max(120, (window.innerHeight - 128) * 0.46));
      setFrame(previous => previous?.left === rect.left + (rect.width - width) / 2 && previous.width === width
        ? previous : { left: rect.left + (rect.width - width) / 2, width });
    };
    update();
    const observer = new ResizeObserver(update);
    if (slot.current) observer.observe(slot.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    media.addEventListener('change', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
      media.removeEventListener('change', update);
    };
  }, []);
  return <div ref={slot} className="checkout-preview-slot">
    {frame ? createPortal(<div className="checkout-fixed-preview" style={{ left: frame.left, width: frame.width }}>{children}</div>, document.body) : children}
  </div>;
}
