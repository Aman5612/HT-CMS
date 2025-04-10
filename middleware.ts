import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    
    // Check if user is inactive
    if (token?.isActive === false) {
      console.log("Access denied: Account is inactive");
      
      // If trying to access any protected route and account is inactive
      if (pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(
          new URL("/account-inactive", req.url)
        );
      }
    }
    
    // Admin-only routes
    const adminOnlyRoutes = [
      "/dashboard/users",
      "/dashboard/settings/site",
    ];
    
    // Editor and admin routes (content management)
    const editorRoutes = [
      "/dashboard/posts/new",
      "/dashboard/posts/edit",
      "/dashboard/media",
    ];
    
    // Check if path is admin-only
    const isAdminRoute = adminOnlyRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    // Check if path is editor-only
    const isEditorRoute = editorRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    // Role-based access control
    const userRole = token?.role || "author";
    
    // If trying to access admin routes without being an admin, redirect to dashboard
    if (isAdminRoute && userRole !== "admin") {
      console.log("Access denied: Admin route accessed by", userRole);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // If trying to access editor routes without sufficient permissions
    if (isEditorRoute && userRole === "author") {
      console.log("Access denied: Editor route accessed by author");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // Allow the request to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Just check if user is authenticated
    },
  }
);

// Protect all dashboard routes
export const config = { matcher: ["/dashboard/:path*"] };