"use client";

import { useSession } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, Unplug, X, Copy, Layers, Github } from "lucide-react";

function randomChunk(length: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i += 1) array[i] = Math.floor(Math.random() * alphabet.length);
  }
  return Array.from(array, (num) => alphabet[num % alphabet.length]).join("");
}

function buildCode(identifier: string) {
  const segments = [randomChunk(7), randomChunk(9), randomChunk(11)].join("-");
  const stamp = Date.now().toString(36);
  return `avacx@${identifier}.${segments}.${stamp}`;
}

type Maybe<T> = T | null;

export default function ScaAccess() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [code, setCode] = useState<Maybe<string>>(null);
  const [storageKey, setStorageKey] = useState<Maybe<string>>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('SCA');

  const userDisplayName = useMemo(() => {
    const name = session?.user?.name?.trim();
    if (name && name.length > 0) return name;
    return "Guest";
  }, [session]);

  const userIdentifier = useMemo(() => userDisplayName.replace(/\s+/g, "-").toLowerCase(), [userDisplayName]);

  const handleOpen = useCallback(() => {
    if (typeof window !== "undefined" && userIdentifier) {
      const key = `sca-code:${userIdentifier}`;
      setStorageKey(key);
      const existing = window.localStorage.getItem(key);
      const value = existing ?? buildCode(userIdentifier);
      if (!existing) window.localStorage.setItem(key, value);
      setCode(value);
    }
    setIsOpen(true);
  }, [userIdentifier]);

  const regenerateCode = useCallback(() => {
    const resolvedKey = storageKey ?? (userIdentifier ? `sca-code:${userIdentifier}` : null);
    if (!userIdentifier || !resolvedKey || typeof window === "undefined") return;
    const generated = buildCode(userIdentifier);
    window.localStorage.setItem(resolvedKey, generated);
    setStorageKey(resolvedKey);
    setCode(generated);
  }, [storageKey, userIdentifier]);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        document.body.removeChild(ta);
      } catch {
        // noop
      }
    }
  }, [code]);

  const closeAll = () => {
    setIsConfirmOpen(false);
    setIsOpen(false);
  };

  const tabs = ['SCA', 'Workspace', 'GitHub'];

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 px-2.5 h-8 rounded-md border border-[#2b2b2c] bg-[#0f1115] text-xs font-semibold text-white hover:border-[#3b3d45] hover:bg-[#13161a] transition cursor-pointer"
        aria-label="Open Security Code Access"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-sm text-white/80">
          <Unplug size={12} strokeWidth={2} />
        </span>
        <span className="tracking-tight">SCA</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-zinc-800 shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-800 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">AVACX Workspace</h2>
                <p className="text-sm text-gray-400">Manage your workspace, snips, users, integrations, and SCA code.</p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-200 transition-colors p-1 cursor-pointer"
                title="Close"
                onClick={() => setIsOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-800 px-6 flex gap-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab
                      ? 'border-emerald-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab === 'SCA' && <Unplug size={16} className="inline mr-1" />}
                  {tab === 'Workspace' && <Layers size={16} className="inline mr-1" />}
                  {tab === 'GitHub' && <Github size={16} className="inline mr-1" />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {activeTab === 'SCA' && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Unplug size={18} /> Security Code Access
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">Use your AVACX SCA code to connect clients securely.</p>
                  <div className="rounded-lg border border-[#1e222a] bg-[#0c0f13] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-[#9ca3af]">Your SCA code</p>
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!code}
                        className="flex items-center gap-2 px-2 py-1 text-[11px] font-semibold rounded-md border border-[#2d313a] text-white hover:bg-[#171a20] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Copy size={12} />
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="text-[13px] font-mono leading-6 break-all text-white">
                      {code ?? "Loading secure code..."}
                    </div>
                    <p className="mt-2 text-[11px] text-[#9ca3af]">Use this code for Security Code Access. It stays the same until you regenerate.</p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={closeAll}
                      className="px-3 py-2 text-xs font-semibold text-[#cfd3dc] rounded-md border border-[#2d313a] hover:bg-[#171a20] cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmOpen(true)}
                      disabled={!code}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border border-[#2d313a] text-white hover:bg-[#171a20] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'Workspace' && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Workspace Overview</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Manage your AVACX workspace, invite team members, and configure workspace settings for collaborative development.
                  </p>
                </div>
              )}
              
              {activeTab === 'GitHub' && (
                <div>
                  <h3 className="text-white font-semibold mb-3">GitHub Integration</h3>
                  <p className="text-sm text-gray-400 mb-4">Connect your GitHub account to sync snips and automate code reviews.</p>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>Repository: avacx/AVACX</li>
                      <li>Last sync: 2025-12-15</li>
                      <li>Auto PR scan enabled</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-3">
          <div className="w-full max-w-sm rounded-xl border border-[#353945] bg-[#0f1115] p-4 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f2730] text-[#7de1c3] border border-[#28323d]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold">Generate a new code?</p>
                <p className="text-xs text-[#9ca3af]">Your current SCA code will be replaced. This action cannot be undone.</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-3 py-2 text-xs font-semibold rounded-md text-[#cfd3dc] border border-[#2d313a] hover:bg-[#171a20]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  regenerateCode();
                  setIsConfirmOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border border-[#2d313a] text-white hover:bg-[#171a20]"
              >
                <RefreshCw size={14} />
                Generate new code
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}