#!/usr/bin/env node
/* Bundles the multi-file game into one self-contained HTML file (dist/hockey-iq-trainer.html).
   The single file can be opened directly in any browser, emailed, or published anywhere.
   Usage: node tools/build-single-file.js */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const js = ["data", "audio", "sim", "app"]
  .map(n => fs.readFileSync(path.join(root, "js", `${n}.js`), "utf8"))
  .join("\n");

// Take everything inside <body>, drop the external script tags and any block
// marked build:strip (things that only make sense for the hosted, multi-file site)
let body = html.split(/<body>/)[1].split(/<\/body>/)[0];
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
