'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function HomeHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = ref.current;
    const home = header?.closest<HTMLElement>('.framy-home');
    if (!header || !home) return;
    const sections = Array.from(home.querySelectorAll<HTMLElement>('main > section[id]'));
    const links = Array.from(header.querySelectorAll<HTMLAnchorElement>('nav a[href^="#"]'));
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = header.getBoundingClientRect().height;
      home.style.setProperty('--home-nav-offset', `${height + 24}px`);
      header.dataset.scrolled = String(window.scrollY > 12);
      // Use a reading line just below the header, including sections without a nav link.
      const section = sections.find(section => {
        const bounds = section.getBoundingClientRect();
        return bounds.top <= height + 32 && bounds.bottom > height + 32;
      });
      for (const link of links) {
        if (section && link.hash === `#${section.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    const main = home.querySelector('main');
    if (main) observer.observe(main);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      home.style.removeProperty('--home-nav-offset');
    };
  }, []);
  return <header ref={ref} className="home-nav">{children}</header>;
}
