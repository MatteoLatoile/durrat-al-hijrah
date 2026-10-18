import createMiddleware from 'next-intl/middleware';
import {NextResponse, type NextRequest} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {routing} from './i18n/routing';

const handleI18n = createMiddleware(routing);

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string
) {
  const destination = NextResponse.redirect(
    new URL(pathname, request.url)
  );

  response.cookies.getAll().forEach(cookie => {
    destination.cookies.set(cookie);
  });

  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = response.headers.get(header);
    if (value) destination.headers.set(header, value);
  }

  return destination;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const adminMatch = pathname.match(
    /^\/(ar|fr|en|ru|ur|id)\/admin(?:\/|$)/
  );

  // Site public : fonctionnement normal de next-intl.
  if (!adminMatch) {
    return handleI18n(request);
  }

  // Dashboard exclusivement en arabe.
  if (adminMatch[1] !== 'ar') {
    const arabicPath = pathname.replace(
      /^\/(fr|en|ru|ur|id)\//,
      '/ar/'
    );

    return NextResponse.redirect(
      new URL(arabicPath, request.url)
    );
  }

  const isLogin = /^\/ar\/admin\/login\/?$/.test(pathname);

  let response = handleI18n(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({name, value}) =>
            request.cookies.set(name, value)
          );

          // Reconstruire la reponse next-intl avec
          // les cookies de session actualises.
          response = handleI18n(request);

          cookiesToSet.forEach(({name, value, options}) =>
            response.cookies.set(name, value, options)
          );

          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              response.headers.set(key, value)
            );
          }
        }
      }
    }
  );

  // Validation cryptographique de la session.
  const {data, error} = await supabase.auth.getClaims();
  const userId = error ? null : data?.claims?.sub;

  if (!userId) {
    return isLogin
      ? response
      : redirectWithCookies(
          request,
          response,
          '/ar/admin/login'
        );
  }

  // Verifier que le compte est un administrateur actif.
  const {data:admin, error:adminError} = await supabase
    .from('admin_users')
    .select('id,role,is_active')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (adminError || !admin) {
    return isLogin
      ? response
      : redirectWithCookies(
          request,
          response,
          '/ar/admin/login'
        );
  }

  // Administrateur deja connecte.
  if (isLogin) {
    return redirectWithCookies(
      request,
      response,
      '/ar/admin/dashboard'
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};