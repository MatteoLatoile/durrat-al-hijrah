'use client';

import {useEffect, useMemo, useState, type ChangeEvent} from 'react';
import {ImagePlus, Trash2, Star, Check, Maximize2, ChevronLeft, ChevronRight, X} from 'lucide-react';
import {createPortal} from 'react-dom';
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
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

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

  function appendFiles(selected: File[]) {
    if (disabled || !selected.length) return;

    const allowedTypes = new Set([
      'image/jpeg', 'image/png', 'image/webp', 'image/avif'
    ]);
    const valid = selected.filter(file =>
      allowedTypes.has(file.type) && file.size <= 10 * 1024 * 1024
    );

    setUploadError(
      valid.length !== selected.length
        ? 'بعض الملفات غير مدعومة. استخدم JPEG أو PNG أو WEBP أو AVIF بحجم أقل من 10MB.'
        : ''
    );

    if (!valid.length) return;

    const combined = [...files, ...valid];
    const unique = combined.filter((file, index) =>
      combined.findIndex(other => fileIdentity(other) === fileIdentity(file)) === index
    );

    onFilesChange(unique);

    if (!selectedCover && saved.length === 0 && unique.length) {
      onSelectCover('pending:' + fileIdentity(unique[0]));
    }
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    appendFiles(selected);
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
  const zoomable = [
    ...saved.map(photo => ({
      url: supabase.storage.from('property-images')
        .getPublicUrl(photo.storage_path).data.publicUrl,
      name: 'صورة العقار المحفوظة'
    })),
    ...previews.map(photo => ({url: photo.url, name: photo.name}))
  ];

  useEffect(() => {
    if (zoomIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomIndex(null);
      if (event.key === 'ArrowLeft') setZoomIndex(i =>
        i === null ? null : (i - 1 + total) % Math.max(total, 1)
      );
      if (event.key === 'ArrowRight') setZoomIndex(i =>
        i === null ? null : (i + 1) % Math.max(total, 1)
      );
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', handleKey);
    };
  }, [zoomIndex, total]);

  return (
    <div className="dh-photo-manager" dir="rtl">

      <label
        className={'dh-photo-manager-upload' + (dragging ? ' dragging' : '')}
        onDragOver={event => {event.preventDefault(); if (!disabled) setDragging(true);}}
        onDragLeave={event => {event.preventDefault(); setDragging(false);}}
        onDrop={event => {
          event.preventDefault();
          setDragging(false);
          appendFiles(Array.from(event.dataTransfer.files || []));
        }}
      >
        <span className="dh-photo-manager-upload-icon"><ImagePlus size={29}/></span>
        <strong>أضف صوراً تلفت الأنظار</strong>
        <span>اسحب الصور هنا أو اضغط لاختيارها من جهازك</span>
        <small>JPEG · PNG · WEBP · AVIF — بحد أقصى 10MB لكل صورة</small>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={addFiles}
          disabled={disabled}
        />
      </label>

      {uploadError && <p className="dh-photo-manager-upload-error" role="alert">{uploadError}</p>}

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

                  <button type="button" className="dh-photo-manager-zoom" title="تكبير الصورة" aria-label="تكبير الصورة" onClick={() => setZoomIndex(saved.findIndex(item => item.id === photo.id))}><Maximize2 size={17}/></button>
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

                  <button type="button" className="dh-photo-manager-zoom" title="تكبير الصورة" aria-label="تكبير الصورة" onClick={() => setZoomIndex(saved.length + index)}><Maximize2 size={17}/></button>
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

      {zoomIndex !== null && zoomable[zoomIndex] && createPortal(
        <div className="dh-photo-manager-lightbox" role="dialog" aria-modal="true" aria-label="معاينة الصورة" onClick={() => setZoomIndex(null)}>
          <div className="dh-photo-manager-lightbox-top">
            <span dir="ltr">{zoomIndex + 1} / {zoomable.length}</span>
            <button type="button" aria-label="إغلاق" onClick={() => setZoomIndex(null)}><X size={23}/></button>
          </div>
          <img src={zoomable[zoomIndex].url} alt={zoomable[zoomIndex].name} onClick={event => event.stopPropagation()}/>
          {zoomable.length > 1 && <>
            <button type="button" className="dh-photo-manager-lightbox-arrow prev" aria-label="الصورة السابقة" onClick={event => {event.stopPropagation();setZoomIndex((zoomIndex - 1 + zoomable.length) % zoomable.length);}}><ChevronRight size={24}/></button>
            <button type="button" className="dh-photo-manager-lightbox-arrow next" aria-label="الصورة التالية" onClick={event => {event.stopPropagation();setZoomIndex((zoomIndex + 1) % zoomable.length);}}><ChevronLeft size={24}/></button>
          </>}
        </div>, document.body
      )}

      <p className="dh-photo-manager-note">
        المعاينة تعرض الصور الأصلية.
        ستتم إضافة العلامة المائية بواسطة FFmpeg أثناء الحفظ.
        لا تنس الضغط على حفظ العقار لتثبيت اختيار الصورة الرئيسية.
      </p>

    </div>
  );
}