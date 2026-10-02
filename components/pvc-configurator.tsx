'use client';
import { SourceImage } from './source-image';
import { useI18n } from './language-provider';
import { pvcModels, pvcModel, pvcPhoto, type PvcModel } from '@/lib/pvc-models';
export function PvcPreview({
  model,
  back = false,
}: {
  model: PvcModel;
  back?: boolean;
}) {
  const { t } = useI18n();
  return (
    <SourceImage
      className="pvc-product-photo"
      src={pvcPhoto(model, back)}
      alt={`${t(pvcModel(model).name)} · ${t(back ? 'Verso' : 'Frente')}`}
      width={600}
      height={600}
    />
  );
}
export function PvcConfigurator({
  model,
  onChange,
  back,
  onFaceChange,
}: {
  model: PvcModel;
  onChange: (model: PvcModel) => void;
  back: boolean;
  onFaceChange: (back: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="pvc-config">
      <fieldset>
        <legend>{t('Escolha o modelo de PVC + epóxi')}</legend>
        <div className="pvc-model-options">
          {pvcModels.map((item) => (
            <label
              key={item.id}
              className={model === item.id ? 'is-selected' : ''}
            >
              <SourceImage
                src={pvcPhoto(item.id)}
                alt={t(item.name)}
                width={240}
                height={240}
              />
              <span>
                <input
                  type="radio"
                  name="pvc-model"
                  value={item.id}
                  checked={model === item.id}
                  onChange={() => onChange(item.id)}
                />
                {t(item.name)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <figure className="pvc-model-preview">
        <div className="leather-face-tabs">
          <button
            type="button"
            aria-pressed={!back}
            onClick={() => onFaceChange(false)}
          >
            {t('Frente')}
          </button>
          <button
            type="button"
            aria-pressed={back}
            onClick={() => onFaceChange(true)}
          >
            {t('Verso')}
          </button>
        </div>
        <PvcPreview model={model} back={back} />
        <figcaption aria-live="polite">
          {t(pvcModel(model).name)} ·{' '}
          {t(back ? 'Verso FramyConnect' : 'Frente')}
        </figcaption>
      </figure>
    </section>
  );
}
