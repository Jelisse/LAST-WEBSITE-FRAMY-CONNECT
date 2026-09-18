export function orderProgress(
  order: { createdAt: string; status: string },
  now: number,
  limitHours = 48,
) {
  const submitted = Date.parse(order.createdAt);
  if (!Number.isFinite(submitted))
    return { label: 'Data indisponível', tone: 'neutral', elapsed: '' };
  const minutes = Math.max(0, Math.floor((now - submitted) / 60000));
  const elapsed =
    minutes < 60
      ? `${minutes} min`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} h ${minutes % 60} min`
        : `${Math.floor(minutes / 1440)} d ${Math.floor((minutes % 1440) / 60)} h`;
  if (order.status === 'DELIVERED')
    return { label: 'Concluído', tone: 'neutral', elapsed: '' };
  if (order.status === 'CANCELLED')
    return { label: 'Cancelado', tone: 'neutral', elapsed: '' };
  const late = now - submitted > limitHours * 3600000;
  return {
    label: late ? 'Em atraso' : 'Normal',
    tone: late ? 'late' : 'normal',
    elapsed,
  };
}
export const submissionTime = (value: string, locale = 'pt-MZ') =>
  new Date(value).toLocaleString(locale, {
    timeZone: 'Africa/Maputo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
