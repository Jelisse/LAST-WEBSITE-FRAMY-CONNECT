import { getTranslations } from '@/lib/server-i18n';
import { solutionPaths } from '@/lib/solution-paths';
import { SolutionCards } from './solution-cards';
export const problemPaths = solutionPaths;
export async function ProblemPaths({ details = false }: { details?: boolean }) {
  const t = await getTranslations();
  return (
    <section className="why-section solution-discovery" id="problemas">
      <div className="why-heading">
        <span className="public-eyebrow">
          {t('DO SEU DIA A DIA PARA A PRÓXIMA CONEXÃO')}
        </span>
        <h2>{t('O que está a tentar resolver?')}</h2>
        <p>{t('Encontre a solução que acompanha o seu próximo passo.')}</p>
      </div>
      <SolutionCards paths={solutionPaths} t={t} legacyAnchors={details} />
      <p className="solution-photo-note">
        {t('Fotografias ilustrativas geradas por IA.')}
      </p>
    </section>
  );
}
