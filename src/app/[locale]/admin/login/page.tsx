import {setRequestLocale} from 'next-intl/server';
import {SupabaseAdminLogin} from '@/components/SupabaseAdminLogin';

export default async function Page({
  params
}:{
  params:Promise<{locale:string}>
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  return <SupabaseAdminLogin/>;
}