/*
  Generate pictorial icons using Simple Icons and write them to public/assets/icons.
  This replaces text-based placeholders with official brand marks where available.
*/

const fs = require('fs');
const path = require('path');
const { get } = require('simple-icons');

const OUT_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'icons');

/** Map of existing filenames to Simple Icons slugs */
const slugMap = {
  c: 'c',
  cpp: 'cplusplus',
  cs: 'csharp',
  css: 'css3',
  go: 'go',
  html: 'html5',
  java: 'java',
  js: 'javascript',
  json: 'json',
  md: 'markdown',
  php: 'php',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  ts: 'typescript',
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
function normalizeSvg(svg, colorHex) {
  // Ensure we set fill color to brand color via currentColor and color style
  // If the SVG already has role/img attributes from Simple Icons, preserve them.
  // We inject a color style attribute on the <svg> root to apply the brand color.
  let out = svg;
  // Add color attribute if missing; avoid duplicating if present
  if (!/\s(color|style)=/i.test(out)) {
    out = out.replace(
      /<svg(\s[^>]*?)?>/i,
      (m) => m.replace('>', ` style="color:#${colorHex}" role="img">`)
    );
  }
  return out;
}

// Generate brand icons
for (const [name, slug] of Object.entries(slugMap)) {
  const icon = get(slug);
  if (!icon) {
    console.warn(`Warning: No Simple Icon found for slug '${slug}' (for ${name}.svg)`);
    continue;
  }
  const svg = normalizeSvg(icon.svg, icon.hex || '000000');
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
