'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type DashboardRecord = {
  id: string;
  published: boolean;
  status?: string;
};

type LiveDistrict = {
  id: string;
  names: Record<string, string>;
};

function translations(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      result[key] = entry;
    }
  }

  return result;
}

export function useDurratDashboardData<T extends DashboardRecord>():
  [
    T[],
    (next: T[]) => void,
    boolean,
    string,
    LiveDistrict[]
  ] {

  const supabase = useMemo(() => createClient(), []);

  const [records, setRecords] = useState<T[]>([]);
  const [districts, setDistricts] = useState<LiveDistrict[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setReady(false);

    try {
      const {data: auth, error: authError} =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error('يرجى تسجيل الدخول إلى لوحة الإدارة.');
      }

      const [propertiesResult, districtsResult] =
        await Promise.all([
          supabase
            .from('properties')
            .select(`
              id,
              reference,
              title,
              description,
              district_id,
              property_type,
              transaction_type,
              status,
              price,
              area_m2,
              bedrooms,
              bathrooms,
              latitude,
              longitude,
              property_images (
                storage_path,
                sort_order,
                is_cover
              )
            `)
            .order('created_at', {ascending: false})
            .limit(1000),

          supabase
            .from('districts')
            .select('id,names')
        ]);

      if (propertiesResult.error) {
        throw propertiesResult.error;
      }

      if (districtsResult.error) {
        throw districtsResult.error;
      }

      const mapped = (propertiesResult.data || []).map(property => {
        const photos = [...(property.property_images || [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(photo => ({
            id: photo.storage_path,
            url: supabase.storage
              .from('property-images')
              .getPublicUrl(photo.storage_path)
              .data.publicUrl
          }));

        return {
          id: property.id,
          reference: property.reference,
          title: translations(property.title),
          description: translations(property.description),
          districtId: property.district_id || '',
          type: property.property_type,
          transaction: property.transaction_type,
          status: property.status,
          price: Number(property.price),
          area: Number(property.area_m2 || 0),
          beds: property.bedrooms || 0,
          baths: property.bathrooms || 0,
          latitude: property.latitude,
          longitude: property.longitude,
          photos,
          published: property.status === 'published'
        } as unknown as T;
      });

      setRecords(mapped);

      setDistricts(
        (districtsResult.data || []).map(district => ({
          id: district.id,
          names: translations(district.names)
        }))
      );

      setError('');

    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'تعذر تحميل بيانات العقارات من Supabase.'
      );
    } finally {
      setReady(true);
    }
  }, [supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Synchronisation des boutons de l'ancien dashboard.
  const saveRecords = useCallback((next: T[]) => {
    if (busy) return;

    const removed = records.filter(
      previous => !next.some(item => item.id === previous.id)
    );

    const changed = next.filter(item => {
      const previous = records.find(p => p.id === item.id);

      return previous && previous.published !== item.published;
    });

    if (removed.length === 0 && changed.length === 0) {
      setError(
        'لتعديل تفاصيل العقار، استخدم صفحة تعديل العقار.'
      );
      return;
    }

    if (
      removed.length > 0 &&
      !window.confirm('هل تريد حذف العقار نهائياً من Supabase؟')
    ) {
      return;
    }

    setBusy(true);
    setError('');

    void (async () => {
      try {
        for (const property of changed) {
          const old = records.find(
            item => item.id === property.id
          );

          if (
            old?.status &&
            !['draft', 'published'].includes(old.status)
          ) {
            throw new Error(
              'يجب تعديل حالة العقار من صفحة التعديل أولاً.'
            );
          }

          const {error: updateError} = await supabase
            .from('properties')
            .update({
              status: property.published ? 'published' : 'draft'
            })
            .eq('id', property.id);

          if (updateError) throw updateError;
        }

        for (const property of removed) {
          if (
            property.status &&
            !['draft', 'archived'].includes(property.status)
          ) {
            throw new Error(
              'يجب إلغاء نشر العقار أو أرشفته قبل حذفه.'
            );
          }

          const {data: images, error: imageError} =
            await supabase
              .from('property_images')
              .select('storage_path')
              .eq('property_id', property.id);

          if (imageError) throw imageError;

          const {error: deleteError} = await supabase
            .from('properties')
            .delete()
            .eq('id', property.id);

          if (deleteError) throw deleteError;

          const paths = (images || []).map(
            image => image.storage_path
          );

          if (paths.length > 0) {
            const {error: storageError} = await supabase.storage
              .from('property-images')
              .remove(paths);

            if (storageError) {
              throw new Error(
                'تم حذف العقار ولكن تعذر تنظيف الصور من التخزين.'
              );
            }
          }
        }

        await reload();

      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'تعذر حفظ التغييرات.'
        );
      } finally {
        setBusy(false);
      }
    })();
  }, [busy, records, reload, supabase]);

  return [records, saveRecords, ready, error, districts];
}