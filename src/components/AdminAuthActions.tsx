'use client';

import {useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {LogOut} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';
import './admin-auth.css';

export function AdminAuthActions() {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!pathname || /\/admin\/login\/?$/.test(pathname)) {
    return null;
  }

  async function logout() {
    setLoading(true);

    try {
      const supabase = createClient();

      const {error} = await supabase.auth.signOut();

      if (error) throw error;

      router.replace('/ar/admin/login');
      router.refresh();
    } catch {
      alert('تعذر تسجيل الخروج. يرجى المحاولة مجدداً.');
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="dh-admin-logout"
      onClick={logout}
      disabled={loading}
      dir="rtl"
    >
      <LogOut size={16}/>
      {loading ? 'جارٍ الخروج...' : 'تسجيل الخروج'}
    </button>
  );
}