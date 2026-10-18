import type {Metadata} from 'next';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {isRtl, routing} from '@/i18n/routing';
import {IntroSplash} from '@/components/IntroSplash';
import '../globals.css';
import '../intro.css';

export const metadata: Metadata = {
  title: 'درة الهجرة للعقارات | Durrat Al Hijrah',
  description: 'اكتشف العقارات المعروضة للبيع والإيجار في المدينة المنورة | Découvrez des biens immobiliers à Médine',
  robots: {index: false, follow: false} // Démonstration: enlever quand le site est prêt à publier
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

/* Exécuté avant le premier rendu : décide si l'intro doit jouer (évite tout flash du site).
   ?intro=1 force la relecture. Sans JS, l'attribut n'existe pas et l'intro reste masquée. */
const introGate = `(function(){var d=document.documentElement;try{var f=/[?&]intro=1/.test(location.search);d.setAttribute('data-intro',(f||!localStorage.getItem('durrat-intro-v1'))?'playing':'seen')}catch(e){d.setAttribute('data-intro','seen')}})();`;

export default async function LocaleLayout({children, params}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: introGate}} />
      </head>
      <body>
        <NextIntlClientProvider>
          <IntroSplash />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
