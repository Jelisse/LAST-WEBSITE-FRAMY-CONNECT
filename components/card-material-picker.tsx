'use client';
import { useState } from 'react';
import { Check, Nfc } from 'lucide-react';
import { useI18n } from './language-provider';
import { CardMaterialImage } from './card-material-image';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { cardMaterials } from '@/lib/purchase-structure';
import { hardwareEstimate, type HardwarePrice } from '@/lib/hardware-pricing';
import { purchaseMoney } from '@/lib/purchase-journey';
export function CardMaterialPicker({
  value,
  back,
  onChange,
  prices,
  availability,
}: {
  value: string;
  back: boolean;
  onChange: (material: string, back: boolean) => void;
  prices: HardwarePrice[];
  availability: Record<string, boolean>;
}) {
  const { t } = useI18n();
  const [candidate, setCandidate] = useState<string | null>(null);
  const [candidateBack, setCandidateBack] = useState(false);
  const priceFor = (material: string) =>
    hardwareEstimate(prices, 'card', material, 'PVC + epóxi');
  const available = (material: string) =>
    availability[
      (
        { PVC: 'pvc', Madeira: 'wood', Metal: 'metal' } as Record<
          string,
          string
        >
      )[material]
    ] !== false;
  return (
    <>
      <fieldset className="card-material-picker">
        <legend>{t('Escolha o material do seu cartão')}</legend>
        <div className="card-material-choices">
          {cardMaterials.map((material) => {
            const price = priceFor(material);
            return (
              <button
                key={material}
                type="button"
                aria-pressed={value === material}
                aria-haspopup="dialog"
                aria-expanded={candidate === material}
                className={value === material ? 'is-selected' : ''}
                onClick={() => {
                  setCandidate(material);
                  setCandidateBack(value === material ? back : false);
                }}
              >
                <span className="material-swatch-scene" aria-hidden="true">
                  <span className="material-swatch" data-material={material}>
                    <span className="material-swatch-sheen" />
                  </span>
                  <Nfc className="material-nfc-signal" size={26} />
                </span>
                <span className="card-material-name">
                  <strong>{t(material)}</strong>
                  {value === material && (
                    <Check size={17} aria-label={t('Escolhido')} />
                  )}
                </span>
                <span className="card-material-texture">
                  {t(
                    material === 'PVC'
                      ? 'Superfície branca e acetinada'
                      : material === 'Madeira'
                        ? 'Veios naturais e acabamento suave'
                        : 'Textura escovada e reflexos metálicos',
                  )}
                </span>
                <span className="material-price">
                  {price
                    ? purchaseMoney(price.amount, t.locale)
                    : t('Sob consulta')}
                </span>
                {!available(material) && (
                  <small>{t('Disponibilidade a confirmar')}</small>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Dialog
        open={candidate !== null}
        onOpenChange={(open) => {
          if (!open) setCandidate(null);
        }}
      >
        <DialogContent className="purchase-preview-dialog card-product-dialog">
          <DialogTitle>
            {t('O seu cartão NFC')} · {candidate && t(candidate)}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Veja a frente e o verso do design Framy. Os dados apresentados são um exemplo de personalização.',
            )}
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
          <div className="card-product-full">
            {candidate && (
              <CardMaterialImage
                material={candidate}
                back={candidateBack}
                eager
              />
            )}
          </div>
          <p className="card-product-price">
            {candidate &&
              (priceFor(candidate)
                ? purchaseMoney(priceFor(candidate)!.amount, t.locale)
                : t('Preço a confirmar'))}
            {candidate && (!available(candidate) || !priceFor(candidate)) && (
              <> · {t('Preço e disponibilidade sob consulta')}</>
            )}
          </p>
          <div className="pvc-product-dialog-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setCandidate(null)}
            >
              {t('Voltar aos materiais')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (candidate) onChange(candidate, candidateBack);
                setCandidate(null);
              }}
            >
              {t('Escolher este cartão')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
