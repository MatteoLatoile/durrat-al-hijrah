import {setRequestLocale} from 'next-intl/server';
import {SupabasePublicDetail} from '@/components/SupabasePublicDetail';

export default async function Page({
  params
}: {
  params: Promise<{locale: string; id: string}>
}) {
  const {locale, id} = await params;
  setRequestLocale(locale);

  return <SupabasePublicDetail id={id}/>;
}