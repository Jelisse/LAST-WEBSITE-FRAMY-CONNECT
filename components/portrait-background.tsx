'use client';
import { useId } from 'react';
import { portraitPath, type PortraitPattern, type PortraitShape } from '@/lib/portrait-design';

function PatternMarks({ pattern }: { pattern: PortraitPattern }) {
  switch (pattern) {
    case 'waves': return <path d="M-10 12Q10 -2 30 12T70 12M-10 36Q10 22 30 36T70 36M-10 60Q10 46 30 60T70 60" />;
    case 'maze': return <path d="M0 8H25Q34 8 34 17V29Q34 38 43 38H64M8 64V48Q8 40 17 40H20M50 0V17Q50 24 58 24H64M0 24H12Q18 24 18 17V0M30 64V54Q30 49 39 49H50V64" />;
    case 'hatch': return <><path d="M5 5L25 10M4 13L24 18M3 21L23 26M39 6L34 27M47 7L42 28M55 8L50 29M6 38L11 59M14 37L19 58M22 36L27 57M36 40L58 35M37 48L59 43M38 56L60 51" /></>;
    case 'rings': return <><circle cx="32" cy="32" r="27" /><circle cx="32" cy="32" r="16" /></>;
    case 'halftone': return <>{Array.from({length: 64}, (_, i) => <circle key={i} cx={(i % 8) * 8 + 4} cy={Math.floor(i / 8) * 8 + 4} r={1 + Math.abs(3.5 - i % 8) * .35} fill="currentColor" stroke="none" />)}</>;
    case 'rays': return <path d="M32 0V17M32 47V64M0 32H17M47 32H64M9 9L21 21M43 43L55 55M9 55L21 43M43 21L55 9" />;
    case 'zigzag': return <path d="M-16 16L0 32L16 16L32 32L48 16L64 32L80 16M-16 48L0 64L16 48L32 64L48 48L64 64L80 48" />;
    case 'leaves': return <><path d="M8 58Q31 32 56 6" strokeWidth="2" /><path d="M28 36Q3 34 8 17Q26 18 28 36ZM35 29Q38 5 54 10Q51 26 35 29ZM16 48Q30 43 38 51Q23 65 16 48Z" fill="currentColor" stroke="none" /></>;
    case 'ribbons': return <>{Array.from({length: 7}, (_, i) => <path key={i} d={`M-10 ${i*6+3}C20 ${i*6-22} 38 ${i*6+38} 74 ${i*6+3}`} strokeWidth="1.2" />)}</>;
    case 'diamonds': return <path d="M32 1L63 32L32 63L1 32ZM32 13L51 32L32 51L13 32ZM0 0L13 13M64 0L51 13M0 64L13 51M64 64L51 51" />;
    case 'sprinkles': return <path d="M7 9L11 12M28 5L31 10M49 10L54 8M18 27L23 25M42 30L44 35M6 47L11 48M29 54L33 51M54 53L57 58" strokeWidth="2" />;
    case 'dots': return <><circle cx="16" cy="16" r="7" fill="currentColor" stroke="none" /><circle cx="48" cy="48" r="7" fill="currentColor" stroke="none" /></>;
    case 'diagonal': return <path d="M-16 16L16 -16M-16 48L48 -16M0 64L64 0M48 80L80 48" strokeWidth="2" />;
    case 'petals': return <path d="M32 0Q32 32 0 32Q32 32 32 64Q32 32 64 32Q32 32 32 0Z" fill="currentColor" stroke="none" />;
    case 'split': return <path d="M0 0H64V32H0Z" fill="currentColor" stroke="none" />;
    default: return null;
  }
}
export function PortraitBackground({shape = 'framy', pattern = 'solid', color, ink = '#ffffff', scale = 100, strength = 100, className}: {
  shape?: PortraitShape; pattern?: PortraitPattern; color?: string; ink?: string; scale?: number; strength?: number; className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const path = portraitPath(shape);
  const global = ['rings', 'rays', 'split'].includes(pattern);
  return <svg className={className} viewBox="0 0 420 440" aria-hidden="true">
    <defs><clipPath id={`${id}-clip`}><path d={path} /></clipPath><pattern id={id} width={64 * scale / 100} height={64 * scale / 100} patternUnits="userSpaceOnUse" viewBox="0 0 64 64">
      <g fill="none" stroke="currentColor" color={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><PatternMarks pattern={pattern} /></g>
    </pattern></defs>
    <path className="portrait-base" d={path} style={color ? {fill: color} : undefined} />
    {pattern !== 'solid' && !global && <path className="portrait-pattern" d={path} style={{ fill: `url(#${id})`, stroke: 'none' }} opacity={strength / 100} />}
    {global && <g clipPath={`url(#${id}-clip)`} opacity={strength / 100} fill="none" stroke={ink}>
      {pattern === 'rings' && <><circle cx="210" cy="240" r={135 * scale / 100} strokeWidth="30" /><circle cx="210" cy="240" r={65 * scale / 100} strokeWidth="24" /></>}
      {pattern === 'rays' && Array.from({length: 24}, (_, i) => <path key={i} d={`M210 ${240 - 100 * scale / 100}V50`} transform={`rotate(${i * 15} 210 240)`} strokeWidth="8" strokeLinecap="round" />)}
      {pattern === 'split' && <path d={`M0 0H420V${220 * scale / 100}H0Z`} fill={ink} stroke="none" />}
    </g>}
  </svg>;
}
