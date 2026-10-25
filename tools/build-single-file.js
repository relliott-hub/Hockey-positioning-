#!/usr/bin/env node
/* Bundles the multi-file game into one self-contained HTML file (dist/hockey-iq-trainer.html).
   The single file can be opened directly in any browser, emailed, or published anywhere.
   Usage: node tools/build-single-file.js */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
/* Read the script list out of index.html rather than keeping a copy of it.

   This used to be a hardcoded array of filenames, which is a standing
   invitation for the bundle to drift from the page: adding a file and
   forgetting to list it ships a bundle missing a file, and removing one
   crashes the build. Order matters — the game's files assume the order the
   page loads them in — so the page's own order is the one to use. */
let body = html.split(/<body>/)[1].split(/<\/body>/)[0];
const scripts = [...body.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
if (!scripts.length) {
  console.error("No js/ script tags found in index.html — refusing to build an empty bundle.");
  process.exit(1);
}
const js = scripts.map(rel => {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error(`index.html loads ${rel}, which does not exist.`);
    process.exit(1);
  }
  return `/* ---- ${rel} ---- */\n` + fs.readFileSync(p, "utf8");
}).join("\n");

// Drop the external script tags and any block marked build:strip (things that
// only make sense for the hosted, multi-file site)
body = body.replace(/<script src="[^"]+"><\/script>\s*/g, "");
body = body.replace(/<!--\s*build:strip-start[\s\S]*?build:strip-end\s*-->\s*/g, "");

// charset MUST be first — without it, browsers guess an encoding and emoji shatter into mojibake
const out = `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Hockey IQ Trainer</title>
<style>
${css}
</style>
${body}
<script>
${js}
</script>
`;

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const outPath = path.join(root, "dist", "hockey-iq-trainer.html");
fs.writeFileSync(outPath, out);
console.log(`built ${outPath} (${out.length} bytes)`);
