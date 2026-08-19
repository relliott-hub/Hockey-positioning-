#!/usr/bin/env node
/* Renders the app icons from a single SVG source so every size stays identical.
   Usage: node tools/make-icons.js   (writes icons/*.png)
   Requires playwright-core; only needs re-running when the icon design changes. */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "icons");

// Icon: a hockey puck on ice with a stick sweeping through, on rink navy.
// `pad` insets the art for maskable icons, where launchers crop the edges.
const svg = (size, pad = 0) => {
  const s = size, c = s / 2, k = s / 512; // k scales the 512-based art
  const inset = pad * s;
  const art = s - inset * 2;
  const a = art / 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12365e"/><stop offset="1" stop-color="#0b1f38"/>
    </linearGradient>
    <linearGradient id="ice" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d8e8f7"/>
    </linearGradient>
    <linearGradient id="stick" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7d070"/><stop offset="1" stop-color="#d99a25"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="url(#bg)"/>
  <g transform="translate(${inset},${inset}) scale(${a})">
    <ellipse cx="256" cy="322" rx="196" ry="74" fill="url(#ice)" opacity="0.16"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="#3f7ec4" stroke-width="${10 / a * a}" opacity="0.5"/>
    <path d="M256 106 L256 406" stroke="#c0392b" stroke-width="9" opacity="0.55"/>
    <path d="M150 372 C210 300, 250 250, 322 150" stroke="url(#stick)" stroke-width="34"
          stroke-linecap="round" fill="none"/>
    <path d="M150 372 L104 388 C92 392, 88 376, 98 368 L140 340 Z" fill="url(#stick)"/>
    <ellipse cx="330" cy="332" rx="74" ry="30" fill="#0a0a0a"/>
    <ellipse cx="330" cy="322" rx="74" ry="30" fill="#232323"/>
    <ellipse cx="330" cy="322" rx="52" ry="19" fill="#3a3a3a"/>
  </g>
</svg>`.replace(/\s+/g, " ");
};

const SIZES = [
  { file: "icon-192.png", size: 192, pad: 0 },
  { file: "icon-512.png", size: 512, pad: 0 },
  { file: "icon-maskable-192.png", size: 192, pad: 0.12 },
  { file: "icon-maskable-512.png", size: 512, pad: 0.12 },
  { file: "apple-touch-icon.png", size: 180, pad: 0 },
  { file: "favicon-32.png", size: 32, pad: 0 },
];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  for (const { file, size, pad } of SIZES) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<body style="margin:0">${svg(size, pad)}</body>`,
      { waitUntil: "load" }
    );
    await page.screenshot({ path: path.join(outDir, file), omitBackground: true });
    console.log(`  ${file} (${size}x${size})`);
  }
  fs.writeFileSync(path.join(outDir, "icon.svg"), svg(512, 0));
  console.log("  icon.svg (source)");
  await browser.close();
})().catch(e => { console.error("icon build failed:", e); process.exit(1); });
