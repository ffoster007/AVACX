import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { getValidGitHubAccessToken } from "../token";

const GITHUB_API_BASE = "https://api.github.com";

type SessionWithId = Session & { id?: number | string };

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: "Unauthorized - No session" }, { status: 401 });
    }
    
    const sessionWithId = session as SessionWithId;
    const sessionUserEmail = session?.user?.email;
    
    // Try to get user ID from session.id (set in JWT callback)
    const parsedId = sessionWithId?.id !== undefined ? Number(sessionWithId.id) : null;
    const sessionUserId = typeof parsedId === "number" && Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;

    // We need at least an email or a valid user ID
    if (!sessionUserEmail && sessionUserId === null) {
      console.log("[api/github/repos] No email or userId in session:", { email: sessionUserEmail, id: sessionWithId?.id });
      return NextResponse.json({ message: "Unauthorized - Missing user identifier" }, { status: 401 });
    }

    // Prioritize lookup by ID if available, fallback to email
    let user = null;
    if (sessionUserId !== null) {
      user = await db.user.findUnique({ where: { id: sessionUserId } });
    }
    if (!user && sessionUserEmail) {
      user = await db.user.findUnique({ where: { email: sessionUserEmail } });
    }
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const tokenResult = await getValidGitHubAccessToken(user.id);
    if (!tokenResult.ok) {
      return NextResponse.json({ message: tokenResult.message }, { status: tokenResult.status });
    }

    const accessToken = tokenResult.accessToken;

    const response = await fetch(
      `${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "AVACX-App",
          Accept: "application/vnd.github+json",
        },
      }
    );

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

    const data: Array<Record<string, unknown>> = await response.json();

    const shaped = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      language: repo.language,
      html_url: repo.html_url,
      updated_at: repo.updated_at,
      default_branch: repo.default_branch,
      owner: repo.owner && typeof repo.owner === "object" ? { login: (repo.owner as { login?: string }).login } : null,
    }));

    return NextResponse.json({ repositories: shaped });
  } catch (error) {
    console.error("[api/github/repos]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
