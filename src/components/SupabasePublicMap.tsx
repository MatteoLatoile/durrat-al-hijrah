'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import type {Map as LeafletMap, LayerGroup} from 'leaflet';
import type {PublicProperty} from '@/lib/supabase/public-properties';
import {translate} from '@/lib/supabase/public-properties';

import 'leaflet/dist/leaflet.css';

type Props = {
  properties: PublicProperty[];
  locale: string;
};

type Group = {
  id: string;
  name: string;
  center: [number, number];
  properties: PublicProperty[];
};

const SAUDI_BOUNDS: [[number, number], [number, number]] = [
  [16.2, 34.5],
  [32.5, 55.8]
];

export function SupabasePublicMap({properties, locale}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);

  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const rtl = locale === 'ar' || locale === 'ur';

  const groups = useMemo(() => {
    const grouped = new Map<string, Group>();

    for (const property of properties) {
      const district = property.district;

      if (
        !district ||
        typeof district.latitude !== 'number' ||
        typeof district.longitude !== 'number'
      ) {
        continue;
      }

      if (!grouped.has(district.id)) {
        grouped.set(district.id, {
          id: district.id,
          name: translate(district.names, locale),
          center: [district.latitude, district.longitude],
          properties: []
        });
      }

      grouped.get(district.id)!.properties.push(property);
    }

    return Array.from(grouped.values());
  }, [properties, locale]);

  const selected = groups.find(group => group.id === selectedId);
  const current = selected?.properties[index % selected.properties.length];

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const L = await import('leaflet');

      if (cancelled || !element.current) return;

      const instance = L.map(element.current, {
        scrollWheelZoom: true,
        zoomControl: true
      });

      instance.fitBounds(SAUDI_BOUNDS, {
        padding: [20, 20]
      });

      L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }
      ).addTo(instance);

      map.current = instance;
      leaflet.current = L;
      layer.current = L.layerGroup().addTo(instance);

      setReady(true);

      setTimeout(() => {
        if (!cancelled) instance.invalidateSize();
      }, 200);
    }

    initialize().catch(console.error);

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      leaflet.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !leaflet.current || !layer.current) return;

    const L = leaflet.current;
    const currentLayer = layer.current;

    currentLayer.clearLayers();

    for (const group of groups) {
      const content = document.createElement('div');
      content.className = 'dh-live-pin-content';

      const name = document.createElement('strong');
      name.textContent = group.name;

      const count = document.createElement('span');
      count.textContent = String(group.properties.length);

      content.append(name, count);

      const icon = L.divIcon({
        className:
          group.id === selectedId
            ? 'dh-live-pin selected'
            : 'dh-live-pin',
        html: content,
        iconSize: [150, 45],
        iconAnchor: [75, 45]
      });

      const marker = L.marker(group.center, {
        icon,
        riseOnHover: true
      });

      marker.on('click', () => {
        setSelectedId(group.id);
        setIndex(0);
      });

      marker.addTo(currentLayer);
    }
  }, [ready, groups, selectedId]);

  return (
    <div className="dh-live-map-wrapper">

      <div
        ref={element}
        className="dh-live-map"
        dir="ltr"
        aria-label="Property map"
      />

      {selected && current && (
        <div
          className="dh-live-map-card"
          dir={rtl ? 'rtl' : 'ltr'}
        >
          <div className="dh-live-map-card-header">
            <strong>{selected.name}</strong>

            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {current.images[0] ? (
            <img
              className="dh-live-map-image"
              src={current.images[0]}
              alt={translate(current.title, locale)}
            />
          ) : (
            <div className="dh-live-map-no-image">
              {locale === 'ar' ? 'لا توجد صورة' : 'No photo'}
            </div>
          )}

          <div className="dh-live-map-card-body">
            <h3>{translate(current.title, locale)}</h3>

            <strong className="dh-live-price">
              {new Intl.NumberFormat(locale).format(current.price)}
              {' '}⃁
            </strong>

            <p>
              {current.area ? `${current.area} m²` : ''}
              {current.beds !== null ? ` · ${current.beds} 🛏` : ''}
            </p>

            <div className="dh-live-carousel-controls">

              <button
                type="button"
                onClick={() =>
                  setIndex(previous =>
                    (previous - 1 + selected.properties.length)
                    % selected.properties.length
                  )
                }
                disabled={selected.properties.length < 2}
                aria-label="Previous"
              >
                ❮
              </button>

              <span>
                {(index % selected.properties.length) + 1}
                {' / '}
                {selected.properties.length}
              </span>

              <button
                type="button"
                onClick={() =>
                  setIndex(previous =>
                    (previous + 1) % selected.properties.length
                  )
                }
                disabled={selected.properties.length < 2}
                aria-label="Next"
              >
                ❯
              </button>

              <Link href={`/${locale}/properties/${current.id}`}>
                {locale === 'ar' ? 'عرض العقار' : 'View property'}
              </Link>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}