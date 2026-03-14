import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import {
  readWorkspacePaths,
  upsertWorkspacePath,
} from "@/server/snipPathStore";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const paths = await readWorkspacePaths(userId);
  return NextResponse.json({ paths });
}

export async function POST(request: NextRequest) {
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

  const {
    workspaceId,
    workspaceName,
    workspaceType,
    path: rawPath,
  } = body as Record<string, unknown>;

  if (typeof workspaceId !== "string" || workspaceId.trim() === "") {
    return NextResponse.json({ error: "Missing workspace identifier." }, { status: 400 });
  }

  if (typeof workspaceName !== "string" || workspaceName.trim() === "") {
    return NextResponse.json({ error: "Missing workspace name." }, { status: 400 });
  }

  if (typeof workspaceType !== "string" || workspaceType.trim() === "") {
    return NextResponse.json({ error: "Missing workspace type." }, { status: 400 });
  }

  if (typeof rawPath !== "string" || rawPath.trim() === "") {
    return NextResponse.json({ error: "Workspace path cannot be empty." }, { status: 400 });
  }

  try {
    const record = await upsertWorkspacePath(userId, {
      workspaceId: workspaceId.trim(),
      workspaceName: workspaceName.trim(),
      type: workspaceType.trim(),
      path: rawPath,
    });

    return NextResponse.json({ path: record });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to persist workspace path.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
