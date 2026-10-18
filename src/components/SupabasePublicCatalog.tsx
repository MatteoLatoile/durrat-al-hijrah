'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useLocale} from 'next-intl';
import {SupabasePublicMap} from './SupabasePublicMap';
import {
  fetchPublicProperties,
  translate,
  type PublicProperty
} from '@/lib/supabase/public-properties';

import './supabase-public.css';

const words: Record<string, Record<string, string>> = {
  ar: {
    title:'اكتشف عقاراتنا',
    subtitle:'استكشف العقارات المتاحة في المملكة العربية السعودية',
    map:'استكشف العقارات حسب الحي',
    filters:'تصفية النتائج',
    all:'الكل',
    sale:'بيع',
    rent:'إيجار',
    transaction:'نوع العملية',
    type:'نوع العقار',
    district:'الحي',
    min:'السعر الأدنى',
    max:'السعر الأعلى',
    search:'بحث',
    results:'العقارات المتاحة',
    empty:'لا توجد عقارات منشورة حالياً',
    loading:'جارٍ تحميل العقارات...',
    details:'عرض التفاصيل',
    area:'المساحة',
    error:'تعذر تحميل العقارات',
    reset:'إعادة ضبط الفلاتر',
    home:'الرئيسية'
  },
  fr: {
    title:'Découvrez nos biens',
    subtitle:'Explorez les biens disponibles en Arabie saoudite',
    map:'Explorer par quartier',
    filters:'Filtres',
    all:'Tous',
    sale:'Vente',
    rent:'Location',
    transaction:'Transaction',
    type:'Type de bien',
    district:'Quartier',
    min:'Prix minimum',
    max:'Prix maximum',
    search:'Rechercher',
    results:'Biens disponibles',
    empty:'Aucun bien publié pour le moment',
    loading:'Chargement des biens...',
    details:'Voir le bien',
    area:'Superficie',
    error:'Impossible de charger les biens',
    reset:'Réinitialiser',
    home:'Accueil'
  },
  en: {
    title:'Explore our properties',
    subtitle:'Discover properties across Saudi Arabia',
    map:'Explore by neighborhood',
    filters:'Filters',
    all:'All',
    sale:'Sale',
    rent:'Rent',
    transaction:'Transaction',
    type:'Property type',
    district:'Neighborhood',
    min:'Minimum price',
    max:'Maximum price',
    search:'Search',
    results:'Available properties',
    empty:'No published properties yet',
    loading:'Loading properties...',
    details:'View property',
    area:'Area',
    error:'Unable to load properties',
    reset:'Reset filters',
    home:'Home'
  }
};

export function SupabasePublicCatalog() {
  const locale = useLocale();
  const t = words[locale] || words.en;

  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [transaction, setTransaction] = useState('');
  const [kind, setKind] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    let active = true;

    fetchPublicProperties()
      .then(rows => {
        if (active) setProperties(rows);
      })
      .catch(cause => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : t.error
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t.error]);

  const districts = useMemo(() => {
    const unique = new Map<string, PublicProperty['district']>();

    for (const item of properties) {
      if (item.district) {
        unique.set(item.district.id, item.district);
      }
    }

    return [...unique.values()].filter(
      (value): value is NonNullable<typeof value> => value !== null
    );
  }, [properties]);

  const types = [...new Set(properties.map(item => item.type))];

  const results = useMemo(() => properties.filter(property => {
    if (transaction && property.transaction !== transaction) return false;
    if (kind && property.type !== kind) return false;
    if (districtId && property.district?.id !== districtId) return false;

    if (minPrice && property.price < Number(minPrice)) return false;
    if (maxPrice && property.price > Number(maxPrice)) return false;

    return true;
  }), [properties, transaction, kind, districtId, minPrice, maxPrice]);

  function reset() {
    setTransaction('');
    setKind('');
    setDistrictId('');
    setMinPrice('');
    setMaxPrice('');
  }

  return (
    <main className="dh-live-page">

      <nav className="dh-live-nav">
        <Link href={`/${locale}`} className="dh-live-brand">
          درة الهجرة <span>للعقارات</span>
        </Link>

        <Link href={`/${locale}`}>{t.home}</Link>
      </nav>

      <div className="dh-live-container">

        <header className="dh-live-heading">
          <span>DURRAT AL HIJRAH / REAL ESTATE</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </header>

        <div className="dh-live-layout">

          <aside className="dh-live-sidebar">
            <h2>{t.filters}</h2>

            <label>
              {t.transaction}
              <select
                value={transaction}
                onChange={event => setTransaction(event.target.value)}
              >
                <option value="">{t.all}</option>
                <option value="sale">{t.sale}</option>
                <option value="rent">{t.rent}</option>
              </select>
            </label>

            <label>
              {t.type}
              <select
                value={kind}
                onChange={event => setKind(event.target.value)}
              >
                <option value="">{t.all}</option>

                {types.map(type => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t.district}
              <select
                value={districtId}
                onChange={event => setDistrictId(event.target.value)}
              >
                <option value="">{t.all}</option>

                {districts.map(district => (
                  <option key={district.id} value={district.id}>
                    {translate(district.names, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t.min}
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={event => setMinPrice(event.target.value)}
              />
            </label>

            <label>
              {t.max}
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={event => setMaxPrice(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="dh-live-reset"
              onClick={reset}
            >
              {t.reset}
            </button>

          </aside>

          <section className="dh-live-main">

            <div className="dh-live-panel-heading">
              <h2>{t.map}</h2>

              <span>
                {results.length} {t.results}
              </span>
            </div>

            <SupabasePublicMap
              properties={results}
              locale={locale}
            />

            <div className="dh-live-panel-heading dh-live-list-heading">
              <h2>{t.results}</h2>
              <span>{results.length}</span>
            </div>

            {loading ? (
              <div className="dh-live-feedback">{t.loading}</div>
            ) : error ? (
              <div className="dh-live-feedback error">
                {t.error}: {error}
              </div>
            ) : results.length === 0 ? (
              <div className="dh-live-feedback">{t.empty}</div>
            ) : (
              <div className="dh-live-grid">
                {results.map(property => (
                  <Link
                    href={`/${locale}/properties/${property.id}`}
                    className="dh-live-card"
                    key={property.id}
                  >
                    {property.images[0] ? (
                      <img
                        src={property.images[0]}
                        alt={translate(property.title, locale)}
                        loading="lazy"
                      />
                    ) : (
                      <div className="dh-live-placeholder">
                        {t.title}
                      </div>
                    )}

                    <div className="dh-live-card-body">
                      <span className="dh-live-card-district">
                        {translate(property.district?.names, locale)}
                      </span>

                      <h3>{translate(property.title, locale)}</h3>

                      <strong className="dh-live-price">
                        {new Intl.NumberFormat(locale).format(property.price)}
                        {' '}⃁
                      </strong>

                      <p>
                        {property.area ? `${property.area} m²` : ''}
                        {property.beds !== null
                          ? ` · ${property.beds} 🛏`
                          : ''}
                        {property.baths !== null
                          ? ` · ${property.baths} 🚿`
                          : ''}
                      </p>

                      <span className="dh-live-details-link">
                        {t.details} ←
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

          </section>
        </div>
      </div>
    </main>
  );
}