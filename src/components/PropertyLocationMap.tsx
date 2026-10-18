'use client';

import {useEffect, useRef} from 'react';
import type {
  Map as LeafletMap,
  Marker as LeafletMarker
} from 'leaflet';

import 'leaflet/dist/leaflet.css';

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (
    latitude: number | null,
    longitude: number | null
  ) => void;
};

const MEDINA: [number, number] = [24.4672, 39.6111];

function valid(lat: number | null, lng: number | null) {
  return (
    lat !== null &&
    lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function PropertyLocationMap({
  latitude,
  longitude,
  onChange
}: Props) {

  const element = useRef<HTMLDivElement>(null);

  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const leafletRef = useRef<
    typeof import('leaflet') | null
  >(null);

  const onChangeRef = useRef(onChange);
  const coordsRef = useRef({latitude, longitude});

  onChangeRef.current = onChange;
  coordsRef.current = {latitude, longitude};

  function updateMarker(lat: number | null, lng: number | null) {
    const L = leafletRef.current;
    const map = mapRef.current;

    if (!L || !map) return;

    if (!valid(lat, lng)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const position: [number, number] = [lat!, lng!];

    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      const icon = L.divIcon({
        className: 'av-location-pin',
        html: '<span></span>',
        iconSize: [36, 45],
        iconAnchor: [18, 43]
      });

      const marker = L.marker(position, {
        icon,
        draggable: true
      }).addTo(map);

      marker.on('dragend', () => {
        const point = marker.getLatLng();

        onChangeRef.current(
          Number(point.lat.toFixed(6)),
          Number(point.lng.toFixed(6))
        );
      });

      markerRef.current = marker;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const L = await import('leaflet');

      if (cancelled || !element.current) return;

      const saved = coordsRef.current;

      const hasLocation = valid(
        saved.latitude,
        saved.longitude
      );

      const center: [number, number] = hasLocation
        ? [saved.latitude!, saved.longitude!]
        : MEDINA;

      const map = L.map(element.current, {
        zoomControl: true,
        scrollWheelZoom: false
      }).setView(center, hasLocation ? 15 : 12);

      L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }
      ).addTo(map);

      leafletRef.current = L;
      mapRef.current = map;

      if (hasLocation) {
        updateMarker(
          saved.latitude,
          saved.longitude
        );
      }

      map.on('click', (event) => {
        const lat = Number(event.latlng.lat.toFixed(6));
        const lng = Number(event.latlng.lng.toFixed(6));

        updateMarker(lat, lng);
        onChangeRef.current(lat, lng);
      });

      setTimeout(() => {
        if (!cancelled) map.invalidateSize();
      }, 150);
    }

    initialize().catch(console.error);

    return () => {
      cancelled = true;

      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    updateMarker(latitude, longitude);

    if (map && valid(latitude, longitude)) {
      map.panTo([latitude!, longitude!]);
    }
  }, [latitude, longitude]);

  return (
    <div className="av-property-map">
      <div
        ref={element}
        className="av-map-canvas"
        aria-label="خريطة اختيار موقع العقار"
        dir="ltr"
      />

      <div className="av-map-hint">
        📍 اضغط على الخريطة لتحديد موقع العقار،
        أو اسحب العلامة لتغيير الموقع.
      </div>
    </div>
  );
}