export type DeliveryCity = {
  id: string;
  name: string;
  active: boolean;
  standardEnabled: boolean;
  standardFee: number;
  area: string;
  eta: string;
  expressEnabled: boolean;
  expressFee: number | null;
  expressNote: string;
};
export type PickupPoint = {
  id: string;
  cityId: string;
  name: string;
  address: string;
  hours: string;
  active: boolean;
};
export type FulfilmentSettings = {
  cities: DeliveryCity[];
  points: PickupPoint[];
};
export const fulfilmentDefaults: FulfilmentSettings = {
  cities: [
    {
      id: 'maputo',
      name: 'Maputo',
      active: true,
      standardEnabled: true,
      standardFee: 20000,
      area: 'Cidade de Maputo',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: true,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'matola',
      name: 'Matola',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'boane',
      name: 'Boane',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'xai-xai',
      name: 'Xai-Xai',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'chokwe',
      name: 'Chókwè',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'inhambane',
      name: 'Inhambane',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'maxixe',
      name: 'Maxixe',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'beira',
      name: 'Beira',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'dondo',
      name: 'Dondo',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'chimoio',
      name: 'Chimoio',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'tete',
      name: 'Tete',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'moatize',
      name: 'Moatize',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'quelimane',
      name: 'Quelimane',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'mocuba',
      name: 'Mocuba',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'nampula',
      name: 'Nampula',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'nacala',
      name: 'Nacala',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'pemba',
      name: 'Pemba',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'montepuez',
      name: 'Montepuez',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'lichinga',
      name: 'Lichinga',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
    {
      id: 'cuamba',
      name: 'Cuamba',
      active: true,
      standardEnabled: false,
      standardFee: 20000,
      area: '',
      eta: 'Prazo a confirmar após preparação do produto',
      expressEnabled: false,
      expressFee: null,
      expressNote:
        'Disponibilidade e preço confirmados pela equipa. Serviço no próprio dia apenas para produtos prontos.',
    },
  ],
  points: [
    {
      id: 'mahota',
      cityId: 'maputo',
      name: 'Framy Connect · Mahota',
      address:
        'Bairro Mahota, Av. Dom Alexandre, próximo do cruzamento com a Rua Mário Coluna, em frente às Bombas Puma.',
      hours: 'Segunda a sexta: 09:00–17:00. Sábado: 08:00–13:00.',
      active: true,
    },
  ],
};
export function validateFulfilment(input: unknown): FulfilmentSettings {
  if (!input || typeof input !== 'object')
    throw Error('Configuração inválida.');
  const value = input as FulfilmentSettings;
  if (
    !Array.isArray(value.cities) ||
    !Array.isArray(value.points) ||
    !value.cities.length ||
    value.cities.length > 100 ||
    value.points.length > 100
  )
    throw Error('Defina entre 1 e 100 cidades e até 100 pontos.');
  const text = (v: unknown, max: number, required = true) => {
    if (
      typeof v !== 'string' ||
      v.trim().length > max ||
      (required && !v.trim()) ||
      Array.from(v).some((character) => character.charCodeAt(0) < 32)
    )
      throw Error('Verifique os campos de texto.');
    return v.trim();
  };
  const id = (v: unknown) => {
    const s = text(v, 60);
    if (!/^[a-z0-9-]+$/.test(s)) throw Error('Identificador inválido.');
    return s;
  };
  const flag = (v: unknown) => {
    if (typeof v !== 'boolean') throw Error('Estado inválido.');
    return v;
  };
  const fee = (v: unknown) => {
    if (!Number.isSafeInteger(v) || Number(v) < 0 || Number(v) > 10000000)
      throw Error('Tarifa inválida.');
    return Number(v);
  };
  const cities = value.cities.map((c) => ({
    id: id(c.id),
    name: text(c.name, 80),
    active: flag(c.active),
    standardEnabled: flag(c.standardEnabled),
    standardFee: fee(c.standardFee),
    area: text(c.area, 300, c.standardEnabled),
    eta: text(c.eta, 200),
    expressEnabled: flag(c.expressEnabled),
    expressFee: c.expressFee === null ? null : fee(c.expressFee),
    expressNote: text(c.expressNote, 300),
  }));
  if (new Set(cities.map((c) => c.id)).size !== cities.length)
    throw Error('Cidades repetidas.');
  const points = value.points.map((p) => ({
    id: id(p.id),
    cityId: id(p.cityId),
    name: text(p.name, 100),
    address: text(p.address, 500),
    hours: text(p.hours, 200),
    active: flag(p.active),
  }));
  if (
    new Set(points.map((p) => p.id)).size !== points.length ||
    points.some((p) => !cities.some((c) => c.id === p.cityId))
  )
    throw Error('Verifique as cidades e os pontos repetidos.');
  return { cities, points };
}
export function readFulfilment(raw?: string | null): FulfilmentSettings | null {
  try {
    return raw ? validateFulfilment(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
export function fulfilmentQuote(
  settings: FulfilmentSettings | null,
  input: Record<string, unknown>,
) {
  const city = settings?.cities.find((c) => c.id === input.city && c.active);
  if (!city) throw Error('Seleccione uma cidade disponível.');
  if (input.delivery === 'pickup') {
    const point = settings!.points.find(
      (p) => p.id === input.pickupPoint && p.cityId === city.id && p.active,
    );
    if (!point) throw Error('Seleccione um ponto de levantamento disponível.');
    return {
      mode: 'pickup',
      city: city.name,
      cityId: city.id,
      fee: 0,
      point: { ...point },
      area: '',
      eta: 'Aguarde a confirmação de que o produto está pronto.',
    };
  }
  if (input.delivery === 'standard' && city.standardEnabled)
    return {
      mode: 'standard',
      city: city.name,
      cityId: city.id,
      fee: city.standardFee,
      point: null,
      area: city.area,
      eta: city.eta,
    };
  if (
    input.delivery === 'express' &&
    city.expressEnabled &&
    city.expressFee !== null
  )
    return {
      mode: 'express',
      city: city.name,
      cityId: city.id,
      fee: city.expressFee,
      point: null,
      area: city.area,
      eta: city.expressNote,
    };
  throw Error(
    'Serviço sob consulta ou indisponível. Solicite uma proposta antes de pagar.',
  );
}
