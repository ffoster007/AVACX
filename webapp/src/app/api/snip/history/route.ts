import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import { readHistory, deleteHistoryEntry } from "@/server/snipHistoryStore";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const history = await readHistory(userId);
  return NextResponse.json({ history });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const { id } = body as Record<string, unknown>;
  if (typeof id !== "string" || id.trim() === "") {
    return NextResponse.json({ error: "Missing history id." }, { status: 400 });
  }

  const deleted = await deleteHistoryEntry(userId, id.trim());
  if (!deleted) {
    return NextResponse.json({ error: "History entry not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
