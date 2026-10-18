import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE = 10 * 1024 * 1024;

const accepted = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif'
]);

const positions = [
  '(main_w-overlay_w)/2:(main_h-overlay_h)/2',
  'main_w-overlay_w-20:20',
  '20:20',
  'main_w-overlay_w-20:main_h-overlay_h-20',
  '20:main_h-overlay_h-20'
];

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.env.FFMPEG_PATH || 'ffmpeg',
      args,
      {windowsHide: true}
    );

    let log = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 60000);

    child.stderr.on('data', chunk => {
      log = (log + String(chunk)).slice(-2500);
    });

    child.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', code => {
      clearTimeout(timeout);

      if (code === 0 && !timedOut) {
        resolve();
      } else {
        reject(new Error(
          timedOut
            ? 'FFmpeg : délai de traitement dépassé.'
            : `FFmpeg : ${log || 'conversion impossible'}`
        ));
      }
    });
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {data: auth, error: authError} =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    return NextResponse.json(
      {error: 'Connexion administrateur requise.'},
      {status: 401}
    );
  }

  const {data: admin, error: adminError} = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', auth.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (adminError || !admin) {
    return NextResponse.json(
      {error: 'Accès administrateur refusé.'},
      {status: 403}
    );
  }

  const contentLength = Number(
    request.headers.get('content-length') || 0
  );

  if (contentLength > MAX_SIZE + 100000) {
    return NextResponse.json(
      {error: 'Image trop volumineuse.'},
      {status: 413}
    );
  }

  let folder: string | undefined;

  try {
    const form = await request.formData();
    const file = form.get('file');
    const index = Number(form.get('index') ?? 0);

    if (!(file instanceof File)) {
      return NextResponse.json(
        {error: 'Aucune image reçue.'},
        {status: 400}
      );
    }

    if (!accepted.has(file.type) || file.size > MAX_SIZE) {
      return NextResponse.json(
        {error: 'Format non autorisé ou image supérieure à 10 Mo.'},
        {status: 400}
      );
    }

    if (!Number.isSafeInteger(index) || index < 0) {
      return NextResponse.json(
        {error: 'Index de photo invalide.'},
        {status: 400}
      );
    }

    const watermarkPath = join(
      process.cwd(),
      'public',
      'filigrane.png'
    );

    if (!existsSync(watermarkPath)) {
      throw new Error('public/filigrane.png est introuvable.');
    }

    folder = await mkdtemp(
      join(tmpdir(), 'durrat-watermark-')
    );

    const inputPath = join(folder, 'input');
    const outputPath = join(folder, 'output.webp');

    await writeFile(
      inputPath,
      Buffer.from(await file.arrayBuffer())
    );

    const position = positions[index % positions.length];

    const filter = [
      '[1:v]scale=180:-1',
      'format=rgba',
      'colorchannelmixer=aa=0.5[wm];',
      `[0:v][wm]overlay=${position}:format=auto[out]`
    ].join(',');

    // Retirer la virgule avant le deuxieme graphe.
    const filterGraph = filter.replace(',[0:v]', '[0:v]');

    await runFFmpeg([
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-i', inputPath,
      '-i', watermarkPath,
      '-filter_complex', filterGraph,
      '-map', '[out]',
      '-frames:v', '1',
      '-c:v', 'libwebp',
      '-quality', '82',
      outputPath
    ]);

    const output = await readFile(outputPath);

    if (output.length > MAX_SIZE) {
      throw new Error('La photo WebP dépasse 10 Mo.');
    }

    return new NextResponse(
      new Uint8Array(output),
      {
        status: 200,
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'no-store'
        }
      }
    );

  } catch (error) {
    console.error('Durrat watermark:', error);

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Échec du traitement FFmpeg.'
      },
      {status: 500}
    );

  } finally {
    if (folder) {
      await rm(folder, {
        recursive: true,
        force: true
      }).catch(console.error);
    }
  }
}