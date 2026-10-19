import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { isAdminProfile } from '@/lib/security/admin-access.mjs';

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin pages require both a valid session and an admin role. Check the
  // role in the database because role changes are stored on the profile.
  const isAdminRoute =
    request.nextUrl.pathname === "/admin" ||
    request.nextUrl.pathname.startsWith("/admin/");

  if (isAdminRoute) {
    let isAdmin = false;

    if (user) {
      const { data, error } = await supabase.rpc("get_my_profile");
      const profile = Array.isArray(data) ? data[0] : data;

      isAdmin = !error && isAdminProfile(profile, user.id);
    }

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Protect routes that require auth
  const protectedRoutes = ['/profile', '/settings', '/watchlist', '/user'];
  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
