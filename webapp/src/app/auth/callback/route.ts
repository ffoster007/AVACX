import { NextResponse } from 'next/server'

// Supabase callback removed. This stub prevents build errors.
// If OAuth provider adds custom code callback, handle here; currently just redirect home.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`);
}