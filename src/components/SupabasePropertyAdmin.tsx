'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from 'react';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';

import {
  Plus,
  Save,
  Trash2,
  Pencil,
  ImagePlus,
  ArrowRight,
  RefreshCw,
  MapPin,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  Languages,
  Images,
  AlertCircle,
  X,
  Ruler,
  Square,
  BedDouble,
  Bath,
  Sofa,
  Layers,
  CarFront,
  CalendarDays,
  BadgeCheck,
  KeyRound,
  Wallet,
  Info,
  ListChecks,
  Check,
  ChevronLeft,
  Globe2,
  Star,
  ShieldCheck,
  ArrowUpLeft
} from 'lucide-react';

import './supabase-property-admin.css';
import {PropertyPhotoGallery, fileIdentity} from './PropertyPhotoGallery';

const languages = [
  ['ar', 'العربية', '🇸🇦'],
  ['fr', 'Français', '🇫🇷'],
  ['en', 'English', '🇬🇧'],
  ['ru', 'Русский', '🇷🇺'],
  ['ur', 'اردو', '🇵🇰'],
  ['id', 'Bahasa Indonesia', '🇮🇩']
] as const;

type Translations = Record<string, string>;

type Status =
  | 'draft'
  | 'published'
  | 'sold'
  | 'rented'
  | 'archived';

type District = {
  id: string;
  names: Translations;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
};

type Photo = {
  id: string;
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
};

type Property = {
  id: string;
  reference: string;
  title: Translations;
  description: Translations;
  district_id: string | null;
  property_type: string;
  transaction_type: string;
  status: Status;
  price: number;
  area_m2: number | null;
  land_area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  living_rooms: number | null;
  floor_number: number | null;
  total_floors: number | null;
  parking_spaces: number | null;
  property_age_years: number | null;
  rent_period: string | null;
  furnished: string;
  is_featured: boolean;
  property_images?: Photo[];
};

const types = [
  ['apartment', 'شقة'],
  ['villa', 'فيلا'],
  ['studio', 'استوديو'],
  ['land', 'أرض'],
  ['building', 'عمارة'],
  ['shop', 'محل تجاري'],
  ['office', 'مكتب'],
  ['warehouse', 'مستودع'],
  ['other', 'أخرى']
];

const statuses: [Status, string][] = [
  ['draft', 'مسودة'],
  ['published', 'منشور'],
  ['sold', 'مباع'],
  ['rented', 'مؤجر'],
  ['archived', 'مؤرشف']
];

const empty = {
  title: {} as Translations,
  description: {} as Translations,
  district_id: '',
  property_type: 'apartment',
  transaction_type: 'sale',
  status: 'draft' as Status,
  price: '',
  area_m2: '',
  land_area_m2: '',
  bedrooms: '',
  bathrooms: '',
  living_rooms: '',
  floor_number: '',
  total_floors: '',
  parking_spaces: '',
  property_age_years: '',
  rent_period: '',
  furnished: 'unfurnished',
  is_featured: false
};

type FormState = typeof empty;

function asTranslations(value: unknown): Translations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string'
    )
  );
}

function numberOrNull(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

function money(value: number): string {
  return new Intl.NumberFormat('ar-SA').format(value) + ' ⃁';
}

function propertyName(property: Property): string {
  return (
    property.title?.ar ||
    property.title?.en ||
    property.reference
  );
}

function storageUrl(path: string): string {
  return createClient()
    .storage
    .from('property-images')
    .getPublicUrl(path)
    .data.publicUrl;
}

// ===================================================
// LISTE DES ANNONCES SUPABASE
// ===================================================

async function processWatermarkedPhoto(
  original: File,
  index: number
): Promise<File> {
  const form = new FormData();

  form.append('file', original);
  form.append('index', String(index));

  const response = await fetch('/api/admin/watermark', {
    method: 'POST',
    body: form,
    cache: 'no-store'
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);

    throw new Error(
      result?.error ||
      'Impossible de traiter la photo avec FFmpeg.'
    );
  }

  const blob = await response.blob();

  if (blob.type !== 'image/webp' || blob.size === 0) {
    throw new Error('FFmpeg a renvoyé une image invalide.');
  }

  return new File(
    [blob],
    original.name.replace(/\.[^.]+$/, '') + '-filigrane.webp',
    {
      type: 'image/webp',
      lastModified: Date.now()
    }
  );
}
export function SupabasePropertyList() {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<Property[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');

    const [propertiesResponse, districtsResponse] = await Promise.all([
      supabase
        .from('properties')
        .select('id,reference,title,description,district_id,property_type,transaction_type,status,price,area_m2,land_area_m2,bedrooms,bathrooms,living_rooms,floor_number,total_floors,parking_spaces,property_age_years,rent_period,furnished,is_featured')
        .order('created_at', {ascending: false})
        .limit(200),

      supabase
        .from('districts')
        .select('id,names,latitude,longitude,is_active')
    ]);

    if (propertiesResponse.error || districtsResponse.error) {
      setMessage(
        propertiesResponse.error?.message ||
        districtsResponse.error?.message ||
        'تعذر تحميل البيانات'
      );
    } else {
      setItems((propertiesResponse.data || []) as unknown as Property[]);
      setDistricts(
        (districtsResponse.data || []) as unknown as District[]
      );
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(property: Property, status: Status) {
    if (busy) return;

    if (status === 'published') {
      const district = districts.find(
        item => item.id === property.district_id
      );

      if (
        !district ||
        !district.is_active ||
        !Number.isFinite(district.latitude) ||
        !Number.isFinite(district.longitude) ||
        district.latitude === null ||
        district.longitude === null
      ) {
        setMessage(
          'يجب اختيار حي نشط له إحداثيات GPS قبل النشر.'
        );
        return;
      }

      if (!property.title?.ar || Number(property.price) <= 0) {
        setMessage('يرجى استكمال اسم العقار والسعر قبل النشر.');
        return;
      }
    }

    setBusy(property.id);
    setMessage('');

    const {error} = await supabase
      .from('properties')
      .update({status})
      .eq('id', property.id);

    if (error) {
      setMessage(error.message);
    } else {
      await load();
    }

    setBusy(null);
  }

  async function deleteProperty(property: Property) {
    if (busy) return;

    if (
      property.status !== 'draft' &&
      property.status !== 'archived'
    ) {
      setMessage(
        'يجب تحويل العقار إلى مسودة أو مؤرشف قبل حذفه.'
      );
      return;
    }

    if (!confirm(`هل تريد حذف العقار ${property.reference}؟`)) {
      return;
    }

    setBusy(property.id);

    const {data: photos, error: photosError} = await supabase
      .from('property_images')
      .select('storage_path')
      .eq('property_id', property.id);

    if (photosError) {
      setMessage(photosError.message);
      setBusy(null);
      return;
    }

    const {error} = await supabase
      .from('properties')
      .delete()
      .eq('id', property.id);

    if (error) {
      setMessage(error.message);
    } else {
      const paths = (photos || []).map(photo => photo.storage_path);

      if (paths.length > 0) {
        const {error: storageError} = await supabase.storage
          .from('property-images')
          .remove(paths);

        if (storageError) {
          setMessage('تم حذف العقار ولكن تعذر تنظيف بعض الصور.');
        }
      }

      await load();
    }

    setBusy(null);
  }

  const filtered = items.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false;

    const district = districts.find(
      value => value.id === item.district_id
    );

    const text = [
      propertyName(item),
      item.reference,
      district?.names?.ar || ''
    ].join(' ').toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <main className="dh-pa" dir="rtl">
      <div className="dh-pa-container">

        <div className="dh-pa-heading">
          <div>
            <Link href="/ar/admin/dashboard" className="dh-pa-back">
              <ArrowRight size={15}/> لوحة الإدارة
            </Link>

            <span className="dh-pa-eyebrow">
              DURRAT / DATABASE
            </span>

            <h1>إدارة العقارات</h1>
            <p>إدارة العقارات المحفوظة في Supabase</p>
          </div>

          <Link href="/ar/admin/properties/new" className="dh-pa-primary">
            <Plus size={18}/> إضافة عقار
          </Link>
        </div>

        {message && (
          <div className="dh-pa-error" role="alert">
            {message}
          </div>
        )}

        <div className="dh-pa-toolbar">
          <input
            placeholder="البحث عن عقار أو حي..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            {statuses.map(([value, name]) =>
              <option key={value} value={value}>{name}</option>
            )}
          </select>

          <button type="button" onClick={() => void load()}>
            <RefreshCw size={17}/> تحديث
          </button>
        </div>

        <div className="dh-pa-table-wrap">
          <table className="dh-pa-table">
            <thead>
              <tr>
                <th>العقار</th>
                <th>الحي</th>
                <th>السعر</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(property => {
                const district = districts.find(
                  item => item.id === property.district_id
                );

                return (
                  <tr key={property.id}>
                    <td>
                      <strong>{propertyName(property)}</strong>
                      <small>{property.reference}</small>
                    </td>

                    <td>{district?.names?.ar || '—'}</td>

                    <td dir="ltr">{money(property.price)}</td>

                    <td>
                      <select
                        value={property.status}
                        disabled={busy !== null}
                        onChange={e => void changeStatus(
                          property,
                          e.target.value as Status
                        )}
                      >
                        {statuses.map(([value, name]) =>
                          <option key={value} value={value}>
                            {name}
                          </option>
                        )}
                      </select>
                    </td>

                    <td>
                      <div className="dh-pa-actions">
                        <Link
                          href={`/ar/admin/properties/${property.id}/edit`}
                          title="تعديل"
                        >
                          <Pencil size={17}/>
                        </Link>

                        {property.status === 'published' && (
                          <Link
                            href={`/ar/properties-live/${property.id}`}
                            title="عرض على الموقع"
                          >
                            <Eye size={17}/>
                          </Link>
                        )}

                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void deleteProperty(property)}
                          title="حذف"
                        >
                          <Trash2 size={17}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <div className="dh-pa-empty">
              لا توجد عقارات مطابقة للبحث
            </div>
          )}

          {loading && (
            <div className="dh-pa-empty">
              جارٍ تحميل العقارات...
            </div>
          )}
        </div>

        <p className="dh-pa-note">
          تعرض هذه الصفحة آخر 200 عقار. سيتم إضافة ترقيم الصفحات لاحقاً.
        </p>

      </div>
    </main>
  );
}

// ===================================================
// FORMULAIRE AJOUT / MODIFICATION
// ===================================================

export function SupabasePropertyEditor({
  propertyId
}: {
  propertyId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [districts, setDistricts] = useState<District[]>([]);
  const [form, setForm] = useState<FormState>({...empty});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [coverChoice, setCoverChoice] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);

  const [savedId, setSavedId] = useState(propertyId || '');
  const [activeDescriptionLang, setActiveDescriptionLang] = useState<string>('ar');
  const [success, setSuccess] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const editing = Boolean(propertyId);

  useEffect(() => {
    if (coverChoice?.startsWith('pending:')) {
      const selected = files.find(file =>
        fileIdentity(file) === coverChoice.slice('pending:'.length)
      );
      if (selected) {
        const url = URL.createObjectURL(selected);
        setCoverPreview(url);
        return () => URL.revokeObjectURL(url);
      }
    }

    const selected = photos.find(photo =>
      'saved:' + photo.id === coverChoice
    ) || photos.find(photo => photo.is_cover) || photos[0];

    setCoverPreview(selected ? storageUrl(selected.storage_path) : null);
  }, [coverChoice, files, photos]);

  useEffect(() => {
    if (error) window.scrollTo({top: 0, behavior: 'smooth'});
  }, [error]);

  const loadPhotos = useCallback(async (id: string) => {
    const {data, error} = await supabase
      .from('property_images')
      .select('id,storage_path,is_cover,sort_order')
      .eq('property_id', id)
      .order('sort_order');

    if (error) throw error;

    const loadedPhotos = (data || []) as Photo[];
    setPhotos(loadedPhotos);

    setCoverChoice(current => {
      if (current?.startsWith('pending:')) return current;

      if (
        current?.startsWith('saved:') &&
        loadedPhotos.some(photo => 'saved:' + photo.id === current)
      ) {
        return current;
      }

      const cover =
        loadedPhotos.find(photo => photo.is_cover) ||
        loadedPhotos[0];

      return cover ? 'saved:' + cover.id : null;
    });
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const {data: districtData, error: districtError} =
          await supabase
            .from('districts')
            .select('id,names,latitude,longitude,is_active')
            .order('created_at', {ascending: false});

        if (districtError) throw districtError;

        if (active) {
          setDistricts(
            (districtData || []) as unknown as District[]
          );
        }

        if (propertyId) {
          const {data, error: propertyError} = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single();

          if (propertyError) throw propertyError;

          if (active) {
            const property = data as Property;

            setForm({
              title: asTranslations(property.title),
              description: asTranslations(property.description),
              district_id: property.district_id || '',
              property_type: property.property_type,
              transaction_type: property.transaction_type,
              status: property.status,
              price: String(property.price),
              area_m2: String(property.area_m2 ?? ''),
              land_area_m2: String(property.land_area_m2 ?? ''),
              bedrooms: String(property.bedrooms ?? ''),
              bathrooms: String(property.bathrooms ?? ''),
              living_rooms: String(property.living_rooms ?? ''),
              floor_number: String(property.floor_number ?? ''),
              total_floors: String(property.total_floors ?? ''),
              parking_spaces: String(property.parking_spaces ?? ''),
              property_age_years: String(property.property_age_years ?? ''),
              rent_period: property.rent_period || '',
              furnished: property.furnished || 'unfurnished',
              is_featured: property.is_featured
            });

            await loadPhotos(propertyId);
          }
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'تعذر تحميل البيانات'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [propertyId, supabase, loadPhotos]);

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm(previous => ({...previous, [key]: value}));
  }

  function translateField(
    field: 'title' | 'description',
    lang: string,
    value: string
  ) {
    setForm(previous => ({
      ...previous,
      [field]: {
        ...previous[field],
        [lang]: value
      }
    }));
  }

  async function removePhoto(photo: Photo) {
    if (!savedId || photoBusy) return;

    if (!confirm('هل تريد حذف الصورة؟')) return;

    setPhotoBusy(true);
    setError('');

    try {
      const {error: dbError} = await supabase
        .from('property_images')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      const {error: storageError} = await supabase.storage
        .from('property-images')
        .remove([photo.storage_path]);

      if (storageError) {
        throw new Error(
          'تم حذف الصورة من العقار، ولكن تعذر حذف الملف من التخزين.'
        );
      }

      await loadPhotos(savedId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'خطأ');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setError('');
    setSuccess('');

    if (!form.title.ar?.trim()) {
      setError('اسم العقار بالعربية مطلوب.');
      return;
    }

    if (!Number.isFinite(Number(form.price)) ||
        Number(form.price) <= 0) {
      setError('يرجى إدخال سعر صحيح.');
      return;
    }

    if (form.status === 'published') {
      const selected = districts.find(
        district => district.id === form.district_id
      );

      if (
        !selected ||
        !selected.is_active ||
        selected.latitude === null ||
        selected.longitude === null ||
        !Number.isFinite(selected.latitude) ||
        !Number.isFinite(selected.longitude)
      ) {
        setError(
          'للنشر، اختر حياً نشطاً له إحداثيات GPS صحيحة.'
        );
        return;
      }
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif'
    ];

    for (const file of files) {
      if (
        !allowedTypes.includes(file.type) ||
        file.size > 10 * 1024 * 1024
      ) {
        setError(
          'الصور يجب أن تكون JPEG أو PNG أو WEBP أو AVIF وأقل من 10MB.'
        );
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        district_id: form.district_id || null,
        property_type: form.property_type,
        transaction_type: form.transaction_type,
        price: Number(form.price),
        area_m2: numberOrNull(form.area_m2),
        land_area_m2: numberOrNull(form.land_area_m2),
        bedrooms: numberOrNull(form.bedrooms),
        bathrooms: numberOrNull(form.bathrooms),
        living_rooms: numberOrNull(form.living_rooms),
        floor_number: numberOrNull(form.floor_number),
        total_floors: numberOrNull(form.total_floors),
        parking_spaces: numberOrNull(form.parking_spaces),
        property_age_years: numberOrNull(form.property_age_years),
        rent_period: form.transaction_type === 'rent'
          ? form.rent_period || null
          : null,
        furnished: form.furnished,
        is_featured: form.is_featured
      };

      let id = savedId;

      if (id) {
        const {error: updateError} = await supabase
          .from('properties')
          .update({
            ...payload,
            status: form.status
          })
          .eq('id', id);

        if (updateError) throw updateError;

      } else {
        // Creation en brouillon avant l'envoi des images.
        const {data, error: createError} = await supabase
          .from('properties')
          .insert({
            ...payload,
            status: 'draft'
          })
          .select('id')
          .single();

        if (createError) throw createError;

        id = data.id;
        setSavedId(id);
      }

      const existingCount = photos.length;
      const uploadedPhotoPaths: {key: string; path: string}[] = [];

      const extensions: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/avif': 'avif'
      };

      for (let i = 0; i < files.length; i++) {
        const file = await processWatermarkedPhoto(files[i], existingCount + i);

        const extension = extensions[file.type];
        const storagePath =
          `${id}/${crypto.randomUUID()}.${extension}`;

        const {error: uploadError} = await supabase.storage
          .from('property-images')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        uploadedPhotoPaths.push({key: fileIdentity(files[i]), path: storagePath});
        const {error: imageError} = await supabase
          .from('property_images')
          .insert({
            property_id: id,
            storage_path: storagePath,
            sort_order: existingCount + i,
            is_cover: existingCount === 0 && i === 0
          });

        if (imageError) {
          await supabase.storage
            .from('property-images')
            .remove([storagePath]);

          throw imageError;
        }
      }

            // Photo principale : synchronisation avec Supabase.
      const {data: coverRows, error: coverReadError} = await supabase
        .from('property_images')
        .select('id,storage_path,is_cover')
        .eq('property_id', id);

      if (coverReadError) throw coverReadError;

      const availablePhotos = coverRows || [];

      let desiredCoverId: string | null = null;

      if (coverChoice?.startsWith('saved:')) {
        const candidate = coverChoice.slice('saved:'.length);

        if (availablePhotos.some(photo => photo.id === candidate)) {
          desiredCoverId = candidate;
        }
      }

      if (coverChoice?.startsWith('pending:')) {
        const key = coverChoice.slice('pending:'.length);
        const uploaded = uploadedPhotoPaths.find(photo => photo.key === key);

        if (uploaded) {
          desiredCoverId =
            availablePhotos.find(
              photo => photo.storage_path === uploaded.path
            )?.id || null;
        }
      }

      desiredCoverId =
        desiredCoverId ||
        availablePhotos.find(photo => photo.is_cover)?.id ||
        availablePhotos[0]?.id ||
        null;

      if (
        desiredCoverId &&
        !availablePhotos.some(
          photo => photo.id === desiredCoverId && photo.is_cover
        )
      ) {
        // Retirer l'ancienne couverture d'abord :
        // la base n'autorise qu'une couverture par bien.
        const {error: resetCoverError} = await supabase
          .from('property_images')
          .update({is_cover: false})
          .eq('property_id', id)
          .eq('is_cover', true);

        if (resetCoverError) throw resetCoverError;

        const {error: setCoverError} = await supabase
          .from('property_images')
          .update({is_cover: true})
          .eq('id', desiredCoverId)
          .eq('property_id', id);

        if (setCoverError) throw setCoverError;
      }

      if (!propertyId && form.status !== 'draft') {
        const {error: publishError} = await supabase
          .from('properties')
          .update({status: form.status})
          .eq('id', id);

        if (publishError) throw publishError;
      }

      if (propertyId) {
        setFiles([]);
        setCoverChoice(desiredCoverId ? 'saved:' + desiredCoverId : null);
        await loadPhotos(id);
        setSuccess('تم حفظ التعديلات بنجاح. جميع البيانات محدثة.');
        window.scrollTo({top: 0, behavior: 'smooth'});
      } else {
        router.replace(`/ar/admin/properties/${id}/edit`);
        router.refresh();
      }

    } catch (cause) {
      setError(
        (cause instanceof Error ? cause.message : 'خطأ') +
        ' — قد يكون العقار قد حُفظ جزئياً. تحقق من قائمة العقارات.'
      );
    } finally {
      setSaving(false);
    }
  }

  const titleCount = languages.filter(([code]) =>
    Boolean(form.title[code]?.trim())
  ).length;
  const descriptionCount = languages.filter(([code]) =>
    Boolean(form.description[code]?.trim())
  ).length;
  const selectedDistrict = districts.find(d => d.id === form.district_id);
  const validArabicTitle = Boolean(form.title.ar?.trim());
  const validPrice = Number.isFinite(Number(form.price)) && Number(form.price) > 0;
  const validDistrict = Boolean(
    selectedDistrict?.is_active &&
    selectedDistrict.latitude !== null &&
    selectedDistrict.longitude !== null &&
    Number.isFinite(selectedDistrict.latitude) &&
    Number.isFinite(selectedDistrict.longitude)
  );
  const totalPhotos = photos.length + files.length;
  const readyCount = [validArabicTitle, validPrice, validDistrict, totalPhotos > 0].filter(Boolean).length;
  const readyPercent = Math.round(readyCount / 4 * 100);
  const currentLanguage = languages.find(([code]) => code === activeDescriptionLang) || languages[0];

  if (loading) {
    return (
      <main className="dh-pa dh-pa-editor" dir="rtl">
        <div className="dh-editor-loading">
          <div className="dh-editor-loading-mark">D</div>
          <p>جارٍ تجهيز مساحة تحرير العقار...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dh-pa dh-pa-editor" dir="rtl">
      <div className="dh-pa-container dh-editor-container">
        <header className="dh-editor-hero">
          <div className="dh-editor-hero-pattern" aria-hidden="true" />
          <div className="dh-editor-topline">
            <Link href="/ar/admin/dashboard?tab=properties" className="dh-editor-back">
              <ArrowRight size={16} /> العودة إلى إدارة العقارات
            </Link>
            <span className="dh-editor-brand">DURRAT AL HIJRAH <span> / PROPERTY STUDIO</span></span>
          </div>
          <div className="dh-editor-hero-body">
            <div className="dh-editor-hero-copy">
              <span className="dh-editor-kicker"><span className="dh-editor-kicker-dot" /> إدارة المحتوى العقاري</span>
              <h1>{editing ? 'تعديل تفاصيل العقار' : 'إضافة عقار جديد'}</h1>
              <p>{editing
                ? 'راجع بيانات العقار وصوره وترجماته، ثم احفظ التغييرات بثقة.'
                : 'كل ما تحتاجه لنشر عقار احترافي، في مساحة عمل واحدة منظمة.'}</p>
              <div className="dh-editor-hero-badges">
                <span><CheckCircle2 size={15} /> حفظ آمن عبر Supabase</span>
                <span><Languages size={15} /> ٦ لغات</span>
                <span><Images size={15} /> معالجة الصور تلقائياً</span>
              </div>
            </div>
            <div className="dh-editor-hero-progress">
              <div className="dh-editor-progress-header"><span>جاهزية الإعلان</span><strong>{readyPercent}%</strong></div>
              <div className="dh-editor-progress-track" role="progressbar" aria-label="جاهزية الإعلان" aria-valuenow={readyPercent} aria-valuemin={0} aria-valuemax={100}>
                <div style={{width: `${readyPercent}%`}} />
              </div>
              <small>أكمل العنوان والسعر والحي والصور</small>
            </div>
          </div>
        </header>

        {error && (
          <div className="dh-editor-notice error" role="alert">
            <AlertCircle size={19} /> <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="إغلاق التنبيه"><X size={16}/></button>
          </div>
        )}
        {success && (
          <div className="dh-editor-notice success" role="status">
            <CheckCircle2 size={19} /><span>{success}</span>
            <button type="button" onClick={() => setSuccess('')} aria-label="إغلاق التنبيه"><X size={16}/></button>
          </div>
        )}

        <form onSubmit={save} className="dh-editor-form">
          <div className="dh-editor-layout">
            <div className="dh-editor-content">
              <section className="dh-editor-section" id="dh-editor-basics" aria-labelledby="dh-editor-basics-title">
                <div className="dh-editor-section-header">
                  <div className="dh-editor-section-number">01</div>
                  <div className="dh-editor-section-title">
                    <span className="dh-editor-section-kicker">PROPERTY DETAILS</span>
                    <h2 id="dh-editor-basics-title">المعلومات الأساسية</h2>
                    <p>حدد نوع العقار وموقعه وسعره بوضوح.</p>
                  </div>
                  <div className="dh-editor-section-icon"><Building2 size={23}/></div>
                </div>

                <div className="dh-editor-section-body">
                  <div className="dh-editor-field-grid">
                    <label className="dh-editor-field">
                      <span className="dh-editor-field-label"><MapPin size={15}/> الحي <em>* عند النشر</em></span>
                      <select value={form.district_id} onChange={e => update('district_id', e.target.value)}>
                        <option value="">اختر الحي المناسب</option>
                        {districts.map(district => (
                          <option key={district.id} value={district.id}>
                            {district.names?.ar || district.id}{!district.is_active ? ' — غير نشط' : ''}
                          </option>
                        ))}
                      </select>
                      <small>تُستخدم إحداثيات الحي لإظهار العقار على الخريطة.</small>
                    </label>
                    <label className="dh-editor-field">
                      <span className="dh-editor-field-label"><Building2 size={15}/> نوع العقار</span>
                      <select value={form.property_type} onChange={e => update('property_type', e.target.value)}>
                        {types.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="dh-editor-subhead"><span>نوع العرض</span><small>اختر ما إذا كان العقار للبيع أو للإيجار</small></div>
                  <div className="dh-editor-choice-group" aria-label="نوع العرض">
                    <button type="button" className={'dh-editor-choice' + (form.transaction_type === 'sale' ? ' active' : '')} aria-pressed={form.transaction_type === 'sale'} onClick={() => update('transaction_type','sale')}>
                      <BadgeCheck size={20}/><span><strong>بيع</strong><small>عقار معروض للبيع</small></span>
                    </button>
                    <button type="button" className={'dh-editor-choice' + (form.transaction_type === 'rent' ? ' active' : '')} aria-pressed={form.transaction_type === 'rent'} onClick={() => update('transaction_type','rent')}>
                      <KeyRound size={20}/><span><strong>إيجار</strong><small>عقار متاح للإيجار</small></span>
                    </button>
                  </div>

                  <div className="dh-editor-field-grid dh-editor-money-row">
                    <label className="dh-editor-field">
                      <span className="dh-editor-field-label"><Wallet size={15}/> السعر (ريال سعودي) <em>*</em></span>
                      <div className="dh-editor-price-input">
                        <input type="number" min="1" step="any" value={form.price} onChange={e => update('price',e.target.value)} placeholder="0" required dir="ltr" />
                        <span className="dh-riyal-icon" role="img" aria-label="ريال سعودي" />
                      </div>
                    </label>
                    {form.transaction_type === 'rent' ? (
                      <label className="dh-editor-field">
                        <span className="dh-editor-field-label"><CalendarDays size={15}/> مدة الإيجار</span>
                        <select value={form.rent_period} onChange={e => update('rent_period',e.target.value)}>
                          <option value="">غير محدد</option><option value="daily">يومي</option><option value="monthly">شهري</option><option value="yearly">سنوي</option>
                        </select>
                      </label>
                    ) : (
                      <label className="dh-editor-field">
                        <span className="dh-editor-field-label"><Sofa size={15}/> التأثيث</span>
                        <select value={form.furnished} onChange={e => update('furnished',e.target.value)}>
                          <option value="unfurnished">غير مفروش</option><option value="furnished">مفروش</option><option value="partially_furnished">مفروش جزئياً</option>
                        </select>
                      </label>
                    )}
                  </div>
                  {form.transaction_type === 'rent' && (
                    <label className="dh-editor-field dh-editor-furnished-extra">
                      <span className="dh-editor-field-label"><Sofa size={15}/> التأثيث</span>
                      <select value={form.furnished} onChange={e => update('furnished',e.target.value)}>
                        <option value="unfurnished">غير مفروش</option><option value="furnished">مفروش</option><option value="partially_furnished">مفروش جزئياً</option>
                      </select>
                    </label>
                  )}
                </div>
              </section>

              <section className="dh-editor-section" id="dh-editor-specs" aria-labelledby="dh-editor-specs-title">
                <div className="dh-editor-section-header">
                  <div className="dh-editor-section-number">02</div>
                  <div className="dh-editor-section-title"><span className="dh-editor-section-kicker">PROPERTY SPECS</span><h2 id="dh-editor-specs-title">المساحات والمواصفات</h2><p>أضف التفاصيل التي تساعد العميل على الاختيار.</p></div>
                  <div className="dh-editor-section-icon"><Ruler size={23}/></div>
                </div>
                <div className="dh-editor-section-body">
                  <div className="dh-editor-spec-grid">
                    {([
                      ['area_m2','المساحة الداخلية','م²',Ruler],
                      ['land_area_m2','مساحة الأرض','م²',Square],
                      ['bedrooms','غرف النوم','غرفة',BedDouble],
                      ['bathrooms','دورات المياه','حمّام',Bath],
                      ['living_rooms','غرف المعيشة','مجلس',Sofa],
                      ['floor_number','رقم الطابق','طابق',Layers],
                      ['total_floors','إجمالي الطوابق','طابق',Building2],
                      ['parking_spaces','مواقف السيارات','موقف',CarFront],
                      ['property_age_years','عمر العقار','سنة',CalendarDays]
                    ] as const).map(([key,label,unit,Icon]) => (
                      <label className="dh-editor-spec" key={key}>
                        <span className="dh-editor-spec-head"><Icon size={17}/>{label}</span>
                        <div className="dh-editor-spec-input"><input type="number" min={key === 'floor_number' ? undefined : 0} step="any" dir="ltr" value={form[key]} onChange={e => update(key,e.target.value)} placeholder="—" /><span>{unit}</span></div>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              <section className="dh-editor-section" id="dh-editor-languages" aria-labelledby="dh-editor-languages-title">
                <div className="dh-editor-section-header">
                  <div className="dh-editor-section-number">03</div>
                  <div className="dh-editor-section-title"><span className="dh-editor-section-kicker">GLOBAL LISTING</span><h2 id="dh-editor-languages-title">العناوين والترجمات</h2><p>ستظهر النصوص للزوار تلقائياً حسب لغة الموقع.</p></div>
                  <div className="dh-editor-section-icon"><Languages size={23}/></div>
                </div>
                <div className="dh-editor-section-body">
                  <div className="dh-editor-language-summary">
                    <div><span className="dh-editor-language-flag-stack">🇸🇦 🇫🇷 🇬🇧 🇷🇺 🇵🇰 🇮🇩</span><strong>٦ لغات مدعومة</strong></div>
                    <span>{titleCount} / 6 عناوين مُدخلة</span>
                  </div>
                  <div className="dh-editor-subhead"><span>عنوان العقار بكل لغة</span><small>العنوان العربي إلزامي — يمكنك استكمال بقية اللغات لاحقاً</small></div>
                  <div className="dh-editor-title-grid">
                    {languages.map(([lang,label,flag]) => (
                      <label key={lang} className={'dh-editor-localized-field' + (lang === 'ar' ? ' primary' : '')}>
                        <span className="dh-editor-localized-label"><span className="dh-editor-lang-flag" aria-hidden="true">{flag}</span><strong>{label}</strong>{lang === 'ar' && <span className="dh-editor-required">أساسي *</span>}{form.title[lang]?.trim() && <CheckCircle2 size={15} className="dh-editor-field-check"/>}</span>
                        <input value={form.title[lang] || ''} onChange={e => translateField('title',lang,e.target.value)} dir={lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr'} placeholder={lang === 'ar' ? 'مثال: شقة فاخرة للإيجار في المدينة المنورة' : 'عنوان العقار'} required={lang === 'ar'} lang={lang} />
                      </label>
                    ))}
                  </div>
                  <div className="dh-editor-description-area">
                    <div className="dh-editor-subhead"><span>الوصف التفصيلي</span><small>{descriptionCount} / 6 أوصاف مكتملة</small></div>
                    <div className="dh-editor-language-tabs" role="tablist" aria-label="لغة وصف العقار">
                      {languages.map(([lang,label,flag]) => (
                        <button key={lang} type="button" role="tab" aria-selected={activeDescriptionLang === lang} aria-controls="dh-editor-description-panel" className={'dh-editor-language-tab' + (activeDescriptionLang === lang ? ' active' : '')} onClick={() => setActiveDescriptionLang(lang)}><span aria-hidden="true">{flag}</span><span>{label}</span>{Boolean(form.description[lang]?.trim()) && <i aria-label="مكتمل"/>}</button>
                      ))}
                    </div>
                    <div className="dh-editor-description-panel" id="dh-editor-description-panel" role="tabpanel">
                      <label htmlFor="dh-editor-current-description" className="dh-editor-description-label"><span aria-hidden="true" className="dh-editor-lang-flag">{currentLanguage[2]}</span> وصف العقار — {currentLanguage[1]}</label>
                      <textarea id="dh-editor-current-description" rows={7} value={form.description[activeDescriptionLang] || ''} onChange={e => translateField('description',activeDescriptionLang,e.target.value)} dir={activeDescriptionLang === 'ar' || activeDescriptionLang === 'ur' ? 'rtl' : 'ltr'} lang={activeDescriptionLang} placeholder="اكتب وصفاً واضحاً للمساحة والمميزات والقرب من الخدمات..." />
                      <div className="dh-editor-description-footer"><span><Info size={14}/> يتم حفظ كل لغة بشكل مستقل.</span><span>{(form.description[activeDescriptionLang] || '').length} حرف</span></div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dh-editor-section" id="dh-editor-photos" aria-labelledby="dh-editor-photos-title">
                <div className="dh-editor-section-header">
                  <div className="dh-editor-section-number">04</div>
                  <div className="dh-editor-section-title"><span className="dh-editor-section-kicker">VISUAL STORY</span><h2 id="dh-editor-photos-title">معرض صور العقار</h2><p>صور عالية الجودة، ومعاينة فورية، وصورة غلاف مميزة.</p></div>
                  <div className="dh-editor-section-icon"><Images size={23}/></div>
                </div>
                <div className="dh-editor-section-body dh-editor-media-body">
                  <div className="dh-editor-media-explainer"><ImagePlus size={20}/><div><strong>أضف الصور ثم اختر صورة الغلاف</strong><span>تُضاف العلامة المائية تلقائياً بواسطة FFmpeg أثناء الحفظ.</span></div><span className="dh-editor-photo-counter">{totalPhotos} صورة</span></div>
                  <PropertyPhotoGallery files={files} saved={photos} selectedCover={coverChoice} onSelectCover={setCoverChoice} onFilesChange={setFiles} onRemoveSaved={photo => void removePhoto(photo)} disabled={saving || photoBusy}/>
                </div>
              </section>
            </div>

            <aside className="dh-editor-rail" aria-label="ملخص العقار والنشر">
              <div className="dh-editor-rail-sticky">
                <div className="dh-editor-rail-card dh-editor-rail-preview">
                  <span className="dh-editor-rail-overline">LIVE SUMMARY / معاينة البيانات</span>
                  <div className={'dh-editor-preview-art' + (coverPreview ? ' with-cover' : '')}>{coverPreview ? <img src={coverPreview} alt="صورة الغلاف المختارة"/> : <><Building2 size={45}/><span className="dh-editor-preview-line"/><span className="dh-editor-preview-line short"/></>}</div>
                  <div className="dh-editor-preview-details">
                    <span className="dh-editor-preview-location"><MapPin size={14}/>{selectedDistrict?.names?.ar || 'لم يتم تحديد الحي بعد'}</span>
                    <strong>{form.title.ar?.trim() || 'عنوان العقار يظهر هنا'}</strong>
                    <div className="dh-editor-preview-price" dir="ltr">{validPrice ? new Intl.NumberFormat('en-US').format(Number(form.price)) : '—'} <span className="dh-riyal-icon" role="img" aria-label="ريال سعودي"/></div>
                    <small>{form.transaction_type === 'rent' ? 'إيجار' : 'بيع'} · {types.find(([value]) => value === form.property_type)?.[1] || 'عقار'}</small>
                  </div>
                </div>
                <div className="dh-editor-rail-card dh-editor-rail-checklist">
                  <h3><ListChecks size={19}/> مراجعة سريعة</h3>
                  {([
                    [validArabicTitle,'العنوان باللغة العربية'],
                    [validPrice,'سعر صحيح'],
                    [validDistrict,'حي نشط بإحداثيات GPS'],
                    [totalPhotos > 0,'صورة واحدة على الأقل (مستحسن)']
                  ] as const).map(([done,label]) => (
                    <div key={label} className={'dh-editor-check-row' + (done ? ' done' : '')}><span className="dh-editor-check-symbol">{done ? <Check size={13}/> : <span/>}</span>{label}</div>
                  ))}
                  <nav className="dh-editor-shortcuts" aria-label="أقسام النموذج">
                    <a href="#dh-editor-basics"><span>01</span> المعلومات الأساسية <ChevronLeft size={15}/></a>
                    <a href="#dh-editor-specs"><span>02</span> المواصفات <ChevronLeft size={15}/></a>
                    <a href="#dh-editor-languages"><span>03</span> الترجمات <ChevronLeft size={15}/></a>
                    <a href="#dh-editor-photos"><span>04</span> الصور <ChevronLeft size={15}/></a>
                  </nav>
                </div>
                <div className="dh-editor-rail-card dh-editor-publishing">
                  <h3><Globe2 size={18}/> إعدادات النشر</h3>
                  <label className="dh-editor-field"><span className="dh-editor-field-label">حالة الإعلان</span><select value={form.status} onChange={e => update('status',e.target.value as Status)}>{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="dh-editor-featured-toggle"><input type="checkbox" checked={form.is_featured} onChange={e => update('is_featured',e.target.checked)}/><span><strong><Star size={15}/> عقار مميز</strong><small>إبراز هذا العقار ضمن العروض المختارة</small></span></label>
                  {form.status === 'published' && !validDistrict && <p className="dh-editor-publish-warning"><AlertCircle size={15}/> يجب تحديد حي نشط بإحداثيات GPS قبل النشر.</p>}
                  <button type="submit" className="dh-editor-submit" disabled={saving || photoBusy}><Save size={18}/>{saving ? 'جارٍ حفظ العقار...' : editing ? 'حفظ التعديلات' : 'حفظ العقار'}<ArrowUpLeft size={16}/></button>
                  <p className="dh-editor-save-hint"><ShieldCheck size={14}/> {saving ? 'جاري رفع الصور ومعالجة البيانات...' : 'يتم حفظ جميع البيانات مباشرة في Supabase.'}</p>
                </div>
              </div>
            </aside>
          </div>
          <div className="dh-editor-bottom-bar"><div><strong>{editing ? 'تعديل العقار' : 'عقار جديد'}</strong><span>راجع التفاصيل ثم احفظ عند الانتهاء</span></div><Link href="/ar/admin/dashboard?tab=properties">إلغاء والعودة</Link><button type="submit" className="dh-editor-submit" disabled={saving || photoBusy}><Save size={17}/>{saving ? 'جارٍ الحفظ...' : 'حفظ العقار'}</button></div>
        </form>
      </div>
    </main>
  );
}
