"use client";

import React from "react";

const ICONS: Record<string, string> = {
  py: "/assets/icons/py.svg",
  go: "/assets/icons/go.svg",
  rs: "/assets/icons/rs.svg",
  js: "/assets/icons/js.svg",
  jsx: "/assets/icons/js.svg",
  ts: "/assets/icons/ts.svg",
  tsx: "/assets/icons/tsx.svg",
  mjs: "/assets/icons/mjs.svg",
  sh: "/assets/icons/sh.svg",
  java: "/assets/icons/java.svg",
  cpp: "/assets/icons/cpp.svg",
  c: "/assets/icons/c.svg",
  cs: "/assets/icons/cs.svg",
  rb: "/assets/icons/rb.svg",
  php: "/assets/icons/php.svg",
  html: "/assets/icons/html.svg",
  css: "/assets/icons/css.svg",
  md: "/assets/icons/md.svg",
  json: "/assets/icons/json.svg",
  toml: "/assets/icons/toml.svg",
  sql: "/assets/icons/sql.svg",
  prisma: "/assets/icons/prisma.svg",
};

export default function FileIcon({ name, className }: { name: string; className?: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const src = ICONS[ext] ?? "/assets/icons/default.svg";

  return (
    // plain img tag to avoid adding image deps; small svgs live in public
    // width/height styled here to match existing icons (14px)
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={ext || "file"} className={className ?? "w-[14px] h-[14px] object-contain"} />
  );
}
