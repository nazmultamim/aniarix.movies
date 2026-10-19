import { createServerClient } from '@supabase/ssr';

export function createRouteHandlerClient(request, response) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

export function copyResponseCookies(source, target) {
  const cookies = source.cookies?.getAll?.() ?? [];

  cookies.forEach(({ name, value, options }) => {
    target.cookies.set(name, value, options);
  });

  return target;
}
