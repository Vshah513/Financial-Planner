import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    // If env vars are missing in Vercel, hard-crashing middleware takes down the whole site.
    // Instead, fail open for public routes and redirect everything else to /auth.
    if (!supabaseUrl || !supabaseAnonKey) {
        const path = request.nextUrl.pathname;
        const isAuthPage = path === "/auth";
        const isLanding = path === "/";
        const isGetStarted = path.startsWith("/get-started");
        const isPublicPath = isAuthPage || isLanding || isGetStarted;

        if (isPublicPath) return NextResponse.next({ request });

        const url = request.nextUrl.clone();
        url.pathname = "/auth";
        url.searchParams.set("error", "missing_supabase_env");
        return NextResponse.redirect(url);
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isAuthPage = path === "/auth";
    const isLanding = path === "/";
    const isGetStarted = path.startsWith("/get-started");
    const isPublicPath = isAuthPage || isLanding || isGetStarted;

    if (!user && !isPublicPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth";
        return NextResponse.redirect(url);
    }

    if (user && (isAuthPage || isLanding)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
