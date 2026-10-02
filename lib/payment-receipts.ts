type ReceiptEnv = {
  DB: D1Database;
  RESEND_API_KEY?: string;
  PROFILE_EMAIL_FROM?: string;
};
type Receipt = {
  email: string;
  name: string;
  amount: number;
  kind: string;
  cycle: string;
  method: string;
  reference: string;
  providerReference: string;
  paidAt: string;
  periodStart?: string;
  periodEnd?: string;
  terms?: { name?: string };
  configuration?: {
    fulfilment?: {
      mode: string;
      city: string;
      point?: { name: string; address: string; hours: string } | null;
    };
    format: string;
    card: string;
    keychain: string;
    design: string;
    hardware: number;
    customization: number;
    delivery: number;
  };
};
const money = (amount: number) =>
  new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100) + ' MT';
const date = (value: string) =>
  new Date(value).toLocaleString('pt-MZ', { timeZone: 'Africa/Maputo' });
export function receiptMessage(r: Receipt) {
  const lines = [
    `Olá, ${r.name}.`,
    '',
    'Pagamento feito com sucesso.',
    'Comprovativo de pagamento · Framy Connect',
    '',
    `Referência: ${r.reference}`,
    `Referência PaySuite: ${r.providerReference}`,
    `Data: ${date(r.paidAt)} (Maputo)`,
    `Método: ${{ mpesa: 'M-Pesa', emola: 'e-Mola', credit_card: 'Visa / Mastercard' }[r.method] ?? r.method}`,
  ];
  const c = r.configuration;
  if (r.kind === 'product' && c) {
    lines.push(
      '',
      `Produto: ${{ card: 'Cartão NFC', keychain: 'Porta-chaves NFC', kit: 'Kit: cartão + porta-chaves' }[c.format] ?? c.format}`,
    );
    if (c.format !== 'keychain') lines.push(`Cartão: ${c.card}`);
    if (c.format !== 'card') lines.push(`Porta-chaves: ${c.keychain}`);
    lines.push(
      `Design: ${{ standard: 'FramyConnect', customer: 'O seu design', team: 'Criado pela equipa' }[c.design] ?? c.design}`,
      `Produtos: ${money(c.hardware)}`,
      `Personalização: ${money(c.customization)}`,
      ...(c.fulfilment?.mode === 'pickup'
        ? [
            'Levantamento gratuito',
            `Ponto: ${c.fulfilment.point?.name}`,
            `Endereço: ${c.fulfilment.point?.address}`,
            `Horário: ${c.fulfilment.point?.hours}`,
            'Aguarde o aviso de que o produto está pronto para levantamento.',
          ]
        : [
            `Entrega${c.fulfilment?.mode === 'express' ? ' expressa' : ''}: ${money(c.delivery)}`,
          ]),
    );
  } else {
    lines.push(
      '',
      `Plano: ${r.terms?.name ?? 'Perfil digital'}`,
      `Período: ${r.cycle === 'annual' ? 'Anual' : 'Mensal'}`,
    );
    if (r.periodStart && r.periodEnd)
      lines.push(
        `Validade: ${date(r.periodStart)} a ${date(r.periodEnd)} (Maputo)`,
      );
  }
  lines.push(
    '',
    `Total pago: ${money(r.amount)}`,
    '',
    'Consultar confirmação:',
    `https://framyconnect.co.mz/checkout/retorno?payment=${encodeURIComponent(r.reference)}`,
  );
  if (r.kind === 'product')
    lines.push(
      '',
      'Continue a criar ou configurar o perfil do seu produto:',
      `https://framyconnect.co.mz/perfil?pagamento=${encodeURIComponent(r.reference)}`,
    );
  lines.push(
    '',
    'Este email comprova o pagamento registado e não substitui a factura fiscal, emitida separadamente no sistema de facturação.',
    'Apoio: info@framyconnect.co.mz',
  );
  return lines.join('\n');
}

// Durable outbox + atomic claim + provider idempotency; never couple payment success to email availability.
export async function paymentReceipts(
  env: ReceiptEnv,
  paymentId?: string,
  now = Date.now(),
) {
  if (!env.RESEND_API_KEY || !env.PROFILE_EMAIL_FROM) return;
  // Stop ambiguous retries before the provider's 24-hour deduplication window expires.
  await env.DB.prepare(
    "UPDATE payment_email_receipts SET status='review' WHERE status='pending' AND first_attempt_at IS NOT NULL AND first_attempt_at<=?",
  )
    .bind(now - 23 * 3600000)
    .run();
  const rows = await env.DB.prepare(
    "SELECT payment_id,payload_json FROM payment_email_receipts WHERE status='pending' AND (attempted_at IS NULL OR attempted_at<?) AND (? IS NULL OR payment_id=?) ORDER BY created_at LIMIT 20",
  )
    .bind(now - 15 * 60000, paymentId ?? null, paymentId ?? null)
    .all<{ payment_id: string; payload_json: string }>();
  for (const row of rows.results) {
    const claim = await env.DB.prepare(
      "UPDATE payment_email_receipts SET first_attempt_at=COALESCE(first_attempt_at,?),attempted_at=? WHERE payment_id=? AND status='pending' AND (attempted_at IS NULL OR attempted_at<?)",
    )
      .bind(now, now, row.payment_id, now - 15 * 60000)
      .run();
    if (!claim.meta.changes) continue;
    try {
      const receipt = JSON.parse(row.payload_json) as Receipt;
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'payment-receipt/' + row.payment_id,
        },
        body: JSON.stringify({
          from: env.PROFILE_EMAIL_FROM,
          to: [receipt.email],
          subject: 'Pagamento feito com sucesso · Framy Connect',
          text: receiptMessage(receipt),
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const result = (await response.json()) as { id?: string };
        await env.DB.prepare(
          "UPDATE payment_email_receipts SET status='sent',sent_at=?,provider_message_id=? WHERE payment_id=?",
        )
          .bind(now, result.id ?? null, row.payment_id)
          .run();
      }
    } catch {
      /* Cron retries the same immutable payload within the deduplication window. */
    }
  }
}
