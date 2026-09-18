import { cookies } from 'next/headers';
import { translator, validLocale } from './i18n';
export async function getLocale() {
  return validLocale((await cookies()).get('framy-language')?.value);
}
export async function getTranslations() {
  return translator(await getLocale());
}
