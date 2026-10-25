import Link from './hard-link';
import { SourceImage } from './source-image';
import { ArrowUpRight } from 'lucide-react';
import type { SolutionPath } from '@/lib/solution-paths';
export function SolutionCards({
  paths,
  t,
  compact = false,
  legacyAnchors = false,
  onNavigate,
}: {
  paths: readonly SolutionPath[];
  t: (key: string) => string;
  compact?: boolean;
  legacyAnchors?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={`solution-cards ${compact ? 'solution-cards-menu' : ''}`}>
      {paths.map((path) => (
        <article key={path.id} id={legacyAnchors ? path.id : undefined}>
          <Link className="solution-card" href={path.href} onClick={onNavigate}>
            <span className="solution-card-photo">
              <SourceImage
                src={path.image}
                srcSet={`${path.image.replace('.webp', '-small.webp')} 480w, ${path.image} 1200w`}
                sizes={
                  compact
                    ? '(max-width: 1100px) 30vw, 16vw'
                    : '(max-width: 700px) 100vw, 33vw'
                }
                alt={t(path.imageAlt)}
                width={1200}
                height={800}
              />
            </span>
            {!compact && (
              <span className="solution-card-category">{t(path.tag)}</span>
            )}
            <h3>{t(path.title)}</h3>
            <p>{t(path.summary)}</p>
            {!compact && (
              <span className="solution-card-action">
                {t('Encontrar o meu caminho')}
                <ArrowUpRight size={16} aria-hidden="true" />
              </span>
            )}
            <span className="solution-card-line" aria-hidden="true" />
          </Link>
        </article>
      ))}
    </div>
  );
}
