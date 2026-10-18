'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import './supabase-leads.css';

type Lead = {
  id: string;
  full_name: string;
  whatsapp_phone: string;
  email: string | null;
  message: string | null;
  status: string;
  created_at: string;
  preferred_language: string;
  properties: {
    reference: string;
    title: Record<string, string>;
  } | null;
};

const statuses = [
  ['new', 'جديد'],
  ['contacted', 'تم التواصل'],
  ['qualified', 'مهتم'],
  ['closed', 'مغلق'],
  ['spam', 'غير مرغوب']
];

export function SupabaseLeadsPanel() {
  const supabase = useMemo(() => createClient(), []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const {data, error: dbError} = await supabase
      .from('leads')
      .select(`
        id,
        full_name,
        whatsapp_phone,
        email,
        message,
        status,
        created_at,
        preferred_language,
        properties (
          reference,
          title
        )
      `)
      .order('created_at', {ascending: false})
      .limit(200);

    if (dbError) {
      setError(dbError.message);
    } else {
      setLeads((data || []) as unknown as Lead[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    setError('');

    const {error: dbError} = await supabase
      .from('leads')
      .update({status})
      .eq('id', id);

    if (dbError) {
      setError(dbError.message);
    } else {
      setLeads(previous =>
        previous.map(item =>
          item.id === id ? {...item, status} : item
        )
      );
    }

    setBusyId('');
  }

  return (
    <section className="dh-leads" dir="rtl">
      <div className="dh-leads-heading">
        <div>
          <h2>طلبات العملاء</h2>
          <p>الطلبات المسجلة من الموقع الإلكتروني</p>
        </div>

        <button type="button" onClick={() => void load()}>
          تحديث
        </button>
      </div>

      <div className="dh-leads-counts">
        <span>جميع الطلبات: {leads.length}</span>
        <span>
          طلبات جديدة: {leads.filter(x => x.status === 'new').length}
        </span>
      </div>

      {error && (
        <p role="alert" className="dh-leads-error">{error}</p>
      )}

      {loading ? (
        <p className="dh-leads-empty">جارٍ تحميل الطلبات...</p>
      ) : leads.length === 0 ? (
        <p className="dh-leads-empty">لا توجد طلبات حتى الآن</p>
      ) : (
        <div className="dh-leads-table-wrap">
          <table className="dh-leads-table">
            <thead>
              <tr>
                <th>العميل</th>
                <th>العقار</th>
                <th>تاريخ الطلب</th>
                <th>الحالة</th>
                <th>التواصل</th>
              </tr>
            </thead>

            <tbody>
              {leads.map(lead => {
                const customerPhone =
                  lead.whatsapp_phone.replace(/\D/g, '');

                return (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.full_name}</strong>
                      <small dir="ltr">{lead.whatsapp_phone}</small>
                      {lead.email && (
                        <small dir="ltr">{lead.email}</small>
                      )}
                    </td>

                    <td>
                      {lead.properties
                        ? (
                          <>
                            <strong>
                              {lead.properties.title?.ar ||
                                lead.properties.reference}
                            </strong>
                            <small>{lead.properties.reference}</small>
                          </>
                        )
                        : 'استفسار عام'}
                    </td>

                    <td>
                      {new Date(lead.created_at).toLocaleString('ar-SA')}
                    </td>

                    <td>
                      <select
                        value={lead.status}
                        disabled={busyId === lead.id}
                        onChange={e =>
                          void updateStatus(lead.id, e.target.value)
                        }
                      >
                        {statuses.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <a
                        href={`https://wa.me/${customerPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        واتساب
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}