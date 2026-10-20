export type ReportMetric = 'opens' | 'clicks' | 'contacts';
export type ReportCounts = { opens: number; clicks: number; contacts: number };
export type TeamReport = ReportCounts & { team: string; contributors: number };
export type DailyReport = ReportCounts & { day: number };
export function corporateReportWindow(days: number, now: number) {
  if (![7, 30, 90].includes(days) || !Number.isSafeInteger(now) || now < 0)
    throw Error('Período inválido.');
  const today = Math.floor((now + 7200000) / 86400000) * 86400000 - 7200000;
  return { today, since: today - (days - 1) * 86400000, until: now };
}
export function fillCorporateReportDays(
  rows: DailyReport[],
  days: number,
  now: number,
) {
  const { since } = corporateReportWindow(days, now);
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return Array.from(
    { length: days },
    (_, i) =>
      byDay.get(since + i * 86400000) ?? {
        day: since + i * 86400000,
        opens: 0,
        clicks: 0,
        contacts: 0,
      },
  );
}
export function teamReportValue(
  row: TeamReport,
  metric: ReportMetric,
  unit: 'total' | 'participant',
) {
  return unit === 'participant'
    ? row.contributors
      ? row[metric] / row.contributors
      : 0
    : row[metric];
}
