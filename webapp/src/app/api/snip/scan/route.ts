import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import { spawn, SpawnOptions } from "child_process";
import crypto from "crypto";
import { promises as fs } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { ReadableStream as NodeReadableStream } from "stream/web";
import * as tar from "tar";
import { appendHistory, SnipHistoryEntry, SnipReport } from "@/server/snipHistoryStore";
import {
  getWorkspacePathById,
  getWorkspacePathByName,
  upsertWorkspacePath,
} from "@/server/snipPathStore";
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { getValidGitHubAccessToken } from "@/app/api/github/token";
import { getServerSession } from "next-auth";

// Root directory for the Go Snip scanner project. Updated after relocation to avacx/main-system.
const GO_PROJECT_DIR = path.join(process.cwd(), "avacx", "snip");
const DEFAULT_LOCAL_ROOT = process.cwd();
const SNIP_BINARY_ENV = process.env.SNIP_BINARY_PATH;

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

interface ScanPayload {
  path?: string | null;
  workspaceId?: string | null;
  maxFindings?: number;
  languages?: string[];
  source?: "workspace" | "overview" | string;
  workspaceName?: string;
  workspaceType?: "local" | "github" | string;
  repo?: {
    owner?: string;
    name?: string;
    fullName?: string;
    branch?: string;
    defaultBranch?: string;
  };
}

type GithubWorkspaceDescriptor = {
  owner: string;
  name: string;
  branch: string;
  fullName?: string;
};

type GithubCheckoutResult =
  | { ok: true; path: string; cleanupDir: string; displayPath: string }
  | { ok: false; status: number; error: string };

async function cloneGitRepository(remote: string, branch: string, destination: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "git",
      ["clone", "--depth", "1", "--single-branch", "--branch", branch, remote, destination],
      {
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0",
          GIT_ASKPASS: "echo",
        },
      }
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const message = stderr.trim() || `git clone exited with code ${code ?? "unknown"}`;
        reject(new Error(message));
      }
    });
  });
}

async function downloadGithubRepositoryArchive(
  owner: string,
  name: string,
  branch: string,
  destination: string,
  accessToken: string
): Promise<void> {
  const archiveUrl = `https://api.github.com/repos/${owner}/${name}/tarball/${branch}`;
  const response = await fetch(archiveUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`GitHub tarball download failed: ${response.status} ${response.statusText}`);
  }

  await fs.mkdir(destination, { recursive: true });

  const bodyStream = response.body as unknown as NodeReadableStream<Uint8Array> | null;
  if (!bodyStream) {
    throw new Error("GitHub tarball download failed: missing response body stream");
  }

  const readable = Readable.fromWeb(bodyStream);

  await pipeline(readable, tar.x({ cwd: destination, strip: 1 }));
}

function isMissingGit(error: unknown): boolean {
  const err = error as NodeJS.ErrnoException | undefined;
  return Boolean(err?.code === "ENOENT");
}

function isMissingGo(error: unknown): boolean {
  const err = error as NodeJS.ErrnoException | undefined;
  return Boolean(err?.code === "ENOENT");
}

type ProcessResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

async function runProcess(command: string, args: string[], options: SpawnOptions): Promise<ProcessResult> {
  return new Promise<ProcessResult>((resolve, reject) => {
    const child = spawn(command, args, options);

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}

function candidateSnipBinaryPaths(): string[] {
  const candidates: Array<string | null | undefined> = [
    SNIP_BINARY_ENV,
    path.join(GO_PROJECT_DIR, "bin", `snip-${process.platform}-${process.arch}`),
    path.join(GO_PROJECT_DIR, "bin", "snip-linux-amd64"),
  ];

  return candidates.filter((value): value is string => Boolean(value && value.trim()));
}

async function resolveSnipBinaryPath(): Promise<string | null> {
  for (const candidate of candidateSnipBinaryPaths()) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function prepareGithubWorkspace(descriptor: GithubWorkspaceDescriptor): Promise<GithubCheckoutResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const tokenResult = await getValidGitHubAccessToken(user.id);
  if (!tokenResult.ok) {
    return { ok: false, status: tokenResult.status, error: tokenResult.message };
  }

  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "snip-github-"));
  const checkoutDir = path.join(baseDir, "checkout");
  const remote = `https://x-access-token:${tokenResult.accessToken}@github.com/${descriptor.owner}/${descriptor.name}.git`;

  try {
    await cloneGitRepository(remote, descriptor.branch, checkoutDir);
  } catch (cloneError) {
    if (isMissingGit(cloneError)) {
      try {
        await downloadGithubRepositoryArchive(
          descriptor.owner,
          descriptor.name,
          descriptor.branch,
          checkoutDir,
          tokenResult.accessToken
        );
      } catch (archiveError) {
        await fs.rm(baseDir, { recursive: true, force: true }).catch(() => undefined);
        const details = archiveError instanceof Error ? archiveError.message : String(archiveError);
        return {
          ok: false,
          status: 500,
          error: `Unable to prepare GitHub repository for Snip scan. ${details}`,
        };
      }
    } else {
      await fs.rm(baseDir, { recursive: true, force: true }).catch(() => undefined);
      const details = cloneError instanceof Error ? cloneError.message : String(cloneError);
      return {
        ok: false,
        status: 500,
        error: `Unable to prepare GitHub repository for Snip scan. ${details}`,
      };
    }
  }

  const displayPath = `github:${descriptor.owner}/${descriptor.name}#${descriptor.branch}`;
  return { ok: true, path: checkoutDir, cleanupDir: baseDir, displayPath };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);

  let body: ScanPayload;
  try {
    body = (await request.json()) as ScanPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const source = body.source ?? "workspace";
  let resolvedPath: string | null = null;
  let cleanupDir: string | null = null;
  let displayPath: string | null = null;

  if (typeof body.path === "string" && body.path.trim() !== "") {
    resolvedPath = path.resolve(body.path.trim());
    displayPath = resolvedPath;
  }

  if (!resolvedPath && body.workspaceId) {
    const stored = await getWorkspacePathById(userId, body.workspaceId);
    if (stored?.path) {
      resolvedPath = stored.path;
      displayPath = stored.path;
    }
  }

  if (!resolvedPath && body.workspaceName) {
    const storedByName = await getWorkspacePathByName(userId, body.workspaceName);
    if (storedByName?.path) {
      resolvedPath = storedByName.path;
      displayPath = storedByName.path;
    }
  }

  if (!resolvedPath && body.workspaceType === "local" && body.workspaceName) {
    const guess = path.join(DEFAULT_LOCAL_ROOT, body.workspaceName);
    if (await pathExists(guess)) {
      resolvedPath = guess;
      displayPath = guess;
    }
  }

  if (!resolvedPath && body.workspaceType === "github" && body.repo?.owner && body.repo?.name) {
    const repoDescriptor: GithubWorkspaceDescriptor = {
      owner: body.repo.owner,
      name: body.repo.name,
      branch: body.repo.branch || body.repo.defaultBranch || "main",
      fullName: body.repo.fullName,
    };

    const checkout = await prepareGithubWorkspace(repoDescriptor);
    if (!checkout.ok) {
      return NextResponse.json({ error: checkout.error }, { status: checkout.status });
    }
    resolvedPath = checkout.path;
    cleanupDir = checkout.cleanupDir;
    displayPath = checkout.displayPath;
  }

  if (!resolvedPath) {
    return NextResponse.json(
      {
        error: `No configured path for workspace ${body.workspaceName ?? body.workspaceId ?? ""}. Configure it from the Snip control panel before running scans.`,
        code: "workspace_path_missing",
      },
      { status: 400 }
    );
  }

  if (!(await pathExists(resolvedPath))) {
    if (cleanupDir) {
      await fs.rm(cleanupDir, { recursive: true, force: true }).catch(() => undefined);
      cleanupDir = null;
    }
    return NextResponse.json(
      {
        error: `Snip path ${resolvedPath} is not accessible. Verify the path and try again.`,
        code: "workspace_path_unavailable",
      },
      { status: 400 }
    );
  }

  if (!cleanupDir && body.workspaceId && body.workspaceName && body.workspaceType === "local") {
    await upsertWorkspacePath(userId, {
      workspaceId: body.workspaceId,
      workspaceName: body.workspaceName,
      type: body.workspaceType ?? "local",
      path: resolvedPath,
    }).catch(() => undefined);
  }

  const maxFindings = Number.isFinite(body?.maxFindings) ? Math.max(1, Math.floor(Number(body?.maxFindings))) : 200;
  const languages = Array.isArray(body?.languages) ? body.languages.filter((lang) => typeof lang === "string" && lang.trim() !== "") : [];

  const scannerArgs = ["--path", resolvedPath, "--max-findings", String(maxFindings)];
  if (languages.length > 0) {
    scannerArgs.push("--languages", languages.join(","));
  }

  const startedAt = Date.now();
  let capturedStdout = "";
  let capturedStderr = "";

  try {
    const goArgs = ["run", "./cmd", ...scannerArgs];
    const spawnOptions: SpawnOptions = {
      cwd: GO_PROJECT_DIR,
      env: { ...process.env },
    };

    let execution: ProcessResult | null = null;
    let lastError: unknown;

    try {
      execution = await runProcess("go", goArgs, spawnOptions);
    } catch (error) {
      lastError = error;
      if (isMissingGo(error)) {
        const binaryPath = await resolveSnipBinaryPath();
        if (!binaryPath) {
          throw Object.assign(new Error("Go runtime is not available and no Snip binary was found."), {
            cause: error,
          });
        }

        try {
          execution = await runProcess(binaryPath, scannerArgs, spawnOptions);
        } catch (binaryError) {
          lastError = binaryError;
        }
      }
    }

    if (!execution) {
      throw lastError ?? new Error("Snip execution failed for unknown reasons.");
    }

  const { stdout, stderr, exitCode } = execution;
  capturedStdout = stdout;
  capturedStderr = stderr;

    const durationMs = Date.now() - startedAt;
  const terminalOutput = [capturedStderr?.trim(), capturedStdout?.trim()].filter(Boolean).join("\n");

    let report: SnipReport | null = null;
    if (stdout.trim()) {
      try {
        report = JSON.parse(stdout.trim()) as SnipReport;
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to parse Snip report output.",
            details: error instanceof Error ? error.message : String(error),
            stdout,
            stderr,
          },
          { status: 500 }
        );
      }
    }

    if (!report) {
      return NextResponse.json(
        {
          error: "Snip scanner did not produce a report.",
          stdout,
          stderr,
        },
        { status: 500 }
      );
    }

    const historyPath = displayPath ?? resolvedPath;

    const entry: SnipHistoryEntry = {
      id: crypto.randomUUID(),
      userId,
      workspaceId: body.workspaceId ?? null,
      source,
      triggeredAt: new Date(startedAt).toISOString(),
      durationMs,
      path: historyPath,
      report,
      terminalOutput,
    };

    await appendHistory(userId, entry);

    return NextResponse.json({
      success: exitCode === 0,
      report,
      terminalOutput,
      historyId: entry.id,
      durationMs,
      resolvedPath: historyPath,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to execute Snip scanner.",
        details: error instanceof Error ? error.message : String(error),
        stdout: capturedStdout,
        stderr: capturedStderr,
      },
      { status: 500 }
    );
  } finally {
    if (cleanupDir) {
      await fs.rm(cleanupDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
