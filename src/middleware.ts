/**
 * ShopFinder — Middleware
 *
 * Protects /admin routes. Public routes (/, /produtos, /api/catalog, /api/auth)
 * are accessible without authentication.
 */
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: ["/admin/:path*"]
};
