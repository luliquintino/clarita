import { getRequestConfig } from 'next-intl/server';

export type Locale = 'pt' | 'es' | 'en';
export const locales: Locale[] = ['pt', 'es', 'en'];
export const defaultLocale: Locale = 'pt';

export default getRequestConfig(async () => {
  return {
    locale: defaultLocale,
    messages: (await import(`../../messages/${defaultLocale}.json`)).default,
  };
});
