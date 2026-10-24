'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
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
  const [candidate, setCandidate] = useState<PvcModel | null>(null);
  const [candidateBack, setCandidateBack] = useState(false);
  return (
    <section className="pvc-config pvc-config-picker">
      <fieldset>
        <legend>{t('Escolha o modelo de PVC + epóxi')}</legend>
        <p className="pvc-picker-intro">
          {t(
            'Clique num modelo para ver a frente e o verso e confirmar a sua escolha.',
          )}
        </p>
        <div className="pvc-model-options">
          {pvcModels.map((item) => (
            <button
              type="button"
              key={item.id}
              className={model === item.id ? 'is-selected' : ''}
              aria-pressed={model === item.id}
              aria-haspopup="dialog"
              aria-expanded={candidate === item.id}
              onClick={() => {
                setCandidate(item.id);
                setCandidateBack(item.id === model ? back : false);
              }}
            >
              <SourceImage
                src={pvcPhoto(item.id)}
                alt={t(item.name)}
                width={240}
                height={240}
              />
              <span>
                {t(item.name)}
                {model === item.id && (
                  <small>
                    <Check size={15} aria-hidden="true" />
                    {t('Escolhido')}
                  </small>
                )}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <Dialog
        open={candidate !== null}
        onOpenChange={(open) => {
          if (!open) setCandidate(null);
        }}
      >
        <DialogContent className="purchase-preview-dialog pvc-product-dialog">
          <DialogTitle>
            {t('Porta-chaves NFC {0}', [
              candidate ? t(pvcModel(candidate).name) : '',
            ])}
          </DialogTitle>
          <DialogDescription>
            {t('Veja a frente e o verso deste modelo.')}
          </DialogDescription>
          <fieldset
            className="leather-face-tabs"
            aria-label={t('Vista do produto')}
          >
            <button
              type="button"
              aria-pressed={!candidateBack}
              onClick={() => setCandidateBack(false)}
            >
              {t('Frente')}
            </button>
            <button
              type="button"
              aria-pressed={candidateBack}
              onClick={() => setCandidateBack(true)}
            >
              {t('Verso')}
            </button>
          </fieldset>
          <div className="purchase-preview-large">
            {candidate && <PvcPreview model={candidate} back={candidateBack} />}
          </div>
          <div className="pvc-product-dialog-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setCandidate(null)}
            >
              {t('Voltar aos modelos')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (candidate) {
                  onChange(candidate);
                  onFaceChange(candidateBack);
                  setCandidate(null);
                }
              }}
            >
              {t('Escolher este modelo')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
