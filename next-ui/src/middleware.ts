import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Authentication from "@/lib/authentication_service";
const auth = new Authentication();

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    const publicPages = [
        "/",
        "/login",
        "/reset-password",
        "/validate",
        "/register",
        "/container-invite",
    ];
    const authRequired = false;

    // if main route we need to check if this is a redirect by checking
    // the presence of a JWT
    if (request.url === "/" && request.headers.get("token")) {
        auth.LoginFromToken(
            request.headers.get("token") as string,
            request.headers.get("state") as string
        )
            .then((result) => {
                if (result) {
                    NextResponse.redirect(new URL("/", request.url));
                    return;
                }

                NextResponse.redirect(new URL("/login", request.url));
            })
            .catch(() => NextResponse.redirect(new URL("/login", request.url)));
    } else {
        if (authRequired && !auth.IsLoggedIn()) {
            return NextResponse.redirect(new URL("/", request.url));
        }
        return;
    }
    return NextResponse.redirect(new URL("/containers", request.url));
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
