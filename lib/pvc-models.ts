export const pvcModels = [
  { id: 'tiktok', name: 'TikTok' },
  { id: 'pattern', name: 'Padrão estampado' },
  { id: 'instagram', name: 'Instagram' },
] as const;
export type PvcModel = (typeof pvcModels)[number]['id'];
export function pvcModel(value: unknown) {
  const model = pvcModels.find((model) => model.id === (value ?? 'tiktok'));
  if (!model) throw Error('Escolha um modelo válido de PVC + epóxi.');
  return model;
}
export function pvcPhoto(model: PvcModel, back = false) {
  return `/products/pvc/${model}-${back ? 'back' : 'front'}.png`;
}
