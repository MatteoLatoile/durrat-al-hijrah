import {setRequestLocale} from 'next-intl/server';
import {SupabasePropertyEditor} from '@/components/SupabasePropertyAdmin';

export default async function Page({
  params
}: {
  params: Promise<{locale: string}>
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  return <SupabasePropertyEditor/>;
}