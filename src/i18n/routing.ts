import {defineRouting} from 'next-intl/routing';

export const locales = ['ar', 'fr', 'en', 'ru', 'ur', 'id'] as const;
export type Locale = (typeof locales)[number];
export const isRtl = (locale: string) => locale === 'ar' || locale === 'ur';

export const routing = defineRouting({
  locales,
  defaultLocale: 'ar',
  localePrefix: 'always'
});
