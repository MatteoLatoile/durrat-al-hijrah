import {setRequestLocale} from 'next-intl/server';
import {SupabasePublicCatalog} from '@/components/SupabasePublicCatalog';

export default async function Page({
  params
}: {
  params: Promise<{locale: string}>
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  return <SupabasePublicCatalog/>;
}