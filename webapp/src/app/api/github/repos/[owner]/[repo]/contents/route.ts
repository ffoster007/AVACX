import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { getValidGitHubAccessToken } from "../../../../token";

const GITHUB_API_BASE = "https://api.github.com";

type RouteParams = {
  params:
    | {
        owner: string;
        repo: string;
      }
    | Promise<{
        owner: string;
        repo: string;
      }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const tokenResult = await getValidGitHubAccessToken(user.id);
    if (!tokenResult.ok) {
      return NextResponse.json({ message: tokenResult.message }, { status: tokenResult.status });
    }

    const accessToken = tokenResult.accessToken;
    const url = new URL(request.url);
    const params = await Promise.resolve(context.params);
    const owner = params?.owner;
    const repo = params?.repo;
    const path = url.searchParams.get("path");
    const ref = url.searchParams.get("ref") || "main";

    if (!owner || !repo) {
      return NextResponse.json({ message: "Repository parameters are missing." }, { status: 400 });
    }

    if (!path) {
      return NextResponse.json({ message: "Missing 'path' parameter." }, { status: 400 });
    }

    const apiUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "AVACX-App",
        Accept: "application/vnd.github+json",
      },
    });

    if (response.status === 401) {
      return NextResponse.json(
        {
          message:
            "GitHub rejected the request. Revoke AVACX in your GitHub settings and connect again to refresh permissions.",
        },
        { status: 401 }
      );
    }

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      const payload = text ? (() => { try { return JSON.parse(text); } catch { return { message: text }; } })() : { message: "GitHub request failed" };
      return NextResponse.json(payload, { status });
    }

    const json = await response.json();

    // If it's a directory, we don't support preview via this endpoint
    if (Array.isArray(json)) {
      return NextResponse.json({ message: "Requested path is a directory." }, { status: 400 });
    }

    if (json.type !== "file") {
      return NextResponse.json({ message: "Requested path is not a file." }, { status: 400 });
    }

    // The GitHub contents API returns base64-encoded content for files
    const encoding = json.encoding as string | undefined;
    const rawContent = json.content as string | undefined;
    let decoded = "";
    if (encoding === "base64" && typeof rawContent === "string") {
      try {
        decoded = Buffer.from(rawContent.replace(/\n/g, ""), "base64").toString("utf8");
      } catch {
        decoded = "";
      }
    }

    return NextResponse.json({
      path,
      ref,
      size: json.size,
      encoding: "utf8",
      content: decoded,
    });
  } catch (error) {
    console.error("[api/github/contents]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
