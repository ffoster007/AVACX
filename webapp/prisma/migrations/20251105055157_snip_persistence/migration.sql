-- CreateTable
CREATE TABLE "SnipWorkspacePath" (
    "id" SERIAL NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workspaceName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SnipWorkspacePath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnipHistoryEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "source" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "report" JSONB NOT NULL,
    "terminalOutput" TEXT NOT NULL,

    CONSTRAINT "SnipHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SnipWorkspacePath_workspaceId_key" ON "SnipWorkspacePath"("workspaceId");
