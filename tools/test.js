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

  // Rink coords -> page coords. The game frames the action with a camera, so this
  // has to go through the same transform the player's eye does.
  const tapCanvas = async (x, y) => {
    await page.evaluate(() => document.getElementById("rink").scrollIntoView({ block: "center" }));
    const box = await page.locator("#rink").boundingBox();
    const c = await page.evaluate(({ x, y }) => HIQ.debug.worldToScreen(x, y), { x, y });
    const cw = await page.evaluate(() => [rink.width, rink.height]);
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
      // Compare against the rink's own midline in feet, not a hardcoded pixel.
      const puckFt = HIQ.VIEW.ftPt(HIQ.debug.getPieces().puck);
      if (puckFt.y < HIQ.RINK.midY) top++; else bottom++;
    }
    return { top, bottom };
  });
  check(sides.top > 25 && sides.bottom > 25, "plays run off both sides of the ice", `${sides.top} top / ${sides.bottom} bottom`);

  // ------------------------------------------------------------ readability
  // A play you can't read teaches nothing, so these are correctness checks too.
  section("Readability");
  const vis = await page.evaluate(() => {
    let overlaps = 0, markerClash = 0, plays = 0, minGap = Infinity, minMarker = Infinity;
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
          /* Markers are drawn after the players, so a marker is never itself
             hidden — the risk is a marker covering a player. Dots are ~16px and
             markers ~18px, so they touch at ~34px. Below 30 the player starts
             disappearing underneath, and that is the real failure. */
          if (d < 30) markerClash++;
        }
      }
      // The puck situation must always be spelled out — either someone is shown
      // holding it, or it's shown as loose. Never left ambiguous.
      const st = HIQ.debug.puckState();
      if (st.label === "HAS PUCK") carrierFound++;
      else if (st.label !== "LOOSE PUCK") unlabelled++;

      /* You should never be assigned the position that is carrying the puck.
         Proximity to the puck is NOT the test — when you're defending, being
         right on the carrier is precisely the read we're teaching. */
      const sc = HIQ.debug.getScenario();
      if (sc.carrier === sc.role) youHadPuck++;
    }
    return {
      overlaps, markerClash, plays, unlabelled, youHadPuck,
      minGap: Math.round(minGap), minMarker: Math.round(minMarker), carrierFound
    };
  });
  check(vis.overlaps === 0, "no two players are ever drawn overlapping",
    `closest pair ${vis.minGap}px across ${vis.plays} plays`);
  check(vis.markerClash === 0, "A/B/C markers never sit on top of a player",
    `closest marker-to-player ${vis.minMarker}px`);
  check(vis.unlabelled === 0, "the puck situation is always spelled out (carried or loose)",
    `${vis.carrierFound}/${vis.plays} carried, ${vis.plays - vis.carrierFound} loose`);
  check(vis.carrierFound / vis.plays > 0.7, "most plays show a clear puck carrier",
    `${Math.round(vis.carrierFound / vis.plays * 100)}% carried`);
  check(vis.youHadPuck === 0, "you are never assigned the position that is carrying the puck",
    `${vis.youHadPuck} such plays`);

  // Taps must land through the camera transform, not just at 1:1
  const camOk = await page.evaluate(() => {
    const c = HIQ.debug.getCamera();
    const p = HIQ.debug.worldToScreen(c.x, c.y);
    const cv = document.getElementById("rink");
    return c.scale >= 1 && Math.abs(p.x - cv.width / 2) < 1 && Math.abs(p.y - cv.height / 2) < 1;
  });
  check(camOk, "camera transform is self-consistent (taps map back correctly)");

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
