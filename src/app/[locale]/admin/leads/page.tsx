import {setRequestLocale} from 'next-intl/server';
import {SupabaseLeadsPanel} from '@/components/SupabaseLeadsPanel';

export default async function Page({
  params
}: {
  params: Promise<{locale: string}>
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  return (
    <main style={{
      maxWidth:1300,
      margin:'40px auto',
      padding:'0 20px'
    }}>
      <a
        href="/ar/admin/dashboard?tab=leads"
        style={{color:'#9a8054'}}
      >
        العودة إلى لوحة الإدارة
      </a>

      <SupabaseLeadsPanel/>
    </main>
  );
}