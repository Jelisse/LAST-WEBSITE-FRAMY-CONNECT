export const ANALYTICS_RETENTION_DAYS = 90;
export function analyticsPath(raw: unknown): string | null {
  if (
    typeof raw !== 'string' ||
    raw.length > 180 ||
    raw.includes('?') ||
    raw.includes('#')
  )
    return null;
  if (
    /^\/(?:|produtos|sobre|contacto|ajuda|termos|privacidade|aplicar|exemplo|entrar)$/.test(
      raw,
    )
  )
    return raw;
  if (/^\/(produtos|encomendar)\/[a-z0-9-]{1,60}$/.test(raw)) return raw;
  return null;
}
export function analyticsRange(
  from: string | null,
  to: string | null,
  now = Date.now(),
) {
  const today = new Date(now + 7200000).toISOString().slice(0, 10);
  const date = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
  const endDate = to || today;
  const startDate =
    from || new Date(now + 7200000 - 6 * 86400000).toISOString().slice(0, 10);
  if (!date(startDate) || !date(endDate)) throw Error('Período inválido.');
  const start = Date.parse(startDate + 'T00:00:00+02:00');
  const end = Date.parse(endDate + 'T00:00:00+02:00') + 86400000;
  if (
    start >= end ||
    end - start > 90 * 86400000 ||
    endDate > today ||
    start < now - 91 * 86400000
  )
    throw Error('Escolha até 90 dias de histórico.');
  return {
    start,
    end: Math.min(end, now + 1),
    from: startDate,
    to: endDate,
    previousStart: start - (end - start),
    previousEnd: start,
  };
}
export function cleanReferrer(value: unknown) {
  if (typeof value !== 'string') return 'direct';
  try {
    const u = new URL(value);
    return /^https?:$/.test(u.protocol) ? u.hostname.slice(0, 120) : 'direct';
  } catch {
    return 'direct';
  }
}
export function safeCampaign(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(value)
    ? value
    : '';
}
export function csvCell(value: unknown) {
  const s =
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  return (
    '"' + (/^[=+@\-\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"'
  );
}
