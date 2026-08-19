#!/usr/bin/env node
/* Hockey IQ Trainer — end-to-end test suite.
   Drives the real game in a headless browser and checks both that it works and
   that the coaching content is correct (the audit invariants live here so they
   can never silently regress).

   Usage:
     node tools/test.js                 # test the multi-file site
     GAME_URL=... node tools/test.js    # test a specific build (e.g. dist bundle)

   Requires playwright-core and a Chromium at CHROMIUM (default /opt/pw-browsers/chromium). */
const path = require("path");
const { chromium } = require("playwright-core");

const ROOT = path.join(__dirname, "..");
const URL = process.env.GAME_URL || "file://" + path.join(ROOT, "index.html");
const EXEC = process.env.CHROMIUM || "/opt/pw-browsers/chromium";
const ROLES = ["C", "LW", "RW", "LD", "RD"];

let passed = 0, failed = 0;
const fail = (name, detail) => { failed++; console.log(`  ✗ ${name}\n      ${detail}`); };
const pass = (name, detail) => { passed++; console.log(`  ✓ ${name}${detail ? "  — " + detail : ""}`); };
const check = (cond, name, detail) => cond ? pass(name, detail) : fail(name, detail);
const section = (t) => console.log(`\n${t}`);

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  const dataWarnings = [];
  page.on("console", m => { if (m.type() === "warning" && m.text().includes("[HIQ]")) dataWarnings.push(m.text()); });

  const tapCanvas = async (x, y) => {
    await page.evaluate(() => document.getElementById("rink").scrollIntoView({ block: "center" }));
    const box = await page.locator("#rink").boundingBox();
    await page.mouse.click(box.x + x * (box.width / 1100), box.y + y * (box.height / 620));
  };
  const settle = () => page.waitForFunction(() => !HIQ.debug.simRunning(), null, { timeout: 15000 });

  // ---------------------------------------------------------------- tutorial
  section("Tutorial (first run)");
  await page.goto(URL);
  await page.waitForTimeout(400);
  check(await page.locator("#tutorial").isVisible(), "shows on first visit");
  const steps = [];
  for (let i = 0; i < 4; i++) {
    steps.push(await page.locator("#tutTitle").innerText());
    if (i < 3) { await page.locator("#tutNext").click(); await page.waitForTimeout(180); }
  }
  check(new Set(steps).size === 4, "walks through 4 distinct steps", steps.length + " steps");
  await page.locator("#tutNext").click();
  await page.waitForTimeout(250);
  check(!(await page.locator("#tutorial").isVisible()), "dismisses on finish");
  await page.reload();
  await page.waitForTimeout(400);
  check(!(await page.locator("#tutorial").isVisible()), "stays dismissed after reload");

  // ------------------------------------------------------------- core loop
  section("Core gameplay loop");
  let sc = await page.evaluate(() => HIQ.debug.getScenario());
  check(!!sc && !!sc.id, "a scenario is built on load", sc && sc.id);
  let opts = await page.evaluate(() => HIQ.debug.getChoices().map(o => ({ c: o.correct, x: o.pos.x, y: o.pos.y, s: o.res.score })));
  check(opts.length === 3, "three choices offered", `${opts.length} options`);
  check(opts.filter(o => o.c).length === 1, "exactly one is correct");

  let right = opts.find(o => o.c);
  await tapCanvas(right.x, right.y);
  await settle();
  let status = await page.locator("#status").innerText();
  check(/NICE READ/.test(status), "correct choice succeeds", status.slice(0, 45));

  await page.waitForTimeout(2200);
  opts = await page.evaluate(() => HIQ.debug.getChoices().map(o => ({ c: o.correct, x: o.pos.x, y: o.pos.y })));
  check(opts.length === 3, "next play auto-starts");

  const wrong = opts.find(o => !o.c);
  await tapCanvas(wrong.x, wrong.y);
  await settle();
  status = await page.locator("#status").innerText();
  check(/NOT THIS TIME|NOT QUITE/.test(status), "wrong choice fails", status.slice(0, 45));
  check(status.length > 40, "failure explains the specific mistake");

  // The answer must NOT be revealed on the first miss (kids would tap the circle)
  await page.waitForTimeout(2000);
  const revealedFirst = await page.evaluate(() => HIQ.debug.guidanceShown());
  check(revealedFirst === false, "first miss re-asks without revealing the answer");
  const opts2 = await page.evaluate(() => HIQ.debug.getChoices().map(o => ({ c: o.correct, x: o.pos.x, y: o.pos.y })));
  const wrong2 = opts2.find(o => !o.c);
  await tapCanvas(wrong2.x, wrong2.y);
  await settle();
  await page.waitForTimeout(2000);
  check(await page.evaluate(() => HIQ.debug.guidanceShown()) === true, "second miss reveals the coaching spot");

  // ------------------------------------------------------------- drag mode
  section("Free-drag mode");
  await page.selectOption("#answerStyle", "drag");
  await page.waitForTimeout(400);
  const g = await page.evaluate(() => HIQ.debug.getPieces().guidance);
  await page.evaluate(({ x, y }) => HIQ.debug.place(x, y), g);
  await page.click("#lockBtn");
  await settle();
  status = await page.locator("#status").innerText();
  check(/NICE READ/.test(status), "placing on the ideal spot succeeds", status.slice(0, 40));
  await page.selectOption("#answerStyle", "choices");
  await page.waitForTimeout(1800);

  // --------------------------------------------------------------- formats
  section("Game formats");
  for (const [fmt, ours, theirs] of [["5v5", 5, 5], ["5v4", 5, 4], ["4v5", 4, 5]]) {
    await page.selectOption("#format", fmt);
    await page.waitForTimeout(350);
    const r = await page.evaluate(() => {
      const p = HIQ.debug.getPieces();
      return {
        ours: p.controlled.length + p.offense.filter(q => q.role !== "G").length,
        theirs: p.defense.filter(q => q.role !== "G").length,
      };
    });
    check(r.ours === ours && r.theirs === theirs, `${fmt} puts the right skaters on the ice`, `${r.ours}v${r.theirs}`);
  }

  // Every role must land on a real position in every format/structure
  let phantom = 0;
  for (const fmt of ["5v4", "4v5"]) {
    await page.selectOption("#format", fmt);
    for (const struct of ["box", "diamond"]) {
      await page.selectOption("#pkStruct", struct).catch(() => {});
      for (const role of ROLES) {
        await page.selectOption("#role", role);
        await page.waitForTimeout(90);
        const ok = await page.evaluate(() => {
          const s = HIQ.debug.getScenario();
          const p = HIQ.debug.getPieces();
          return !!s.guidanceByRole[s.role] && p.controlled.length > 0;
        });
        if (!ok) phantom++;
      }
    }
  }
  check(phantom === 0, "no role is ever assigned a position that isn't on the ice", `${phantom} phantom assignments`);
  await page.selectOption("#format", "5v5");
  await page.selectOption("#role", "C");

  // ------------------------------------------------- scoring invariants
  section("Scoring invariants (the audit checks)");
  let idealBad = 0, idealN = 0;
  for (const age of ["6-8", "9-11", "12-14"]) {
    for (const diff of ["easy", "med", "hard"]) {
      await page.selectOption("#age", age);
      await page.selectOption("#diff", diff);
      await page.waitForTimeout(80);
      const r = await page.evaluate(() => {
        let bad = 0, n = 0;
        for (let i = 0; i < 40; i++) {
          HIQ.debug.newPlay();
          const s = HIQ.debug.getScenario();
          const gg = HIQ.debug.getPieces().guidance;
          n++;
          if (HIQ.debug.scoreAt(s.role, gg.x, gg.y).score < 100) bad++;
        }
        return { bad, n };
      });
      idealBad += r.bad; idealN += r.n;
    }
  }
  check(idealBad === 0,
    "the ideal spot always scores 100, in every age and difficulty",
    `${idealN - idealBad}/${idealN} plays`);

  await page.selectOption("#age", "9-11");
  await page.selectOption("#diff", "med");
  const quality = await page.evaluate(() => {
    let beats = 0, n = 0, tooClose = 0;
    for (let i = 0; i < 120; i++) {
      HIQ.debug.newPlay();
      const o = HIQ.debug.getChoices();
      const r = o.find(x => x.correct);
      const w = o.filter(x => !x.correct);
      n++;
      if (w.every(x => x.res.score < r.res.score)) beats++;
      if (w.some(x => x.res.score >= r.res.score - 5)) tooClose++;
    }
    return { beats, n, tooClose };
  });
  check(quality.beats === quality.n, "the right answer always outscores both decoys", `${quality.beats}/${quality.n}`);
  check(quality.tooClose === 0, "no decoy is ambiguously close to correct");

  const decoyMistakes = await page.evaluate(() => {
    let withMsg = 0, n = 0;
    for (let i = 0; i < 60; i++) {
      HIQ.debug.newPlay();
      for (const o of HIQ.debug.getChoices().filter(x => !x.correct)) {
        n++; if (o.mistake && o.mistake.length > 10) withMsg++;
      }
    }
    return { withMsg, n };
  });
  check(decoyMistakes.withMsg === decoyMistakes.n,
    "every wrong answer names the mistake it represents", `${decoyMistakes.withMsg}/${decoyMistakes.n}`);

  // ---------------------------------------------------------------- variety
  section("Replay variety (anti-memorisation)");
  for (const role of ["C", "LD"]) {
    await page.selectOption("#role", role);
    await page.waitForTimeout(80);
    const v = await page.evaluate(() => {
      const spots = new Set();
      for (let i = 0; i < 120; i++) {
        HIQ.debug.newPlay();
        const gg = HIQ.debug.getPieces().guidance;
        spots.add(`${Math.round(gg.x / 12)},${Math.round(gg.y / 12)}`);
      }
      return spots.size;
    });
    check(v >= 50, `role ${role} sees many distinct coaching spots`, `${v} in 120 plays`);
  }
  const sides = await page.evaluate(() => {
    let top = 0, bottom = 0;
    for (let i = 0; i < 120; i++) {
      HIQ.debug.newPlay();
      if (HIQ.debug.getPieces().puck.y < 310) top++; else bottom++;
    }
    return { top, bottom };
  });
  check(sides.top > 25 && sides.bottom > 25, "plays run off both sides of the ice", `${sides.top} top / ${sides.bottom} bottom`);

  // ------------------------------------------------------------ persistence
  section("Progress and profile persistence");
  await page.evaluate(() => { document.getElementById("settingsPanel").open = true; });
  await page.fill("#pName", "Tester");
  await page.fill("#pNum", "17");
  await page.selectOption("#pColor", "green");
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => ({ p: HIQ.debug.getProfile(), s: HIQ.debug.getStats() }));
  await page.reload();
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ p: HIQ.debug.getProfile(), s: HIQ.debug.getStats() }));
  check(after.p.name === "Tester" && String(after.p.number) === "17" && after.p.color === "green",
    "player profile survives a reload", `${after.p.name} #${after.p.number} ${after.p.color}`);
  check(after.s.xp === before.s.xp && typeof after.s.xp === "number",
    "XP survives a reload", `xp=${after.s.xp}`);

  // ---------------------------------------------------------------- results
  section("Runtime health");
  check(errors.length === 0, "no console errors or exceptions", errors.slice(0, 3).join(" | ") || "clean");
  check(dataWarnings.length === 0, "no scenario data self-check warnings",
    [...new Set(dataWarnings)].slice(0, 3).join(" | ") || "clean");

  console.log(`\n${failed === 0 ? "PASS" : "FAIL"} — ${passed} passed, ${failed} failed\n`);
  await browser.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error("\nTEST RUN CRASHED:", e); process.exit(1); });
