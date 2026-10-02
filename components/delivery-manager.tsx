'use client';
import { useEffect, useState } from 'react';
import { MapPin, Truck, Plus, Save } from 'lucide-react';
import type {
  FulfilmentSettings,
  DeliveryCity,
  PickupPoint,
} from '@/lib/fulfilment';
export function DeliveryManager() {
  const [settings, setSettings] = useState<FulfilmentSettings | null>(null),
    [version, setVersion] = useState(0),
    [cityId, setCityId] = useState('maputo'),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  async function load() {
    const r = await fetch('/api/manager-delivery', {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const d = (await r.json()) as {
      settings: FulfilmentSettings;
      version: number;
      error?: string;
    };
    if (!r.ok) throw Error(d.error);
    setSettings(d.settings);
    setVersion(d.version);
  }
  useEffect(() => {
    const c = new AbortController();
    void fetch('/api/manager-delivery', { cache: 'no-store', signal: c.signal })
      .then(async (r) => {
        const d = (await r.json()) as {
          settings: FulfilmentSettings;
          version: number;
          error?: string;
        };
        if (!r.ok) throw Error(d.error);
        if (!c.signal.aborted) {
          setSettings(d.settings);
          setVersion(d.version);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, []);
  const city = settings?.cities.find((c) => c.id === cityId);
  const updateCity = (patch: Partial<DeliveryCity>) =>
    setSettings((s) =>
      s
        ? {
            ...s,
            cities: s.cities.map((c) =>
              c.id === cityId ? { ...c, ...patch } : c,
            ),
          }
        : s,
    );
  const updatePoint = (id: string, patch: Partial<PickupPoint>) =>
    setSettings((s) =>
      s
        ? {
            ...s,
            points: s.points.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          }
        : s,
    );
  const currency = (value: string) => Math.round(Number(value) * 100);
  return (
    <section className="management-suite delivery-manager">
      <div className="suite-toolbar">
        <div>
          <h2>
            <Truck size={22} aria-hidden="true" /> Levantamento e entregas
          </h2>
          <p>
            Defina cidades, pontos de levantamento e tarifas. Os valores são por
            encomenda, em MT.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError('');
            void load().catch((e) => setError(e.message));
          }}
        >
          Actualizar definições
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <output>{message}</output>}
      {settings && (
        <form
          className="suite-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            setMessage('');
            try {
              const r = await fetch('/api/manager-delivery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings, version }),
                signal: AbortSignal.timeout(15000),
              });
              const d = (await r.json()) as { version: number; error?: string };
              if (!r.ok) throw Error(d.error);
              setVersion(d.version);
              setMessage(
                'Opções guardadas. As encomendas anteriores mantêm as condições contratadas.',
              );
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : 'Não foi possível guardar.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <legend>Cidades de recepção</legend>
            <div className="suite-toolbar">
              <label>
                Cidade a configurar
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                >
                  {settings.cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.active ? '' : ' · oculta'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  const id = 'city-' + crypto.randomUUID();
                  setSettings({
                    ...settings,
                    cities: [
                      ...settings.cities,
                      {
                        id,
                        name: 'Nova cidade',
                        active: false,
                        standardEnabled: false,
                        standardFee: 20000,
                        area: '',
                        eta: 'Prazo a confirmar após preparação do produto',
                        expressEnabled: false,
                        expressFee: null,
                        expressNote:
                          'Preço e disponibilidade a confirmar com o parceiro.',
                      },
                    ],
                  });
                  setCityId(id);
                }}
              >
                <Plus size={16} aria-hidden="true" /> Adicionar cidade
              </button>
            </div>
            {city && (
              <>
                <label>
                  Nome da cidade
                  <input
                    required
                    maxLength={80}
                    value={city.name}
                    onChange={(e) => updateCity({ name: e.target.value })}
                  />
                </label>
                <label className="suite-check">
                  <input
                    type="checkbox"
                    checked={city.active}
                    onChange={(e) => updateCity({ active: e.target.checked })}
                  />
                  Mostrar esta cidade no checkout
                </label>
                <div className="suite-grid">
                  <fieldset>
                    <legend>Entrega normal</legend>
                    <label className="suite-check">
                      <input
                        type="checkbox"
                        checked={city.standardEnabled}
                        onChange={(e) =>
                          updateCity({ standardEnabled: e.target.checked })
                        }
                      />
                      Disponível nesta cidade
                    </label>
                    <label>
                      Tarifa (MT)
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="0.01"
                        required
                        value={city.standardFee / 100}
                        onChange={(e) =>
                          updateCity({ standardFee: currency(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Zona abrangida / bairros
                      <input
                        required={city.standardEnabled}
                        maxLength={300}
                        value={city.area}
                        onChange={(e) => updateCity({ area: e.target.value })}
                      />
                    </label>
                    <label>
                      Prazo após preparação
                      <input
                        required
                        maxLength={200}
                        value={city.eta}
                        onChange={(e) => updateCity({ eta: e.target.value })}
                      />
                    </label>
                  </fieldset>
                  <fieldset>
                    <legend>Entrega expressa</legend>
                    <label className="suite-check">
                      <input
                        type="checkbox"
                        checked={city.expressEnabled}
                        onChange={(e) =>
                          updateCity({ expressEnabled: e.target.checked })
                        }
                      />
                      Oferecer esta opção
                    </label>
                    <label>
                      Tarifa acordada (MT)
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="0.01"
                        placeholder="Em branco: sob cotação"
                        value={
                          city.expressFee === null ? '' : city.expressFee / 100
                        }
                        onChange={(e) =>
                          updateCity({
                            expressFee:
                              e.target.value === ''
                                ? null
                                : currency(e.target.value),
                          })
                        }
                      />
                    </label>
                    <small>
                      Deixe em branco enquanto o parceiro não confirmar o preço.
                      Não é uma cotação automática da Yango.
                    </small>
                    <label>
                      Condições e horário-limite
                      <input
                        required
                        maxLength={300}
                        value={city.expressNote}
                        onChange={(e) =>
                          updateCity({ expressNote: e.target.value })
                        }
                      />
                    </label>
                  </fieldset>
                </div>
                <h3>
                  <MapPin size={20} aria-hidden="true" /> Pontos de levantamento
                  · {city.name}
                </h3>
                <p>
                  O levantamento é gratuito. Desactive um ponto para o retirar
                  das novas compras.
                </p>
                {settings.points
                  .filter((p) => p.cityId === cityId)
                  .map((p) => (
                    <fieldset key={p.id}>
                      <legend>{p.name}</legend>
                      <label>
                        Nome do ponto
                        <input
                          required
                          maxLength={100}
                          value={p.name}
                          onChange={(e) =>
                            updatePoint(p.id, { name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Endereço e referência
                        <input
                          required
                          maxLength={500}
                          value={p.address}
                          onChange={(e) =>
                            updatePoint(p.id, { address: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Horário / instruções
                        <input
                          required
                          maxLength={200}
                          value={p.hours}
                          onChange={(e) =>
                            updatePoint(p.id, { hours: e.target.value })
                          }
                        />
                      </label>
                      <label className="suite-check">
                        <input
                          type="checkbox"
                          checked={p.active}
                          onChange={(e) =>
                            updatePoint(p.id, { active: e.target.checked })
                          }
                        />
                        Ponto disponível para levantamento
                      </label>
                    </fieldset>
                  ))}
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      points: [
                        ...settings.points,
                        {
                          id: 'point-' + crypto.randomUUID(),
                          cityId,
                          name: 'Novo ponto',
                          address: '',
                          hours: 'Horário a confirmar',
                          active: false,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} aria-hidden="true" /> Adicionar ponto nesta
                  cidade
                </button>
              </>
            )}
          </fieldset>
          <button type="submit" disabled={busy}>
            <Save size={17} aria-hidden="true" />
            {busy ? 'A guardar…' : 'Guardar levantamento e entregas'}
          </button>
        </form>
      )}
    </section>
  );
}
