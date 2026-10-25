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

/* Find Playwright wherever this machine keeps it.

   This suite has been stranded three times by a fresh container that had
   `playwright` installed globally instead of `playwright-core` locally, which
   looks exactly like a broken test run. Try the known names and the common
   global prefix before giving up, and say what to do if none of them work. */
const { chromium } = (() => {
  const candidates = ["playwright-core", "playwright"];
  const extraRoots = ["/opt/node-tools/node_modules", "/usr/lib/node_modules", "/usr/local/lib/node_modules"];
  for (const name of candidates) {
    try { return require(name); } catch (e) { /* try the next one */ }
    for (const root of extraRoots) {
      try { return require(path.join(root, name)); } catch (e) { /* and the next */ }
    }
  }
  console.error("Could not find playwright-core or playwright.\n" +
    "Install one with:  npm i -D playwright-core\n" +
    "or point NODE_PATH at a global install.");
  process.exit(2);
})();

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

  // Rink coords -> page coords. The game frames the action with a camera, so this
  // has to go through the same transform the player's eye does.
  const tapCanvas = async (x, y) => {
    await page.evaluate(() => document.getElementById("rink").scrollIntoView({ block: "center" }));
    const box = await page.locator("#rink").boundingBox();
    const c = await page.evaluate(({ x, y }) => HIQ.debug.worldToScreen(x, y), { x, y });
    // Logical sheet size, not the pixel buffer: the buffer adapts to the device.
    const cw = await page.evaluate(() => [HIQ.VIEW.width, HIQ.VIEW.height]);
    await page.mouse.click(box.x + c.x * (box.width / cw[0]), box.y + c.y * (box.height / cw[1]));
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
  /* The settings panel ships collapsed, so a player meets the rink rather than
     ten dropdowns. The suite drives those dropdowns, so open it first. */
  const openSettings = () =>
    page.evaluate(() => { document.getElementById("settingsPanel").open = true; });
  await openSettings();
  await page.waitForTimeout(150);

  /* The game ships in season-plan mode, which deliberately serves only the
     current unit's scenarios. Everything below this line is about the whole
     library, so switch to free play; the plan gets its own section at the end. */
  await page.selectOption("#plan", "free");
  await page.waitForTimeout(300);

  section("Core gameplay loop");
  let sc = await page.evaluate(() => HIQ.debug.getScenario());
  check(!!sc && !!sc.id, "a scenario is built on load", sc && sc.id);
  let opts = await page.evaluate(() => HIQ.debug.getChoices().map(o => ({ c: o.correct, tier: o.tier, x: o.pos.x, y: o.pos.y, s: o.res.score })));
  check(opts.length === 3, "three choices offered", `${opts.length} options`);
  check(opts.filter(o => o.c).length === 1, "exactly one is the best read");

  let right = opts.find(o => o.c);
  await tapCanvas(right.x, right.y);
  await settle();
  let status = await page.locator("#status").innerText();
  check(/BEST READ/.test(status), "the best read succeeds", status.slice(0, 45));

  await page.waitForTimeout(2200);
  opts = await page.evaluate(() => HIQ.debug.getChoices().map(o => ({ c: o.correct, tier: o.tier, x: o.pos.x, y: o.pos.y })));
  check(opts.length === 3, "next play auto-starts");

  const wrong = opts.find(o => o.tier === "wrong") || opts.find(o => !o.c);
  await tapCanvas(wrong.x, wrong.y);
  await settle();
  status = await page.locator("#status").innerText();
  check(/NOT THIS TIME|NOT QUITE/.test(status), "wrong choice fails", status.slice(0, 45));
  check(status.length > 40, "failure explains the specific mistake");

  // The answer must NOT be revealed on the first miss (kids would tap the circle)
  await page.waitForTimeout(2000);
  const revealedFirst = await page.evaluate(() => HIQ.debug.guidanceShown());
  check(revealedFirst === false, "first miss re-asks without revealing the answer");
  const opts2 = await page.evaluate(() => HIQ.debug.getChoices().map(o => ({ c: o.correct, tier: o.tier, x: o.pos.x, y: o.pos.y })));
  const wrong2 = opts2.find(o => o.tier === "wrong") || opts2.find(o => !o.c);
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
  check(/BEST READ/.test(status), "placing on the coached spot succeeds", status.slice(0, 40));
  await page.selectOption("#answerStyle", "choices");
  await page.waitForTimeout(1800);

  // --------------------------------------------------------------- formats
  section("Rosters");
  const roster = await page.evaluate(() => {
    let bad = 0, n = 0;
    for (let i = 0; i < 40; i++) {
      HIQ.debug.newPlay();
      const p = HIQ.debug.getPieces();
      const ours = p.controlled.filter(q => q.role !== "G").length + p.offense.filter(q => q.role !== "G").length;
      const theirs = p.defense.filter(q => q.role !== "G").length;
      const goalies = p.offense.filter(q => q.role === "G").length + p.defense.filter(q => q.role === "G").length;
      n++;
      if (ours !== 5 || theirs !== 5 || goalies !== 2) bad++;
    }
    return { bad, n };
  });
  check(roster.bad === 0, "every play is a full 5v5 with both goalies", `${roster.n - roster.bad}/${roster.n}`);

  /* Special teams are back on. They were disabled for several versions because
     the old ones drew a hardcoded shape regardless of the setting, so the first
     thing to prove is that the number of players on the ice is actually the
     number the format promises. */
  for (const [fmt, ours, theirs] of [["5v4", 5, 4], ["4v5", 4, 5]]) {
    await page.selectOption("#format", fmt);
    await page.waitForTimeout(150);
    const r = await page.evaluate(({ ours, theirs }) => {
      let bad = 0, n = 0, jobs = 0;
      const phases = new Set();
      for (let i = 0; i < 20; i++) {
        HIQ.debug.newPlay();
        const p = HIQ.debug.getPieces();
        const s = HIQ.debug.getScenario();
        const o = p.controlled.filter(q => q.role !== "G").length + p.offense.filter(q => q.role !== "G").length;
        const t = p.defense.filter(q => q.role !== "G").length;
        n++;
        phases.add(s.phase);
        if (s.job) jobs++;
        if (o !== ours || t !== theirs) bad++;
      }
      return { bad, n, jobs, phases: [...phases] };
    }, { ours, theirs });
    check(r.bad === 0, `${fmt} puts ${ours} of ours and ${theirs} of theirs on the ice`,
      `${r.n - r.bad}/${r.n}, phase ${r.phases.join("/")}`);
    check(r.jobs === r.n, `${fmt} tells the player which job they have, not just their position`,
      `${r.jobs}/${r.n} named`);
  }
  await page.selectOption("#format", "5v5");
  await page.waitForTimeout(150);

  // ------------------------------------------------------- geometry claims
  /* A scenario that says "the puck is below the goal line" while drawing it
     thirteen feet above the goal line teaches the wrong vocabulary for the
     sport. Every claim a situation makes is checked against the actual ice. */
  section("Situation text matches the ice");
  const geo = await page.evaluate(() => {
    const Z = HIQ.zones, R = HIQ.RINK;
    const problems = [];
    let claimsChecked = 0;

    for (const play of HIQ.PLAYS) {
      const ourSide = play.ourNet;
      const theirSide = ourSide === "left" ? "right" : "left";
      const puckSide = Z.nearestEnd(play.puck);
      const claims = play.claims || {};

      for (const claim of (claims.puck || [])) {
        claimsChecked++;
        const ok = Z[claim](play.puck, puckSide);
        if (!ok) problems.push(`${play.id}: puck is not ${claim} (x=${play.puck.x}, y=${play.puck.y})`);
      }

      // Points are defencemen standing on the blue line of the attacking zone.
      if (claims.opponentDAtBlueLine) {
        claimsChecked++;
        for (const o of play.opponents.filter(o => /^D/.test(o.label))) {
          if (!Z.atBlueLine(o, ourSide)) {
            problems.push(`${play.id}: opponent ${o.label} at x=${o.x} is not on the blue line (${ourSide === "left" ? R.blueLineLeft : R.blueLineRight})`);
          }
        }
      }
      if (claims.ourDAtBlueLine) {
        claimsChecked++;
        for (const role of ["LD", "RD"]) {
          const d = play.players[role];
          if (d && !Z.atBlueLine(d, theirSide)) {
            problems.push(`${play.id}: our ${role} at x=${d.x} is not on the attacking blue line`);
          }
        }
      }

      // Nobody, in any authored read, may be off the ice.
      const everyone = [play.puck, ...Object.values(play.players), ...play.opponents];
      for (const r of Object.values(play.reads)) {
        everyone.push(r.best, ...r.acceptable, ...r.wrong);
      }
      for (const pt of everyone) {
        if (!Z.onIce(pt)) problems.push(`${play.id}: a position is off the ice (x=${pt.x}, y=${pt.y})`);
      }
    }
    return { problems, claimsChecked, plays: HIQ.PLAYS.length };
  });
  check(geo.problems.length === 0,
    "every situation's wording matches where things actually are",
    geo.problems.length ? geo.problems.slice(0, 5).join(" | ") : `${geo.claimsChecked} claims across ${geo.plays} plays`);

  /* The ice itself has to be right before anything standing on it can be.

     The neutral-zone dots were on the wrong side of both blue lines — placed
     5ft inside the end zones rather than 5ft into the neutral zone, which is
     what makes them neutral-zone dots. The rink drew them there too, so the
     picture a child was learning from was wrong. */
  const dots = await page.evaluate(() => {
    const R = HIQ.RINK, Z = HIQ.zones;
    const bad = [];
    for (const [name, d] of Object.entries(R.dots)) {
      if (name.startsWith("nz")) {
        if (!Z.inNeutralZone(d)) bad.push(`${name} at x=${d.x} is not in the neutral zone`);
        const line = name.includes("Left") ? R.blueLineLeft : R.blueLineRight;
        if (Math.abs(Math.abs(d.x - line) - R.nzDotFromBlueLine) > 0.01) {
          bad.push(`${name} is ${Math.abs(d.x - line)}ft from its blue line, expected ${R.nzDotFromBlueLine}`);
        }
      } else {
        // End-zone dots belong inside an end zone, not the neutral zone.
        if (Z.inNeutralZone(d)) bad.push(`${name} at x=${d.x} is in the neutral zone`);
      }
      if (!Z.onIce(d)) bad.push(`${name} is off the ice`);
    }
    return bad;
  });
  check(dots.length === 0, "every faceoff dot is on the right part of the ice",
    dots.join(" | ") || "9 dots verified against the blue lines");

  // Any scenario mentioning a landmark in its text must actually place the puck there.
  const wording = await page.evaluate(() => {
    const Z = HIQ.zones;
    const bad = [];
    const phrases = [
      [/below (your own |their |the )?goal line/i, "belowGoalLine"],
      [/in (your |their |the )?corner/i, "inCorner"],
      [/half-wall/i, "onHalfWall"],
      [/neutral zone/i, "inNeutralZone"],
    ];
    for (const play of HIQ.PLAYS) {
      const side = Z.nearestEnd(play.puck);
      for (const [re, fn] of phrases) {
        if (!re.test(play.situation)) continue;
        if (!Z[fn](play.puck, side)) {
          bad.push(`${play.id}: text says "${re.source}" but puck fails ${fn}`);
        }
      }
    }
    return bad;
  });
  check(wording.length === 0, "no scenario describes the puck somewhere it isn't",
    wording.length ? wording.join(" | ") : "all wording verified against geometry");

  // ------------------------------------------------- authored-read invariants
  section("Coaching correctness");

  // The authored best read must always grade as the best read, at every setting.
  let bestBad = 0, bestN = 0;
  for (const age of ["6-8", "9-11", "12-14"]) {
    for (const diff of ["easy", "med", "hard"]) {
      await page.selectOption("#age", age);
      await page.selectOption("#diff", diff);
      await page.waitForTimeout(70);
      const r = await page.evaluate(() => {
        let bad = 0, n = 0;
        for (let i = 0; i < 30; i++) {
          HIQ.debug.newPlay();
          const s = HIQ.debug.getScenario();
          const b = s.reads[s.role].best;
          const g = HIQ.debug.gradeAt(s.role, b.x, b.y);
          n++;
          if (g.tier !== "best" || g.score < 95) bad++;
        }
        return { bad, n };
      });
      bestBad += r.bad; bestN += r.n;
    }
  }
  check(bestBad === 0, "the coached best read always grades as best", `${bestN - bestBad}/${bestN} across all settings`);

  await page.selectOption("#age", "9-11");
  await page.selectOption("#diff", "med");

  // Every authored spot must grade as the tier it was authored as. This is the
  // check that would have caught a defensible read being marked wrong.
  const tiers = await page.evaluate(() => {
    let mis = 0, n = 0; const examples = [];
    for (let i = 0; i < 120; i++) {
      HIQ.debug.newPlay();
      const s = HIQ.debug.getScenario();
      const reads = s.reads[s.role];
      const cases = [["best", reads.best]]
        .concat(reads.acceptable.map(a => ["acceptable", a]))
        .concat(reads.wrong.map(w => ["wrong", w]));
      for (const [want, spot] of cases) {
        const g = HIQ.debug.gradeAt(s.role, spot.x, spot.y);
        n++;
        if (g.tier !== want) {
          mis++;
          if (examples.length < 4) examples.push(`${s.id}/${s.role} authored ${want} graded ${g.tier}`);
        }
      }
    }
    return { mis, n, examples };
  });
  check(tiers.mis === 0, "every authored spot grades as the tier it was written as",
    tiers.mis ? tiers.examples.join(" | ") : `${tiers.n} spots checked`);

  // Score bands must not overlap, or "that works" and "that's wrong" blur.
  const bands = await page.evaluate(() => {
    const b = { best: [], acceptable: [], wrong: [] };
    for (let i = 0; i < 120; i++) {
      HIQ.debug.newPlay();
      const s = HIQ.debug.getScenario();
      const reads = s.reads[s.role];
      b.best.push(HIQ.debug.gradeAt(s.role, reads.best.x, reads.best.y).score);
      for (const a of reads.acceptable) b.acceptable.push(HIQ.debug.gradeAt(s.role, a.x, a.y).score);
      for (const w of reads.wrong) b.wrong.push(HIQ.debug.gradeAt(s.role, w.x, w.y).score);
    }
    const lo = a => Math.min(...a), hi = a => Math.max(...a);
    return {
      best: [lo(b.best), hi(b.best)],
      acceptable: [lo(b.acceptable), hi(b.acceptable)],
      wrong: [lo(b.wrong), hi(b.wrong)],
    };
  });
  check(bands.acceptable[1] < bands.best[0] && bands.wrong[1] < bands.acceptable[0],
    "best / acceptable / wrong score in separate bands",
    `wrong ${bands.wrong[0]}-${bands.wrong[1]}, acceptable ${bands.acceptable[0]}-${bands.acceptable[1]}, best ${bands.best[0]}-${bands.best[1]}`);

  // Every option shown must carry a coaching reason written for it.
  const reasons = await page.evaluate(() => {
    let withWhy = 0, n = 0, tiersSeen = {};
    for (let i = 0; i < 120; i++) {
      HIQ.debug.newPlay();
      for (const o of HIQ.debug.getChoices()) {
        n++;
        tiersSeen[o.tier] = (tiersSeen[o.tier] || 0) + 1;
        if (o.why && o.why.length > 20) withWhy++;
      }
    }
    return { withWhy, n, tiersSeen };
  });
  check(reasons.withWhy === reasons.n, "every option carries an authored coaching reason", `${reasons.withWhy}/${reasons.n}`);
  check(!!reasons.tiersSeen.acceptable, "players are offered genuinely acceptable alternatives, not just traps",
    JSON.stringify(reasons.tiersSeen));

  // Outcome realism: a good read must not guarantee a goal.
  section("Outcome realism");
  const outcomes = await page.evaluate(() => {
    const t = { best: {}, acceptable: {}, wrong: {} };
    for (let i = 0; i < 900; i++) {
      for (const g of ["best", "acceptable", "wrong"]) {
        const o = HIQ.debug.outcomeFor(g);
        t[g][o] = (t[g][o] || 0) + 1;
      }
    }
    return t;
  });
  const goalRate = (t) => (t.great || 0) / 900;
  check(goalRate(outcomes.best) > 0.4 && goalRate(outcomes.best) < 0.85,
    "a best read creates a chance rather than a certain goal", `${Math.round(goalRate(outcomes.best) * 100)}% goals`);
  check(goalRate(outcomes.acceptable) > 0.05 && goalRate(outcomes.acceptable) < goalRate(outcomes.best),
    "an acceptable read can still score, but less often", `${Math.round(goalRate(outcomes.acceptable) * 100)}% goals`);
  check((outcomes.wrong.bad || 0) / 900 < 0.45,
    "a mistake usually costs possession rather than conceding", `${Math.round((outcomes.wrong.bad || 0) / 900 * 100)}% goals against`);

  // ------------------------------------------------- can a kid tell them apart?
  /* Ryan's report: "I don't see any real difference between two options most of
     the time, yet the outcome changes." Two spots a child cannot distinguish
     are not a choice. Every option shown must read as a different decision. */
  section("Options are distinguishable");
  const sep = await page.evaluate(() => {
    let worst = Infinity, worstWho = "", under20 = 0, pairs = 0, plays = 0, empty = 0;
    const buckets = { best: 0, acceptable: 0, wrong: 0 };
    for (let i = 0; i < 200; i++) {
      HIQ.debug.newPlay();
      const s = HIQ.debug.getScenario();
      const opts = HIQ.debug.getChoices();
      if (!opts.length) { empty++; continue; }
      plays++;
      for (const o of opts) buckets[o.tier]++;
      for (let a = 0; a < opts.length; a++) {
        for (let b = a + 1; b < opts.length; b++) {
          const ft = Math.hypot(opts[a].pos.x - opts[b].pos.x, opts[a].pos.y - opts[b].pos.y) / HIQ.VIEW.PX_PER_FT;
          pairs++;
          if (ft < 20) under20++;
          if (ft < worst) { worst = ft; worstWho = `${s.id}/${s.role}`; }
        }
      }
    }
    return { worst: worst.toFixed(1), worstWho, under20, pairs, plays, empty, buckets };
  });
  check(sep.under20 === 0,
    "no two options a player chooses between are closer than 20 ft",
    `closest ${sep.worst} ft (${sep.worstWho}), ${sep.pairs} pairs checked`);
  check(Number(sep.worst) * 5.5 > 100,
    "options are visually far apart on screen",
    `closest pair ${Math.round(Number(sep.worst) * 5.5)} px, markers are ~36 px wide`);
  check(sep.empty === 0, "no play is skipped for want of distinguishable options", `${sep.empty} skipped`);
  check(sep.buckets.acceptable > 0, "a genuine alternative is still offered regularly",
    JSON.stringify(sep.buckets));

  // ------------------------------------------------ what the simulation shows
  /* Ryan's report: "the puck was passed from my defensive corner to the centre
     in front of the net — that should never be allowed."

     He's right, and it's worse than a cosmetic bug: the game names that exact
     pass as a mistake in its own feedback and then demonstrated it. Every pass
     the simulation draws is a demonstration of hockey to a child, so every one
     of them gets audited here. */
  section("The simulation never shows illegal hockey");
  const sim = await page.evaluate(() => {
    const V = HIQ.VIEW, Z = HIQ.zones;
    let illegal = 0, passes = 0, plays = 0;
    const examples = [];

    for (let i = 0; i < 120; i++) {
      HIQ.debug.newPlay();
      const s = HIQ.debug.getScenario();
      if (s.isDefense) continue;          // their attacking passes may cross our slot
      const ownSide = s.attackDir === "right" ? "left" : "right";
      plays++;

      for (const grade of ["best", "acceptable", "wrong"]) {
        for (let oi = 0; oi < 3; oi++) {
          const script = HIQ.debug.simScriptFor(grade, oi);
          if (!script) continue;
          // Track the puck through the script; each move of it is a pass or carry.
          let puckAt = V.ftPt(HIQ.debug.getPieces().puck);
          /* Only OUR possession is audited. When the puck is theirs, moving it
             into our slot is exactly what they are supposed to do. Possession
             is marked explicitly by the simulation rather than guessed from
             banner wording. */
          let poss = script.startPoss;
          for (const step of script) {
            if (step.poss) poss = step.poss;
            if (poss !== "us") continue;
            if (!step.puckTo) continue;
            const to = V.ftPt(step.puckTo);
            if (Math.hypot(to.x - puckAt.x, to.y - puckAt.y) < 3) { puckAt = to; continue; }
            // A player skating the puck through the middle is a carry, not a
            // pass, and is legitimate. Only passes are judged.
            if (!step.carried) {
              passes++;
              if (Z.laneCrossesSlot(puckAt, to, ownSide)) {
                illegal++;
                if (examples.length < 4) {
                  examples.push(`${s.id}/${s.role} (${grade}): passed through its own slot`);
                }
              }
            }
            puckAt = to;
          }
        }
      }
    }
    return { illegal, passes, plays, examples };
  });
  check(sim.illegal === 0,
    "the puck is never passed across the front of your own net",
    sim.illegal ? sim.examples.join(" | ") : `${sim.passes} puck movements across ${sim.plays} attacking plays`);

  // Nothing the simulation draws may leave the ice surface.
  const bounds = await page.evaluate(() => {
    const V = HIQ.VIEW, R = HIQ.RINK;
    let off = 0, pts = 0;
    for (let i = 0; i < 80; i++) {
      HIQ.debug.newPlay();
      for (const grade of ["best", "acceptable", "wrong"]) {
        const script = HIQ.debug.simScriptFor(grade, 0);
        if (!script) continue;
        for (const step of script) {
          for (const m of step.dests) {
            if (!m.to) continue;
            const f = V.ftPt(m.to);
            pts++;
            if (f.x < -6 || f.x > R.length + 6 || f.y < -6 || f.y > R.width + 6) off++;
          }
        }
      }
    }
    return { off, pts };
  });
  check(bounds.off === 0, "no play sends the puck or a player off the ice",
    `${bounds.pts} destinations checked`);

  /* A read we call best or acceptable must never require a pass the game
     itself refuses to make. That contradiction — the coach saying "that works"
     while the defenceman visibly declines the pass — is exactly the kind of
     mixed message that makes the game feel arbitrary. */
  const consistent = await page.evaluate(() => {
    const V = HIQ.VIEW, Z = HIQ.zones;
    const bad = [];
    for (const play of HIQ.PLAYS) {
      if (play.isDefense) continue;
      const ownSide = play.ourNet;
      for (const [role, r] of Object.entries(play.reads)) {
        for (const [tier, spot] of [["best", r.best]].concat(r.acceptable.map(a => ["acceptable", a]))) {
          if (!Z.laneCrossesSlot(play.puck, spot, ownSide)) continue;
          // A direct pass would cross the slot — a real breakout would go
          // D-to-D first, so the read is fine as long as SOME teammate makes
          // a legal two-leg route to it.
          const relayExists = Object.entries(play.players).some(([r2, mate]) => {
            if (r2 === role) return false;
            return !Z.laneCrossesSlot(play.puck, mate, ownSide) &&
                   !Z.laneCrossesSlot(mate, spot, ownSide);
          });
          if (!relayExists) {
            bad.push(`${play.id}/${role}: ${tier} read is unreachable without crossing our own slot`);
          }
        }
      }
    }
    return bad;
  });
  check(consistent.length === 0,
    "every read we endorse can be reached without crossing our own slot",
    consistent.length ? consistent.join(" | ") : "all reachable, directly or via a D-to-D");

  // ---------------------------------------------------------------- variety
  section("Replay variety");
  /* Positional fuzzing used to inflate this number, but it did so by shifting
     authored plays relative to the net — which corrupted the hockey. Variety
     now comes only from mirroring, so it is bounded by how many scenarios have
     actually been written. That is the honest number, and the way to raise it
     is to author more plays, not to fuzz the ones we have. */
  for (const role of ["C", "LD"]) {
    await page.selectOption("#role", role);
    await page.waitForTimeout(80);
    const v = await page.evaluate((role) => {
      /* Count the scenarios actually served, by id and which side of the ice.

         This used to bucket the coaching marker's screen position instead, as
         a proxy. That proxy breaks: a play whose two defencemen sit roughly
         symmetrically about centre ice puts LD in nearly the same spot whether
         you arrive at it directly or by mirroring the play and swapping D — so
         two genuinely different runs collided in one bucket and the game was
         marked down for coverage it actually had. */
      const spots = new Set();
      for (let i = 0; i < 160; i++) {
        HIQ.debug.newPlay();
        const s = HIQ.debug.getScenario();
        spots.add(`${s.id}|${s.mirrored ? "m" : "o"}`);
      }
      /* A role can only be coached in a play that has a read for it AND where
         it isn't the one carrying the puck. Mirroring doubles that. */
      const SWAP = { LW: "RW", RW: "LW", LD: "RD", RD: "LD", C: "C" };
      let reachable = 0;
      for (const p of HIQ.PLAYS) {
        for (const m of [false, true]) {
          const src = m ? (SWAP[role] || role) : role;
          if (p.reads[src] && p.carrier !== src) reachable++;
        }
      }
      return { spots: spots.size, reachable };
    }, role);
    check(v.spots >= v.reachable * 0.8,
      `role ${role} reaches nearly every play and side available to it`,
      `${v.spots} distinct spots of ${v.reachable} reachable play/side combinations`);
  }

  const sides = await page.evaluate(() => {
    let top = 0, bottom = 0;
    for (let i = 0; i < 120; i++) {
      HIQ.debug.newPlay();
      // Compare against the rink's own midline in feet, not a hardcoded pixel.
      const puckFt = HIQ.VIEW.ftPt(HIQ.debug.getPieces().puck);
      if (puckFt.y < HIQ.RINK.midY) top++; else bottom++;
    }
    return { top, bottom };
  });
  check(sides.top > 25 && sides.bottom > 25, "plays run off both sides of the ice", `${sides.top} top / ${sides.bottom} bottom`);

  // ---------------------------------------------------------- principles
  /* The game is meant to teach ideas that transfer, not pictures to memorise.
     Every read carries the principle it teaches or breaks, the player is told
     which one, and the coach report reports in those terms. */
  section("Principles");
  const prin = await page.evaluate(() => {
    let total = 0, tagged = 0, unknown = 0;
    const used = {};
    for (const play of HIQ.PLAYS) {
      for (const r of Object.values(play.reads)) {
        for (const o of [r.best, ...r.acceptable, ...r.wrong]) {
          total++;
          if (!o.principle) continue;
          tagged++;
          if (!HIQ.PRINCIPLES[o.principle]) unknown++;
          used[o.principle] = (used[o.principle] || 0) + 1;
        }
      }
    }
    return { total, tagged, unknown, used, defined: Object.keys(HIQ.PRINCIPLES).length };
  });
  check(prin.tagged === prin.total, "every authored read names the principle behind it",
    `${prin.tagged}/${prin.total}`);
  check(prin.unknown === 0, "no read points at a principle that doesn't exist");
  check(Object.keys(prin.used).length === prin.defined,
    "every principle is actually taught by something", `${Object.keys(prin.used).length}/${prin.defined} used`);

  // The player is told the idea, not just the outcome.
  await page.selectOption("#age", "9-11");
  await page.selectOption("#diff", "med");
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    HIQ.debug.newPlay();
    HIQ.debug.choose(HIQ.debug.getChoices().find(o => o.tier === "best"));
  });
  await settle();
  const shown = await page.locator("#status").innerHTML();
  check(/class="principle"/.test(shown), "the principle is named in the feedback",
    (await page.locator("#status").innerText()).replace(/\s+/g, " ").slice(0, 70));

  // The 6-8 tier leads with the idea rather than the system.
  await page.selectOption("#age", "6-8");
  await page.waitForTimeout(200);
  await page.evaluate(() => HIQ.debug.newPlay());
  await page.waitForTimeout(150);
  const youngPrompt = await page.locator("#prompt").innerHTML();
  check(/class="principle"/.test(youngPrompt),
    "the 6-8 tier states the principle up front instead of the system",
    (await page.locator("#prompt").innerText()).replace(/\s+/g, " ").slice(0, 70));
  const radius = await page.evaluate(() => HIQ.debug.readRadiusFt());
  await page.selectOption("#age", "12-14");
  await page.waitForTimeout(120);
  const radiusOld = await page.evaluate(() => HIQ.debug.readRadiusFt());
  check(radius > radiusOld * 1.5, "the youngest players get a much more forgiving target",
    `${radius.toFixed(0)} ft vs ${radiusOld.toFixed(0)} ft`);
  await page.selectOption("#age", "9-11");
  await page.waitForTimeout(120);

  // ------------------------------------------------------------ readability
  // A play you can't read teaches nothing, so these are correctness checks too.
  section("Readability");
  const vis = await page.evaluate(() => {
    let faceoffs = 0, falseCarrier = 0, overlaps = 0, markerClash = 0, plays = 0, minGap = Infinity, minMarker = Infinity;
    let carrierFound = 0, unlabelled = 0, youHadPuck = 0;
    for (let i = 0; i < 150; i++) {
      HIQ.debug.newPlay();
      const p = HIQ.debug.getPieces();
      // Only what is actually drawn: the player token is hidden while choosing.
      const drawn = [...p.offense, ...p.defense].filter(q => q.role !== "G");
      if (!HIQ.debug.choiceActive()) drawn.push(...p.controlled);
      plays++;

      for (let a = 0; a < drawn.length; a++) {
        for (let b = a + 1; b < drawn.length; b++) {
          const d = Math.hypot(drawn[a].x - drawn[b].x, drawn[a].y - drawn[b].y);
          if (d < minGap) minGap = d;
          if (d < 40) overlaps++;
        }
      }
      for (const o of HIQ.debug.getChoices()) {
        for (const q of drawn) {
          const d = Math.hypot(o.pos.x - q.x, o.pos.y - q.y);
          if (d < minMarker) minMarker = d;
          /* Markers are drawn last as a solid disc with a ring, so the marker
             itself is always fully legible. The real failure is a PLAYER being
             erased underneath one.

             A defensive-zone play packs ten skaters into a third of the ice.
             Demanding 11 ft between every pair AND wide marker clearance is
             over-constrained — something has to give, and two players merging
             into one blob is far worse than a marker overlapping one. So the
             assertion is the one that matters: a marker must never sit so close
             that the player beneath it disappears (marker r~27, player r~17). */
          if (d < 20) markerClash++;
        }
      }
      // The puck situation must always be spelled out — either someone is shown
      // holding it, or it's shown as loose. Never left ambiguous.
      const st = HIQ.debug.puckState();
      const sc0 = HIQ.debug.getScenario();
      if (st.label === "HAS PUCK") carrierFound++;
      else if (st.label === "LOOSE PUCK") { /* genuinely nobody's */ }
      else if (/^FACEOFF/.test(st.label || "")) faceoffs++;
      else unlabelled++;
      /* Nobody has the puck on a draw. Possession is worked out by proximity
         and a centre on the dot is the closest skater to it, so every faceoff
         scenario used to ring a player who could not possibly have it. */
      if (sc0.faceoff && st.label === "HAS PUCK") falseCarrier++;

      /* You should never be assigned the position that is carrying the puck.
         Proximity to the puck is NOT the test — when you're defending, being
         right on the carrier is precisely the read we're teaching. */
      const sc = HIQ.debug.getScenario();
      if (sc.carrier === sc.role) youHadPuck++;
    }
    return {
      overlaps, markerClash, plays, unlabelled, youHadPuck, faceoffs, falseCarrier,
      minGap: Math.round(minGap), minMarker: Math.round(minMarker), carrierFound
    };
  });
  check(vis.overlaps === 0, "no two players are ever drawn overlapping",
    `closest pair ${vis.minGap}px across ${vis.plays} plays`);
  check(vis.markerClash === 0, "no player is ever hidden underneath an A/B/C marker",
    `closest marker-to-player ${vis.minMarker}px`);
  check(vis.unlabelled === 0, "the puck situation is always spelled out",
    `${vis.carrierFound} carried, ${vis.faceoffs} faceoffs, ` +
    `${vis.plays - vis.carrierFound - vis.faceoffs} loose, of ${vis.plays}`);
  check(vis.falseCarrier === 0, "nobody is shown holding the puck on a faceoff",
    `${vis.falseCarrier} false carriers across ${vis.faceoffs} draws`);
  /* Spreading players apart for legibility must never push one off the ice.
     The clamp that bounds those nudges was written for an older canvas size
     and allowed a player to be shoved past the boards and off the bottom of
     the picture entirely. */
  const onSheet = await page.evaluate(() => {
    const V = HIQ.VIEW, R = HIQ.RINK;
    let worst = null, off = 0, checked = 0;
    for (let i = 0; i < 120; i++) {
      HIQ.debug.newPlay();
      const p = HIQ.debug.getPieces();
      for (const q of [...p.controlled, ...p.offense, ...p.defense, p.puck]) {
        checked++;
        const ft = V.ftPt(q);
        if (ft.x < 0 || ft.x > R.length || ft.y < 0 || ft.y > R.width) {
          off++;
          if (!worst) worst = `${q.role || "puck"} at ${ft.x.toFixed(1)},${ft.y.toFixed(1)} ft`;
        }
      }
    }
    return { off, checked, worst };
  });
  check(onSheet.off === 0, "nobody is ever pushed off the ice to make room",
    onSheet.worst || `${onSheet.checked} positions checked`);

  check(vis.carrierFound / vis.plays > 0.7, "most plays show a clear puck carrier",
    `${Math.round(vis.carrierFound / vis.plays * 100)}% carried`);
  check(vis.youHadPuck === 0, "you are never assigned the position that is carrying the puck",
    `${vis.youHadPuck} such plays`);

  /* Taps must land through the camera transform, not just at 1:1.

     Note what this is measured against: the LOGICAL sheet, not the pixel
     buffer. The buffer is now sized to whatever the device can afford to
     rasterise, so it is no longer the coordinate system — and this check used
     to compare against it, which only worked while the two happened to be the
     same size. */
  const cam = await page.evaluate(() => {
    const c = HIQ.debug.getCamera();
    const mid = HIQ.debug.worldToScreen(c.x, c.y);
    const V = HIQ.VIEW;
    // Round-trip a handful of points: world -> screen -> world.
    let worst = 0;
    for (const p of [{ x: 200, y: 150 }, { x: 576, y: 260 }, { x: 900, y: 400 }]) {
      const s = HIQ.debug.worldToScreen(p.x, p.y);
      const back = HIQ.debug.screenToWorld(s.x, s.y);
      worst = Math.max(worst, Math.hypot(back.x - p.x, back.y - p.y));
    }
    return {
      centred: Math.abs(mid.x - V.width / 2) < 1 && Math.abs(mid.y - V.height / 2) < 1,
      scale: c.scale,
      worst,
      buffer: [document.getElementById("rink").width, document.getElementById("rink").height],
      logical: [V.width, V.height],
    };
  });
  check(cam.centred && cam.scale >= 1,
    "the camera centre maps to the middle of the sheet",
    `scale ${cam.scale.toFixed(2)}`);
  check(cam.worst < 0.01,
    "a tap maps back to the exact spot on the ice it came from",
    `worst round-trip error ${cam.worst.toFixed(4)} px`);
  check(cam.buffer[0] > 0 && cam.buffer[0] <= cam.logical[0],
    "the pixel buffer is sized for the device without changing the coordinate system",
    `buffer ${cam.buffer.join("x")}, sheet ${cam.logical.join("x")}`);

  /* ------------------------------------------------------- rendering cost

     Ryan's report: the graphics lag. Measured, and true — on a phone-class CPU
     the simulation ran at 30fps with most frames overrunning their budget,
     which is what reads as lag.

     Two things are checked here, and the first matters more. Counting canvas
     operations per frame is deterministic: it does not care how loaded the
     machine running the tests is, and it is what actually regressed — players
     and their name chips were being re-traced from scratch every frame, about
     650 operations a frame to draw figures that had not changed. The frame
     interval is also checked, with a generous bound, because a number that
     depends on the host's spare capacity should not fail a build on its own. */
  section("Rendering cost");

  const frameOps = await page.evaluate(() => new Promise(resolve => {
    const c = document.getElementById("rink").getContext("2d");
    const METHODS = ["beginPath", "arc", "ellipse", "moveTo", "lineTo", "fill", "stroke",
      "fillText", "measureText", "drawImage", "save", "restore", "createRadialGradient",
      "createLinearGradient", "clearRect", "fillRect", "translate", "rotate", "scale",
      "setLineDash", "closePath", "quadraticCurveTo", "bezierCurveTo", "rect", "roundRect", "arcTo"];
    const orig = {}, count = {};
    for (const m of METHODS) {
      if (typeof c[m] !== "function") continue;
      orig[m] = c[m];
      c[m] = function (...a) { count[m] = (count[m] || 0) + 1; return orig[m].apply(this, a); };
    }
    let frames = 0;
    function sample() {
      if (++frames < 60) { requestAnimationFrame(sample); return; }
      for (const m in orig) c[m] = orig[m];
      const total = Object.values(count).reduce((a, b) => a + b, 0) / frames;
      const gradients = ((count.createRadialGradient || 0) + (count.createLinearGradient || 0)) / frames;
      resolve({
        total: +total.toFixed(0),
        measureText: +((count.measureText || 0) / frames).toFixed(1),
        gradients: +gradients.toFixed(2),
        paths: +((count.beginPath || 0) / frames).toFixed(0),
      });
    }
    requestAnimationFrame(sample);
  }));
  check(frameOps.total < 300, "a frame costs a sane number of canvas operations",
    `${frameOps.total} per frame (was ~650 before players were pre-rendered)`);
  check(frameOps.paths < 40, "players are not re-traced from scratch every frame",
    `${frameOps.paths} path builds per frame`);
  check(frameOps.measureText <= 3, "text is not re-measured every frame",
    `${frameOps.measureText} measureText per frame`);
  check(frameOps.gradients < 0.1, "no gradient is rebuilt every frame",
    `${frameOps.gradients} per frame`);

  const fps = await page.evaluate(() => new Promise(resolve => {
    const gaps = [];
    let last = performance.now();
    function f(t) {
      gaps.push(t - last); last = t;
      if (gaps.length < 90) requestAnimationFrame(f);
      else {
        const s = gaps.slice(5).sort((a, b) => a - b);
        resolve({ median: +s[Math.floor(s.length / 2)].toFixed(1), scale: HIQ.debug.renderScale() });
      }
    }
    requestAnimationFrame(f);
  }));
  check(fps.median < 25, "frames are delivered without stalling",
    `median ${fps.median}ms (${Math.round(1000 / fps.median)}fps), render scale ${fps.scale.toFixed(2)}`);

  /* Pre-rendering trades memory for speed, so the caches have to stay bounded.
     Every distinct team colour, player size and stick position is a separate
     sprite, so a player cycling through colours is the way to make them grow. */
  const caches = await page.evaluate(() => {
    for (let i = 0; i < 20; i++) HIQ.debug.newPlay();
    for (let pass = 0; pass < 3; pass++) {
      for (const c of ["blue", "green", "purple", "teal", "gold"]) {
        const sel = document.getElementById("pColor");
        sel.value = c;
        sel.dispatchEvent(new Event("change"));
        HIQ.debug.newPlay();
      }
    }
    return HIQ.debug.spriteCaches();
  });
  check(caches.figures <= 80 && caches.chips <= 40 && caches.goalies <= 20 && caches.ground <= 8,
    "pre-rendered sprite caches stay bounded as colours and plays change",
    JSON.stringify(caches));
  check(errors.length === 0, "no errors raised while stressing the renderer",
    errors.slice(0, 2).join(" | ") || "clean");

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

  /* ------------------------------------------------------------ season plan

     The plan is the game's answer to "what should a kid work on first?", and
     the order is taken from published coaching guidance rather than invented.
     So what gets tested is the thing that makes it a plan and not a shuffle:
     it serves one unit at a time, it opens the next one only when the reads in
     the current one are actually landing, and every scenario in the game is
     reachable by working through it. */
  section("Season plan");
  // The reload above re-collapsed the settings panel.
  await openSettings();
  await page.waitForTimeout(150);
  await page.evaluate(() => HIQ.debug.resetPlan());
  await page.selectOption("#plan", "season");
  await page.waitForTimeout(250);

  const planShape = await page.evaluate(() => {
    const units = HIQ.CURRICULUM.map(u => ({
      id: u.id, name: u.name, goal: u.goal,
      size: HIQ.unitSize(u), need: Math.min(u.need, HIQ.unitSize(u)), plays: u.plays,
    }));
    const covered = units.flatMap(u => u.plays);
    return {
      units,
      total: HIQ.PLAYS.length,
      covered: covered.length,
      unique: new Set(covered).size,
      missing: HIQ.PLAYS.map(p => p.id).filter(id => !covered.includes(id)),
      needTooBig: units.filter(u => u.need > u.size).map(u => u.id),
      noGoal: units.filter(u => !u.goal || !u.name).map(u => u.id),
    };
  });
  check(planShape.missing.length === 0 && planShape.unique === planShape.total,
    "the plan covers every scenario in the game exactly once",
    `${planShape.unique}/${planShape.total} plays across ${planShape.units.length} units`);
  check(planShape.needTooBig.length === 0,
    "no unit asks for more reads than it contains (so every unit can be finished)",
    planShape.needTooBig.join(", ") || "all reachable");
  check(planShape.noGoal.length === 0, "every unit states what it is teaching",
    planShape.noGoal.join(", ") || `e.g. "${planShape.units[0].goal}"`);

  // Plan mode serves only the current unit.
  const unit0 = await page.evaluate(() => {
    const seen = new Set();
    for (let i = 0; i < 40; i++) { HIQ.debug.newPlay(); seen.add(HIQ.debug.getScenario().id); }
    const plan = HIQ.debug.getPlan();
    return { seen: [...seen], unit: plan.unit.plays, index: plan.index, on: plan.on };
  });
  check(unit0.on && unit0.index === 0, "a fresh player starts at unit 1", `unit index ${unit0.index}`);
  check(unit0.seen.every(id => unit0.unit.includes(id)),
    "only the current unit's scenarios are served", `saw ${unit0.seen.join(", ")}`);

  // A wrong read must not advance the plan; the best read must.
  const gating = await page.evaluate(() => {
    HIQ.debug.resetPlan();
    HIQ.debug.newPlay();
    const startDone = HIQ.debug.getPlan().done.length;
    // Grading a wrong option directly exercises the same path the UI uses.
    const wrong = HIQ.debug.getChoices().find(o => o.tier === "wrong");
    return { startDone, hasWrong: !!wrong };
  });
  check(gating.startDone === 0 && gating.hasWrong, "progress starts empty and a wrong option exists to try");

  // Drive the real UI: a miss leaves progress alone, a best read records one.
  let planOpts = await page.evaluate(() => HIQ.debug.getChoices().map(o => ({ t: o.tier, x: o.pos.x, y: o.pos.y })));
  await tapCanvas(planOpts.find(o => o.t === "wrong").x, planOpts.find(o => o.t === "wrong").y);
  await settle();
  await page.waitForTimeout(2300);
  const afterMiss = await page.evaluate(() => HIQ.debug.getPlan().done.length);
  check(afterMiss === 0, "a wrong read does not advance the plan", `${afterMiss} reads credited`);

  planOpts = await page.evaluate(() => HIQ.debug.getChoices().map(o => ({ t: o.tier, x: o.pos.x, y: o.pos.y })));
  await tapCanvas(planOpts.find(o => o.t === "best").x, planOpts.find(o => o.t === "best").y);
  await settle();
  await page.waitForTimeout(2300);
  const afterHit = await page.evaluate(() => HIQ.debug.getPlan());
  check(afterHit.done.length === 1, "the best read records one learned read", `${afterHit.done.length} credited`);

  // Credit is per position-and-situation, so grinding one easy read can't open a unit.
  const noDupes = await page.evaluate(() => {
    const plan = HIQ.debug.getPlan();
    const key = plan.done[0];
    return { key, unique: new Set(plan.done).size === plan.done.length };
  });
  check(noDupes.unique && /\//.test(noDupes.key || ""),
    "credit is tracked per position in a situation, not per correct answer", noDupes.key);

  // Filling a unit opens exactly the next one, and the last unit stays put.
  const advance = await page.evaluate(() => {
    HIQ.debug.resetPlan();
    const steps = [];
    for (let u = 0; u < HIQ.CURRICULUM.length + 2; u++) {
      const plan = HIQ.debug.getPlan();
      const unit = plan.unit;
      // Credit every coachable read in this unit, which must be enough to fill it.
      for (const id of unit.plays) {
        const play = HIQ.PLAYS.find(p => p.id === id);
        for (const role of Object.keys(play.reads)) {
          if (role === play.carrier) continue;
          HIQ.debug.creditPlan(id, role);
        }
      }
      steps.push(HIQ.debug.getPlan().index);
    }
    return { steps, last: HIQ.CURRICULUM.length - 1 };
  });
  check(advance.steps[0] === 1, "finishing unit 1 opens unit 2", `landed on index ${advance.steps[0]}`);
  check(advance.steps[advance.last] === advance.last,
    "the plan stops at the final unit instead of running off the end",
    `index ${advance.steps[advance.last]} of ${advance.last}`);
  /* Finishing the nth unit must land on exactly the (n+1)th — one step, never
     two. Once the last unit is reached the index stops moving, so only the
     first `last` steps are the advancing ones. */
  const marched = advance.steps.slice(0, advance.last).every((v, i) => v === i + 1);
  check(marched, "each unit opens exactly one new unit, in order", advance.steps.join(" → "));

  /* The "show me this exact scenario" hook. A coach reviewing the spec needs
     to be able to call up the play they are reading about, and this hook had
     silently stopped working when the authored plays replaced the old template
     list — it filtered a list nothing read any more. */
  await page.selectOption("#plan", "free");
  await page.waitForTimeout(200);
  const forced = await page.evaluate(() => {
    const out = [];
    for (const play of HIQ.PLAYS) {
      const got = HIQ.debug.forceTemplate(play.id);
      out.push({ asked: play.id, got, n: HIQ.PLAYS.length });
    }
    return { out, missing: HIQ.debug.forceTemplate("no_such_play") };
  });
  check(forced.out.every(r => r.got === r.asked),
    "every scenario can be called up by name for review",
    `${forced.out.filter(r => r.got === r.asked).length}/${forced.out.length}`);
  check(forced.out.every(r => r.n === forced.out.length),
    "calling one up leaves the full set of scenarios intact",
    `library still ${forced.out[0].n} plays`);
  check(forced.missing === null, "an unknown scenario name returns nothing rather than breaking");
  await page.selectOption("#plan", "season");
  await page.waitForTimeout(200);

  // Progress is persisted — a child does not restart the season every session.
  await page.evaluate(() => { HIQ.debug.resetPlan(); HIQ.debug.creditPlan(HIQ.CURRICULUM[0].plays[0], "C"); });
  await page.reload();
  await page.waitForTimeout(600);
  const planPersist = await page.evaluate(() => HIQ.debug.getPlan().done.length);
  check(planPersist === 1, "plan progress survives a reload", `${planPersist} read remembered`);
  await page.evaluate(() => HIQ.debug.resetPlan());

  // ---------------------------------------------------------------- results
  section("Runtime health");
  check(errors.length === 0, "no console errors or exceptions", errors.slice(0, 3).join(" | ") || "clean");
  check(dataWarnings.length === 0, "no scenario data self-check warnings",
    [...new Set(dataWarnings)].slice(0, 3).join(" | ") || "clean");

  console.log(`\n${failed === 0 ? "PASS" : "FAIL"} — ${passed} passed, ${failed} failed\n`);
  await browser.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error("\nTEST RUN CRASHED:", e); process.exit(1); });
