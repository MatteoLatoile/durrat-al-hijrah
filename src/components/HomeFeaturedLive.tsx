'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {
  Search,
  MapPin,
  BedDouble,
  Bath,
  ArrowUpLeft,
  Maximize2
} from 'lucide-react';

import type {Filters} from './SearchPanel';

import {
  fetchPublicProperties,
  translate,
  type PublicProperty
} from '@/lib/supabase/public-properties';

export function HomeFeaturedLive({
  applied
}: {
  applied: Filters;
}) {
  const locale = useLocale();
  const f = useTranslations('Featured');
  const s = useTranslations('Search');

  const [all,setAll] = useState<PublicProperty[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  useEffect(() => {
    let active = true;

    fetchPublicProperties()
      .then(properties => {
        if(active) setAll(properties);
      })
      .catch(cause => {
        if(active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load properties'
          );
        }
      })
      .finally(() => {
        if(active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return all.filter(item => {

      if(
        applied.transaction !== 'all' &&
        applied.transaction !== item.transaction
      ) return false;

      if(
        applied.type !== 'all' &&
        applied.type !== item.type
      ) return false;

      if(
        applied.district !== 'all' &&
        applied.district !== item.district?.id
      ) return false;

      if(
        applied.minPrice &&
        item.price < Number(applied.minPrice)
      ) return false;

      if(
        applied.maxPrice &&
        item.price > Number(applied.maxPrice)
      ) return false;

      if(
        applied.bedrooms &&
        (item.beds ?? 0) < Number(applied.bedrooms)
      ) return false;

      if(
        applied.minArea &&
        (item.area ?? 0) < Number(applied.minArea)
      ) return false;

      return true;
    });
  }, [all,applied]);

  return (
    <section
      className="featured-section section-pad"
      id="properties"
    >
      <div className="container">

        <div className="section-header">
          <div>
            <span className="section-eyebrow">
              <span/>
              {f('eyebrow')}
            </span>

            <h2 className="section-title">
              {f('title')}
            </h2>

            <p className="section-description">
              {f('description')}
            </p>
          </div>

          <div className="section-side-label">
            DURRAT / COLLECTION <span>001</span>
          </div>
        </div>

        <div className="result-meta">
          <span>
            <Search size={15}/>
            {s('results')}: <b>{filtered.length}</b>
          </span>

          <Link
            href={`/${locale}/properties`}
            style={{
              color:'#a8895d',
              fontWeight:700
            }}
          >
            {f('view')}
            {' '}
            <ArrowUpLeft
              size={14}
              style={{display:'inline'}}
            />
          </Link>
        </div>

        {loading ? (
          <div className="empty-results">
            <p>...</p>
          </div>

        ) : error ? (
          <div className="empty-results" role="alert">
            {error}
          </div>

        ) : filtered.length === 0 ? (
          <div className="empty-results">
            <Search size={34}/>
            <h3>{f('empty')}</h3>
          </div>

        ) : (
          <div className="property-grid">

            {filtered.slice(0,6).map(item => {
              const title = translate(item.title,locale);

              return (
                <article
                  className="property-card"
                  key={item.id}
                >

                  <Link
                    href={`/${locale}/properties/${item.id}`}
                    className="property-visual"
                  >
                    {item.images[0] ? (
                      <img
                        src={item.images[0]}
                        alt={title}
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="image-sketch"
                        aria-hidden="true"
                      >
                        <i/><i/><i/><i/><i/>
                      </span>
                    )}

                    <span className="property-tag">
                      {item.transaction === 'rent'
                        ? s('rent')
                        : s('buy')}
                    </span>

                    <span className="image-expand">
                      <ArrowUpLeft size={18}/>
                    </span>
                  </Link>

                  <div className="property-body">

                    <div className="property-location">
                      <MapPin size={14}/>
                      {translate(item.district?.names,locale)}
                    </div>

                    <h3>
                      <Link
                        href={`/${locale}/properties/${item.id}`}
                      >
                        {title}
                      </Link>
                    </h3>

                    <div className="property-specs">
                      {item.area != null && (
                        <span>
                          <Maximize2 size={15}/>
                          {item.area} {f('area')}
                        </span>
                      )}

                      {item.beds != null && item.beds > 0 && (
                        <span>
                          <BedDouble size={16}/>
                          {item.beds} {f('rooms')}
                        </span>
                      )}

                      {item.baths != null && item.baths > 0 && (
                        <span>
                          <Bath size={16}/>
                          {item.baths} {f('baths')}
                        </span>
                      )}
                    </div>

                    <div className="property-bottom">
                      <div className="price">
                        <b>
                          <span dir="ltr">
                            {new Intl.NumberFormat(locale).format(item.price)}
                          </span>

                          {' '}

                          <span
                            className="dh-riyal-icon"
                            role="img"
                            aria-label="ريال سعودي"
                          />
                        </b>
                      </div>

                      <Link
                        href={`/${locale}/properties/${item.id}`}
                        className="open-property"
                        aria-label={f('view')}
                      >
                        <ArrowUpLeft size={20}/>
                      </Link>
                    </div>

                  </div>
                </article>
              );
            })}

          </div>
        )}

      </div>
    </section>
  );
}