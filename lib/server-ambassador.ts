import { database } from './server-db';
import { normalizeAmbassadorCode, referralAmounts } from './ambassador';
export async function referralQuote(
  code: unknown,
  hardware: number,
  buyerId?: string,
  buyerEmail?: string,
) {
  const normalized = normalizeAmbassadorCode(code ?? '');
  if (!normalized) return null;
  const row = await database()
    .prepare(
      'SELECT b.account_id,b.code,b.commission_bps,b.version,a.email FROM ambassadors b JOIN auth_accounts a ON a.id=b.account_id AND a.active=1 WHERE b.code=? AND b.active=1',
    )
    .bind(normalized)
    .first<{
      account_id: string;
      email: string;
      code: string;
      commission_bps: number;
      version: number;
    }>();
  if (!row) throw Error('Código de embaixador inválido ou inactivo.');
  if (
    row.account_id === buyerId ||
    (buyerEmail && row.email.toLowerCase() === buyerEmail.toLowerCase())
  )
    throw Error('Não pode usar o seu próprio código.');
  return {
    ...row,
    base: hardware,
    ...referralAmounts(hardware, row.commission_bps),
  };
}
