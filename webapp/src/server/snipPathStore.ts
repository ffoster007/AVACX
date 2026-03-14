import path from "path";

import { db } from "@/app/lib/db";

export interface SnipWorkspacePath {
  workspaceId: string;
  workspaceName: string;
  type: string;
  path: string;
  updatedAt: string;
}

function mapRecord(record: {
  workspaceId: string;
  workspaceName: string;
  type: string;
  path: string;
  updatedAt: Date;
}): SnipWorkspacePath {
  return {
    workspaceId: record.workspaceId,
    workspaceName: record.workspaceName,
    type: record.type,
    path: record.path,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function readWorkspacePaths(userId: number): Promise<SnipWorkspacePath[]> {
  const records = await db.snipWorkspacePath.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return records.map(mapRecord);
}

export async function getWorkspacePathById(userId: number, workspaceId: string): Promise<SnipWorkspacePath | null> {
  if (!workspaceId) return null;
  const record = await db.snipWorkspacePath.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return record ? mapRecord(record) : null;
}

export async function getWorkspacePathByName(userId: number, name: string): Promise<SnipWorkspacePath | null> {
  if (!name) return null;
  const record = await db.snipWorkspacePath.findFirst({
    where: { userId, workspaceName: name },
  });
  return record ? mapRecord(record) : null;
}

export async function upsertWorkspacePath(
  userId: number,
  params: {
    workspaceId: string;
    workspaceName: string;
    type: string;
    path: string;
  }
): Promise<SnipWorkspacePath> {
  const sanitizedPath = path.resolve(params.path.trim());

  const record = await db.snipWorkspacePath.upsert({
    where: { userId_workspaceId: { userId, workspaceId: params.workspaceId } },
    update: {
      workspaceName: params.workspaceName,
      type: params.type,
      path: sanitizedPath,
    },
    create: {
      userId,
      workspaceId: params.workspaceId,
      workspaceName: params.workspaceName,
      type: params.type,
      path: sanitizedPath,
    },
  });

  return mapRecord(record);
}
