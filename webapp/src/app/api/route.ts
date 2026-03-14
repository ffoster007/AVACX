import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
// auth is located in src/app/lib/auth.ts
import { authOptions } from "@/app/lib/auth";

export const GET = async () => {
    const session = await getServerSession(authOptions);

    return  NextResponse.json({ authenticated: !!session});
}