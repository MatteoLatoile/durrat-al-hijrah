'use client';

import {useCallback, useEffect, useMemo, useState, type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {DistrictManagementMap} from './DistrictManagementMap';
import {
  Plus,
  Save,
  Pencil,
  Trash2,
  MapPin,
  CheckCircle2,
  X,
  RefreshCw
} from 'lucide-react';
import './supabase-districts.css';

const LANGS = [
  {key: 'ar', label: 'العربية'},
  {key: 'fr', label: 'الفرنسية'},
  {key: 'en', label: 'الإنجليزية'},
  {key: 'ru', label: 'الروسية'},
  {key: 'ur', label: 'الأردية'},
  {key: 'id', label: 'الإندونيسية'}
] as const;

type Language = typeof LANGS[number]['key'];

type Names = Record<Language, string>;

type Position = {
  latitude: number | null;
  longitude: number | null;
};

type City = {
  id: string;
  slug: string;
  names: Record<string, string>;
  latitude: number | null;
  longitude: number | null;
};

type District = {
  id: string;
  city_id: string;
  slug: string;
  names: Record<string, string>;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
};

type Message = {
  text: string;
  type: 'success' | 'error';
};

function emptyNames(): Names {
  return {
    ar: '',
    fr: '',
    en: '',
    ru: '',
    ur: '',
    id: ''
  };
}

function readableNames(value: unknown): Record<string, string> {
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

function cityLabel(city: City): string {
  return city.names.ar || city.names.en || city.slug;
}

function validPosition(position: Position): boolean {
  return (
    position.latitude !== null &&
    position.longitude !== null &&
    Number.isFinite(position.latitude) &&
    Number.isFinite(position.longitude) &&
    position.latitude >= -90 &&
    position.latitude <= 90 &&
    position.longitude >= -180 &&
    position.longitude <= 180
  );
}

export function SupabaseDistrictsManager() {

  const supabase = useMemo(() => createClient(), []);

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [cityId, setCityId] = useState('');
  const [names, setNames] = useState<Names>(emptyNames());

  const [position, setPosition] = useState<Position>({
    latitude: null,
    longitude: null
  });

  const [isActive, setIsActive] = useState(true);

  const [search, setSearch] = useState('');

  const [message, setMessage] = useState<Message | null>(null);

  // -------------------------------------
  // LECTURE REELLE DE SUPABASE
  // -------------------------------------

  const loadData = useCallback(async () => {

    setLoading(true);

    try {

      const {data: authData, error: authError} =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error('يرجى تسجيل الدخول إلى لوحة الإدارة.');
      }

      const [cityResponse, districtResponse] = await Promise.all([
        supabase
          .from('cities')
          .select('id,slug,names,latitude,longitude')
          .order('slug'),

        supabase
          .from('districts')
          .select(
            'id,city_id,slug,names,latitude,longitude,is_active,created_at'
          )
          .order('created_at', {ascending: false})
      ]);

      if (cityResponse.error) {
        throw cityResponse.error;
      }

      if (districtResponse.error) {
        throw districtResponse.error;
      }

      const loadedCities: City[] = (cityResponse.data ?? []).map(
        (city) => ({
          ...city,
          names: readableNames(city.names)
        })
      );

      const loadedDistricts: District[] =
        (districtResponse.data ?? []).map(
          (district) => ({
            ...district,
            names: readableNames(district.names)
          })
        );

      setCities(loadedCities);
      setDistricts(loadedDistricts);

      setCityId(previous =>
        previous || loadedCities[0]?.id || ''
      );

    } catch (error) {

      setMessage({
        type: 'error',
        text: error instanceof Error
          ? error.message
          : 'تعذر الاتصال بقاعدة البيانات.'
      });

    } finally {
      setLoading(false);
    }

  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // -------------------------------------
  // FORMULAIRE
  // -------------------------------------

  function resetForm() {
    setEditingId(null);
    setNames(emptyNames());
    setPosition({
      latitude: null,
      longitude: null
    });
    setIsActive(true);
    setMessage(null);
  }

  function editDistrict(district: District) {

    const savedNames = readableNames(district.names);

    const translations = emptyNames();

    for (const lang of LANGS) {
      translations[lang.key] = savedNames[lang.key] || '';
    }

    setEditingId(district.id);
    setCityId(district.city_id);
    setNames(translations);

    setPosition({
      latitude: district.latitude,
      longitude: district.longitude
    });

    setIsActive(district.is_active);
    setMessage(null);

  }

  function updateName(language: Language, value: string) {
    setNames(previous => ({
      ...previous,
      [language]: value
    }));
  }

  // -------------------------------------
  // ENREGISTREMENT SUPABASE
  // -------------------------------------

  async function saveDistrict(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    if (saving) return;

    if (!cityId) {
      setMessage({
        type: 'error',
        text: 'يرجى اختيار المدينة.'
      });
      return;
    }

    if (!names.ar.trim()) {
      setMessage({
        type: 'error',
        text: 'اسم الحي باللغة العربية مطلوب.'
      });
      return;
    }

    if (!validPosition(position)) {
      setMessage({
        type: 'error',
        text: 'يرجى تحديد موقع الحي على الخريطة.'
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {

      const translatedNames = Object.fromEntries(
        LANGS.map(language => [
          language.key,
          names[language.key].trim()
        ])
      );

      const values = {
        city_id: cityId,
        names: translatedNames,
        latitude: position.latitude,
        longitude: position.longitude,
        is_active: isActive
      };

      if (editingId) {

        const {error} = await supabase
          .from('districts')
          .update(values)
          .eq('id', editingId);

        if (error) throw error;

      } else {

        const slugBase = (
          names.en ||
          names.fr ||
          'district'
        )
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 45) || 'district';

        const slug =
          slugBase + '-' + crypto.randomUUID().slice(0, 8);

        const {error} = await supabase
          .from('districts')
          .insert({
            ...values,
            slug
          });

        if (error) throw error;

      }

      await loadData();
      resetForm();

      setMessage({
        type: 'success',
        text: 'تم حفظ الحي بنجاح في قاعدة بيانات Supabase.'
      });

    } catch (error) {

      setMessage({
        type: 'error',
        text: error instanceof Error
          ? error.message
          : 'تعذر حفظ الحي.'
      });

    } finally {
      setSaving(false);
    }

  }

  // -------------------------------------
  // ACTIVER / DESACTIVER
  // -------------------------------------

  async function toggleDistrict(district: District) {

    setBusyId(district.id);
    setMessage(null);

    try {

      const {error} = await supabase
        .from('districts')
        .update({
          is_active: !district.is_active
        })
        .eq('id', district.id);

      if (error) throw error;

      await loadData();

      setMessage({
        type: 'success',
        text: 'تم تحديث حالة الحي.'
      });

    } catch (error) {

      setMessage({
        type: 'error',
        text: error instanceof Error
          ? error.message
          : 'تعذر تحديث الحي.'
      });

    } finally {
      setBusyId(null);
    }

  }

  // -------------------------------------
  // SUPPRIMER
  // -------------------------------------

  async function deleteDistrict(district: District) {

    if (!window.confirm(
      `هل تريد حذف الحي "${district.names.ar || district.slug}"؟`
    )) {
      return;
    }

    setBusyId(district.id);
    setMessage(null);

    try {

      const {error} = await supabase
        .from('districts')
        .delete()
        .eq('id', district.id);

      if (error) throw error;

      if (editingId === district.id) {
        resetForm();
      }

      await loadData();

      setMessage({
        type: 'success',
        text: 'تم حذف الحي من قاعدة البيانات.'
      });

    } catch (error) {

      setMessage({
        type: 'error',
        text:
          'تعذر حذف الحي. إذا كان مرتبطاً بعقارات، قم بتعطيله بدلاً من حذفه.'
      });

    } finally {
      setBusyId(null);
    }

  }

  // -------------------------------------
  // DONNEES DE LA CARTE
  // -------------------------------------

  const mapDistricts = districts.map(district => ({
    id: district.id,
    names: district.names,
    latitude: district.latitude,
    longitude: district.longitude
  }));

  const filteredDistricts = districts.filter(district => {

    const query = search.trim().toLowerCase();

    if (!query) return true;

    const city = cities.find(
      item => item.id === district.city_id
    );

    return (
      Object.values(district.names).some(value =>
        value.toLowerCase().includes(query)
      ) ||
      district.slug.toLowerCase().includes(query) ||
      (city ? cityLabel(city).toLowerCase().includes(query) : false)
    );

  });

  return (
    <div className="dh-sd" dir="rtl">

      {/* ENTETE */}

      <div className="dh-sd-header">

        <div>
          <span className="dh-sd-eyebrow">
            DURRAT / SUPABASE
          </span>

          <h2>إدارة الأحياء</h2>

          <p>
            إدارة مواقع الأحياء والترجمات وربطها بقاعدة البيانات
          </p>
        </div>

        <div className="dh-sd-header-actions">

          <span className="dh-sd-database-badge">
            <span/>
            SUPABASE
          </span>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading || saving}
            className="dh-sd-refresh"
          >
            <RefreshCw size={16}/>
            تحديث البيانات
          </button>

        </div>

      </div>

      {/* NOTIFICATION */}

      {message && (
        <div
          className={
            'dh-sd-message ' +
            (message.type === 'error' ? 'error' : 'success')
          }
          role="alert"
        >
          {message.type === 'success'
            ? <CheckCircle2 size={18}/>
            : <X size={18}/>
          }

          <span>{message.text}</span>
        </div>
      )}

      {/* CARTE EXISTANTE */}

      <section className="dh-sd-map-panel">

        <div className="dh-sd-section-heading">
          <div>
            <h3>خريطة الأحياء</h3>
            <p>
              اضغط على الخريطة أو اسحب العلامة لتحديد الموقع
            </p>
          </div>

          <span>
            {districts.length} أحياء
          </span>
        </div>

        <DistrictManagementMap
          districts={mapDistricts}
          editingId={editingId}
          position={position}
          onPick={setPosition}
          onEdit={district => {
            const original = districts.find(
              item => item.id === district.id
            );

            if (original) {
              editDistrict(original);
            }
          }}
        />

      </section>

      <div className="dh-sd-columns">

        {/* FORMULAIRE */}

        <section className="dh-sd-panel">

          <div className="dh-sd-section-heading">

            <div>
              <h3>
                {editingId ? 'تعديل الحي' : 'إضافة حي جديد'}
              </h3>

              <p>
                يتم حفظ جميع التغييرات في Supabase
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                className="dh-sd-icon-button"
                onClick={resetForm}
                title="إلغاء التعديل"
              >
                <X size={18}/>
              </button>
            )}

          </div>

          <form
            className="dh-sd-form"
            onSubmit={saveDistrict}
          >

            <label className="dh-sd-label">
              <span>المدينة *</span>

              <select
                value={cityId}
                onChange={event => setCityId(event.target.value)}
                required
              >
                <option value="">
                  اختر المدينة
                </option>

                {cities.map(city => (
                  <option key={city.id} value={city.id}>
                    {cityLabel(city)}
                  </option>
                ))}
              </select>
            </label>

            <div className="dh-sd-divider">
              أسماء الحي بجميع اللغات
            </div>

            <div className="dh-sd-language-fields">

              {LANGS.map(lang => (

                <label
                  key={lang.key}
                  className="dh-sd-label"
                >
                  <span>
                    {lang.label}
                    {lang.key === 'ar' ? ' *' : ''}
                  </span>

                  <input
                    type="text"
                    value={names[lang.key]}
                    onChange={event =>
                      updateName(lang.key, event.target.value)
                    }
                    dir={
                      lang.key === 'ar' || lang.key === 'ur'
                        ? 'rtl'
                        : 'ltr'
                    }
                    placeholder={
                      lang.key === 'ar'
                        ? 'مثال: حي العريض'
                        : ''
                    }
                    required={lang.key === 'ar'}
                  />

                </label>

              ))}

            </div>

            <div className="dh-sd-divider">
              الموقع الجغرافي
            </div>

            <div className="dh-sd-coordinates">

              <label className="dh-sd-label">
                <span>خط العرض</span>

                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  dir="ltr"
                  value={position.latitude ?? ''}
                  onChange={event =>
                    setPosition(previous => ({
                      ...previous,
                      latitude: event.target.value === ''
                        ? null
                        : Number(event.target.value)
                    }))
                  }
                />
              </label>

              <label className="dh-sd-label">
                <span>خط الطول</span>

                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  dir="ltr"
                  value={position.longitude ?? ''}
                  onChange={event =>
                    setPosition(previous => ({
                      ...previous,
                      longitude: event.target.value === ''
                        ? null
                        : Number(event.target.value)
                    }))
                  }
                />
              </label>

            </div>

            <p className="dh-sd-helper">
              <MapPin size={14}/>
              يمكنك تحديد الإحداثيات مباشرة من الخريطة أعلاه.
            </p>

            <label className="dh-sd-switch">
              <input
                type="checkbox"
                checked={isActive}
                onChange={event =>
                  setIsActive(event.target.checked)
                }
              />

              <span>الحي نشط ومتاح للعرض</span>
            </label>

            <div className="dh-sd-form-actions">

              <button
                type="submit"
                disabled={saving || loading}
                className="dh-sd-save"
              >
                <Save size={17}/>

                {saving
                  ? 'جارٍ الحفظ...'
                  : editingId
                    ? 'حفظ التعديلات'
                    : 'إضافة الحي'
                }
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="dh-sd-cancel"
                >
                  إلغاء
                </button>
              )}

            </div>

          </form>

        </section>

        {/* LISTE DES QUARTIERS */}

        <section className="dh-sd-panel">

          <div className="dh-sd-section-heading">

            <div>
              <h3>الأحياء المسجلة</h3>
              <p>
                جميع الأحياء المحفوظة في قاعدة البيانات
              </p>
            </div>

            <span className="dh-sd-count">
              {districts.length}
            </span>

          </div>

          <div className="dh-sd-search-wrap">
            <input
              type="search"
              placeholder="البحث عن حي أو مدينة..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>

          <div className="dh-sd-list">

            {loading ? (

              <div className="dh-sd-empty">
                جارٍ تحميل الأحياء من Supabase...
              </div>

            ) : filteredDistricts.length === 0 ? (

              <div className="dh-sd-empty">
                <MapPin size={28}/>

                <p>لا توجد أحياء مسجلة حالياً</p>

                <small>
                  أضف أول حي باستخدام النموذج.
                </small>
              </div>

            ) : (

              filteredDistricts.map(district => {

                const city = cities.find(
                  item => item.id === district.city_id
                );

                return (
                  <div
                    className="dh-sd-list-item"
                    key={district.id}
                  >

                    <div className="dh-sd-list-icon">
                      <MapPin size={19}/>
                    </div>

                    <div className="dh-sd-list-info">

                      <strong>
                        {district.names.ar || district.slug}
                      </strong>

                      <span>
                        {city ? cityLabel(city) : '—'}
                      </span>

                      <small dir="ltr">
                        {district.latitude ?? '—'},
                        {' '}
                        {district.longitude ?? '—'}
                      </small>

                      <span
                        className={
                          'dh-sd-status ' +
                          (district.is_active ? 'active' : 'inactive')
                        }
                      >
                        {district.is_active ? 'نشط' : 'غير نشط'}
                      </span>

                    </div>

                    <div className="dh-sd-item-actions">

                      <button
                        type="button"
                        title="تعديل"
                        onClick={() => editDistrict(district)}
                        disabled={busyId !== null}
                      >
                        <Pencil size={16}/>
                      </button>

                      <button
                        type="button"
                        title={
                          district.is_active
                            ? 'تعطيل'
                            : 'تفعيل'
                        }
                        onClick={() => void toggleDistrict(district)}
                        disabled={busyId !== null}
                      >
                        {district.is_active ? '◉' : '○'}
                      </button>

                      <button
                        type="button"
                        className="danger"
                        title="حذف"
                        onClick={() => void deleteDistrict(district)}
                        disabled={busyId !== null}
                      >
                        <Trash2 size={16}/>
                      </button>

                    </div>

                  </div>
                );

              })

            )}

          </div>

        </section>

      </div>

      <div className="dh-sd-footer">
        <CheckCircle2 size={16}/>
        متصل بقاعدة بيانات Supabase — لا يتم حفظ البيانات في المتصفح
      </div>

    </div>
  );
}