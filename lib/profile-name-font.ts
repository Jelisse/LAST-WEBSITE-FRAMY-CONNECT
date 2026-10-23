export const nameFonts = [
  { value: 'classic', label: 'Clássico' },
  { value: 'modern', label: 'Moderno' },
  { value: 'elegant', label: 'Elegante' },
  { value: 'bold', label: 'Marcante' },
] as const;
export type NameFont = (typeof nameFonts)[number]['value'];
export function nameFont(value: unknown): NameFont {
  if (value === undefined || value === null) return 'classic';
  if (!nameFonts.some((font) => font.value === value))
    throw Error('Tipo de letra do nome inválido.');
  return value as NameFont;
}
export function nameFontStyle(value: unknown) {
  switch (nameFont(value)) {
    case 'modern':
      return {
        fontFamily: 'var(--font-poppins), Arial, sans-serif',
        fontWeight: 500,
        fontStyle: 'normal',
      } as const;
    case 'elegant':
      return {
        fontFamily: 'Georgia, "Noto Serif TC", "Times New Roman", serif',
        fontWeight: 400,
        fontStyle: 'normal',
      } as const;
    case 'bold':
      return {
        fontFamily: 'var(--font-poppins), Arial, sans-serif',
        fontWeight: 700,
        fontStyle: 'normal',
      } as const;
    default:
      return {
        fontFamily: 'Allura, "Noto Serif TC", cursive',
        fontWeight: 400,
        fontStyle: 'normal',
      } as const;
  }
}
