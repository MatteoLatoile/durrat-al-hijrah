'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useLocale} from 'next-intl';

import {
  fetchPublicProperties,
  translate,
  type PublicProperty
} from '@/lib/supabase/public-properties';

import './supabase-public.css';

export function SupabasePublicDetail({id}: {id:string}) {
  const locale = useLocale();

  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    let active = true;

    fetchPublicProperties(id)
      .then(rows => {
        if (active) setProperty(rows[0] || null);
      })
      .catch(cause => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : 'Error'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="dh-live-page dh-live-detail">

      <nav className="dh-live-nav">
        <Link href={`/${locale}`} className="dh-live-brand">
          درة الهجرة <span>للعقارات</span>
        </Link>

        <Link href={`/${locale}/properties-live`}>
          {locale === 'ar' ? 'جميع العقارات' : 'All properties'}
        </Link>
      </nav>

      <div className="dh-live-container">

        {loading ? (
          <div className="dh-live-feedback">
            {locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
          </div>
        ) : error ? (
          <div className="dh-live-feedback error">{error}</div>
        ) : !property ? (
          <div className="dh-live-feedback">
            {locale === 'ar'
              ? 'العقار غير متاح'
              : 'Property unavailable'}
          </div>
        ) : (
          <>
            <header className="dh-live-heading">
              <span>{property.reference}</span>

              <h1>{translate(property.title, locale)}</h1>

              <p>{translate(property.district?.names, locale)}</p>
            </header>

            <div className="dh-live-detail-layout">

              <section className="dh-live-detail-main">

                <div className="dh-live-detail-photo">
                  {property.images[photo] ? (
                    <img
                      src={property.images[photo]}
                      alt={translate(property.title, locale)}
                    />
                  ) : (
                    <div className="dh-live-placeholder">
                      {locale === 'ar' ? 'لا توجد صور' : 'No photos'}
                    </div>
                  )}
                </div>

                {property.images.length > 1 && (
                  <div className="dh-live-thumbnails">
                    {property.images.map((image, index) => (
                      <button
                        key={image}
                        type="button"
                        className={photo === index ? 'active' : ''}
                        onClick={() => setPhoto(index)}
                        aria-label={`Photo ${index + 1}`}
                      >
                        <img src={image} alt=""/>
                      </button>
                    ))}
                  </div>
                )}

                <div className="dh-live-description">
                  <h2>
                    {locale === 'ar' ? 'وصف العقار' : 'Description'}
                  </h2>

                  <p>
                    {translate(property.description, locale)}
                  </p>
                </div>

              </section>

              <aside className="dh-live-detail-aside">

                <span>{property.reference}</span>

                <strong className="dh-live-price">
                  {new Intl.NumberFormat(locale).format(property.price)}
                  {' '}⃁
                </strong>

                <div className="dh-live-specs">
                  <p>
                    {locale === 'ar' ? 'المساحة' : 'Area'}:
                    {' '}{property.area ?? '—'} m²
                  </p>

                  <p>
                    {locale === 'ar' ? 'الغرف' : 'Bedrooms'}:
                    {' '}{property.beds ?? '—'}
                  </p>

                  <p>
                    {locale === 'ar' ? 'دورات المياه' : 'Bathrooms'}:
                    {' '}{property.baths ?? '—'}
                  </p>
                </div>

                <Link
                  href={`/${locale}/contact`}
                  className="dh-live-contact-link"
                >
                  {locale === 'ar'
                    ? 'التواصل مع المكتب'
                    : 'Contact the agency'}
                </Link>

              </aside>

            </div>
          </>
        )}

      </div>
    </main>
  );
}