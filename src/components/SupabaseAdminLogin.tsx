'use client';

import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {LockKeyhole, Mail, ShieldCheck, ArrowLeft} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';
import './admin-auth.css';

export function SupabaseAdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const {data, error:loginError} =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

      if (loginError || !data.user) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        return;
      }

      const {data:admin, error:adminError} = await supabase
        .from('admin_users')
        .select('role,is_active')
        .eq('id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError || !admin) {
        await supabase.auth.signOut();
        setError('هذا الحساب غير مصرح له بالدخول إلى لوحة الإدارة.');
        return;
      }

      router.replace('/ar/admin/dashboard');
      router.refresh();

    } catch {
      setError('تعذر الاتصال بالخادم. يرجى المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dh-auth-page" dir="rtl">
      <div className="dh-auth-card">

        <div className="dh-auth-brand">
          <span className="dh-auth-mark">د</span>

          <div>
            <strong>درة الهجرة للعقارات</strong>
            <small>DURRAT AL HIJRAH</small>
          </div>
        </div>

        <div className="dh-auth-icon">
          <ShieldCheck size={25}/>
        </div>

        <h1>تسجيل دخول الإدارة</h1>

        <p className="dh-auth-description">
          مرحباً بك في لوحة إدارة درة الهجرة للعقارات.
          يرجى تسجيل الدخول للمتابعة.
        </p>

        <form onSubmit={handleLogin}>

          <label htmlFor="admin-email">
            البريد الإلكتروني
          </label>

          <div className="dh-auth-input">
            <Mail size={18}/>

            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              dir="ltr"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          <label htmlFor="admin-password">
            كلمة المرور
          </label>

          <div className="dh-auth-input">
            <LockKeyhole size={18}/>

            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="dh-auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="dh-auth-submit"
            disabled={loading}
            type="submit"
          >
            {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
            {!loading && <ArrowLeft size={17}/>}
          </button>

        </form>

        <Link href="/ar" className="dh-auth-back">
          العودة إلى الموقع
        </Link>

        <div className="dh-auth-secure">
          <LockKeyhole size={13}/>
          منطقة إدارية محمية
        </div>
      </div>
    </main>
  );
}