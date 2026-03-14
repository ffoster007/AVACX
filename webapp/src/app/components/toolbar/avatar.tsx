"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

const THEME_OPTIONS = ["Dark", "Light", "System"] as const;

export default function Avatar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<(typeof THEME_OPTIONS)[number]>("System");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => session?.user?.name?.[0] ?? "U", [session]);
  const dropdownClasses = `absolute right-0 mt-2 w-64 bg-[#161616] text-[#cccccc] shadow-xl border border-[#464647] overflow-hidden origin-top-right transition ease-out ${
    isDropdownOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
  }`;

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleThemeChange = (theme: (typeof THEME_OPTIONS)[number]) => {
    setSelectedTheme(theme);
    // TODO: wire actual theme switching; keeping console log to preserve current behavior
    console.log("Theme changed to:", theme);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={() => setIsDropdownOpen((prev) => !prev)} className="flex items-center space-x-2 cursor-pointer focus:outline-none">
        <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200">
          {session?.user?.image ? (
            <Image src={session.user.image} alt="Profile" width={32} height={32} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">{initials}</div>
          )}
        </div>
      </button>

      <div className={dropdownClasses}>
        <div className="px-4 py-3 border-b border-[#464647]">
          <div className="font-semibold text-sm">{session?.user?.name || "Username"}</div>
          <div className="text-[#999999] text-xs mt-1">{session?.user?.email || "Email"}</div>
        </div>

        <div className="py-2">
          <MenuButton
            onClick={() => {
              setIsDropdownOpen(false);
              router.push("/routes/AvatarPopup/AccountSettings");
            }}
            label="Settings"
            icon={(
              <svg className="w-5 h-5 mr-3 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          />

          <MenuButton
            onClick={() => {
              setIsDropdownOpen(false);
              router.push("/routes/AvatarPopup/Billing");
            }}
            label="Pricing"
            icon={
              <svg className="w-4 h-4 mr-3 text-[#999999]" fill="currentColor" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg">
                <path d="M444-200h70v-50q50-9 86-39t36-89q0-42-24-77t-96-61q-60-20-83-35t-23-41q0-26 18.5-41t53.5-15q32 0 50 15.5t26 38.5l64-26q-11-35-40.5-61T516-710v-50h-70v50q-50 11-78 44t-28 74q0 47 27.5 76t86.5 50q63 23 87.5 41t24.5 47q0 33-23.5 48.5T486-314q-33 0-58.5-20.5T390-396l-66 26q14 48 43.5 77.5T444-252v52Zm36 120q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
              </svg>
            }
          />
        </div>

        <div className="border-t border-[#464647] py-2">
          <div className="px-4 py-2 text-xs font-semibold text-[#999999] uppercase tracking-wider">Theme</div>
          <div className="space-y-1 px-2">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded hover:bg-[#323538] cursor-pointer"
              >
                <span>{theme}</span>
                {selectedTheme === theme ? <div className="w-2 h-2 bg-[#007acc] rounded-full" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#464647] py-2">
          <button onClick={handleLogout} className="block w-full px-4 py-2 text-sm text-left hover:bg-[#323538] cursor-pointer">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center w-full px-4 py-2 text-sm hover:bg-[#323538] cursor-pointer">
      {icon}
      {label}
    </button>
  );
}