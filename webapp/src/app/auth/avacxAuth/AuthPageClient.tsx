"use client";
import React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Tomorrow } from "next/font/google";
import { CheckCircle2 } from "lucide-react";

const tomorrow = Tomorrow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const AuthPageClient: React.FC = () => {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const resolvedCallbackUrl =
    rawCallbackUrl && rawCallbackUrl.startsWith("/")
      ? rawCallbackUrl
      : "/dashboard";

  const highlights = [
    "Unified access to your AVACX workspace",
    "GitHub-backed security with zero procurement delays",
    "Aligned with every pricing tier commitment",
  ];

  const handleGithubLogin = async () => {
    try {
      await signIn("github", { callbackUrl: resolvedCallbackUrl });
    } catch (error) {
      console.error("GitHub sign-in failed", error);
    }
  };

  return (
    <div
      className={`${tomorrow.className} relative min-h-screen w-full overflow-hidden bg-black text-white`}
      style={{
        backgroundImage: "url('/assets/GREEN_EARTH.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/85" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-black/70 to-black" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="mx-auto grid w-full max-w-5xl gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center border border-emerald-800/60 bg-emerald-900/20 px-4 py-1 text-[11px] uppercase tracking-[0.35em] text-emerald-200/80">
              AVACX
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
                Seamless entry, same promise as our landing and pricing tours
              </h1>
              <p className="text-sm text-emerald-100/70 md:max-w-lg">
                GitHub is the single source of truth for signing in. The green trail from our pricing tiers now guides you straight into your workspace.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-emerald-100/80">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-lime-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 text-xs text-emerald-100/60">
              <span className="border border-emerald-800/60 bg-emerald-900/20 px-3 py-1 uppercase tracking-[0.3em]">
                Fyron Industries
              </span>
              <Link
                href="/landing/pricing"
                className="border border-emerald-800/60 bg-emerald-900/20 px-3 py-1 uppercase tracking-[0.3em] text-emerald-100/75 transition hover:border-lime-400/70 hover:text-white"
              >
                View Plans
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-12 -top-px h-px bg-gradient-to-r from-transparent via-lime-400/70 to-transparent" aria-hidden="true" />
            <div className="border border-emerald-800/60 bg-black/60 p-1 backdrop-blur">
              <div className="border border-emerald-900/80 bg-gradient-to-b from-emerald-900/40 via-black/60 to-black/70 p-8">
                <div className="space-y-6 text-left">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-100/50">
                      Single Sign-On
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">Continue with GitHub</h2>
                    <p className="mt-2 text-sm text-emerald-100/70">
                      Authenticate once and launch your dashboard. No extra credentials, perfectly aligned with how we price and secure AVACX.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGithubLogin}
                    className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden border border-lime-400/50 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-sm font-semibold tracking-wide transition hover:border-lime-300 hover:shadow-[0_20px_50px_-25px_rgba(163,230,53,0.8)] cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-lime-400/20 via-transparent to-lime-400/20 opacity-0 transition group-hover:opacity-100" />
                    <svg viewBox="0 0 24 24" fill="currentColor" className="relative h-6 w-6">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span className="relative">Authenticate with GitHub</span>
                  </button>

                  <div className="border border-emerald-900/70 bg-black/50 p-4 text-xs text-emerald-100/70">
                    <p className="font-semibold text-white">Need alternatives?</p>
                    <p className="mt-2">
                      Talk to the AVACX team for bespoke enterprise SSO. We extend the same greenline support showcased in our pricing commitments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPageClient;
