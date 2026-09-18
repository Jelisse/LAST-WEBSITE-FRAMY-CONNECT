// Keep customer data, SQL text and secrets out of public responses and logs.
export function serviceFailure(error: unknown, area: string, message: string) {
  const reference = crypto.randomUUID();
  const detail = error instanceof Error ? error.message : '';
  const category = /no such table|no such column/i.test(detail) ? 'schema-missing'
    : /D1|SQLITE|database|Armazenamento/i.test(detail) ? 'database'
    : /JSON|Unexpected token/i.test(detail) ? 'invalid-record'
    : 'service';
  console.error(JSON.stringify({ event:'service-unavailable', area, reference, category }));
  return Response.json({ error: `${message} Referência: ${reference}`, reference }, {
    status:503, headers:{'Cache-Control':'no-store'},
  });
}
