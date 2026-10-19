export function normalizeAmbassadorCode(value: unknown): string {
  if (typeof value !== 'string' || value.length > 100)
    throw Error('Código de embaixador inválido.');
  return value.normalize('NFKD').replace(/\p{M}/gu, '').trim().toUpperCase();
}
export function ambassadorPrefix(name: string): string {
  return (
    Array.from(
      name
        .trim()
        .split(/\s+/)[0]
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .replace(/[^\p{L}\p{N}]/gu, '')
        .toUpperCase(),
    )
      .slice(0, 24)
      .join('') || 'FRAMY'
  );
}
export function referralAmounts(hardware: number, bps: number) {
  if (
    !Number.isSafeInteger(hardware) ||
    hardware <= 0 ||
    hardware > 1000000000 ||
    !Number.isInteger(bps) ||
    bps < 1000 ||
    bps > 1500
  )
    throw Error('Comissão inválida.');
  return {
    discount: Math.round(hardware / 10),
    commission: Math.round((hardware * bps) / 10000),
  };
}
