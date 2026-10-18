import {createClient} from './client';

export type PublicDistrict = {
  id: string;
  names: Record<string, string>;
  latitude: number | null;
  longitude: number | null;
};

export type PublicProperty = {
  id: string;
  reference: string;
  title: Record<string, string>;
  description: Record<string, string>;
  price: number;
  type: string;
  transaction: string;
  area: number | null;
  beds: number | null;
  baths: number | null;
  district: PublicDistrict | null;
  images: string[];
  publishedAt: string | null;
};

type RawProperty = {
  id: string;
  reference: string;
  title: Record<string, string>;
  description: Record<string, string>;
  price: number;
  property_type: string;
  transaction_type: string;
  area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  published_at: string | null;
  districts: PublicDistrict | null;
  property_images: {
    storage_path: string;
    is_cover: boolean;
    sort_order: number;
  }[];
};

export function translate(
  values: Record<string, string> | null | undefined,
  locale: string
): string {
  if (!values) return '';

  return (
    values[locale] ||
    values.ar ||
    values.en ||
    Object.values(values).find(Boolean) ||
    ''
  );
}

export async function fetchPublicProperties(
  propertyId?: string
): Promise<PublicProperty[]> {
  const supabase = createClient();

  let query = supabase
    .from('properties')
    .select(`
      id,
      reference,
      title,
      description,
      price,
      property_type,
      transaction_type,
      area_m2,
      bedrooms,
      bathrooms,
      published_at,
      districts (
        id,
        names,
        latitude,
        longitude
      ),
      property_images (
        storage_path,
        is_cover,
        sort_order
      )
    `)
    .eq('status', 'published');

  if (propertyId) {
    query = query.eq('id', propertyId);
  }

  const {data, error} = await query
    .order('published_at', {ascending: false})
    .limit(propertyId ? 1 : 500);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as unknown as RawProperty[];

  return rows.map(row => {
    const images = [...(row.property_images || [])]
      .sort((a, b) =>
        Number(b.is_cover) - Number(a.is_cover) ||
        a.sort_order - b.sort_order
      )
      .map(image =>
        supabase.storage
          .from('property-images')
          .getPublicUrl(image.storage_path)
          .data.publicUrl
      );

    return {
      id: row.id,
      reference: row.reference,
      title: row.title || {},
      description: row.description || {},
      price: Number(row.price),
      type: row.property_type,
      transaction: row.transaction_type,
      area: row.area_m2,
      beds: row.bedrooms,
      baths: row.bathrooms,
      district: row.districts,
      images,
      publishedAt: row.published_at
    };
  });
}