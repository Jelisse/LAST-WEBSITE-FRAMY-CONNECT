export const featureCatalog = {
  whatsapp: 'WhatsApp com mensagem personalizada',
  location: 'Morada, direcções e horário',
  showcase: 'Vitrine com até 6 produtos ou serviços',
  enquiries: 'Formulário de contacto e caixa de entrada',
  english: 'Conteúdos do perfil em inglês',
  analytics: 'Estatísticas de visitas e cliques',
  teams: 'Gestão de equipa: até 25 membros e convites',
  domain: 'Domínio próprio, sujeito a configuração técnica',
} as const;
export type FeatureKey = keyof typeof featureCatalog;
export type PlanFeatures = Record<FeatureKey, boolean>;
export type PlanControls = {
  entitlementVersion?: number;
  features?: Partial<PlanFeatures>;
  monthlyEnabled?: boolean;
  annualEnabled?: boolean;
  benefits?: string[];
  sortOrder?: number;
};
export function planFeatures(
  plan: { id: string } & PlanControls,
  historical = false,
): PlanFeatures {
  const advanced = plan.id !== 'personal';
  const base = Object.fromEntries(
    Object.keys(featureCatalog).map((key) => [
      key,
      advanced || (historical && ['whatsapp', 'location'].includes(key)),
    ]),
  ) as PlanFeatures;
  return { ...base, ...plan.features };
}
export function validatePlanControls(
  body: Record<string, unknown>,
): Required<PlanControls> {
  const features = body.features;
  if (
    !features ||
    typeof features !== 'object' ||
    Array.isArray(features) ||
    Object.keys(features).some((k) => !(k in featureCatalog))
  )
    throw Error('Funcionalidades inválidas.');
  for (const k of Object.keys(featureCatalog))
    if (typeof (features as Record<string, unknown>)[k] !== 'boolean')
      throw Error('Seleccione as funcionalidades do plano.');
  if (
    typeof body.monthlyEnabled !== 'boolean' ||
    typeof body.annualEnabled !== 'boolean'
  )
    throw Error('Periodicidade inválida.');
  if (
    body.active &&
    body.id !== 'free-30' &&
    !body.monthlyEnabled &&
    !body.annualEnabled
  )
    throw Error('Active pelo menos uma periodicidade.');
  if (
    !Number.isInteger(body.sortOrder) ||
    Number(body.sortOrder) < 0 ||
    Number(body.sortOrder) > 999
  )
    throw Error('Ordem inválida.');
  if (
    !Array.isArray(body.benefits) ||
    body.benefits.length > 12 ||
    body.benefits.some(
      (v) => typeof v !== 'string' || v.length > 160 || !v.trim(),
    )
  )
    throw Error('Benefícios inválidos (máximo 12).');
  return {
    entitlementVersion: 1,
    features: features as PlanFeatures,
    monthlyEnabled: body.monthlyEnabled,
    annualEnabled: body.annualEnabled,
    sortOrder: Number(body.sortOrder),
    benefits: body.benefits.map((v) => v.trim()),
  };
}
