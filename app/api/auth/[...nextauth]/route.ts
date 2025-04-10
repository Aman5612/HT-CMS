// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth/next";
import { authOptions } from "../auth.config";

// Create the handler
const handler = NextAuth(authOptions);

// Export the handler functions with proper typing
export { handler as GET, handler as POST };