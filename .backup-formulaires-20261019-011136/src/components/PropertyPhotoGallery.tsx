'use client';

import {useEffect, useMemo, useState, type ChangeEvent} from 'react';
import {ImagePlus, Trash2, Star, Check} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';

export type SavedPhoto = {
  id: string;
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
};

export function fileIdentity(file: File): string {
  return [file.name, file.size, file.lastModified].join(':');
}

type Preview = {
  key: string;
  url: string;
  name: string;
};

type Props = {
  files: File[];
  saved: SavedPhoto[];
  selectedCover: string | null;
  onSelectCover: (value: string | null) => void;
  onFilesChange: (files: File[]) => void;
  onRemoveSaved: (photo: SavedPhoto) => void;
  disabled?: boolean;
};

export function PropertyPhotoGallery({
  files,
  saved,
  selectedCover,
  onSelectCover,
  onFilesChange,
  onRemoveSaved,
  disabled = false
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [previews, setPreviews] = useState<Preview[]>([]);

  useEffect(() => {
    const urls = files.map(file => ({
      key: fileIdentity(file),
      name: file.name,
      url: URL.createObjectURL(file)
    }));

    setPreviews(urls);

    return () => {
      urls.forEach(item => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';

    if (!selected.length) return;

    const combined = [...files, ...selected];

    const unique = combined.filter((file, index) =>
      combined.findIndex(other =>
        fileIdentity(other) === fileIdentity(file)
      ) === index
    );

    onFilesChange(unique);

    if (!selectedCover && saved.length === 0 && unique.length) {
      onSelectCover('pending:' + fileIdentity(unique[0]));
    }
  }

  function removePending(index: number) {
    const removed = files[index];
    const next = files.filter((_, i) => i !== index);

    onFilesChange(next);

    if (
      removed &&
      selectedCover === 'pending:' + fileIdentity(removed)
    ) {
      onSelectCover(
        saved.length
          ? 'saved:' + saved[0].id
          : next.length
            ? 'pending:' + fileIdentity(next[0])
            : null
      );
    }
  }

  const total = saved.length + files.length;

  return (
    <div className="dh-photo-manager" dir="rtl">

      <label className="dh-photo-manager-upload">
        <ImagePlus size={30}/>
        <strong>إضافة صور العقار</strong>
        <span>اضغط لاختيار صورة أو عدة صور</span>
        <small>JPEG, PNG, WEBP, AVIF — الحد الأقصى 10MB للصورة</small>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={addFiles}
          disabled={disabled}
        />
      </label>

      {total > 0 && (
        <>
          <div className="dh-photo-manager-heading">
            <strong>معاينة الصور ({total})</strong>
            <span>اختر الصورة الرئيسية بالضغط على النجمة</span>
          </div>

          <div className="dh-photo-manager-grid">

            {saved.map(photo => {
              const key = 'saved:' + photo.id;
              const selected = selectedCover === key;

              const url = supabase.storage
                .from('property-images')
                .getPublicUrl(photo.storage_path)
                .data.publicUrl;

              return (
                <div
                  key={key}
                  className={
                    'dh-photo-manager-item' +
                    (selected ? ' selected' : '')
                  }
                >
                  <img src={url} alt="صورة العقار المحفوظة"/>

                  <div className="dh-photo-manager-top">
                    <button
                      type="button"
                      className="dh-photo-manager-star"
                      disabled={disabled}
                      onClick={() => onSelectCover(key)}
                      title="تعيين كصورة رئيسية"
                    >
                      <Star
                        size={17}
                        fill={selected ? 'currentColor' : 'none'}
                      />
                    </button>

                    <button
                      type="button"
                      className="dh-photo-manager-delete"
                      disabled={disabled}
                      onClick={() => onRemoveSaved(photo)}
                      title="حذف الصورة"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>

                  <div className="dh-photo-manager-bottom">
                    {selected ? (
                      <span className="cover">
                        <Check size={13}/> الصورة الرئيسية
                      </span>
                    ) : (
                      <span>صورة محفوظة</span>
                    )}
                  </div>
                </div>
              );
            })}

            {previews.map((photo, index) => {
              const key = 'pending:' + photo.key;
              const selected = selectedCover === key;

              return (
                <div
                  key={key}
                  className={
                    'dh-photo-manager-item' +
                    (selected ? ' selected' : '')
                  }
                >
                  <img src={photo.url} alt={photo.name}/>

                  <div className="dh-photo-manager-top">
                    <button
                      type="button"
                      className="dh-photo-manager-star"
                      disabled={disabled}
                      onClick={() => onSelectCover(key)}
                      title="تعيين كصورة رئيسية"
                    >
                      <Star
                        size={17}
                        fill={selected ? 'currentColor' : 'none'}
                      />
                    </button>

                    <button
                      type="button"
                      className="dh-photo-manager-delete"
                      disabled={disabled}
                      onClick={() => removePending(index)}
                      title="إزالة من الصور المختارة"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>

                  <div className="dh-photo-manager-bottom">
                    {selected ? (
                      <span className="cover">
                        <Check size={13}/> الصورة الرئيسية
                      </span>
                    ) : (
                      <span>جديدة — لم تُحفظ بعد</span>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </>
      )}

      <p className="dh-photo-manager-note">
        المعاينة تعرض الصور الأصلية.
        ستتم إضافة العلامة المائية بواسطة FFmpeg أثناء الحفظ.
        لا تنس الضغط على حفظ العقار لتثبيت اختيار الصورة الرئيسية.
      </p>

    </div>
  );
}