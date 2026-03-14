/*
  Generate pictorial icons using Simple Icons and write them to public/assets/icons.
  This replaces text-based placeholders with official brand marks where available.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { getIconsData, getIconSlug } from 'simple-icons/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT_DIR, 'public', 'assets', 'icons');
const SI_ICONS_DIR = path.resolve(ROOT_DIR, 'node_modules', 'simple-icons', 'icons');

/** Map of existing filenames to Simple Icons slugs */
// Base set: maintain existing filenames in public/assets/icons
const slugMap = {
  c: 'c',
  cpp: 'cplusplus',
  cs: 'dotnet',
  css: 'css3',
  go: 'go',
  html: 'html5',
  java: 'openjdk',
  js: 'javascript',
  json: 'json',
  md: 'markdown',
  php: 'php',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  ts: 'typescript',
};

// Extended mapping from file extensions to Simple Icons slugs
const EXT_SLUG = {
  c: 'c',
  h: 'c',
  cc: 'cplusplus',
  cpp: 'cplusplus',
  cxx: 'cplusplus',
  hh: 'cplusplus',
  hpp: 'cplusplus',
  cs: 'dotnet',
  css: 'css3',
  go: 'go',
  html: 'html5',
  htm: 'html5',
  java: 'openjdk',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'react',
  ts: 'typescript',
  tsx: 'react',
  json: 'json',
  md: 'markdown',
  mdx: 'mdx',
  php: 'php',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sh: 'gnubash',
  bash: 'gnubash',
  zsh: 'zsh',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  dockerfile: 'docker',
  sql: 'postgresql',
  prisma: 'prisma',
  lock: 'npm',
};

/** Ensure output directory exists */
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Write a given SVG content to the output directory
 */
function writeSvg(name, svg) {
  const fp = path.join(OUT_DIR, `${name}.svg`);
  fs.writeFileSync(fp, svg.trim() + '\n', 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), fp)}`);
}

/**
 * Normalize Simple Icons provided SVG for a consistent 24x24 size.
 * Simple Icons already provides 24x24 viewBox; we just keep it as-is.
 */
const COLOR_OVERRIDES = {
  // per output filename (extension key)
  rs: { bg: '#DEA584', fg: '#FFFFFF' },      // Rust (GitHub language color)
  md: { bg: '#4F8AFF', fg: '#FFFFFF' },      // Markdown (pleasant blue)
  json: { bg: '#F7DF1E', fg: '#000000' },    // JSON (yellow like JS)
  java: { bg: '#ED8B00', fg: '#FFFFFF' },    // Java/OpenJDK (classic orange)
};

function normalizeSvg(svg, hex, name) {
  // Inject fill="currentColor" on root <svg> and a style color with brand hex
  let out = svg;
  const isBlack = !hex || /^0{3,6}$/i.test(hex);
  const override = COLOR_OVERRIDES[name];
  const fg = override?.fg || (isBlack ? undefined : `#${hex}`);
  const bg = override?.bg;

  // 1) Ensure currentColor fill and color style on <svg>
  out = out.replace(
    /<svg(\s[^>]*?)?>/i,
    (m, attrs = '') => {
      const hasFill = /\sfill=/.test(attrs);
      const hasStyle = /\sstyle=/.test(attrs);
      let newAttrs = attrs || '';
      if (!hasFill) newAttrs += ' fill="currentColor"';
      if (!hasStyle && (fg || isBlack)) {
        const color = fg || '#000000';
        newAttrs += ` style="color:${color}"`;
      }
      return `<svg${newAttrs}>`;
    }
  );

  // 2) If we have a background override, inject a rounded rect right after <svg...>
  if (bg) {
    const bgRect = `<rect width="24" height="24" rx="4" fill="${bg}"/>`;
    out = out.replace(/<svg[^>]*>/i, (m) => `${m}${bgRect}`);
  }

  return out;
}

// Generate brand icons
const data = await getIconsData();
const hexBySlug = new Map(data.map((d) => [getIconSlug(d), d.hex]));

// If --all is passed, scan repo to add more icons based on actual file extensions
let finalMap = { ...slugMap };
if (process.argv.includes('--all')) {
  try {
    const out = execSync('git ls-files -co --exclude-standard', {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    const exts = new Set(
      out
        .split('\n')
        .filter(Boolean)
        .filter((p) => !p.startsWith('node_modules/') && !p.startsWith('target/') && !p.startsWith('public/generated/') )
        .map((p) => {
          const base = p.split('/').pop() || '';
          const m = base.toLowerCase().match(/^(dockerfile)$|\.([a-z0-9]+)$/);
          return m ? (m[1] || m[2]) : '';
        })
        .filter(Boolean)
    );
    for (const ext of exts) {
      const slug = EXT_SLUG[ext];
      if (slug) {
        // Write using the extension name, unless we already have a nicer alias in base set
        const name = ext in finalMap ? ext : ext;
        finalMap[name] = slug;
      }
    }
  } catch {
    console.warn('Repo scan skipped (git not available).');
  }
}

for (const [name, slug] of Object.entries(finalMap)) {
  const iconPath = path.join(SI_ICONS_DIR, `${slug}.svg`);
  if (!fs.existsSync(iconPath)) {
    console.warn(`Warning: Missing icon file for slug '${slug}' (${iconPath})`);
    continue;
  }
  const raw = fs.readFileSync(iconPath, 'utf8');
  const hex = hexBySlug.get(slug);
  const svg = normalizeSvg(raw, hex, name);
  writeSvg(name, svg);
}

// Create a neutral default file icon (pictorial, no text)
const defaultSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="file icon">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9CA3AF"/>
      <stop offset="100%" stop-color="#6B7280"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="none">
    <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="url(#g)"/>
    <path d="M13 2v5a2 2 0 0 0 2 2h5" fill="#E5E7EB"/>
    <rect x="7" y="12" width="10" height="1.6" rx="0.8" fill="#D1D5DB"/>
    <rect x="7" y="15" width="10" height="1.6" rx="0.8" fill="#D1D5DB"/>
  </g>
  <title>File</title>
  <desc>Generic file icon without text</desc>
  <style>svg{color:#6B7280}</style>
 </svg>`;

writeSvg('default', defaultSvg);

console.log('Icon generation complete.');
