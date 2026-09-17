import type { Product } from './catalog';

export function validateProduct(input: unknown, existing: Product): Product {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Produto inválido.');
  const data = input as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const value = data[key];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
      throw new Error(`Campo ${key} inválido.`);
    return value.trim();
  };
  const amount = data.amount,
    cost = data.cost;
  if (
    !Number.isSafeInteger(amount) ||
    Number(amount) < 0 ||
    Number(amount) > 100000000 ||
    !Number.isSafeInteger(cost) ||
    Number(cost) < 0 ||
    Number(cost) > 100000000
  )
    throw new Error('Indique valores monetários válidos.');
  if (typeof data.available !== 'boolean')
    throw new Error('Disponibilidade inválida.');
  if (data.available && Number(amount) === 0)
    throw new Error(
      'Defina um preço superior a zero antes de disponibilizar o produto.',
    );
  if (!Number.isSafeInteger(data.version) || Number(data.version) < 0)
    throw new Error('Versão inválida.');
  const imageUrl = text('imageUrl', 200);
  if (
    !/^\/products\/[a-z0-9-]+\.png$/.test(imageUrl) &&
    !/^\/api\/product-image\/[0-9a-f-]{36}$/.test(imageUrl)
  )
    throw new Error(
      'Seleccione uma imagem do catálogo ou carregue uma fotografia.',
    );
  const category = text('category', 50);
  if (!['Cartões', 'Acessórios', 'Para organizações'].includes(category))
    throw new Error('Categoria inválida.');
  if (data.published !== undefined && typeof data.published !== 'boolean')
    throw Error('Publicação inválida.');
  const images = data.images ?? [imageUrl];
  if (
    !Array.isArray(images) ||
    images.length < 1 ||
    images.length > 8 ||
    images.some(
      (v) =>
        typeof v !== 'string' ||
        !/^\/(?:products\/[a-z0-9-]+\.png|api\/product-image\/[0-9a-f-]{36})$/.test(
          v,
        ),
    ) ||
    new Set(images).size !== images.length
  )
    throw Error('Escolha entre 1 e 8 fotografias diferentes.');
  if (!images.includes(imageUrl))
    throw Error('A fotografia principal deve pertencer à galeria.');
  return {
    ...existing,
    name: text('name', 90),
    tagline: text('tagline', 160),
    description: text('description', 2000),
    audience: text('audience', 60),
    category,
    amount: Number(amount),
    cost: Number(cost),
    available: data.available,
    imageUrl,
    images,
    published: data.published !== false,
    availabilityConfigured: true,
    version: Number(data.version),
  };
}
