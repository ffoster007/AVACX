import { db } from "@/app/lib/db";
import { NextResponse } from "next/server";
import * as z from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

// Schema for profile update (GitHub-only auth - no password fields)
const updateSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  username: z.string().min(1).max(100).optional(),
});

type UpdatePayload = z.infer<typeof updateSchema>;

// PATCH: Update user profile (email/username only - no password for GitHub-only auth)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data: UpdatePayload = updateSchema.parse(body);

    // Lookup current user by session email
    const user = await db.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const updates: Partial<{ email: string; username: string }> = {};

    // Check email uniqueness
    if (data.email && data.email !== user.email) {
      const exists = await db.user.findUnique({ where: { email: data.email } });
      if (exists) {
        return NextResponse.json({ message: 'Email already in use' }, { status: 409 });
      }
      updates.email = data.email;
    }

    // Check username uniqueness
    if (data.username && data.username !== user.username) {
      const existsU = await db.user.findUnique({ where: { username: data.username } });
      if (existsU) {
        return NextResponse.json({ message: 'Username already in use' }, { status: 409 });
      }
      updates.username = data.username;
    }

    // No changes to apply
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        message: 'No changes',
        user: { id: user.id, email: user.email, username: user.username }
      }, { status: 200 });
    }

    const updated = await db.user.update({ where: { id: user.id }, data: updates });

    return NextResponse.json({
      message: 'Updated',
      user: { id: updated.id, email: updated.email, username: updated.username }
    }, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.issues }, { status: 400 });
    }
    console.error('Update profile error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

type SessionWithId = { id?: number | string; user?: { email?: string | null } };

// GET: Return current user info + linked providers
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized - No session' }, { status: 401 });
    }

    const sessionWithId = session as SessionWithId;
    const sessionUserEmail = session?.user?.email;
    const parsedId = sessionWithId?.id !== undefined ? Number(sessionWithId.id) : null;
    const sessionUserId = typeof parsedId === 'number' && Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;

    if (!sessionUserEmail && sessionUserId === null) {
      console.log('[api/user] No email or userId in session:', { email: sessionUserEmail, id: sessionWithId?.id });
      return NextResponse.json({ message: 'Unauthorized - Missing user identifier' }, { status: 401 });
    }

    // Fetch the user - prioritize by ID, fallback to email
    let user = null;
    if (sessionUserId !== null) {
      user = await db.user.findUnique({ where: { id: sessionUserId } });
    }
    if (!user && sessionUserEmail) {
      user = await db.user.findUnique({ where: { email: sessionUserEmail } });
    }
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Load linked OAuth providers from Account table
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      select: { provider: true }
    });
    const providers: string[] = Array.from(new Set(accounts.map(a => a.provider)));

    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      providers,
    }, { status: 200 });

  } catch (e) {
    console.error('GET /api/user error:', e);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
