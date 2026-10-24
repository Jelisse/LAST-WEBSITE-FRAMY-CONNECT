'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useI18n } from './language-provider';
import { isDashboardSupportPath } from '@/lib/support-contact';
import {
  guidanceScope,
  guidanceTips,
  guidanceStorageKey,
  readGuidance,
  tipPosition,
} from '@/lib/first-use-tips';
const memory = new Set<string>();
type Tip = {
  key: string;
  scope: string;
  message: string;
  anchor: HTMLElement;
  width: number;
  arrow: number;
  left: number;
  top: number;
  above: boolean;
};
export function FirstUseGuidance() {
  const path = usePathname() ?? '';
  const { t } = useI18n();
  const id = useId();
  const [tip, setTip] = useState<Tip | null>(null);
  const quiet = useRef(new Set<string>());
  const dismiss = useCallback(() => {
    if (!tip) return;
    memory.add(tip.key);
    quiet.current.add(tip.scope);
    try {
      const seen = readGuidance(localStorage.getItem(guidanceStorageKey));
      localStorage.setItem(
        guidanceStorageKey,
        JSON.stringify([...new Set([...seen, tip.key])].slice(-200)),
      );
    } catch {
      /* session memory remains */
    }
    setTip(null);
  }, [tip]);
  useEffect(() => {
    if (!isDashboardSupportPath(path) && path !== '/comprar') {
      queueMicrotask(() => setTip(null));
      return;
    }
    let timer = 0;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.top >= 0 &&
        r.bottom <= innerHeight - 12 &&
        getComputedStyle(el).visibility !== 'hidden'
      );
    };
    const inspect = () => {
      const main =
        document.querySelector('main[data-guidance-panel]') ??
        document.querySelector('main');
      const scope = guidanceScope(
        path,
        main?.getAttribute('data-guidance-panel') ??
          document
            .querySelector('[data-purchase-step]')
            ?.getAttribute('data-purchase-step') ??
          '',
      );
      if (
        quiet.current.has(scope) ||
        [...document.querySelectorAll('[role="dialog"], [role="menu"]')].some(
          (el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          },
        ) ||
        document.activeElement?.matches(
          'input,textarea,select,[contenteditable="true"]',
        )
      ) {
        setTip(null);
        return;
      }
      let seen: string[] = [];
      try {
        seen = readGuidance(localStorage.getItem(guidanceStorageKey));
      } catch {
        /* no storage */
      }
      for (const item of guidanceTips) {
        if (
          document.querySelector('[data-onboarding="true"]') &&
          !['preview', 'expand'].includes(item.id)
        )
          continue;
        if ('mobile' in item && item.mobile && innerWidth > 950) continue;
        const key = `${'global' in item ? scope.split(':')[0] : scope}:${item.id}`;
        if (memory.has(key) || seen.includes(key)) continue;
        const anchor = [
          ...document.querySelectorAll<HTMLElement>(item.selector),
        ].find(visible);
        if (!anchor) continue;
        const r = anchor.getBoundingClientRect();
        const { width, left, top, above, arrow } = tipPosition(
          r,
          document.documentElement.clientWidth,
          innerHeight,
        );
        setTip((old) =>
          old?.key === key &&
          old.top === top &&
          old.left === left &&
          old.width === width &&
          old.arrow === arrow
            ? old
            : {
                key,
                scope,
                message: item.message,
                anchor,
                left,
                top,
                above,
                width,
                arrow,
              },
        );
        return;
      }
      setTip(null);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(inspect, 200);
    };
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            !(
              record.target instanceof Element &&
              record.target.closest('.first-use-tip')
            ),
        )
      )
        schedule();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'data-guidance-panel',
        'data-purchase-step',
        'data-collapsed',
        'aria-current',
        'aria-pressed',
      ],
    });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    window.addEventListener('storage', schedule);
    timer = window.setTimeout(inspect, 1000);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      window.removeEventListener('storage', schedule);
    };
  }, [path]);
  useEffect(() => {
    if (!tip) return;
    const anchor = tip.anchor;
    const previous = anchor.getAttribute('aria-describedby');
    anchor.setAttribute(
      'aria-describedby',
      [previous, id].filter(Boolean).join(' '),
    );
    anchor.classList.add('first-use-target');
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    const used = (event: Event) => {
      if (event.target instanceof Node && anchor.contains(event.target))
        dismiss();
    };
    document.addEventListener('click', used, true);
    document.addEventListener('keydown', escape);
    return () => {
      if (previous) anchor.setAttribute('aria-describedby', previous);
      else anchor.removeAttribute('aria-describedby');
      anchor.classList.remove('first-use-target');
      document.removeEventListener('click', used, true);
      document.removeEventListener('keydown', escape);
    };
  }, [tip, id, dismiss]);
  if (!tip) return null;
  return createPortal(
    <aside
      id={id}
      role="note"
      aria-live="polite"
      className="first-use-tip"
      data-above={tip.above}
      style={{ left: tip.left, top: tip.top, width: tip.width }}
      aria-label={t('Dica rápida')}
    >
      <span
        className="first-use-arrow"
        aria-hidden="true"
        style={{ left: tip.arrow }}
      />
      <p>{t(tip.message)}</p>
      <button type="button" onClick={dismiss}>
        {t('Entendido')}
      </button>
    </aside>,
    document.body,
  );
}
