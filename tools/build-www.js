#!/usr/bin/env node
/* Assembles the shippable web app into www/ for native packaging (Capacitor).
   Keeps the repo root clean: tools, tests, docs and git metadata stay out of
   the app bundle that goes to the app stores.
   Usage: node tools/build-www.js */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "www");

// Everything the running game needs, and nothing else.
const INCLUDE = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "sw.js",
  "js",
  "icons",
];

function copy(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) copy(path.join(src, entry), path.join(dest, entry));
  } else {
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

let files = 0;
for (const item of INCLUDE) {
  const src = path.join(root, item);
  if (!fs.existsSync(src)) {
    console.error(`  missing: ${item}`);
    process.exit(1);
  }
  copy(src, path.join(out, item));
  files++;
}

console.log(`built ${out} (${files} top-level entries)`);
