export const purchaseStages = [
  'Escolha o seu produto NFC',
  'Personalize o seu produto',
  'Escolha como receber',
  'Reveja e confirme',
] as const;
export function purchaseConfigurationIssue(
  input: {
    materialReady: boolean;
    artworkMissing: boolean;
    instructionsMissing: boolean;
    uploadBusy: boolean;
  },
  stage: 0 | 1,
) {
  if (!input.materialReady)
    return 'O preço deste produto precisa de confirmação. Escolha outro material ou contacte a Framy Connect.';
  if (stage === 1) {
    if (input.uploadBusy) return 'Aguarde o fim do carregamento do design.';
    if (input.artworkMissing)
      return 'Carregue o design de cada produto personalizado antes de continuar.';
    if (input.instructionsMissing)
      return 'Escreva as instruções para a equipa antes de continuar.';
  }
  return null;
}
