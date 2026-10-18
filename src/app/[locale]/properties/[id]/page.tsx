import {setRequestLocale} from 'next-intl/server';
import {DetailsPage} from '@/components/InteriorPages';

export default async function Page({
  params
}: {
  params:Promise<{locale:string;id:string}>
}) {
  const {locale,id}=await params;
  setRequestLocale(locale);

  return <DetailsPage id={id}/>;
}