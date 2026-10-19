import {timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60;

type HookPayload = {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  table?: string;
  record?: {id?: string; status?: string} | null;
  old_record?: {id?: string; status?: string} | null;
};

type TelegramResult = {
  ok: boolean;
  description?: string;
  result?: {message_id: number} | {message_id: number}[];
};

const text = (values: Record<string, string> | null | undefined) =>
  values?.ar || values?.fr || values?.en || '—';

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isValidSecret(received: string | null, expected: string) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function sendTelegram(
  token: string,
  method: string,
  body: FormData | Record<string, unknown>
): Promise<number[]> {
  const form = body instanceof FormData;
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: form ? undefined : {'Content-Type': 'application/json'},
    body: form ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(45000)
  });
  const result = (await response.json()) as TelegramResult;
  if (!response.ok || !result.ok || !result.result) {
    throw new Error(`Telegram: ${result.description || `HTTP ${response.status}`}`);
  }
  return Array.isArray(result.result)
    ? result.result.map(item => item.message_id)
    : [result.result.message_id];
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  if (!isValidSecret(request.headers.get('x-durrat-webhook-secret'), expectedSecret)) {
    return Response.json({error: 'Unauthorized'}, {status: 401});
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL_ID || '@test3iqaar';
  const siteUrl = process.env.SITE_URL;

  if (!url || !adminKey || !token || !siteUrl) {
    console.error('Telegram: missing server environment variables');
    return Response.json({error: 'Server configuration incomplete'}, {status: 500});
  }

  let event: HookPayload;
  try {
    event = (await request.json()) as HookPayload;
  } catch {
    return Response.json({error: 'Invalid JSON'}, {status: 400});
  }
  if (
    (event.type !== 'INSERT' && event.type !== 'UPDATE') ||
    event.schema !== 'public' || event.table !== 'properties' ||
    event.record?.status !== 'published' || !event.record.id
  ) {
    return Response.json({skipped: true});
  }

  // Publish only on the first transition to published.
  if (event.type === 'UPDATE' && event.old_record?.status === 'published') {
    return Response.json({skipped: true, reason: 'Already published'});
  }

  const propertyId = event.record.id;
  const admin = createClient(url, adminKey, {
    auth: {autoRefreshToken: false, persistSession: false}
  });

  // Secure deduplication: one row per property, even for repeated webhooks.
  const {error: startError} = await admin.from('telegram_publications')
    .upsert({property_id: propertyId, status: 'pending'}, {
      onConflict: 'property_id', ignoreDuplicates: true
    });
  if (startError) {
    console.error('Telegram job creation:', startError.message);
    return Response.json({error: 'Unable to register publication'}, {status: 500});
  }

  const {data: claimed, error: claimError} = await admin
    .from('telegram_publications')
    .update({status: 'sending', updated_at: new Date().toISOString()})
    .eq('property_id', propertyId)
    .in('status', ['pending', 'failed'])
    .select('property_id')
    .maybeSingle();

  if (claimError) {
    console.error('Telegram job claim:', claimError.message);
    return Response.json({error: 'Unable to lock publication'}, {status: 500});
  }
  if (!claimed) return Response.json({skipped: true, reason: 'Already sent or sending'});

  try {
    const {data: property, error: propertyError} = await admin
      .from('properties')
      .select('id,reference,title,description,price,transaction_type,rent_period,area_m2,bedrooms,bathrooms,status,districts(id,names,city_id)')
      .eq('id', propertyId).single();
    if (propertyError || !property || property.status !== 'published') {
      throw new Error(propertyError?.message || 'Property is not published');
    }

    const districtData = property.districts as unknown as {
      names: Record<string, string>; city_id: string | null
    } | null;
    let cityName = '';
    if (districtData?.city_id) {
      const {data: city} = await admin.from('cities')
        .select('names').eq('id', districtData.city_id).maybeSingle();
      if (city?.names) cityName = text(city.names as Record<string, string>);
    }

    const {data: images, error: imageError} = await admin
      .from('property_images')
      .select('storage_path,is_cover,sort_order')
      .eq('property_id', propertyId);
    if (imageError) throw imageError;

    const ordered = [...(images || [])]
      .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) ||
        (a.sort_order || 0) - (b.sort_order || 0))
      .slice(0, 10);

    const link = new URL(`/ar/properties/${encodeURIComponent(propertyId)}`, siteUrl).toString();
    const caption = [
      '🏡 <b>عقار جديد | درة الهجرة للعقارات</b>',
      `<b>${escapeHtml(text(property.title as Record<string, string>).slice(0, 110))}</b>`,
      cityName ? `🏙 المدينة: ${escapeHtml(cityName.slice(0, 65))}` : '',
      districtData ? `📍 الحي: ${escapeHtml(text(districtData.names).slice(0, 65))}` : '',
      `💰 السعر: ${Number(property.price || 0).toLocaleString('en-US')} ريال${property.transaction_type === 'rent' && property.rent_period ? ` / ${escapeHtml(property.rent_period)}` : ''}`,
      property.bedrooms != null ? `🛏 الغرف: ${property.bedrooms}` : '',
      property.bathrooms != null ? `🚿 الحمامات: ${property.bathrooms}` : '',
      property.area_m2 != null ? `📐 المساحة: ${property.area_m2} م²` : '',
      `🔗 <a href="${escapeHtml(link)}">عرض تفاصيل العقار والصور</a>`
    ].filter(Boolean).join('\n');

    let messageIds: number[];
    if (ordered.length === 0) {
      messageIds = await sendTelegram(token, 'sendMessage', {
        chat_id: channel, text: caption, parse_mode: 'HTML'
      });
    } else {
      const form = new FormData();
      form.set('chat_id', channel);
      const media: {type: 'photo'; media: string; caption?: string; parse_mode?: string}[] = [];

      for (const [index, photo] of ordered.entries()) {
        const {data: blob, error: downloadError} = await admin.storage
          .from('property-images').download(photo.storage_path);
        if (downloadError || !blob) {
          throw new Error(`Photo ${index + 1}: ${downloadError?.message || 'unavailable'}`);
        }
        // Saved files are WebP. Telegram photos work reliably as JPEG.
        const jpg = await sharp(Buffer.from(await blob.arrayBuffer()))
          .rotate().resize(1600, 1600, {fit: 'inside', withoutEnlargement: true})
          .jpeg({quality: 78, mozjpeg: true}).toBuffer();
        const field = `image${index}`;
        form.append(field, new Blob([new Uint8Array(jpg)], {type: 'image/jpeg'}), `${field}.jpg`);
        media.push({
          type: 'photo', media: `attach://${field}`,
          ...(index === 0 ? {caption, parse_mode: 'HTML'} : {})
        });
      }

      if (media.length === 1) {
        // The multipart attachment has already been prepared above.
        const cover = form.get('image0');
        if (!(cover instanceof Blob)) throw new Error('Missing cover attachment');
        form.set('photo', cover, 'cover.jpg');
        form.delete('image0');
        form.set('caption', caption);
        form.set('parse_mode', 'HTML');
        messageIds = await sendTelegram(token, 'sendPhoto', form);
      } else {
        form.set('media', JSON.stringify(media));
        messageIds = await sendTelegram(token, 'sendMediaGroup', form);
      }
    }

    const {error: markError} = await admin.from('telegram_publications')
      .update({
        status: 'sent', telegram_message_ids: messageIds,
        sent_at: new Date().toISOString(), last_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('property_id', propertyId);
    if (markError) throw markError;
    return Response.json({sent: true, propertyId});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Telegram publication failure:', message);
    await admin.from('telegram_publications')
      .update({status: 'failed', last_error: message.slice(0, 800), updated_at: new Date().toISOString()})
      .eq('property_id', propertyId);
    return Response.json({error: 'Telegram publication failed'}, {status: 500});
  }
}
