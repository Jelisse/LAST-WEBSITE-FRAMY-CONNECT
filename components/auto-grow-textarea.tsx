'use client';
import { useLayoutEffect, useRef, type ComponentProps } from 'react';
export function AutoGrowTextarea(props: ComponentProps<'textarea'>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let width = -1;
    const fit = () => {
      if (!element.clientWidth) return;
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
    };
    const observer = new ResizeObserver(() => {
      if (width !== element.clientWidth) {
        width = element.clientWidth;
        fit();
      }
    });
    observer.observe(element);
    fit();
    return () => observer.disconnect();
  }, [props.value]);
  return (
    <textarea
      {...props}
      ref={ref}
      className={`auto-grow-textarea ${props.className ?? ''}`}
      rows={props.rows ?? 2}
    />
  );
}
