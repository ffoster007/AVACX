import NextAuth from "next-auth"
// auth is located in src/app/lib/auth.ts — use the app alias to reach it
import { authOptions } from "@/app/lib/auth"; 

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }