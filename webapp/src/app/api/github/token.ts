import { db } from "@/app/lib/db";

const GITHUB_REFRESH_ENDPOINT = "https://github.com/login/oauth/access_token";

const CLIENT_ID = process.env.GITHUB_ID ?? "";
const CLIENT_SECRET = process.env.GITHUB_SECRET ?? "";

type TokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; status: number; message: string };

const refreshWindowPadding = 60 * 1000; // refresh one minute before expiry

export async function getValidGitHubAccessToken(userId: number): Promise<TokenResult> {
  const githubAccount = await db.account.findFirst({
    where: { userId, provider: "github" },
    select: {
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
      token_type: true,
    },
  });

  if (!githubAccount?.access_token) {
    return { ok: false, status: 400, message: "GitHub account not linked" };
  }

  const scopeList = (githubAccount.scope ?? "")
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  const hasRepoScope = scopeList.some((scope) => scope === "repo" || scope === "public_repo");

  if (!hasRepoScope) {
    return {
      ok: false,
      status: 403,
      message:
        "Your GitHub connection is missing repository permissions. Please disconnect GitHub from Account Settings and connect it again.",
    };
  }

  const expiresAt = githubAccount.expires_at ? githubAccount.expires_at * 1000 : null;
  const now = Date.now();

  if (expiresAt === null || expiresAt - refreshWindowPadding > now) {
    return { ok: true, accessToken: githubAccount.access_token };
  }

  if (!githubAccount.refresh_token) {
    return {
      ok: false,
      status: 401,
      message: "GitHub access token expired and cannot be refreshed. Please reconnect your GitHub account.",
    };
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      ok: false,
      status: 500,
      message: "GitHub client credentials are not configured on the server.",
    };
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: githubAccount.refresh_token,
  });

  const response = await fetch(GITHUB_REFRESH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload || typeof payload.access_token !== "string") {
    const message =
      typeof payload?.error_description === "string"
        ? payload.error_description
        : typeof payload?.error === "string"
        ? payload.error
        : "Unable to refresh GitHub access token.";

    return {
      ok: false,
      status: response.status || 500,
      message,
    };
  }

  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : null;
  const refreshToken = typeof payload.refresh_token === "string" ? payload.refresh_token : githubAccount.refresh_token;
  const scope = typeof payload.scope === "string" ? payload.scope : githubAccount.scope ?? undefined;
  const tokenType = typeof payload.token_type === "string" ? payload.token_type : githubAccount.token_type ?? undefined;

  await db.account.update({
    where: {
      provider_providerAccountId: {
        provider: "github",
        providerAccountId: githubAccount.providerAccountId,
      },
    },
    data: {
      access_token: payload.access_token,
      refresh_token: refreshToken,
      expires_at: expiresIn ? Math.floor((Date.now() + expiresIn * 1000) / 1000) : null,
      scope,
      token_type: tokenType,
    },
  });

  return { ok: true, accessToken: payload.access_token };
}
