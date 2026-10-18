'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {ArrowUpLeft, ChevronDown, Menu, X} from 'lucide-react';

const languages = [
  {
    code: 'ar',
    label: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
    flag: 'ar'
  },
  {
    code: 'fr',
    label: 'Fran\u00e7ais',
    flag: 'fr'
  },
  {
    code: 'en',
    label: 'English',
    flag: 'en'
  },
  {
    code: 'ru',
    label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',
    flag: 'ru'
  },
  {
    code: 'ur',
    label: '\u0627\u0631\u062f\u0648',
    flag: 'pk'
  },
  {
    code: 'id',
    label: 'Bahasa Indonesia',
    flag: 'id'
  }
];

const brandName = '\u062f\u0631\u0629 \u0627\u0644\u0647\u062c\u0631\u0629';
const brandSubtitle = '\u0644\u0644\u0639\u0642\u0627\u0631\u0627\u062a';

export function Header() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('Nav');

  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const popup = useRef<HTMLDivElement>(null);

  const activeLang =
    languages.find((language) => language.code === locale)
    || languages[0];

  const localizedPath = (code: string) => {
    const rest = pathname.replace(
      /^\/(ar|fr|en|ru|ur|id)(?=\/|$)/,
      ''
    );

    return `/${code}${rest}`;
  };

  useEffect(() => {
    const onOutsideClick = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node)) {
        setLanguagesOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLanguagesOpen(false);
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', onOutsideClick);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('pointerdown', onOutsideClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const navigation = [
    {
      href: `/${locale}/properties`,
      label: t('properties')
    },
    {
      href: `/${locale}/about`,
      label: t('services')
    },
    {
      href: `/${locale}/about`,
      label: t('about')
    }
  ];

  return (
    <header className="site-header">
      <div className="container header-inner">

        <Link
          href={`/${locale}`}
          className="brand"
          aria-label="Durrat Al Hijrah"
        >
          <Image
            src="/brand-gold.png"
            alt=""
            width={52}
            height={52}
            priority
            className="brand-symbol"
          />

          <span className="brand-name" dir="rtl">
            {brandName}
            <small>{brandSubtitle}</small>
          </span>
        </Link>

        <nav
          aria-label={t('menu')}
          className="desktop-nav"
        >
          {navigation.map((item, index) => (
            <Link
              key={index}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">

          <div className="language-picker" ref={popup}>

            <button
              type="button"
              className="language-button"
              aria-label={t('language')}
              aria-haspopup="menu"
              aria-expanded={languagesOpen}
              onClick={() => setLanguagesOpen(!languagesOpen)}
            >
              <Image
                src={`/flags/${activeLang.flag}.svg`}
                className="flag-img"
                width={24}
                height={16}
                alt=""
              />

              <span>{activeLang.label}</span>

              <ChevronDown
                size={14}
                className={
                  languagesOpen
                    ? 'chevron flipped'
                    : 'chevron'
                }
              />
            </button>

            {languagesOpen && (
              <div
                className="language-menu"
                role="menu"
                aria-label={t('language')}
              >

                {languages.map((language) => (
                  <Link
                    key={language.code}
                    href={localizedPath(language.code)}
                    role="menuitem"
                    aria-current={
                      locale === language.code
                        ? 'page'
                        : undefined
                    }
                    className={
                      locale === language.code
                        ? 'language-option selected'
                        : 'language-option'
                    }
                    onClick={() => setLanguagesOpen(false)}
                  >
                    <Image
                      src={`/flags/${language.flag}.svg`}
                      className="flag-img"
                      width={24}
                      height={16}
                      alt=""
                    />

                    <span
                      dir={
                        language.code === 'ar' ||
                        language.code === 'ur'
                          ? 'rtl'
                          : 'ltr'
                      }
                    >
                      {language.label}
                    </span>

                    {locale === language.code && (
                      <span className="lang-dot" />
                    )}
                  </Link>
                ))}

              </div>
            )}
          </div>

          <Link
            href={`/${locale}/contact`}
            className="header-contact"
          >
            <span>{t('contact')}</span>
            <ArrowUpLeft size={15} aria-hidden="true" />
          </Link>

          <button
            className="mobile-toggle"
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t('menu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label={t('menu')}
        >
          {navigation.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <Link
            href={`/${locale}/contact`}
            onClick={() => setMenuOpen(false)}
          >
            {t('contact')}
          </Link>
        </nav>
      )}

    </header>
  );
}
