'use client';

import {useEffect, useState} from 'react';
import {Images, X} from 'lucide-react';

type Preview = {
  url: string;
  name: string;
  size: number;
};

type Props = {
  files: File[];
  onRemove: (index: number) => void;
};

export function PropertyPendingPhotos({
  files,
  onRemove
}: Props) {

  const [previews, setPreviews] = useState<Preview[]>([]);

  useEffect(() => {
    const generated = files.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));

    setPreviews(generated);

    return () => {
      generated.forEach(photo => {
        URL.revokeObjectURL(photo.url);
      });
    };
  }, [files]);

  if (files.length === 0) {
    return null;
  }

  return (
    <section className="dh-photo-preview" dir="rtl">

      <div className="dh-photo-preview-heading">
        <div>
          <Images size={19}/>

          <strong>معاينة الصور قبل الحفظ</strong>
        </div>

        <span>{files.length} صور</span>
      </div>

      <div className="dh-photo-preview-grid">

        {previews.map((photo, index) => (

          <div
            className="dh-photo-preview-card"
            key={photo.url}
          >

            <div className="dh-photo-preview-image">

              <img
                src={photo.url}
                alt={`صورة العقار ${index + 1}`}
              />

              <span className="dh-photo-preview-number">
                {index + 1}
              </span>

              <button
                type="button"
                className="dh-photo-preview-remove"
                onClick={() => onRemove(index)}
                title="إزالة الصورة"
                aria-label={`إزالة الصورة ${index + 1}`}
              >
                <X size={16}/>
              </button>

            </div>

            <div className="dh-photo-preview-info">
              <span title={photo.name}>
                {photo.name}
              </span>

              <small>
                {(photo.size / 1024 / 1024).toFixed(2)} MB
              </small>
            </div>

          </div>

        ))}

      </div>

      <p className="dh-photo-preview-notice">
        هذه معاينة للصور الأصلية.
        ستتم إضافة العلامة المائية أثناء الحفظ.
      </p>

    </section>
  );
}