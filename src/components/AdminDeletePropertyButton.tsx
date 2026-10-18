'use client';

import {useState} from 'react';
import {Trash2} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';

export function AdminDeletePropertyButton({
  propertyId
}: {
  propertyId: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (busy) return;

    const confirmed = window.confirm(
      'هل أنت متأكد من حذف هذا العقار نهائياً؟'
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const supabase = createClient();

      // Recuperer les chemins des photos avant suppression.
      const {data: images, error: imageError} = await supabase
        .from('property_images')
        .select('storage_path')
        .eq('property_id', propertyId);

      if (imageError) {
        console.warn('Lecture des photos:', imageError.message);
      }

      // Supprimer directement dans Supabase.
      const {data: deleted, error: deleteError} = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .select('id');

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Verifier que la base a reellement supprime une ligne.
      if (!deleted || deleted.length !== 1) {
        throw new Error(
          'لم يتم حذف العقار من قاعدة البيانات. يرجى التحقق من صلاحيات الحساب.'
        );
      }

      // Nettoyage des photos apres suppression reussie.
      const paths = [...new Set(
        (images || [])
          .map(image => image.storage_path)
          .filter((path): path is string => Boolean(path))
      )];

      if (paths.length > 0) {
        const {error: storageError} = await supabase.storage
          .from('property-images')
          .remove(paths);

        if (storageError) {
          console.warn(
            'Photos non supprimees:',
            storageError.message
          );

          window.alert(
            'تم حذف العقار بنجاح، ولكن تعذر تنظيف بعض الصور من التخزين.'
          );
        }
      }

      // Actualiser apres confirmation par Supabase.
      window.location.reload();

    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : 'حدث خطأ غير معروف.';

      console.error('Erreur suppression:', cause);

      window.alert(
        'تعذر حذف العقار:\n' + message
      );

      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      title={busy ? 'جارٍ الحذف...' : 'حذف العقار'}
      aria-label="حذف العقار"
      disabled={busy}
      onClick={handleDelete}
      style={{
        opacity: busy ? 0.5 : 1,
        cursor: busy ? 'wait' : 'pointer'
      }}
    >
      <Trash2 size={18}/>
    </button>
  );
}