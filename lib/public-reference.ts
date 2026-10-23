/** Public identifiers never replace authentication or payment-provider references. */
export function normalizeReference(value: string): string | null {
  const compact = value.trim().replace(/[\s-]/g, '').toUpperCase();
  if (/^[A-F0-9]{32}$/.test(compact)) return compact.toLowerCase();
  const match = /^FC(OR|PY)(\d{2})(\d{8})$/.exec(compact);
  if (!match) return null;
  const digits = (match[1] === 'OR' ? '01' : '02') + match[2] + match[3];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  if (sum % 10) return null;
  return `FC-${match[1]}-${match[2]}-${match[3].slice(0, 4)}-${match[3].slice(4)}`;
}
