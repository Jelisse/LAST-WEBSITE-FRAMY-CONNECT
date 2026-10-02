import { MapPin, Truck, Zap } from 'lucide-react';
import { useI18n } from '@/components/language-provider';
import type { FulfilmentSettings } from '@/lib/fulfilment';
import Link from '@/components/hard-link';
export function DeliverySelector({
  settings,
  city,
  mode,
  point,
  onCity,
  onMode,
  onPoint,
}: {
  settings: FulfilmentSettings | null;
  city: string;
  mode: string;
  point: string;
  onCity: (id: string) => void;
  onMode: (mode: string) => void;
  onPoint: (id: string) => void;
}) {
  const { t } = useI18n();
  const selected = settings?.cities.find((c) => c.id === city && c.active);
  const points =
    settings?.points.filter((p) => p.cityId === city && p.active) ?? [];
  const selectedPoint = points.find((p) => p.id === point);
  const amount = (n: number) =>
    new Intl.NumberFormat('pt-MZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n / 100) + ' MT';
  return (
    <>
      <label>
        {t(' Em que cidade pretende receber ou levantar o produto? ')}
        <select value={city} onChange={(e) => onCity(e.target.value)}>
          <option value="">{t('Seleccionar cidade')}</option>
          {settings?.cities
            .filter((c) => c.active)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          <option value="other">{t('Outra cidade / localidade')}</option>
        </select>
      </label>
      {!settings && (
        <p role="alert">
          {t(' As opções de recepção estão temporariamente indisponíveis. ')}
        </p>
      )}
      {city && (
        <>
          <fieldset className="delivery-methods">
            <legend>{t('Como pretende receber?')}</legend>
            <div className="delivery-options">
              <label className={mode === 'pickup' ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="fulfilment"
                  checked={mode === 'pickup'}
                  onChange={() => onMode('pickup')}
                />
                <MapPin size={22} aria-hidden="true" />
                <strong>{t('Levantar num ponto')}</strong>
                <small>
                  {t(
                    points.length
                      ? 'Gratuito'
                      : 'Sem ponto disponível nesta cidade',
                  )}
                </small>
              </label>
              <label className={mode === 'standard' ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="fulfilment"
                  checked={mode === 'standard'}
                  onChange={() => onMode('standard')}
                />
                <Truck size={22} aria-hidden="true" />
                <strong>{t('Receber na minha morada')}</strong>
                <small>
                  {t(
                    selected?.standardEnabled
                      ? amount(selected.standardFee)
                      : 'Sob consulta',
                  )}
                </small>
              </label>
              <label className={mode === 'express' ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="fulfilment"
                  checked={mode === 'express'}
                  onChange={() => onMode('express')}
                />
                <Zap size={22} aria-hidden="true" />
                <strong>{t('Entrega expressa')}</strong>
                <small>
                  {t(
                    selected?.expressEnabled && selected.expressFee !== null
                      ? amount(selected.expressFee)
                      : 'Sob cotação',
                  )}
                </small>
              </label>
            </div>
          </fieldset>
          {mode === 'pickup' && points.length > 0 && (
            <>
              <label>
                {t(' Ponto de levantamento ')}
                <select value={point} onChange={(e) => onPoint(e.target.value)}>
                  <option value="">{t('Seleccionar ponto')}</option>
                  {points.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedPoint && (
                <div className="pickup-location">
                  <strong>{selectedPoint.name}</strong>
                  <p>{selectedPoint.address}</p>
                  <p>{selectedPoint.hours}</p>
                  <a
                    href={
                      'https://www.google.com/maps/search/?api=1&query=' +
                      encodeURIComponent(
                        selectedPoint.address +
                          ' ' +
                          selected?.name +
                          ', Moçambique',
                      )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t(' Ver endereço no mapa ↗ ')}
                  </a>
                  <p>
                    {t(
                      ' Aguarde a confirmação de que o produto está pronto antes de se deslocar ao ponto. ',
                    )}
                  </p>
                </div>
              )}
            </>
          )}
          {mode === 'standard' && selected?.standardEnabled && (
            <div className="pickup-location">
              <strong>
                {t('Zona abrangida: ')}
                {selected.area}
              </strong>
              <p>{selected.eta}</p>
              <small>
                {t(
                  ' O prazo de entrega começa depois de o produto estar pronto. ',
                )}
              </small>
            </div>
          )}
          {mode === 'express' && selected?.expressEnabled && (
            <div className="pickup-location">
              <p>{selected.expressNote}</p>
              {selected.expressFee === null && (
                <p>
                  {t(
                    ' O parceiro confirmará o preço e a disponibilidade. Este serviço ainda não pode ser pago no checkout. ',
                  )}
                </p>
              )}
            </div>
          )}
          {((mode === 'pickup' && !points.length) ||
            (mode === 'standard' && !selected?.standardEnabled) ||
            (mode === 'express' &&
              (!selected?.expressEnabled || selected.expressFee === null))) && (
            <p>
              <Link className="home-text-link" href="/contacto">
                {t(' Solicitar cotação à equipa ↗ ')}
              </Link>
              <br />
              <small>
                {t(
                  ' O total será confirmado antes do pagamento. Pode escolher outra forma de recepção. ',
                )}
              </small>
            </p>
          )}
        </>
      )}
    </>
  );
}
