/* Hockey IQ Trainer — main application: scenario building, scoring, drawing, input, and outcomes. */
(() => {
  const { pick, clamp, dist, toward, shuffle } = HIQ.util;
  const LM = HIQ.LANDMARKS;

  // --- DOM
  const canvas = document.getElementById("rink");
  const ctx = canvas.getContext("2d");

  const ageSel = document.getElementById("age");
  const formatSel = document.getElementById("format");
  const modeSel = document.getElementById("mode");
  const roleSel = document.getElementById("role");
  const diffSel = document.getElementById("diff");
  const answerSel = document.getElementById("answerStyle");

  const phaseFilterSel = document.getElementById("phaseFilter");
  const pressureFilterSel = document.getElementById("pressureFilter");
  const ppStructSel = document.getElementById("ppStruct");
  const pkStructSel = document.getElementById("pkStruct");
  const ppStructWrap = document.getElementById("ppStructWrap");
  const pkStructWrap = document.getElementById("pkStructWrap");
  const overlaySel = document.getElementById("overlay");

  const newBtn = document.getElementById("newBtn");
  const lockBtn = document.getElementById("lockBtn");
  const muteBtn = document.getElementById("muteBtn");

  const streakEl = document.getElementById("streak");
  const phaseEl = document.getElementById("phase");
  const pressureEl = document.getElementById("pressure");
  const structureEl = document.getElementById("structure");
  const scoreEl = document.getElementById("score");
  const gfEl = document.getElementById("gf");
  const gaEl = document.getElementById("ga");
  const promptEl = document.getElementById("prompt");
  const hintEl = document.getElementById("hint");
  const statusEl = document.getElementById("status");

  const reportSummaryEl = document.getElementById("reportSummary");
  const reportRowsEl = document.getElementById("reportRows");
  const reportChipsEl = document.getElementById("reportChips");

  // --- State
  let streak = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let scenario = null;

  let controlled = [];
  let offense = [];
  let defense = [];
  const puck = { x: 550, y: 310, r: 10 };
  let guidance = { x: 550, y: 310, r: 90 };

  let choice = { active: false, options: [] };
  let snapshot = null;
  let pendingTimer = null;
  let lastBanner = null;

  const report = [];

  // --- Helpers
  const nowTime = () => {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, "0")).join(":");
  };

  function difficultyTighten(radius, diff) {
    if (diff === "easy") return radius * 1.25;
    if (diff === "hard") return radius * 0.75;
    return radius;
  }

  function getAgeSettings() {
    const age = ageSel.value;
    if (age === "6-8") {
      return { guidanceScale: 1.35, passScore: { easy: 55, med: 60, hard: 65 }, maxRulesToEnforce: 2, showSecondCue: false };
    }
    if (age === "12-14") {
      return { guidanceScale: 0.95, passScore: { easy: 65, med: 75, hard: 85 }, maxRulesToEnforce: 4, showSecondCue: true };
    }
    return { guidanceScale: 1.10, passScore: { easy: 60, med: 70, hard: 80 }, maxRulesToEnforce: 3, showSecondCue: true };
  }

  function passThreshold() {
    return getAgeSettings().passScore[diffSel.value];
  }

  // Sides: for offensive scenarios attackDir is where we attack; for defensive
  // scenarios attackDir is the zone we defend (where opponents attack).
  function ownSideOf(scen) {
    return scen.isDefense ? scen.attackDir : (scen.attackDir === "right" ? "left" : "right");
  }
  function attackSideOf(scen) {
    return scen.isDefense ? (scen.attackDir === "right" ? "left" : "right") : scen.attackDir;
  }
  function netFor(side) { return side === "left" ? LM.leftNet : LM.rightNet; }
  function slotFor(side) {
    const n = netFor(side);
    return { x: side === "right" ? n.x - 125 : n.x + 125, y: 310 };
  }
  function isFriendlyGoalie(p) {
    if (p.role !== "G" || !scenario) return false;
    const own = netFor(ownSideOf(scenario));
    return dist(p.x, p.y, own.x, own.y) < 130;
  }

  // --- Scoring engine (positional principles)
  function scorePlacement(role, pos, scen) {
    const ageCfg = getAgeSettings();
    const rules = (scen.rulesByRole && scen.rulesByRole[role]) ? scen.rulesByRole[role] : {};
    const failures = [];

    const fail = (key, pts, msg) => { failures.push({ key, msg, pts }); };

    if (rules.spacingFromPuck) {
      const d = dist(pos.x, pos.y, puck.x, puck.y);
      const { min, max } = rules.spacingFromPuck;
      if (d < min) fail("spacing", 25, "Too close to the puck — give your teammate room.");
      if (d > max) fail("spacing", 25, "Too far from the puck — you're not an option.");
    }

    if (rules.beOutlet) {
      const { preferX } = rules.beOutlet;
      if (preferX === "greater" && pos.x < puck.x - 15) fail("outlet", 25, "You're behind the play — get ahead so they can pass to you.");
      if (preferX === "less" && pos.x > puck.x + 15) fail("outlet", 25, "You're behind the play — get where they can pass to you.");
    }

    if (rules.protectSlot) {
      const { slotSide, radius } = rules.protectSlot;
      const slot = (slotSide === "left") ? LM.leftSlot : LM.rightSlot;
      const d = dist(pos.x, pos.y, slot.x, slot.y);
      if (d > radius) fail("slot", 30, "You left the front of your net open — protect middle ice!");
    }

    if (rules.stayAbovePuck) {
      const margin = rules.stayAbovePuck.margin ?? 25;
      const tooDeep = (scen.attackDir === "right")
        ? (pos.x > puck.x + margin && !rules.stayAbovePuck.allowDeeper)
        : (pos.x < puck.x - margin && !rules.stayAbovePuck.allowDeeper);
      if (tooDeep) fail("above", 20, "Too deep! Stay above the puck so you're not caught.");
    }

    if (scen.guidanceByRole && scen.guidanceByRole[role]) {
      const g = scen.guidanceByRole[role];
      const d = dist(pos.x, pos.y, g.x, g.y);
      const r = difficultyTighten(g.r, scen.diff) * ageCfg.guidanceScale;
      if (d > r * 1.35) fail("guidance", 20, "You drifted out of your support area.");
    }

    failures.sort((a, b) => b.pts - a.pts);
    const enforced = failures.slice(0, ageCfg.maxRulesToEnforce);
    let score = 100;
    for (const f of enforced) score -= f.pts;
    score = clamp(score, 0, 100);

    return { score, failures: enforced, allFailures: failures };
  }

  // --- Scenario selection / building
  function getCandidateTemplates(fmt) {
    if (fmt === "5v4" || fmt === "4v5") {
      const st = HIQ.buildSpecialTeamsScenario(fmt, ppStructSel.value, pkStructSel.value);
      return st ? [st] : [];
    }
    return HIQ.TEMPLATES_EVEN.filter(t => t.allowedFormats.includes("5v5"));
  }

  function applyFormat(offenseFull, defenseFull, fmt) {
    const off = offenseFull.map(p => ({ ...p }));
    const def = defenseFull.map(p => ({ ...p }));
    const defSkaters = def.filter(p => p.role !== "G");
    const defGoalies = def.filter(p => p.role === "G");

    if (fmt === "5v4") return { off: off.slice(0, 5), def: defSkaters.slice(0, 4).concat(defGoalies) };
    if (fmt === "4v5") return { off: off.slice(0, 4), def: defSkaters.slice(0, 5).concat(defGoalies) };
    return { off: off.slice(0, 5), def: defSkaters.slice(0, 5).concat(defGoalies) };
  }

  function structureLabel(fmt) {
    if (fmt === "5v4") return `PP ${ppStructSel.value === "one3one" ? "1-3-1" : "Umbrella"} vs PK ${pkStructSel.value}`;
    if (fmt === "4v5") return `PK ${pkStructSel.value} vs PP ${ppStructSel.value === "one3one" ? "1-3-1" : "Umbrella"}`;
    return "—";
  }

  function isChoiceMode() {
    return answerSel.value === "choices" && modeSel.value === "single";
  }

  function coachHints(role, scen) {
    const rules = (scen.rulesByRole && scen.rulesByRole[role]) || {};
    const hints = [];
    if (rules.protectSlot) hints.push("🛡️ Protect the front of your net — don't chase the puck!");
    if (rules.beOutlet) hints.push("🏒 Get open where your teammate can pass to you.");
    if (rules.spacingFromPuck) hints.push("↔️ Not too close to the puck, not too far.");
    if (rules.stayAbovePuck) hints.push("⬆️ Don't get caught too deep — stay above the puck.");
    return hints.slice(0, 2);
  }

  function buildScenario() {
    if (HIQ.Sim.isRunning()) HIQ.Sim.cancel();
    clearTimeout(pendingTimer);
    lastBanner = null;

    const fmt = formatSel.value;
    const mode = modeSel.value;
    const role = roleSel.value;
    const diff = diffSel.value;

    const isSpecial = (fmt === "5v4" || fmt === "4v5");
    ppStructWrap.style.display = isSpecial ? "" : "none";
    pkStructWrap.style.display = isSpecial ? "" : "none";

    let candidates = getCandidateTemplates(fmt);
    const phaseFilter = phaseFilterSel.value;
    const pressureFilter = pressureFilterSel.value;

    candidates = candidates.filter(t => phaseFilter === "any" || t.phase === phaseFilter);
    if (candidates.length === 0) candidates = getCandidateTemplates(fmt);
    if (candidates.length === 0) { statusEl.textContent = "No scenarios available for those filters."; return; }

    const tpl = pick(candidates);
    const pressure = (pressureFilter === "any") ? pick(tpl.pressures || ["Med"]) : pressureFilter;

    scenario = {
      id: tpl.id,
      phase: tpl.phase,
      pressure, fmt, mode, role, diff,
      attackDir: tpl.attackDir || "right",
      isDefense: !!tpl.isDefense,
      rulesByRole: tpl.rulesByRole || {},
      guidanceByRole: tpl.guidanceByRole || {},
      prompt: tpl.prompt ? tpl.prompt(role, fmt) : `${fmt} — ${tpl.phase}. You are ${role}.`
    };

    puck.x = tpl.puck.x;
    puck.y = tpl.puck.y;

    const applied = applyFormat(tpl.offenseFull, tpl.defenseFull, fmt);
    defense = applied.def.map(p => ({ ...p, r: 16 }));

    if (mode === "single") {
      // Your role always takes one of the team's spots (never adds an extra skater).
      let others = applied.off.filter(p => p.role !== role);
      if (others.length >= applied.off.length) others = others.slice(0, applied.off.length - 1);
      controlled = [{ role, x: 550, y: 310, r: 19, dragging: false }];
      offense = others.map(p => ({ ...p, r: 16 }));
    } else {
      controlled = applied.off.map(p => ({ ...p, r: 19, dragging: false }));
      offense = [];
    }

    const ageCfg = getAgeSettings();
    const g = scenario.guidanceByRole?.[role] || { x: 550, y: 310, r: 90 };
    guidance = { x: g.x, y: g.y, r: difficultyTighten(g.r, diff) * ageCfg.guidanceScale };

    // Choice mode: generate A/B/C options
    choice = { active: false, options: [] };
    if (isChoiceMode()) {
      choice.options = generateChoices();
      choice.active = choice.options.length > 0;
    }

    // UI
    phaseEl.textContent = scenario.phase;
    pressureEl.textContent = scenario.pressure;
    structureEl.textContent = structureLabel(fmt);
    promptEl.textContent = scenario.prompt;
    scoreEl.textContent = "—";
    lockBtn.style.display = choice.active ? "none" : "";

    const showHints = (diffSel.value === "easy" || ageSel.value === "6-8");
    const hints = showHints ? coachHints(role, scenario) : [];
    hintEl.textContent = hints.join("   ");
    hintEl.style.display = hints.length ? "" : "none";

    if (choice.active) {
      statusEl.innerHTML = "Tap <b>A</b>, <b>B</b>, or <b>C</b> — where should you go? Then watch the play!";
    } else if (mode === "single") {
      statusEl.textContent = "Drag your blue player to the best spot, then tap Lock In to watch the play.";
    } else {
      statusEl.textContent = "Drag your whole team (blue) into a better shape, then tap Lock In.";
    }

    draw();
  }

  // --- A/B/C choice generation
  function generateChoices() {
    const role = scenario.role;
    const g = scenario.guidanceByRole?.[role] || { x: 550, y: 310, r: 90 };
    const correctPos = { x: g.x, y: g.y };
    const correctRes = scorePlacement(role, correctPos, scenario);

    const atk = attackSideOf(scenario);
    const ownS = ownSideOf(scenario);
    const atkNet = netFor(atk);
    const ownNet = netFor(ownS);

    const candidates = [
      // Chasing / crowding the puck
      { x: puck.x + (puck.x < 550 ? 40 : -40), y: puck.y + (puck.y < 310 ? 30 : -30) },
      // Way too deep behind the net at the play's end of the ice
      (() => {
        const deepNet = scenario.isDefense ? ownNet : atkNet;
        return { x: deepNet.x + (deepNet.x < 550 ? -28 : 28), y: 470 };
      })(),
      // Wrong side of the ice (mirror of the correct spot)
      { x: g.x, y: 620 - g.y },
      // Hiding near own net corner
      { x: ownNet.x + (ownS === "right" ? -70 : 70), y: 150 },
      // Floating in the middle, away from the play
      { x: 550, y: 310 + (g.y > 310 ? -170 : 170) },
    ].map(p => ({ x: clamp(p.x, 60, 1040), y: clamp(p.y, 60, 560) }));

    let decoys = candidates
      .map(p => ({ pos: p, res: scorePlacement(role, p, scenario) }))
      .filter(c => c.res.score <= correctRes.score - 10)
      .filter(c => dist(c.pos.x, c.pos.y, correctPos.x, correctPos.y) > 90);

    // Keep decoys apart from each other
    const spread = [];
    for (const c of shuffle(decoys)) {
      if (spread.every(s => dist(s.pos.x, s.pos.y, c.pos.x, c.pos.y) > 80)) spread.push(c);
      if (spread.length === 2) break;
    }
    // Fallbacks if the pool came up short
    while (spread.length < 2) {
      const p = spread.length === 0
        ? { x: clamp(puck.x + 25, 60, 1040), y: clamp(puck.y - 25, 60, 560) }
        : { x: clamp(ownNet.x + (ownS === "right" ? -40 : 40), 60, 1040), y: 520 };
      spread.push({ pos: p, res: scorePlacement(role, p, scenario) });
    }

    const opts = shuffle([
      { pos: correctPos, res: correctRes, correct: true },
      { pos: spread[0].pos, res: spread[0].res, correct: false },
      { pos: spread[1].pos, res: spread[1].res, correct: false },
    ]);
    opts.forEach((o, i) => { o.label = "ABC"[i]; });
    return opts;
  }

  // --- Snapshots (restore after a failed attempt so the player can retry)
  function takeSnapshot() {
    snapshot = {
      controlled: controlled.map(p => ({ x: p.x, y: p.y })),
      offense: offense.map(p => ({ x: p.x, y: p.y })),
      defense: defense.map(p => ({ x: p.x, y: p.y })),
      puck: { x: puck.x, y: puck.y }
    };
  }
  function restoreSnapshot() {
    if (!snapshot) return;
    controlled.forEach((p, i) => { p.x = snapshot.controlled[i].x; p.y = snapshot.controlled[i].y; });
    offense.forEach((p, i) => { p.x = snapshot.offense[i].x; p.y = snapshot.offense[i].y; });
    defense.forEach((p, i) => { p.x = snapshot.defense[i].x; p.y = snapshot.defense[i].y; });
    puck.x = snapshot.puck.x; puck.y = snapshot.puck.y;
  }

  // --- Simulation script building
  function mv(obj, x, y) { return { obj, to: { x, y } }; }

  function nearestTo(arr, x, y) {
    let best = null, bd = Infinity;
    for (const p of arr) {
      const d = dist(p.x, p.y, x, y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function buildSimScript(tier, receiver, subMsg) {
    const scen = scenario;
    const atk = attackSideOf(scen);
    const ownS = ownSideOf(scen);
    const atkNet = netFor(atk);
    const ownNet = netFor(ownS);
    const steps = [];

    const friendly = (scen.mode === "single") ? [controlled[0], ...offense] : controlled.slice();
    const friendlySk = friendly.filter(p => p.role !== "G");
    const oppSk = defense.filter(p => p.role !== "G");

    if (!scen.isDefense) {
      // We have the puck.
      if (tier === "great" || tier === "good") {
        steps.push({ d: 450, msg: "Good spot! Watch the play…" });
        steps.push({ d: 520, sound: "pass", movers: [mv(puck, receiver.x, receiver.y)] });
        if (tier === "great") {
          const carryTo = toward(receiver, slotFor(atk), 0.6);
          steps.push({ d: 650, sound: "catch", movers: [mv(receiver, carryTo.x, carryTo.y), mv(puck, carryTo.x, carryTo.y)] });
          steps.push({ d: 260, sound: "shot", movers: [mv(puck, atkNet.x, atkNet.y)] });
          steps.push({ d: 1400, sound: "goal", banner: { text: "GOAL! 🚨", sub: "Perfect positioning!", color: "#4ade80", light: atk } });
        } else {
          let next = null, bd = Infinity;
          for (const p of friendlySk) {
            if (p === receiver) continue;
            const d = dist(p.x, p.y, atkNet.x, atkNet.y);
            if (d < bd) { bd = d; next = p; }
          }
          if (next) {
            steps.push({ d: 240, sound: "catch" });
            steps.push({ d: 520, sound: "pass", movers: [mv(puck, next.x, next.y)] });
            steps.push({ d: 1300, sound: "good", banner: { text: "PLAY ALIVE! ⚡", sub: "Great option — the play continues!", color: "#7dd3fc" } });
          } else {
            steps.push({ d: 260, sound: "shot", movers: [mv(puck, atkNet.x, atkNet.y)] });
            steps.push({ d: 1300, sound: "good", banner: { text: "SCORING CHANCE! ⚡", sub: "Great option!", color: "#7dd3fc" } });
          }
        }
      } else {
        steps.push({ d: 450, msg: "Hmm… watch what happens." });
        const mid = toward(puck, receiver, 0.55);
        const D = nearestTo(oppSk, mid.x, mid.y) || { x: mid.x, y: mid.y };
        steps.push({ d: 560, sound: "pass", movers: [mv(puck, mid.x, mid.y), mv(D, mid.x, mid.y)] });
        if (tier === "miss") {
          steps.push({ d: 1400, sound: "whistle", banner: { text: "TURNOVER ❌", sub: subMsg, color: "#fca5a5" } });
        } else {
          const counter = slotFor(ownS);
          steps.push({ d: 300, banner: { text: "TURNOVER ❌", sub: "They're coming back the other way!", color: "#fca5a5" } });
          steps.push({ d: 700, movers: [mv(D, counter.x, counter.y), mv(puck, counter.x, counter.y)] });
          steps.push({ d: 260, sound: "shot", movers: [mv(puck, ownNet.x, ownNet.y)] });
          steps.push({ d: 1500, sound: "goalAgainst", banner: { text: "GOAL AGAINST 😖", sub: subMsg, color: "#fca5a5", light: ownS } });
        }
      }
    } else {
      // Opponents have the puck — our job is coverage.
      const dangerSpot = slotFor(ownS);
      if (tier === "great" || tier === "good") {
        steps.push({ d: 450, msg: "They attack — watch your read…" });
        const cut = toward(puck, dangerSpot, 0.5);
        steps.push({ d: 560, sound: "pass", movers: [mv(puck, cut.x, cut.y), mv(receiver, cut.x, cut.y)] });
        steps.push({ d: 400, sound: "catch", banner: { text: "TAKEAWAY! 🛡️", sub: "You read the play!", color: "#4ade80" } });
        if (tier === "great") {
          const counter = slotFor(atk);
          steps.push({ d: 850, banner: null, movers: [mv(receiver, counter.x, counter.y), mv(puck, counter.x, counter.y)] });
          steps.push({ d: 260, sound: "shot", movers: [mv(puck, atkNet.x, atkNet.y)] });
          steps.push({ d: 1500, sound: "goal", banner: { text: "COUNTER-ATTACK GOAL! 🚨", sub: "Defense turned into offense!", color: "#4ade80", light: atk } });
        } else {
          const clearTo = { x: ownS === "right" ? 320 : 780, y: 80 };
          steps.push({ d: 650, banner: null, sound: "clear", movers: [mv(puck, clearTo.x, clearTo.y)] });
          steps.push({ d: 1200, banner: { text: "CLEARED! ✅", sub: "Great defensive position!", color: "#4ade80" } });
        }
      } else {
        steps.push({ d: 450, msg: "Uh oh — you left space open…" });
        const carrier = nearestTo(oppSk, puck.x, puck.y);
        const others = oppSk.filter(p => p !== carrier);
        const open = nearestTo(others.length ? others : oppSk, dangerSpot.x, dangerSpot.y) || carrier;
        steps.push({ d: 520, sound: "pass", movers: [mv(puck, open.x, open.y)] });
        steps.push({ d: 450, sound: "pass", movers: [mv(puck, dangerSpot.x, dangerSpot.y), mv(open, dangerSpot.x, dangerSpot.y)] });
        if (tier === "miss") {
          const savePt = toward(dangerSpot, ownNet, 0.75);
          steps.push({ d: 240, sound: "shot", movers: [mv(puck, savePt.x, savePt.y)] });
          steps.push({ d: 1400, sound: "whistle", banner: { text: "BIG CHANCE AGAINST ⚠️", sub: (subMsg || "") + " Lucky save by your goalie!", color: "#fcd34d" } });
        } else {
          steps.push({ d: 240, sound: "shot", movers: [mv(puck, ownNet.x, ownNet.y)] });
          steps.push({ d: 1500, sound: "goalAgainst", banner: { text: "GOAL AGAINST 😖", sub: subMsg, color: "#fca5a5", light: ownS } });
        }
      }
    }
    return steps;
  }

  // --- Lock In / outcome
  function tierFor(score, ok) {
    const pass = passThreshold();
    if (ok) return score >= Math.min(96, pass + 12) ? "great" : "good";
    return score >= pass - 25 ? "miss" : "bad";
  }

  function lockIn(chosen = null) {
    if (!scenario || HIQ.Sim.isRunning()) return;
    clearTimeout(pendingTimer);

    const mode = scenario.mode;
    const pass = passThreshold();
    const ageCfg = getAgeSettings();

    let ok, score, failures, receiver, reportRole;

    if (mode === "single") {
      const you = controlled[0];
      const res = chosen ? chosen.res : scorePlacement(scenario.role, { x: you.x, y: you.y }, scenario);
      score = res.score;
      failures = res.failures;
      ok = chosen ? chosen.correct : (score >= pass);
      receiver = you;
      reportRole = scenario.role;
    } else {
      const results = controlled.map(p => scorePlacement(p.role, { x: p.x, y: p.y }, scenario));
      score = Math.round(results.reduce((a, r) => a + r.score, 0) / Math.max(1, results.length));
      const missCounts = {};
      let worst = null;
      for (const r of results) {
        for (const f of r.failures) {
          missCounts[f.key] = (missCounts[f.key] || 0) + 1;
          if (!worst || f.pts > worst.pts) worst = f;
        }
      }
      const topKey = Object.entries(missCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const teamMsgs = {
        slot: "Too much slot exposure — protect inside ice.",
        spacing: "Spacing is off — don't crowd the puck or disappear.",
        outlet: "Not enough passing options — get open.",
        above: "Too many players too deep — stay above the puck.",
        guidance: "Players drifting out of structure — hold your shape."
      };
      failures = topKey ? [{ key: topKey, msg: teamMsgs[topKey], pts: worst?.pts || 0 }] : [];
      ok = score >= pass;
      const anchor = scenario.isDefense ? toward(puck, slotFor(ownSideOf(scenario)), 0.5) : puck;
      receiver = nearestTo(controlled, anchor.x, anchor.y) || controlled[0];
      reportRole = "TEAM";
    }

    const tier = tierFor(score, ok);
    const top = failures[0];
    const second = failures[1];
    const cues = [];
    if (top) cues.push(top.msg);
    if (ageCfg.showSecondCue && second) cues.push(second.msg);
    const subMsg = top ? top.msg : "Not the best option this time.";

    // Update stats immediately
    scoreEl.textContent = `${score}`;
    if (ok) streak += 1; else streak = 0;
    streakEl.textContent = streak;
    if (tier === "great") { goalsFor += 1; gfEl.textContent = goalsFor; }
    if (tier === "bad") { goalsAgainst += 1; gaEl.textContent = goalsAgainst; }

    addReportEntry({
      time: nowTime(), fmt: scenario.fmt, phase: scenario.phase,
      mode, role: reportRole, ok, score,
      topMissKey: ok ? null : (top?.key || null),
      topMissMsg: ok ? null : (top?.msg || null)
    });

    // Run the simulation (choice mode snapshots before the player moves to the option)
    if (!chosen) takeSnapshot();
    choice.active = false;
    const steps = buildSimScript(tier, receiver, subMsg);

    HIQ.Sim.run(steps, {
      onFrame: (banner) => { lastBanner = banner; draw({ banner }); },
      onMsg: (m) => { statusEl.textContent = m; },
      onDone: (banner) => {
        lastBanner = banner;
        draw({ banner });
        if (ok) {
          statusEl.innerHTML = tier === "great"
            ? "<b>NICE READ ✅</b> You finished the play with a goal! Next play coming…"
            : "<b>NICE READ ✅</b> You kept the play alive. Next play coming…";
          pendingTimer = setTimeout(buildScenario, 1500);
        } else {
          statusEl.innerHTML = `<b>NOT THIS TIME ❌</b> ${cues.join(" ")}<br/><span class="muted">Coach cue: protect middle ice, keep spacing, be an option. Try again!</span>`;
          pendingTimer = setTimeout(() => {
            restoreSnapshot();
            lastBanner = null;
            if (isChoiceMode() && choice.options.length) choice.active = true;
            draw({ showGuidance: true, ok: false });
          }, 1600);
        }
      }
    });
  }

  // --- Reporting
  function addReportEntry(entry) {
    report.push(entry);
    if (report.length > 25) report.shift();
    renderReport();
  }

  function renderReport() {
    const total = report.length;
    const correct = report.filter(r => r.ok).length;
    const pct = total ? Math.round((correct / total) * 100) : 0;

    const byPhase = {};
    const missKeys = {};
    for (const r of report) {
      byPhase[r.phase] = byPhase[r.phase] || { t: 0, c: 0 };
      byPhase[r.phase].t += 1;
      if (r.ok) byPhase[r.phase].c += 1;
      if (!r.ok && r.topMissKey) missKeys[r.topMissKey] = (missKeys[r.topMissKey] || 0) + 1;
    }

    reportSummaryEl.textContent = `Attempts: ${total} | Correct: ${correct} (${pct}%)`;

    reportChipsEl.innerHTML = "";
    Object.keys(byPhase).sort().forEach(ph => {
      const v = byPhase[ph];
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = `${ph}: ${Math.round((v.c / v.t) * 100)}%`;
      reportChipsEl.appendChild(chip);
    });

    const topMiss = Object.entries(missKeys).sort((a, b) => b[1] - a[1])[0];
    if (topMiss) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = `Most common miss: ${topMiss[0]} (${topMiss[1]})`;
      reportChipsEl.appendChild(chip);
    }

    reportRowsEl.innerHTML = "";
    for (let i = report.length - 1; i >= 0; i--) {
      const r = report[i];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.time}</td>
        <td>${r.fmt}</td>
        <td>${r.phase}</td>
        <td>${r.mode}</td>
        <td>${r.role}</td>
        <td>${r.ok ? "✅" : "❌"} ${r.score}</td>
        <td>${r.topMissMsg || (r.ok ? "Good principles" : "—")}</td>
      `;
      reportRowsEl.appendChild(tr);
    }
  }

  // --- Drawing
  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function drawRink() {
    // Ice
    roundRect(ctx, 20, 20, 1060, 580, 110);
    const grad = ctx.createLinearGradient(0, 20, 0, 600);
    grad.addColorStop(0, "#f7fbff");
    grad.addColorStop(1, "#e6f1fb");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    roundRect(ctx, 20, 20, 1060, 580, 110);
    ctx.clip();

    // Goal lines
    ctx.strokeStyle = "#d94141";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(95, 20); ctx.lineTo(95, 600); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1005, 20); ctx.lineTo(1005, 600); ctx.stroke();

    // Blue lines + center red line
    ctx.fillStyle = "rgba(37, 99, 235, 0.75)";
    ctx.fillRect(354, 20, 12, 580);
    ctx.fillRect(734, 20, 12, 580);
    ctx.fillStyle = "rgba(220, 60, 60, 0.75)";
    ctx.fillRect(544, 20, 12, 580);

    // Center circle
    ctx.strokeStyle = "rgba(37, 99, 235, 0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(550, 310, 65, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(220, 60, 60, 0.8)";
    ctx.beginPath(); ctx.arc(550, 310, 5, 0, Math.PI * 2); ctx.fill();

    // Zone faceoff circles + dots
    ctx.strokeStyle = "rgba(217, 65, 65, 0.55)";
    ctx.fillStyle = "rgba(217, 65, 65, 0.8)";
    for (const [fx, fy] of [[222, 170], [222, 450], [878, 170], [878, 450]]) {
      ctx.beginPath(); ctx.arc(fx, fy, 55, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI * 2); ctx.fill();
    }
    // Neutral zone dots
    for (const [fx, fy] of [[460, 170], [460, 450], [640, 170], [640, 450]]) {
      ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI * 2); ctx.fill();
    }

    // Creases
    ctx.fillStyle = "rgba(147, 197, 253, 0.55)";
    ctx.strokeStyle = "#d94141";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(95, 310, 45, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(1005, 310, 45, Math.PI / 2, -Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.stroke();

    // Nets
    for (const side of ["left", "right"]) {
      const n = netFor(side);
      const w = 30, h = 58;
      const x0 = side === "left" ? n.x - w : n.x;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(x0, n.y - h / 2, w, h);
      ctx.strokeStyle = "#b93030";
      ctx.lineWidth = 3;
      ctx.strokeRect(x0, n.y - h / 2, w, h);
      ctx.strokeStyle = "rgba(120,120,120,0.5)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(x0 + (w / 4) * i, n.y - h / 2); ctx.lineTo(x0 + (w / 4) * i, n.y + h / 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0, n.y - h / 2 + (h / 4) * i); ctx.lineTo(x0 + w, n.y - h / 2 + (h / 4) * i); ctx.stroke();
      }
    }

    ctx.restore();

    // Boards
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#12263a";
    roundRect(ctx, 20, 20, 1060, 580, 110);
    ctx.stroke();
  }

  function drawOverlays() {
    const ov = overlaySel.value;
    if (ov === "off") return;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#444";
    if (ov === "lanes") {
      for (const x of [360, 550, 740]) {
        ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 580); ctx.stroke();
      }
    }
    if (ov === "house") {
      const drawHouse = (slotX) => {
        ctx.beginPath();
        ctx.moveTo(slotX - 30, 250);
        ctx.lineTo(slotX + 40, 220);
        ctx.lineTo(slotX + 80, 310);
        ctx.lineTo(slotX + 40, 400);
        ctx.lineTo(slotX - 30, 370);
        ctx.closePath();
        ctx.stroke();
      };
      drawHouse(LM.leftSlot.x);
      drawHouse(LM.rightSlot.x);
    }
    ctx.restore();
  }

  function drawMarker(x, y, label, fill, radius, stroke = "#111", strokeW = 2) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = strokeW;
    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (label) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y);
    }
  }

  function drawDirectionTag() {
    if (!scenario) return;
    const atk = attackSideOf(scenario);
    const ownS = ownSideOf(scenario);
    const text = scenario.isDefense
      ? `🛡️ DEFEND the ${ownS.toUpperCase()} net`
      : (atk === "right" ? "ATTACK ➡➡" : "⬅⬅ ATTACK");
    ctx.font = "bold 17px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(15, 42, 74, 0.5)";
    ctx.fillText(text, 550, 52);
  }

  function drawBanner(b) {
    if (!b) return;
    if (b.light) {
      const n = netFor(b.light);
      const g = ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, 120);
      g.addColorStop(0, "rgba(255, 40, 40, 0.55)");
      g.addColorStop(1, "rgba(255, 40, 40, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 120, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.font = "bold 44px system-ui";
    const w = Math.max(360, ctx.measureText(b.text).width + 90);
    const h = b.sub ? 108 : 78;
    roundRect(ctx, 550 - w / 2, 92, w, h, 22);
    ctx.fillStyle = "rgba(10, 18, 32, 0.85)";
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = b.color || "#fff";
    ctx.fillText(b.text, 550, 132);
    if (b.sub) {
      ctx.font = "600 19px system-ui";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(b.sub, 550, 172);
    }
    ctx.restore();
  }

  function draw(opts = {}) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRink();
    drawOverlays();
    drawDirectionTag();

    // Guidance area
    if (scenario && scenario.mode === "single") {
      const reveal = (diffSel.value === "easy" && !choice.active) || opts.showGuidance;
      if (reveal) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "#00aa00";
        ctx.beginPath();
        ctx.arc(guidance.x, guidance.y, guidance.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (opts.showGuidance) {
          ctx.lineWidth = 4;
          ctx.strokeStyle = opts.ok ? "#0a0" : "#c22";
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.arc(guidance.x, guidance.y, guidance.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Pieces
    defense.forEach(p => {
      const friendlyG = isFriendlyGoalie(p);
      drawMarker(p.x, p.y, p.role, friendlyG ? "#0d9488" : "#cc2b2b", p.r || 16, friendlyG ? "#064e46" : "#5e1111");
    });
    offense.forEach(p => drawMarker(p.x, p.y, p.role, p.role === "G" ? "#0d9488" : "#f08a24", p.r || 16, "#7a4310"));

    controlled.forEach(p => {
      if (!HIQ.Sim.isRunning() && !choice.active) {
        ctx.save();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.r || 19) + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawMarker(p.x, p.y, p.role, "#1e4fff", p.r || 19, "#0b1b55", 3);
    });

    // Puck
    drawMarker(puck.x, puck.y, "", "#111", puck.r, "#444", 1);

    // A/B/C options
    if (choice.active) {
      for (const o of choice.options) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = "#fffbeb";
        ctx.beginPath();
        ctx.arc(o.pos.x, o.pos.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(o.pos.x, o.pos.y, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#b45309";
        ctx.font = "bold 22px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(o.label, o.pos.x, o.pos.y);
      }
    }

    drawBanner(opts.banner ?? null);
  }

  // --- Input (drag + choice taps)
  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const isTouch = evt.touches && evt.touches.length;
    const clientX = isTouch ? evt.touches[0].clientX : evt.clientX;
    const clientY = isTouch ? evt.touches[0].clientY : evt.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function findControlledAt(x, y) {
    for (let i = controlled.length - 1; i >= 0; i--) {
      const p = controlled[i];
      if (dist(x, y, p.x, p.y) <= (p.r || 19) + 12) return p;
    }
    return null;
  }

  let activeDrag = null;

  function chooseOption(opt) {
    if (HIQ.Sim.isRunning()) return;
    takeSnapshot();
    choice.active = false;
    const you = controlled[0];
    HIQ.Sim.run([{ d: 320, movers: [{ obj: you, to: { x: opt.pos.x, y: opt.pos.y } }] }], {
      onFrame: () => draw(),
      onDone: () => lockIn(opt)
    });
  }

  function pointerDown(evt) {
    if (!scenario || HIQ.Sim.isRunning()) return;
    const p = getPos(evt);

    if (choice.active) {
      for (const o of choice.options) {
        if (dist(p.x, p.y, o.pos.x, o.pos.y) <= 34) {
          evt.preventDefault();
          chooseOption(o);
          return;
        }
      }
      return;
    }

    activeDrag = findControlledAt(p.x, p.y);
    if (activeDrag) activeDrag.dragging = true;
  }

  function pointerMove(evt) {
    if (!activeDrag || !activeDrag.dragging) return;
    evt.preventDefault();
    const p = getPos(evt);
    activeDrag.x = clamp(p.x, 50, 1050);
    activeDrag.y = clamp(p.y, 50, 570);
    draw();
  }

  function pointerUp() {
    if (activeDrag) activeDrag.dragging = false;
    activeDrag = null;
  }

  canvas.addEventListener("mousedown", pointerDown);
  window.addEventListener("mousemove", pointerMove);
  window.addEventListener("mouseup", pointerUp);
  canvas.addEventListener("touchstart", pointerDown, { passive: false });
  window.addEventListener("touchmove", pointerMove, { passive: false });
  window.addEventListener("touchend", pointerUp);

  // --- Controls
  newBtn.addEventListener("click", buildScenario);
  lockBtn.addEventListener("click", () => lockIn());
  muteBtn.addEventListener("click", () => {
    HIQ.audio.setMuted(!HIQ.audio.isMuted());
    muteBtn.textContent = HIQ.audio.isMuted() ? "🔇" : "🔊";
  });

  function onSettingChange() {
    const fmt = formatSel.value;
    const isSpecial = (fmt === "5v4" || fmt === "4v5");
    ppStructWrap.style.display = isSpecial ? "" : "none";
    pkStructWrap.style.display = isSpecial ? "" : "none";
    if (scenario) buildScenario();
    else draw();
  }

  [ageSel, formatSel, modeSel, roleSel, diffSel, answerSel, phaseFilterSel, pressureFilterSel, ppStructSel, pkStructSel, overlaySel]
    .forEach(el => el.addEventListener("change", onSettingChange));

  // Debug/testing hooks (not used by gameplay)
  HIQ.debug = {
    getScenario: () => scenario,
    getPieces: () => ({ controlled, offense, defense, puck: { x: puck.x, y: puck.y }, guidance: { ...guidance } }),
    getChoices: () => choice.options,
    choiceActive: () => choice.active,
    place: (x, y) => { if (controlled[0]) { controlled[0].x = x; controlled[0].y = y; draw(); } },
    lock: () => lockIn(),
    newPlay: () => buildScenario(),
    simRunning: () => HIQ.Sim.isRunning()
  };

  // Init
  ppStructWrap.style.display = "none";
  pkStructWrap.style.display = "none";
  buildScenario();
})();
