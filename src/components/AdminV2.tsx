'use client';
import {AdminDeletePropertyButton} from './AdminDeletePropertyButton';
import {SupabaseLeadsPanel} from './SupabaseLeadsPanel';
import {useDurratDashboardData} from './useDurratDashboardData';
import {SupabaseDistrictsManager} from './SupabaseDistrictsManager';

import {useEffect, useMemo, useState, type ChangeEvent, type ReactNode, type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useLocale} from 'next-intl';
import {
  Building2, LayoutDashboard, Users, Send, MapPin,
  Plus, Pencil, Trash2, Eye, EyeOff, ArrowRight,
  Save, ImagePlus, X, Search
} from 'lucide-react';
import {PropertyLocationMap} from './PropertyLocationMap';
import {DistrictManagementMap} from './DistrictManagementMap';
import './admin-v2.css';

type Lang = 'ar'|'fr'|'en'|'ru'|'ur'|'id';
type Multi = Record<Lang,string>;
type Photo = {name:string; url:string};
type District = {id:string; names:Multi; latitude?:number|null; longitude?:number|null};

type Property = {
  id:string;
  title:Multi;
  description:Multi;
  districtId:string;
  type:string;
  transaction:'sale'|'rent';
  price:number;
  area:number;
  beds:number;
  baths:number;
  latitude:number|null;
  longitude:number|null;
  photos:Photo[];
  published:boolean;
};

type Section = 'overview'|'properties'|'districts'|'leads'|'telegram';

const langs: {id:Lang;flag:string;label:string}[] = [
  {id:'ar',flag:'🇸🇦',label:'العربية'},
  {id:'fr',flag:'🇫🇷',label:'Français'},
  {id:'en',flag:'🇬🇧',label:'English'},
  {id:'ru',flag:'🇷🇺',label:'Русский'},
  {id:'ur',flag:'🇵🇰',label:'اردو'},
  {id:'id',flag:'🇮🇩',label:'Bahasa Indonesia'}
];

const emptyMulti = ():Multi => ({
  ar:'',fr:'',en:'',ru:'',ur:'',id:''
});

const blankProperty = ():Property => ({
  id:'',
  title:emptyMulti(),
  description:emptyMulti(),
  districtId:'arid',
  type:'apartment',
  transaction:'rent',
  price:0,
  area:0,
  beds:0,
  baths:0,
  latitude:null,
  longitude:null,
  photos:[],
  published:false
});

const seedDistricts:District[] = [
  {
    id:'arid',
    names:{...emptyMulti(),ar:'العريض',fr:'Al-Aridh',en:'Al-Aridh'}
  },
  {
    id:'qurban',
    names:{...emptyMulti(),ar:'قربان',fr:'Qurban',en:'Qurban'}
  },
  {
    id:'awali',
    names:{...emptyMulti(),ar:'العوالي',fr:'Al-Awali',en:'Al-Awali'}
  }
];

const seedProperties:Property[] = [
  {
    ...blankProperty(),
    id:'1001',
    title:{...emptyMulti(),ar:'شقة للإيجار في العريض'},
    districtId:'arid',
    price:42000,
    area:165,
    beds:3,
    baths:2,
    published:true
  },
  {
    ...blankProperty(),
    id:'1002',
    title:{...emptyMulti(),ar:'فيلا للبيع في العوالي'},
    districtId:'awali',
    type:'villa',
    transaction:'sale',
    price:1850000,
    area:420,
    beds:5,
    baths:4,
    published:true
  },
  {
    ...blankProperty(),
    id:'1003',
    title:{...emptyMulti(),ar:'شقة للإيجار في قربان'},
    districtId:'qurban',
    price:56000,
    area:210,
    beds:4,
    baths:3,
    published:false
  }
];

const KEY_PROPS = 'durrat-demo-properties-v2';
const KEY_DIST = 'durrat-demo-districts-v2';

function read<T>(key:string, fallback:T):T {
  try {
    const raw=localStorage.getItem(key);
    return raw?JSON.parse(raw) as T:fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key:string,value:T):boolean {
  try {
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function useData<T>(key:string, fallback:T):[T,(next:T)=>boolean,boolean] {
  const [value,setValue]=useState<T>(fallback);
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    setValue(read(key,fallback));
    setReady(true);
  },[key]);

  const save=(next:T)=>{
    const ok=write(key,next);
    if(ok)setValue(next);
    return ok;
  };

  return [value,save,ready];
}

function Shell({
  children,section,onSection
}: {
  children:ReactNode;
  section:Section;
  onSection?:(section:Section)=>void
}) {
  const locale=useLocale();

  const entries: {
    key:Section;
    label:string;
    icon:typeof Building2
  }[] = [
    {key:'overview',label:'نظرة عامة',icon:LayoutDashboard},
    {key:'properties',label:'العقارات',icon:Building2},
    {key:'districts',label:'إدارة الأحياء',icon:MapPin},
    {key:'leads',label:'العملاء المحتملون',icon:Users},
    {key:'telegram',label:'تيليجرام',icon:Send}
  ];

  return <div className="av-shell" dir="rtl">
    <aside className="av-sidebar">
      <Link href={`/${locale}`} className="av-brand">
        <img src="/brand-gold.png" alt=""/>
        <span>درة الهجرة <small>إدارة العقارات</small></span>
      </Link>

      <div className="av-side-label">لوحة الإدارة</div>

      <nav className="av-nav">
        {entries.map(({key,label,icon:Icon}) => onSection
          ? <button
              key={key}
              type="button"
              className={section===key?'selected':''}
              onClick={()=>onSection(key)}
            >
              <Icon size={19}/>{label}
            </button>
          : <Link
              key={key}
              href={`/${locale}/admin/dashboard?tab=${key}`}
              className={section===key?'selected':''}
            >
              <Icon size={19}/>{label}
            </Link>
        )}
      </nav>

      <Link href={`/${locale}/admin/login`} className="av-exit">
        العودة إلى صفحة الدخول
      </Link>
    </aside>

    <div className="av-content">
      <header className="av-topbar">
        <span>درة الهجرة / لوحة الإدارة</span>
        <strong>العربية 🇸🇦</strong>
      </header>

      <main className="av-main">{children}</main>
    </div>
  </div>;
}

function money(n:number) {
  return new Intl.NumberFormat('ar-SA').format(n);
}

export function AdminDashboard() {
  const locale=useLocale();

  const [section,setSection]=useState<Section>('overview');
  const [records,saveRecords,ready,recordsError,liveDistricts]=useDurratDashboardData<Property>();
  const [districts,saveDistricts,distReady]=useData(KEY_DIST,seedDistricts);
  const [search,setSearch]=useState('');

  useEffect(()=>{
    const tab=new URLSearchParams(window.location.search).get('tab');
    if(['overview','properties','districts','leads','telegram'].includes(tab||'')) {
      setSection(tab as Section);
    }
  },[]);

  const filtered=useMemo(
    ()=>records.filter(p=>
      [p.id,p.title.ar,p.districtId]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    ),
    [records,search]
  );

  const changeRecord=(id:string,fn:(p:Property)=>Property)=>
    saveRecords(records.map(p=>p.id===id?fn(p):p));

  return <Shell section={section} onSection={setSection}>
    <div className="av-heading">
      

      <div>
        <span className="av-eyebrow">DURRAT / ADMIN</span>

        <h1>{({
          overview:'نظرة عامة',
          properties:'إدارة العقارات',
          districts:'إدارة الأحياء',
          leads:'العملاء المحتملون',
          telegram:'تيليجرام'
        } as Record<Section,string>)[section]}</h1>

        <p>إدارة العقارات متصلة بقاعدة بيانات Supabase.</p>
        {recordsError && (
          <p role="alert" style={{color:'#b42318',marginTop:8}}>
            {recordsError}
          </p>
        )}
      </div>

      <Link className="av-btn av-primary" href={`/${locale}/admin/properties/new`}>
        <Plus size={19}/>
        إضافة عقار
      </Link>
    </div>

    {(section==='overview'||section==='properties')&&<>
      {section==='overview'&&
        <div className="av-stats">
          <div>
            <span>جميع العقارات</span>
            <strong>{records.length}</strong>
          </div>
          <div>
            <span>منشور</span>
            <strong>{records.filter(p=>p.published).length}</strong>
          </div>
          <div>
            <span>مسودة</span>
            <strong>{records.filter(p=>(p as Property & {status?:string}).status==='draft').length}</strong>
          </div>
          <div>
            <span>عدد الأحياء</span>
            <strong>{liveDistricts.length}</strong>
          </div>
        </div>
      }

      <section className="av-panel">
        <div className="av-panel-head">
          <h2>قائمة العقارات</h2>

          <label className="av-search">
            <Search size={17}/>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="البحث عن عقار"
            />
          </label>
        </div>

        <div className="av-table-scroll">
          <table className="av-table">
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
              {ready&&filtered.map(p=>
                <tr key={p.id}>
                  <td>
                    <div className="av-property">
                      <div className="av-cover">
                        {p.photos[0]
                          ? <img src={p.photos[0].url} alt=""/>
                          : <Building2 size={22}/>
                        }
                      </div>

                      <span>
                        <strong>{p.title.ar||'بدون عنوان'}</strong>
                        <small>#{(p as Property & {reference?:string}).reference || p.id}</small>
                      </span>
                    </div>
                  </td>

                  <td>
                    {liveDistricts.find(d=>d.id===p.districtId)?.names.ar || '—'}
                  </td>

                  <td dir="ltr">{money(p.price)} <span className="dh-riyal-icon" role="img" aria-label="ريال سعودي" /></td>

                  <td>
                    <span className={p.published?'av-tag on':'av-tag'}>
                      {p.published?'منشور':'مسودة'}
                    </span>
                  </td>

                  <td>
                    <div className="av-actions">
                      <Link
                        title="تعديل العقار"
                        aria-label="تعديل العقار"
                        href={`/${locale}/admin/properties/${p.id}/edit`}
                      >
                        <Pencil size={18}/>
                      </Link>

                      <button
                        title="تغيير حالة النشر"
                        aria-label="تغيير حالة النشر"
                        onClick={()=>
                          changeRecord(
                            p.id,
                            x=>({...x,published:!x.published})
                          )
                        }
                      >
                        {p.published
                          ? <EyeOff size={18}/>
                          : <Eye size={18}/>
                        }
                      </button>

                      <AdminDeletePropertyButton propertyId={p.id}/>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {ready&&filtered.length===0&&
            <p className="av-empty">لا توجد عقارات مطابقة</p>
          }
        </div>
      </section>
    </>}

    {section==='districts'&&distReady&&
      <SupabaseDistrictsManager />
    }

    {section==='leads' && <SupabaseLeadsPanel/>}

    {section==='telegram'&&
      <div className="av-panel av-placeholder">
        <Send size={36}/>
        <h2>الربط مع تيليجرام</h2>
        <p>سيتم إعداد النشر الآلي بعد الانتهاء من الواجهة.</p>
      </div>
    }
  </Shell>;
}

function DistrictManager({
  districts,records,onSave
}:{
  districts:District[];
  records:Property[];
  onSave:(d:District[])=>boolean
}) {
  const [editing,setEditing]=useState<string|null>(null);
  const [names,setNames]=useState<Multi>(emptyMulti());
  const [notice,setNotice]=useState('');
  const [position,setPosition]=useState<{latitude:number|null;longitude:number|null}>({latitude:null,longitude:null});

  function submit(e:FormEvent) {
    e.preventDefault();

    if(!names.ar.trim())return;

    if(districts.some(
      d=>d.id!==editing&&d.names.ar.trim()===names.ar.trim()
    )) {
      setNotice('هذا الحي موجود مسبقاً.');
      return;
    }

    if(
      position.latitude===null ||
      position.longitude===null ||
      !Number.isFinite(position.latitude) ||
      !Number.isFinite(position.longitude) ||
      Math.abs(position.latitude)>90 ||
      Math.abs(position.longitude)>180
    ) {
      setNotice('يرجى تحديد موقع الحي على الخريطة قبل الحفظ.');
      return;
    }
    const item={
      id:editing||`district-${Date.now()}`,
      names,
      latitude:position.latitude,
      longitude:position.longitude
    };

    const next=editing
      ? districts.map(d=>d.id===editing?item:d)
      : [...districts,item];

    if(!onSave(next)) {
      setNotice('تعذر حفظ البيانات في المتصفح.');
      return;
    }

    setEditing(null);
    setNames(emptyMulti());
    setPosition({latitude:null,longitude:null});
    setNotice('تم حفظ الحي بنجاح.');
  }

  return <>
    <section className="av-panel av-padding av-district-map-panel">
      <h2>خريطة الأحياء</h2>

      <DistrictManagementMap
        districts={districts}
        editingId={editing}
        position={position}
        onPick={setPosition}
        onEdit={district=>{
          setEditing(district.id);
          setNames({...emptyMulti(), ...district.names});
          setPosition({
            latitude:district.latitude??null,
            longitude:district.longitude??null
          });
          setNotice('');
        }}
      />
    </section>

    <div className="av-columns">
    <section className="av-panel av-padding">
      <h2>{editing?'تعديل الحي':'إضافة حي جديد'}</h2>

      <form onSubmit={submit} className="av-form">
        <MultiInputs
          names={names}
          setNames={setNames}
          title="اسم الحي بجميع اللغات"
          description={false}
        />

        <div className="av-fields av-district-coords">
          <label>
            <span>خط العرض — Latitude</span>
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              dir="ltr"
              value={position.latitude??''}
              onChange={e=>setPosition(p=>({
                ...p,
                latitude:e.target.value===''?null:Number(e.target.value)
              }))}
            />
          </label>

          <label>
            <span>خط الطول — Longitude</span>
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              dir="ltr"
              value={position.longitude??''}
              onChange={e=>setPosition(p=>({
                ...p,
                longitude:e.target.value===''?null:Number(e.target.value)
              }))}
            />
          </label>
        </div>

        <div className="av-controls">
          <button type="submit" className="av-btn av-primary">
            <Save size={17}/>
            حفظ الحي
          </button>

          {editing&&
            <button
              className="av-btn av-outline"
              type="button"
              onClick={()=>{
                setEditing(null);
                setNames(emptyMulti());
    setPosition({latitude:null,longitude:null});
              }}
            >
              إلغاء
            </button>
          }
        </div>

        {notice&&
          <p role="status" className="av-notice">{notice}</p>
        }
      </form>
    </section>

    <section className="av-panel av-padding">
      <h2>الأحياء المسجلة ({districts.length})</h2>

      <div className="av-district-list">
        {districts.map(d=>
          <div className="av-district" key={d.id}>
            <span>
              <MapPin size={17}/>
              <strong>{d.names.ar}</strong>
            </span>

            <div className="av-actions">
              <button
                type="button"
                aria-label="تعديل الحي"
                onClick={()=>{
                  setEditing(d.id);
                  setNames({...d.names});
                  setPosition({latitude:d.latitude??null,longitude:d.longitude??null});
                  setNotice('');
                }}
              >
                <Pencil size={17}/>
              </button>

              <button
                type="button"
                aria-label="حذف الحي"
                onClick={()=>{
                  if(records.some(p=>p.districtId===d.id)) {
                    setNotice('لا يمكن حذف حي مرتبط بعقارات.');
                    return;
                  }

                  if(window.confirm('حذف هذا الحي؟')) {
                    onSave(districts.filter(x=>x.id!==d.id));
                  }
                }}
              >
                <Trash2 size={17}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  </div>
  </>;
}

function MultiInputs({
  names,setNames,title,description
}:{
  names:Multi;
  setNames:(n:Multi)=>void;
  title:string;
  description:boolean
}) {
  return <fieldset className="av-translations">
    <legend>{title}</legend>

    <div className="av-fields">
      {langs.map(l=>
        <label key={l.id}>
          <span>
            {l.flag} {l.label} {l.id==='ar'?'*':''}
          </span>

          {description
            ? <textarea
                rows={4}
                dir={l.id==='ar'||l.id==='ur'?'rtl':'ltr'}
                value={names[l.id]}
                onChange={e=>setNames({
                  ...names,[l.id]:e.target.value
                })}
              />
            : <input
                required={l.id==='ar'}
                dir={l.id==='ar'||l.id==='ur'?'rtl':'ltr'}
                value={names[l.id]}
                onChange={e=>setNames({
                  ...names,[l.id]:e.target.value
                })}
              />
          }
        </label>
      )}
    </div>
  </fieldset>;
}

async function photoPreview(file:File):Promise<Photo> {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)) {
    throw new Error('اختر صورة JPG أو PNG أو WebP فقط.');
  }

  if(file.size>10*1024*1024) {
    throw new Error('حجم الصورة أكبر من 10 ميغابايت.');
  }

  const url=URL.createObjectURL(file);

  try {
    return await new Promise<Photo>((resolve,reject)=>{
      const image=new window.Image();

      image.onerror=()=>
        reject(new Error('تعذر قراءة الصورة.'));

      image.onload=()=>{
        const scale=Math.min(
          1,
          760/Math.max(image.naturalWidth,image.naturalHeight)
        );

        const canvas=document.createElement('canvas');

        canvas.width=Math.round(image.naturalWidth*scale);
        canvas.height=Math.round(image.naturalHeight*scale);

        const ctx=canvas.getContext('2d');

        if(!ctx) {
          reject(new Error('تعذر معالجة الصورة.'));
          return;
        }

        ctx.drawImage(image,0,0,canvas.width,canvas.height);

        resolve({
          name:file.name,
          url:canvas.toDataURL('image/jpeg',0.65)
        });
      };

      image.src=url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AdminPropertyForm({editId}:{editId?:string}) {
  const locale=useLocale();
  const router=useRouter();

  const [form,setForm]=useState<Property>(blankProperty());
  const [districts,setDistricts]=useState<District[]>(seedDistricts);
  const [ready,setReady]=useState(false);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const stored=read(KEY_PROPS,seedProperties);
    const options=read(KEY_DIST,seedDistricts);

    setDistricts(options);

    if(editId) {
      const found=stored.find(x=>x.id===editId);

      if(found) {
        setForm(found);
      } else {
        setNotice('العقار غير موجود.');
      }
    } else if(options.length) {
      setForm(x=>({...x,districtId:options[0].id}));
    }

    setReady(true);
  },[editId]);

  const update=(patch:Partial<Property>)=>
    setForm(f=>({...f,...patch}));

  async function photosChanged(e:ChangeEvent<HTMLInputElement>) {
    const files=Array.from(e.target.files||[]);

    e.target.value='';

    if(!files.length)return;

    if(files.length+form.photos.length>6) {
      setNotice('الحد الأقصى ست صور للعقار الواحد.');
      return;
    }

    setBusy(true);
    setNotice('');

    try {
      const uploaded=await Promise.all(files.map(photoPreview));

      setForm(f=>({
        ...f,
        photos:[...f.photos,...uploaded].slice(0,6)
      }));
    } catch(error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'تعذر إضافة الصور.'
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(e:FormEvent) {
    e.preventDefault();

    if(
      !form.title.ar.trim() ||
      !form.districtId ||
      form.price<=0 ||
      form.area<=0
    ) {
      setNotice('يرجى إدخال العنوان والحي والسعر والمساحة.');
      return;
    }

    const records=read(KEY_PROPS,seedProperties);

    const entity={
      ...form,
      id:editId||String(Date.now())
    };

    const next=editId
      ? records.map(p=>p.id===editId?entity:p)
      : [entity,...records];

    if(!write(KEY_PROPS,next)) {
      setNotice('مساحة التخزين ممتلئة. قلّل عدد الصور أو حجمها.');
      return;
    }

    router.push(`/${locale}/admin/dashboard?tab=properties`);
  }

  return <Shell section="properties">
    <div className="av-heading">
      

      <div>
        <span className="av-eyebrow">DURRAT / PROPERTY</span>

        <h1>
          {editId?'تعديل العقار':'إضافة عقار جديد'}
        </h1>

        <p>أدخل معلومات العقار وترجماته، ثم احفظه.</p>
      </div>

      <Link
        className="av-btn av-outline"
        href={`/${locale}/admin/dashboard?tab=properties`}
      >
        <ArrowRight size={18}/>
        عودة للعقارات
      </Link>
    </div>

    {!ready
      ? <p>جارٍ تحميل البيانات...</p>
      : <form className="av-edit" onSubmit={submit}>

        <section className="av-panel av-padding">
          <h2>البيانات الأساسية</h2>

          <div className="av-fields">
            <label>
              <span>نوع العقار</span>

              <select
                value={form.type}
                onChange={e=>update({type:e.target.value})}
              >
                <option value="apartment">شقة</option>
                <option value="villa">فيلا</option>
                <option value="land">أرض</option>
                <option value="building">عمارة</option>
                <option value="shop">محل تجاري</option>
              </select>
            </label>

            <label>
              <span>نوع العملية</span>

              <select
                value={form.transaction}
                onChange={e=>update({
                  transaction:e.target.value as 'rent'|'sale'
                })}
              >
                <option value="rent">إيجار</option>
                <option value="sale">بيع</option>
              </select>
            </label>

            <label>
              <span>الحي</span>

              <select
                required
                value={form.districtId}
                onChange={e=>update({districtId:e.target.value})}
              >
                {districts.map(d=>
                  <option key={d.id} value={d.id}>
                    {d.names.ar}
                  </option>
                )}
              </select>
            </label>

            <label>
              <span>السعر (ريال سعودي)</span>

              <input
                type="number"
                required
                min="1"
                value={form.price||''}
                onChange={e=>update({
                  price:Number(e.target.value)
                })}
              />
            </label>

            <label>
              <span>المساحة (م²)</span>

              <input
                type="number"
                required
                min="1"
                value={form.area||''}
                onChange={e=>update({
                  area:Number(e.target.value)
                })}
              />
            </label>

            {form.type!=='land'&&<>
              <label>
                <span>غرف النوم</span>

                <input
                  type="number"
                  min="0"
                  value={form.beds}
                  onChange={e=>update({
                    beds:Number(e.target.value)
                  })}
                />
              </label>

              <label>
                <span>دورات المياه</span>

                <input
                  type="number"
                  min="0"
                  value={form.baths}
                  onChange={e=>update({
                    baths:Number(e.target.value)
                  })}
                />
              </label>
            </>}
          </div>
        </section>

        <section className="av-panel av-padding">
          <MultiInputs
            title="عنوان العقار بجميع اللغات"
            names={form.title}
            setNames={title=>update({title})}
            description={false}
          />
        </section>

        <section className="av-panel av-padding">
          <MultiInputs
            title="وصف العقار بجميع اللغات"
            names={form.description}
            setNames={description=>update({description})}
            description={true}
          />
        </section>

        <section className="av-panel av-padding">
          <h2>موقع العقار على الخريطة</h2>

          <p className="av-muted">
            حدد الموقع الدقيق للعقار بالضغط على الخريطة.
            يمكنك أيضاً إدخال الإحداثيات يدوياً.
          </p>

          <PropertyLocationMap
            latitude={form.latitude ?? null}
            longitude={form.longitude ?? null}
            onChange={(latitude, longitude) =>
              update({latitude, longitude})
            }
          />

          <div className="av-fields av-map-coordinates">

            <label>
              <span>خط العرض (Latitude)</span>

              <input
                type="number"
                min="-90"
                max="90"
                step="any"
                dir="ltr"
                placeholder="24.467200"
                value={form.latitude ?? ''}
                onChange={e =>
                  update({
                    latitude: e.target.value === ''
                      ? null
                      : Number(e.target.value)
                  })
                }
              />
            </label>

            <label>
              <span>خط الطول (Longitude)</span>

              <input
                type="number"
                min="-180"
                max="180"
                step="any"
                dir="ltr"
                placeholder="39.611100"
                value={form.longitude ?? ''}
                onChange={e =>
                  update({
                    longitude: e.target.value === ''
                      ? null
                      : Number(e.target.value)
                  })
                }
              />
            </label>

          </div>

          <button
            type="button"
            className="av-btn av-outline av-map-clear"
            onClick={() =>
              update({
                latitude: null,
                longitude: null
              })
            }
          >
            إزالة تحديد الموقع
          </button>

          {form.latitude != null &&
           form.longitude != null && (
            <a
              className="av-map-google-link"
              href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              فتح الموقع في خرائط Google ↗
            </a>
          )}
        </section>
        <section className="av-panel av-padding">
          <h2>صور العقار</h2>

          <p className="av-muted">
            يمكنك اختيار حتى 6 صور (JPG, PNG, WebP).
            يتم تصغيرها وتخزينها محلياً للتجربة فقط،
            بدون رفعها إلى خادم.
          </p>

          <label className="av-upload">
            <ImagePlus size={29}/>
            <strong>اختيار الصور</strong>
            <span>حد أقصى 6 صور، 10 MB لكل صورة</span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={photosChanged}
            />
          </label>

          <div className="av-photo-grid">
            {form.photos.map((p,i)=>
              <div key={i} className="av-photo">
                <img src={p.url} alt={p.name}/>

                <button
                  type="button"
                  aria-label="حذف الصورة"
                  onClick={()=>update({
                    photos:form.photos.filter((_,j)=>i!==j)
                  })}
                >
                  <X size={16}/>
                </button>

                {i===0&&
                  <small>الصورة الرئيسية</small>
                }
              </div>
            )}
          </div>
        </section>

        <section className="av-panel av-padding">
          <label className="av-check">
            <input
              type="checkbox"
              checked={form.published}
              onChange={e=>update({
                published:e.target.checked
              })}
            />

            نشر العقار في القائمة التجريبية
          </label>

          <p className="av-muted">
            التجربة محلية: لن يظهر العقار بعد على الموقع العام
            ولن يُنشر على تيليجرام.
          </p>
        </section>

        {notice&&
          <p role="alert" className="av-notice">
            {notice}
          </p>
        }

        <div className="av-controls">
          <button
            disabled={busy}
            type="submit"
            className="av-btn av-primary"
          >
            <Save size={18}/>
            {busy?'جارٍ معالجة الصور...':'حفظ العقار'}
          </button>

          <Link
            className="av-btn av-outline"
            href={`/${locale}/admin/dashboard?tab=properties`}
          >
            إلغاء
          </Link>
        </div>
      </form>
    }
  </Shell>;
}