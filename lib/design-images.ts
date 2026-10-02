export const designImageDefaults = [
  {
    id: 'standard',
    image: '/design/standard.svg',
    alt: 'Exemplo do design FramyConnect',
    version: 0,
  },
  {
    id: 'customer',
    image: '/design/customer.svg',
    alt: 'Envio do seu design em PDF vectorial',
    version: 0,
  },
  {
    id: 'team',
    image: '/design/team.svg',
    alt: 'Criação de um design pela equipa',
    version: 0,
  },
];
export type DesignImage = (typeof designImageDefaults)[number];
export function validateDesignImage(
  input: Record<string, unknown>,
): DesignImage {
  const id = designImageDefaults.find((row) => row.id === input.id)?.id;
  if (!id || !Number.isInteger(input.version) || Number(input.version) < 0)
    throw Error('Opção ou versão inválida.');
  if (
    typeof input.image !== 'string' ||
    !(
      input.image === `/design/${id}.svg` ||
      /^\/api\/product-image\/[a-f0-9-]{36}$/.test(input.image)
    )
  )
    throw Error('Carregue uma imagem através do gestor.');
  if (
    typeof input.alt !== 'string' ||
    !input.alt.trim() ||
    input.alt.length > 180
  )
    throw Error('Indique uma descrição de até 180 caracteres.');
  return {
    id,
    image: input.image,
    alt: input.alt.trim(),
    version: Number(input.version),
  };
}
