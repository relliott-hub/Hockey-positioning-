/* Hockey IQ Trainer — main application: scenario building, scoring, rendering, input, and outcomes. */
(() => {
  // Never fail silently: surface any runtime error where the player can see it.
  window.addEventListener("error", (e) => {
    const el = document.getElementById("status");
    if (el) el.innerHTML = `⚠️ Oops, something glitched (<code>${e.message || "unknown error"}</code>). Tap New Play to keep going.`;
  });

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

  const pNameEl = document.getElementById("pName");
  const pNumEl = document.getElementById("pNum");
  const pColorEl = document.getElementById("pColor");
  const levelEl = document.getElementById("level");
  const xpFillEl = document.getElementById("xpfill");
  const coachFaceEl = document.getElementById("coachFace");
  const badgeGridEl = document.getElementById("badgeGrid");
  const trophySummaryEl = document.getElementById("trophySummary");
  const toastsEl = document.getElementById("toasts");
  const dotTeamEl = document.getElementById("dotTeam");

  // --- State
  let streak = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let scenario = null;

  let controlled = [];
  let offense = [];
  let defense = [];
  const puck = { x: 550, y: 310, r: 9 };
  let guidance = { x: 550, y: 310, r: 90 };

  let choice = { active: false, options: [] };
  let snapshot = null;
  let pendingTimer = null;

  const renderState = { banner: null, bannerAt: 0, showGuidance: false, guidanceOk: null, shakeAt: 0, shakeMag: 0, intro: null };
  let particles = [];
  let effects = [];
  const puckTrail = [];
  let lastTick = 0;

  const report = [];

  // --- Player profile, XP, and badges (persisted)
  const XP_PER_LEVEL = 300;

  function loadStore(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return (v && typeof v === "object") ? { ...fallback, ...v } : fallback;
    } catch (e) { return fallback; }
  }
  function saveStore(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode etc. */ }
  }

  const profile = loadStore("hiq_profile", { name: "", number: 9, color: "blue" });
  const stats = loadStore("hiq_stats", {
    xp: 0, goals: 0, corrects: 0, greats: 0, perfects: 0, bestStreak: 0,
    byPhase: {}, pkCorrect: 0, ppCorrect: 0, badges: {}
  });
  let sessionGoals = 0;
  let recentMisses = 0;

  const PRESET_COLORS = {
    blue:   { jersey: "#2456ff", trim: "#0a1c56", helmet: "#0a1c56" },
    green:  { jersey: "#22c55e", trim: "#14532d", helmet: "#14532d" },
    purple: { jersey: "#8b5cf6", trim: "#3b0764", helmet: "#3b0764" },
    teal:   { jersey: "#06b6d4", trim: "#164e63", helmet: "#164e63" },
    gold:   { jersey: "#eab308", trim: "#713f12", helmet: "#713f12" }
  };
  function teamStyle() { return PRESET_COLORS[profile.color] || PRESET_COLORS.blue; }

  const BADGES = [
    { id: "first_goal",    emoji: "🚨", name: "First Goal",      desc: "Score your first goal",            test: s => s.goals >= 1 },
    { id: "hat_trick",     emoji: "🎩", name: "Hat Trick",       desc: "3 goals in one session",           test: () => sessionGoals >= 3 },
    { id: "sniper",        emoji: "🎯", name: "Sniper",          desc: "Score 10 goals",                   test: s => s.goals >= 10 },
    { id: "breakout_boss", emoji: "🧊", name: "Breakout Boss",   desc: "5 correct breakout reads",         test: s => (s.byPhase["Breakout"] || 0) >= 5 },
    { id: "rush_master",   emoji: "💨", name: "Rush Master",     desc: "5 correct rush reads",             test: s => (s.byPhase["Rush"] || 0) >= 5 },
    { id: "ozone_pro",     emoji: "🔁", name: "O-Zone Pro",      desc: "5 correct offensive-zone reads",   test: s => (s.byPhase["O-zone"] || 0) >= 5 },
    { id: "lockdown",      emoji: "🛡️", name: "Lockdown D",      desc: "5 correct defensive reads",        test: s => (s.byPhase["Defend"] || 0) >= 5 },
    { id: "pk_wall",       emoji: "🧱", name: "PK Wall",         desc: "5 correct penalty-kill reads",     test: s => s.pkCorrect >= 5 },
    { id: "pp_qb",         emoji: "⚡", name: "PP Quarterback",  desc: "5 correct power-play reads",       test: s => s.ppCorrect >= 5 },
    { id: "on_fire",       emoji: "🔥", name: "On Fire",         desc: "Get a streak of 5",                test: s => s.bestStreak >= 5 },
    { id: "comeback",      emoji: "💪", name: "Comeback Kid",    desc: "Bounce back after 2 misses",       test: (s, ev) => !!ev.comeback },
    { id: "perfect",       emoji: "💯", name: "Perfect 100",     desc: "Score a perfect 100",              test: s => s.perfects >= 1 },
  ];

  function toast(emoji, title, sub) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="t-emoji">${emoji}</span><span>${title}<br/><span class="t-sub">${sub || ""}</span></span>`;
    toastsEl.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function levelFromXp(xp) { return Math.floor(xp / XP_PER_LEVEL) + 1; }

  function renderProgress() {
    levelEl.textContent = levelFromXp(stats.xp);
    xpFillEl.style.width = `${Math.round(((stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)}%`;
  }

  function awardXP(amount) {
    const before = levelFromXp(stats.xp);
    stats.xp += amount;
    const after = levelFromXp(stats.xp);
    renderProgress();
    if (after > before) {
      HIQ.audio.play("levelup");
      toast("⭐", `LEVEL UP! Level ${after}`, "Keep making smart reads!");
    }
  }

  function checkBadges(ev = {}) {
    for (const b of BADGES) {
      if (stats.badges[b.id]) continue;
      if (b.test(stats, ev)) {
        stats.badges[b.id] = Date.now();
        HIQ.audio.play("badge");
        toast(b.emoji, `Badge unlocked: ${b.name}`, b.desc);
      }
    }
    renderTrophies();
  }

  function renderTrophies() {
    const earned = Object.keys(stats.badges).length;
    trophySummaryEl.textContent = `— ${earned}/${BADGES.length} earned`;
    badgeGridEl.innerHTML = "";
    for (const b of BADGES) {
      const card = document.createElement("div");
      card.className = "badge-card" + (stats.badges[b.id] ? "" : " locked");
      card.innerHTML = `<div class="b-emoji">${b.emoji}</div><div class="b-name">${b.name}</div><div class="b-desc">${b.desc}</div>`;
      badgeGridEl.appendChild(card);
    }
  }

  const COACH_FACES = { neutral: "😀", watch: "👀", happy: "😄", goal: "🤩", sad: "😧", think: "🧐" };
  function setCoach(mood) {
    coachFaceEl.textContent = COACH_FACES[mood] || COACH_FACES.neutral;
  }

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
    // scenarioJitter: how far the puck (and the whole read) moves play to play.
    // Younger players get steadier pictures; older ones get more variety.
    if (age === "6-8") {
      return { guidanceScale: 1.35, passScore: { easy: 55, med: 60, hard: 65 }, maxRulesToEnforce: 2, showSecondCue: false, scenarioJitter: 30 };
    }
    if (age === "12-14") {
      return { guidanceScale: 0.95, passScore: { easy: 65, med: 75, hard: 85 }, maxRulesToEnforce: 4, showSecondCue: true, scenarioJitter: 60 };
    }
    return { guidanceScale: 1.10, passScore: { easy: 60, med: 70, hard: 80 }, maxRulesToEnforce: 3, showSecondCue: true, scenarioJitter: 45 };
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

  // --- Scoring engine
  // Two layers: a smooth positional score (how close to the coaching spot) plus
  // specific, coachable rule violations. Keeping them separate means the ideal
  // spot always scores 100 and the score degrades predictably with distance.

  // Teaching rules only — no positional component. Also used to self-check scenario data.
  function ruleViolations(role, pos, scen, skip = {}) {
    const rules = (scen.rulesByRole && scen.rulesByRole[role]) ? scen.rulesByRole[role] : {};
    const out = [];
    const fail = (key, pts, msg) => { if (!skip[key]) out.push({ key, msg, pts }); };

    if (rules.spacingFromPuck) {
      const d = dist(pos.x, pos.y, puck.x, puck.y);
      const { min, max } = rules.spacingFromPuck;
      if (d < min) fail("spacing", 22, "Too close to the puck — give your teammate room.");
      if (d > max) fail("spacing", 22, "Too far from the puck — you're not an option.");
    }

    // "Be an outlet" only means something for a player waiting to receive. The
    // one carrying the puck can't be an outlet for themselves.
    if (rules.beOutlet && dist(pos.x, pos.y, puck.x, puck.y) > 60) {
      const { preferX } = rules.beOutlet;
      if (preferX === "greater" && pos.x < puck.x - 15) fail("outlet", 22, "You're behind the play — get ahead so they can pass to you.");
      if (preferX === "less" && pos.x > puck.x + 15) fail("outlet", 22, "You're behind the play — get where they can pass to you.");
    }

    if (rules.protectSlot) {
      const { slotSide, radius } = rules.protectSlot;
      const slot = (slotSide === "left") ? LM.leftSlot : LM.rightSlot;
      if (dist(pos.x, pos.y, slot.x, slot.y) > radius) fail("slot", 26, "You left the front of your net open — protect middle ice!");
    }

    if (rules.stayAbovePuck) {
      const margin = rules.stayAbovePuck.margin ?? 25;
      const tooDeep = (scen.attackDir === "right")
        ? (pos.x > puck.x + margin && !rules.stayAbovePuck.allowDeeper)
        : (pos.x < puck.x - margin && !rules.stayAbovePuck.allowDeeper);
      if (tooDeep) fail("above", 18, "Too deep! Stay above the puck so you're not caught.");
    }

    return out;
  }

  // A rule the ideal spot itself breaks is a data bug, not a player mistake.
  // Disable it for that play so the canonical answer can never be punished.
  function buildSkipRules(scen) {
    const skip = {};
    for (const role of Object.keys(scen.guidanceByRole || {})) {
      const g = scen.guidanceByRole[role];
      const v = ruleViolations(role, { x: g.x, y: g.y }, scen, {});
      if (v.length) {
        skip[role] = {};
        v.forEach(f => { skip[role][f.key] = true; });
        console.warn(`[HIQ] ${scen.id}/${role}: ideal spot violates [${v.map(f => f.key).join(", ")}] — rule disabled for this play (fix the scenario data).`);
      }
    }
    return skip;
  }

  function scorePlacement(role, pos, scen) {
    const ageCfg = getAgeSettings();
    const skip = (scen._skipRules && scen._skipRules[role]) || {};

    // Positional accuracy: 100 at the coaching spot, decaying smoothly outward.
    const g = scen.guidanceByRole && scen.guidanceByRole[role];
    let base = 100;
    let posMiss = null;
    if (g) {
      const r = Math.max(35, difficultyTighten(g.r, scen.diff) * ageCfg.guidanceScale);
      const d = dist(pos.x, pos.y, g.x, g.y);
      base = clamp(Math.round(100 - 30 * Math.pow(d / r, 1.3)), 0, 100);
      if (base < 88) {
        posMiss = {
          key: "position",
          pts: 100 - base,
          msg: d > r * 2
            ? "That's the wrong area of the ice for your position."
            : "Close — but not quite in your support spot."
        };
      }
    }

    const violations = ruleViolations(role, pos, scen, skip);
    violations.sort((a, b) => b.pts - a.pts);
    const enforced = violations.slice(0, ageCfg.maxRulesToEnforce);

    let score = base;
    for (const f of enforced) score -= f.pts;
    score = clamp(Math.round(score), 0, 100);

    // Coaching cues: specific rule mistakes first, positional drift as backup.
    const cues = enforced.concat(posMiss ? [posMiss] : []);
    return { score, failures: cues, allFailures: violations };
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
    setBanner(null);
    renderState.showGuidance = false;
    puckTrail.length = 0;
    effects = [];

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

    const base = pick(candidates);
    const pressure = (pressureFilter === "any") ? pick(base.pressures || ["Med"]) : pressureFilter;

    // Every play is a fresh read: mirrored ice, a moved puck, and support spots
    // and opposition that respond. Special teams already vary by puck location.
    const isSpecialTpl = base.id && base.id.startsWith("PP_") || (base.id || "").startsWith("PK_");
    const tpl = isSpecialTpl ? base : HIQ.varyScenario(base, {
      mirror: Math.random() < 0.5,
      pressure,
      jitter: getAgeSettings().scenarioJitter
    });

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

    // The player must be assigned a position that is actually on the ice in this
    // format (e.g. a 4-man penalty kill has no 5th spot to stand in).
    const onIce = applied.off.map(p => p.role);
    let playRole = role;
    if (!onIce.includes(playRole) || !scenario.guidanceByRole[playRole]) {
      playRole = onIce.find(r2 => scenario.guidanceByRole[r2]) || onIce[0];
      scenario.roleNote = `On this unit you're covering the ${playRole} spot.`;
    }
    scenario.role = playRole;
    scenario.prompt = tpl.prompt ? tpl.prompt(playRole, fmt) : `${fmt} — ${tpl.phase}. You are ${playRole}.`;
    scenario._skipRules = buildSkipRules(scenario);

    if (mode === "single") {
      // Your role always takes one of the team's spots (never adds an extra skater).
      const others = applied.off.filter(p => p.role !== playRole);
      controlled = [{ role: playRole, x: 550, y: 310, r: 19, dragging: false }];
      offense = others.map(p => ({ ...p, r: 16 }));
    } else {
      controlled = applied.off.map(p => ({ ...p, r: 19, dragging: false }));
      offense = [];
    }

    const ageCfg = getAgeSettings();
    const g = scenario.guidanceByRole?.[playRole] || { x: 550, y: 310, r: 90 };
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
    const hints = showHints ? coachHints(scenario.role, scenario) : [];
    if (scenario.roleNote) hints.unshift(scenario.roleNote);
    hintEl.textContent = hints.join("   ");
    hintEl.style.display = hints.length ? "" : "none";

    if (choice.active) {
      statusEl.innerHTML = "Tap <b>A</b>, <b>B</b>, or <b>C</b> — where should you go? Then watch the play!";
    } else if (mode === "single") {
      statusEl.textContent = "Drag your blue player to the best spot, then tap Lock In to watch the play.";
    } else {
      statusEl.textContent = "Drag your whole team (blue) into a better shape, then tap Lock In.";
    }

    renderState.intro = { text: `${scenario.phase.toUpperCase()}  •  ${fmt}`, at: performance.now() };
    HIQ.audio.play("faceoff");
    setCoach("think");
  }

  // --- A/B/C choice generation
  // Decoys are deliberate near-misses: each one is a real positioning mistake,
  // placed a difficulty-scaled distance from the coaching spot. Obvious decoys
  // teach nothing, so tighter difficulties pull them closer to the right answer.
  function generateChoices() {
    const role = scenario.role;
    const g = scenario.guidanceByRole?.[role] || { x: 550, y: 310, r: 90 };
    const correctPos = { x: g.x, y: g.y };
    const correctRes = scorePlacement(role, correctPos, scenario);

    const atk = attackSideOf(scenario);
    const ownS = ownSideOf(scenario);
    const atkNet = netFor(atk);
    const ownNet = netFor(ownS);
    const ageCfg = getAgeSettings();
    const r = difficultyTighten(g.r, scenario.diff) * ageCfg.guidanceScale;

    // How far a wrong answer sits from the right one, by difficulty.
    const spreadBand = { easy: [2.0, 2.8], med: [1.5, 2.1], hard: [1.1, 1.5] }[scenario.diff] || [1.5, 2.1];
    const near = r * spreadBand[0];
    const far = r * spreadBand[1];

    const unit = (from, to) => {
      const dx = to.x - from.x, dy = to.y - from.y;
      const m = Math.hypot(dx, dy) || 1;
      return { x: dx / m, y: dy / m };
    };
    const at = (dir, d, mistake) => ({
      pos: {
        x: clamp(correctPos.x + dir.x * d, 55, 1045),
        y: clamp(correctPos.y + dir.y * d, 55, 565)
      },
      mistake
    });

    const toPuck = unit(correctPos, puck);
    const toOwnNet = unit(correctPos, ownNet);
    const toAtkNet = unit(correctPos, atkNet);
    const toMiddle = unit(correctPos, { x: correctPos.x, y: 310 });
    const toBoards = { x: 0, y: correctPos.y < 310 ? -1 : 1 };

    const candidates = [
      at(toPuck, near, "You chased the puck instead of holding your support spot."),
      at(toOwnNet, far, "You hung back too far — you weren't an option for your teammate."),
      at(toAtkNet, near, scenario.isDefense
        ? "You got caught up ice while your team was defending."
        : "You drifted too deep and skated yourself out of the play."),
      at(toMiddle, far, "You floated into the middle and left your lane uncovered."),
      at(toBoards, near, "You hugged the boards — no passing angle from there."),
    ];

    // Keep only genuinely worse options, well separated from each other.
    const scored = candidates
      .map(c => ({ ...c, res: scorePlacement(role, c.pos, scenario) }))
      .filter(c => c.res.score <= correctRes.score - 12)
      .filter(c => dist(c.pos.x, c.pos.y, correctPos.x, correctPos.y) > r * 0.9);

    const spread = [];
    for (const c of shuffle(scored)) {
      if (spread.every(s => dist(s.pos.x, s.pos.y, c.pos.x, c.pos.y) > r * 0.9)) spread.push(c);
      if (spread.length === 2) break;
    }
    // Fallback: push straight out from the ideal spot in opposite directions.
    let angle = Math.random() * Math.PI * 2;
    while (spread.length < 2) {
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      const c = at(dir, far, "That's not your spot on this play.");
      c.res = scorePlacement(role, c.pos, scenario);
      if (spread.every(s => dist(s.pos.x, s.pos.y, c.pos.x, c.pos.y) > r * 0.9)) spread.push(c);
      angle += Math.PI * 0.7;
    }

    const opts = shuffle([
      { pos: correctPos, res: correctRes, correct: true },
      { pos: spread[0].pos, res: spread[0].res, correct: false, mistake: spread[0].mistake },
      { pos: spread[1].pos, res: spread[1].res, correct: false, mistake: spread[1].mistake },
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
    puckTrail.length = 0;
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

  // Ambient team motion: everyone drifts part-way toward a point so the whole
  // play feels alive, not just the puck carriers.
  function driftAll(list, exclude, target, amt) {
    return list
      .filter(p => !exclude.includes(p))
      .map(p => mv(p, p.x + (target.x - p.x) * amt, p.y + (target.y - p.y) * amt));
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

    const atkSlot = slotFor(atk);

    if (!scen.isDefense) {
      // We have the puck.
      if (tier === "great" || tier === "good") {
        steps.push({ d: 450, msg: "Good spot! Watch the play…" });
        steps.push({
          d: 520, sound: "pass",
          movers: [
            mv(puck, receiver.x, receiver.y),
            ...driftAll(friendlySk, [receiver], atkSlot, 0.10),
            ...driftAll(oppSk, [], atkSlot, 0.08)
          ],
          fx: { type: "ring", x: receiver.x, y: receiver.y, color: "96, 165, 250" }
        });
        if (tier === "great") {
          const carryTo = toward(receiver, atkSlot, 0.6);
          steps.push({
            d: 650, sound: "catch",
            movers: [
              mv(receiver, carryTo.x, carryTo.y), mv(puck, carryTo.x, carryTo.y),
              ...driftAll(friendlySk, [receiver], atkSlot, 0.15),
              ...driftAll(oppSk, [], atkSlot, 0.12)
            ]
          });
          steps.push({ d: 260, sound: "shot", movers: [mv(puck, atkNet.x, atkNet.y)] });
          steps.push({ d: 1400, sound: "goal", shake: 1, banner: { text: "GOAL! 🚨", sub: "Perfect positioning!", color: "#4ade80", light: atk, fx: "confetti" } });
        } else {
          let next = null, bd = Infinity;
          for (const p of friendlySk) {
            if (p === receiver) continue;
            const d = dist(p.x, p.y, atkNet.x, atkNet.y);
            if (d < bd) { bd = d; next = p; }
          }
          if (next) {
            steps.push({ d: 240, sound: "catch" });
            steps.push({
              d: 520, sound: "pass",
              movers: [
                mv(puck, next.x, next.y),
                ...driftAll(friendlySk, [receiver, next], atkSlot, 0.08),
                ...driftAll(oppSk, [], atkSlot, 0.08)
              ],
              fx: { type: "ring", x: next.x, y: next.y, color: "96, 165, 250" }
            });
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
        steps.push({
          d: 560, sound: "pass",
          movers: [
            mv(puck, mid.x, mid.y), mv(D, mid.x, mid.y),
            ...driftAll(oppSk, [D], mid, 0.10)
          ]
        });
        if (tier === "miss") {
          steps.push({ d: 1400, sound: "whistle", banner: { text: "TURNOVER ❌", sub: subMsg, color: "#fca5a5" } });
        } else {
          const counter = slotFor(ownS);
          steps.push({ d: 300, banner: { text: "TURNOVER ❌", sub: "They're coming back the other way!", color: "#fca5a5" } });
          steps.push({
            d: 700,
            movers: [
              mv(D, counter.x, counter.y), mv(puck, counter.x, counter.y),
              ...driftAll(oppSk, [D], counter, 0.18),
              ...driftAll(friendlySk, [receiver], counter, 0.10)
            ]
          });
          steps.push({ d: 260, sound: "shot", movers: [mv(puck, ownNet.x, ownNet.y)] });
          steps.push({ d: 1500, sound: "goalAgainst", shake: 0.7, banner: { text: "GOAL AGAINST 😖", sub: subMsg, color: "#fca5a5", light: ownS } });
        }
      }
    } else {
      // Opponents have the puck — our job is coverage.
      const dangerSpot = slotFor(ownS);
      if (tier === "great" || tier === "good") {
        steps.push({ d: 450, msg: "They attack — watch your read…" });
        const cut = toward(puck, dangerSpot, 0.5);
        steps.push({
          d: 560, sound: "pass",
          movers: [
            mv(puck, cut.x, cut.y), mv(receiver, cut.x, cut.y),
            ...driftAll(oppSk, [], dangerSpot, 0.10),
            ...driftAll(friendlySk, [receiver], dangerSpot, 0.08)
          ]
        });
        steps.push({ d: 400, sound: "catch", banner: { text: "TAKEAWAY! 🛡️", sub: "You read the play!", color: "#4ade80" }, fx: { type: "ring", x: cut.x, y: cut.y, color: "74, 222, 128" } });
        if (tier === "great") {
          const counter = slotFor(atk);
          steps.push({
            d: 850, banner: null,
            movers: [
              mv(receiver, counter.x, counter.y), mv(puck, counter.x, counter.y),
              ...driftAll(friendlySk, [receiver], counter, 0.15),
              ...driftAll(oppSk, [], counter, 0.12)
            ]
          });
          steps.push({ d: 260, sound: "shot", movers: [mv(puck, atkNet.x, atkNet.y)] });
          steps.push({ d: 1500, sound: "goal", shake: 1, banner: { text: "COUNTER-ATTACK GOAL! 🚨", sub: "Defense turned into offense!", color: "#4ade80", light: atk, fx: "confetti" } });
        } else {
          const clearTo = { x: ownS === "right" ? 320 : 780, y: 80 };
          steps.push({
            d: 650, banner: null, sound: "clear",
            movers: [mv(puck, clearTo.x, clearTo.y), ...driftAll(oppSk, [], clearTo, 0.06)]
          });
          steps.push({ d: 1200, banner: { text: "CLEARED! ✅", sub: "Great defensive position!", color: "#4ade80" } });
        }
      } else {
        steps.push({ d: 450, msg: "Uh oh — you left space open…" });
        const carrier = nearestTo(oppSk, puck.x, puck.y);
        const others = oppSk.filter(p => p !== carrier);
        const open = nearestTo(others.length ? others : oppSk, dangerSpot.x, dangerSpot.y) || carrier;
        steps.push({
          d: 520, sound: "pass",
          movers: [mv(puck, open.x, open.y), ...driftAll(oppSk, [open], dangerSpot, 0.08)]
        });
        steps.push({
          d: 450, sound: "pass",
          movers: [
            mv(puck, dangerSpot.x, dangerSpot.y), mv(open, dangerSpot.x, dangerSpot.y),
            ...driftAll(friendlySk, [], dangerSpot, 0.12)
          ]
        });
        if (tier === "miss") {
          const savePt = toward(dangerSpot, ownNet, 0.75);
          steps.push({ d: 240, sound: "shot", movers: [mv(puck, savePt.x, savePt.y)] });
          steps.push({ d: 200, sound: "save", fx: { type: "ring", x: savePt.x, y: savePt.y, color: "252, 211, 77" } });
          steps.push({ d: 1300, sound: "whistle", banner: { text: "BIG CHANCE AGAINST ⚠️", sub: (subMsg || "") + " Lucky save by your goalie!", color: "#fcd34d" } });
        } else {
          steps.push({ d: 240, sound: "shot", movers: [mv(puck, ownNet.x, ownNet.y)] });
          steps.push({ d: 1500, sound: "goalAgainst", shake: 0.7, banner: { text: "GOAL AGAINST 😖", sub: subMsg, color: "#fca5a5", light: ownS } });
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
    renderState.showGuidance = false;

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
    // A picked decoy knows exactly which mistake it represents — say that first.
    if (!ok && chosen && chosen.mistake) cues.push(chosen.mistake);
    if (top && cues.length === 0) cues.push(top.msg);
    else if (top && ageCfg.showSecondCue) cues.push(top.msg);
    if (ageCfg.showSecondCue && second && cues.length < 2) cues.push(second.msg);
    const subMsg = cues[0] || (top ? top.msg : "Not the best option this time.");

    // Update stats immediately
    scoreEl.textContent = `${score}`;
    if (ok) streak += 1; else streak = 0;
    streakEl.textContent = streak;
    if (tier === "great") { goalsFor += 1; gfEl.textContent = goalsFor; }
    if (tier === "bad") { goalsAgainst += 1; gaEl.textContent = goalsAgainst; }

    // Progression (persisted): XP, counters, badges
    const wasComeback = ok && recentMisses >= 2;
    if (ok) {
      stats.corrects += 1;
      stats.byPhase[scenario.phase] = (stats.byPhase[scenario.phase] || 0) + 1;
      if (scenario.fmt === "4v5") stats.pkCorrect += 1;
      if (scenario.fmt === "5v4") stats.ppCorrect += 1;
      recentMisses = 0;
    } else {
      recentMisses += 1;
    }
    if (tier === "great") { stats.goals += 1; stats.greats += 1; sessionGoals += 1; }
    if (score === 100) stats.perfects += 1;
    stats.bestStreak = Math.max(stats.bestStreak, streak);
    awardXP(tier === "great" ? 100 : tier === "good" ? 60 : 15);
    checkBadges({ comeback: wasComeback });
    saveStore("hiq_stats", stats);

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

    setCoach("watch");
    HIQ.Sim.run(steps, {
      onFrame: (banner) => { setBanner(banner); },
      onMsg: (m) => { statusEl.textContent = m; },
      onStep: (s) => {
        if (s.shake) { renderState.shakeAt = performance.now(); renderState.shakeMag = s.shake; }
        if (s.fx) effects.push({ ...s.fx, at: performance.now() });
      },
      onDone: (banner) => {
        setBanner(banner);
        setCoach(ok ? (tier === "great" ? "goal" : "happy") : "sad");
        if (ok) {
          statusEl.innerHTML = tier === "great"
            ? "<b>NICE READ ✅</b> You finished the play with a goal! Next play coming…"
            : "<b>NICE READ ✅</b> You kept the play alive. Next play coming…";
          pendingTimer = setTimeout(buildScenario, 1500);
        } else {
          // Revealing the answer on the first miss teaches kids to tap the green
          // circle instead of reading the play. Give them a cue and a second look
          // first; only show the spot once they've genuinely had two goes.
          // The youngest group still gets the answer right away.
          const alwaysReveal = (ageSel.value === "6-8" || diffSel.value === "easy");
          scenario._attempts = (scenario._attempts || 0) + 1;
          const reveal = alwaysReveal || scenario._attempts >= 2;

          statusEl.innerHTML = reveal
            ? `<b>NOT QUITE ❌</b> ${cues.join(" ")}<br/><span class="muted">Here's the spot the coach wanted — remember that shape.</span>`
            : `<b>NOT THIS TIME ❌</b> ${cues.join(" ")}<br/><span class="muted">Have another look — where should you be?</span>`;

          pendingTimer = setTimeout(() => {
            restoreSnapshot();
            setBanner(null);
            if (isChoiceMode() && choice.options.length) choice.active = true;
            renderState.showGuidance = reveal;
            renderState.guidanceOk = false;
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

  // =========================================================================
  // RENDERING — persistent animation loop, sprite players, particles
  // =========================================================================

  function setBanner(b) {
    if (renderState.banner === b) return;
    renderState.banner = b;
    renderState.bannerAt = performance.now();
    if (b && b.fx === "confetti") spawnConfetti();
  }

  function spawnConfetti() {
    const colors = ["#fbbf24", "#34d399", "#60a5fa", "#f87171", "#f472b6", "#ffffff"];
    for (let i = 0; i < 90; i++) {
      particles.push({
        kind: "confetti",
        x: 550 + (Math.random() - 0.5) * 340,
        y: 130 + (Math.random() - 0.5) * 70,
        vx: (Math.random() - 0.5) * 280,
        vy: -Math.random() * 240 - 40,
        size: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 10,
        color: colors[i % colors.length],
        life: 1.5 + Math.random() * 0.9
      });
    }
  }

  // Little puff of snow when a skater stops hard
  function spawnSpray(x, y) {
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 25 + Math.random() * 55;
      particles.push({
        kind: "spray",
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: 1.5 + Math.random() * 2.5,
        rot: 0, vr: 0,
        color: "#ffffff",
        life: 0.35 + Math.random() * 0.25
      });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "confetti") p.vy += 320 * dt;
      else { p.vx *= 0.92; p.vy *= 0.92; }
      p.rot += p.vr * dt;
    }
    particles = particles.filter(p => p.life > 0 && p.y < 660);
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = clamp(p.kind === "spray" ? p.life * 2 : p.life, 0, 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.kind === "confetti") {
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawEffects(t) {
    effects = effects.filter(e => t - e.at < 600);
    for (const e of effects) {
      const k = (t - e.at) / 600;
      ctx.strokeStyle = `rgba(${e.color || "255, 255, 255"}, ${1 - k})`;
      ctx.lineWidth = 3.5 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 10 + k * 36, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Smoothly rotate players toward their movement direction (or the puck when idle)
  function updateHeadings(dt) {
    const all = [...controlled, ...offense, ...defense];
    for (const p of all) {
      const dx = p.x - (p._px ?? p.x);
      const dy = p.y - (p._py ?? p.y);
      let target;
      if (Math.hypot(dx, dy) > 0.6) {
        target = Math.atan2(dy, dx);
        p._moving = true;
      } else {
        p._moving = false;
        target = Math.atan2(puck.y - p.y, puck.x - p.x);
      }
      if (p.angle === undefined) p.angle = target;
      let d = target - p.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      p.angle += d * Math.min(1, dt * 8);

      // Skate trail carving + snow spray on hard stops
      if (!p._trail) p._trail = [];
      if (p._moving) {
        const lt = p._trail[p._trail.length - 1];
        if (!lt || dist(lt.x, lt.y, p.x, p.y) > 4) p._trail.push({ x: p.x, y: p.y });
        if (p._trail.length > 9) p._trail.shift();
      } else if (p._trail.length) {
        p._trail.shift();
      }
      if (p._wasMoving && !p._moving && Math.hypot(dx, dy) < 0.6) spawnSpray(p.x, p.y);
      p._wasMoving = p._moving;

      p._px = p.x;
      p._py = p.y;
    }
  }

  // Goalies always square up to the puck and hug their crease
  function updateGoalies(dt) {
    for (const p of [...defense, ...offense]) {
      if (p.role !== "G") continue;
      const net = dist(p.x, p.y, LM.leftNet.x, LM.leftNet.y) < dist(p.x, p.y, LM.rightNet.x, LM.rightNet.y)
        ? LM.leftNet : LM.rightNet;
      const ty = clamp(puck.y, net.y - 26, net.y + 26);
      const tx = net.x + (net.x < 550 ? 8 : -8);
      p.y += (ty - p.y) * Math.min(1, dt * 3);
      p.x += (tx - p.x) * Math.min(1, dt * 1.5);
    }
  }

  function drawTrails() {
    for (const p of [...controlled, ...offense, ...defense]) {
      const tr = p._trail;
      if (!tr || tr.length < 2) continue;
      for (let i = 1; i < tr.length; i++) {
        const k = i / tr.length;
        ctx.strokeStyle = `rgba(125, 170, 215, ${0.28 * k})`;
        ctx.lineWidth = 3 * k + 1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tr[i - 1].x, tr[i - 1].y);
        ctx.lineTo(tr[i].x, tr[i].y);
        ctx.stroke();
      }
    }
  }

  function updatePuckTrail() {
    const last = puckTrail[puckTrail.length - 1];
    if (!last || dist(last.x, last.y, puck.x, puck.y) > 3) {
      puckTrail.push({ x: puck.x, y: puck.y });
      if (puckTrail.length > 10) puckTrail.shift();
    } else if (puckTrail.length) {
      puckTrail.shift(); // fade the trail out when the puck stops
    }
  }

  // --- Static rink pre-rendered once to an offscreen layer
  const rinkLayer = document.createElement("canvas");
  rinkLayer.width = 1100;
  rinkLayer.height = 620;

  function roundRectPath(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function buildRinkLayer() {
    const c = rinkLayer.getContext("2d");
    c.clearRect(0, 0, 1100, 620);

    // Ice with subtle vertical sheen
    roundRectPath(c, 20, 20, 1060, 580, 110);
    const grad = c.createLinearGradient(0, 20, 0, 600);
    grad.addColorStop(0, "#f8fcff");
    grad.addColorStop(0.5, "#eef6fd");
    grad.addColorStop(1, "#e3eff9");
    c.fillStyle = grad;
    c.fill();

    c.save();
    roundRectPath(c, 20, 20, 1060, 580, 110);
    c.clip();

    // Ice texture: faint skate-scuff speckles
    for (let i = 0; i < 420; i++) {
      c.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.5)" : "rgba(160,190,220,0.18)";
      const sx = 20 + Math.random() * 1060;
      const sy = 20 + Math.random() * 580;
      c.fillRect(sx, sy, 1 + Math.random() * 2, 1);
    }

    // Goal lines
    c.strokeStyle = "#d94141";
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(95, 20); c.lineTo(95, 600); c.stroke();
    c.beginPath(); c.moveTo(1005, 20); c.lineTo(1005, 600); c.stroke();

    // Blue lines + center red line
    c.fillStyle = "rgba(37, 99, 235, 0.75)";
    c.fillRect(354, 20, 12, 580);
    c.fillRect(734, 20, 12, 580);
    c.fillStyle = "rgba(220, 60, 60, 0.75)";
    c.fillRect(544, 20, 12, 580);

    // Center circle with a faint home logo
    c.strokeStyle = "rgba(37, 99, 235, 0.6)";
    c.lineWidth = 3;
    c.beginPath(); c.arc(550, 310, 65, 0, Math.PI * 2); c.stroke();
    c.font = "bold 34px system-ui";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "rgba(37, 99, 235, 0.12)";
    c.fillText("HIQ", 550, 310);
    c.fillStyle = "rgba(220, 60, 60, 0.8)";
    c.beginPath(); c.arc(550, 310, 5, 0, Math.PI * 2); c.fill();

    // Board advertising strips (arena feel)
    c.font = "bold 13px system-ui";
    c.fillStyle = "rgba(18, 38, 58, 0.22)";
    for (const y of [34, 588]) {
      for (const x of [300, 550, 800]) {
        c.fillText(x === 550 ? "★ HOCKEY IQ TRAINER ★" : "GO  TEAM  GO!", x, y);
      }
    }

    // Zone faceoff circles + dots
    c.strokeStyle = "rgba(217, 65, 65, 0.55)";
    c.fillStyle = "rgba(217, 65, 65, 0.8)";
    for (const [fx, fy] of [[222, 170], [222, 450], [878, 170], [878, 450]]) {
      c.beginPath(); c.arc(fx, fy, 55, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(fx, fy, 6, 0, Math.PI * 2); c.fill();
    }
    // Neutral zone dots
    for (const [fx, fy] of [[460, 170], [460, 450], [640, 170], [640, 450]]) {
      c.beginPath(); c.arc(fx, fy, 6, 0, Math.PI * 2); c.fill();
    }

    // Creases
    c.fillStyle = "rgba(147, 197, 253, 0.55)";
    c.strokeStyle = "#d94141";
    c.lineWidth = 2;
    c.beginPath(); c.arc(95, 310, 45, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(1005, 310, 45, Math.PI / 2, -Math.PI / 2); c.closePath(); c.fill(); c.stroke();

    // Nets
    for (const side of ["left", "right"]) {
      const n = netFor(side);
      const w = 30, h = 58;
      const x0 = side === "left" ? n.x - w : n.x;
      c.fillStyle = "rgba(255,255,255,0.9)";
      c.fillRect(x0, n.y - h / 2, w, h);
      c.strokeStyle = "#b93030";
      c.lineWidth = 3;
      c.strokeRect(x0, n.y - h / 2, w, h);
      c.strokeStyle = "rgba(120,120,120,0.5)";
      c.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        c.beginPath(); c.moveTo(x0 + (w / 4) * i, n.y - h / 2); c.lineTo(x0 + (w / 4) * i, n.y + h / 2); c.stroke();
        c.beginPath(); c.moveTo(x0, n.y - h / 2 + (h / 4) * i); c.lineTo(x0 + w, n.y - h / 2 + (h / 4) * i); c.stroke();
      }
    }

    c.restore();

    // Boards with inner glow
    c.lineWidth = 9;
    c.strokeStyle = "rgba(18, 38, 58, 0.12)";
    roundRectPath(c, 20, 20, 1060, 580, 110);
    c.stroke();
    c.lineWidth = 5;
    c.strokeStyle = "#12263a";
    roundRectPath(c, 20, 20, 1060, 580, 110);
    c.stroke();
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

  const TEAM_STYLES = {
    you:       { jersey: "#2456ff", trim: "#0a1c56", helmet: "#0a1c56" },
    teammate:  { jersey: "#f08a24", trim: "#8a4d0f", helmet: "#6b3a0c" },
    opponent:  { jersey: "#cc2b2b", trim: "#5e1111", helmet: "#3f0b0b" },
    ourGoalie: { jersey: "#0d9488", trim: "#06463f", helmet: "#06463f" },
    oppGoalie: { jersey: "#a11d1d", trim: "#4a0d0d", helmet: "#380808" }
  };

  function drawRoleChip(p, style, t) {
    let label = p.role;
    if (style.isYou) {
      const nm = (profile.name || "").trim().toUpperCase();
      label = `${p.role} · ${nm ? nm + " " : ""}#${profile.number || 9}`;
    }
    if (!label) return;
    ctx.font = "bold 10px system-ui";
    const tw = ctx.measureText(label).width;
    const w = tw + 10, h = 14;
    const y = p.y + (p.r || 16) + 8;
    ctx.save();
    roundRectPath(ctx, p.x - w / 2, y, w, h, 6);
    ctx.fillStyle = style.isYou ? "#facc15" : "rgba(15, 23, 42, 0.75)";
    ctx.fill();
    ctx.fillStyle = style.isYou ? "#1f2937" : "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, p.x, y + h / 2 + 0.5);
    ctx.restore();
  }

  function drawSkater(p, style, t) {
    if (p._ph === undefined) p._ph = Math.random() * Math.PI * 2;
    const R = p.r || 16;
    const s = R / 16;
    const a = p.angle || 0;
    const stride = p._moving ? Math.sin(t / 70 + p._ph) * 2.2 : 0;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Shadow on the ice
    ctx.fillStyle = "rgba(10, 20, 40, 0.18)";
    ctx.beginPath();
    ctx.ellipse(2 * s, 4 * s, 15 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(a);
    ctx.scale(s, s);

    // Stick (shaft + blade), waggling slightly while skating
    ctx.lineCap = "round";
    ctx.strokeStyle = "#8a5a2b";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(3, 9);
    ctx.lineTo(21, 13 + stride);
    ctx.stroke();
    ctx.strokeStyle = "#3d2b1f";
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(21, 13 + stride);
    ctx.lineTo(27, 10.5 + stride);
    ctx.stroke();

    // Body: shoulder pads (wide across the direction of travel)
    ctx.fillStyle = style.jersey;
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Jersey shoulder stripe
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-3.5, -13);
    ctx.lineTo(-3.5, 13);
    ctx.stroke();

    // Gloves at the shoulder tips
    ctx.fillStyle = style.trim;
    ctx.beginPath(); ctx.arc(3, -13.5, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, 13.5, 3.6, 0, Math.PI * 2); ctx.fill();

    // Helmet with a shine
    ctx.fillStyle = style.helmet;
    ctx.beginPath(); ctx.arc(1.5, 0, 6.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath(); ctx.arc(3.4, -1.8, 2.2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    drawRoleChip(p, style, t);
  }

  function drawGoalie(p, style, t) {
    const R = (p.r || 16) + 2;
    const s = R / 16;
    const a = p.angle || 0;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(10, 20, 40, 0.18)";
    ctx.beginPath();
    ctx.ellipse(2 * s, 4 * s, 16 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(a);
    ctx.scale(s, s);

    // Leg pads out front
    ctx.fillStyle = "#efe3cd";
    ctx.strokeStyle = "#b7a27b";
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, 5, -15, 8, 12, 3); ctx.fill(); ctx.stroke();
    roundRectPath(ctx, 5, 3, 8, 12, 3); ctx.fill(); ctx.stroke();

    // Goalie stick held across
    ctx.strokeStyle = "#3d2b1f";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(12, -12);
    ctx.lineTo(12, 12);
    ctx.stroke();

    // Body
    ctx.fillStyle = style.jersey;
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 15.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mask
    ctx.fillStyle = "#f5f5f5";
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(1.5, 0, 6.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(80,80,80,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(-1, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -4.5); ctx.lineTo(2, 4.5); ctx.stroke();

    ctx.restore();

    drawRoleChip(p, style, t);
  }

  function drawPuck(t) {
    // Motion trail
    for (let i = 0; i < puckTrail.length; i++) {
      const q = puckTrail[i];
      const k = (i + 1) / puckTrail.length;
      ctx.fillStyle = `rgba(30, 41, 59, ${0.05 + k * 0.16})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, puck.r * (0.4 + k * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    // Disc
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    const g = ctx.createRadialGradient(puck.x - 2, puck.y - 2, 1, puck.x, puck.y, puck.r);
    g.addColorStop(0, "#3a3a3a");
    g.addColorStop(1, "#0b0b0b");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, puck.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, puck.r - 2.5, -2.4, -0.9);
    ctx.stroke();
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

  function drawGuidance(t) {
    if (!scenario || scenario.mode !== "single") return;
    const reveal = (diffSel.value === "easy" && !choice.active) || renderState.showGuidance;
    if (!reveal) return;
    ctx.save();
    ctx.globalAlpha = 0.14 + Math.sin(t / 500) * 0.03;
    ctx.fillStyle = "#00aa00";
    ctx.beginPath();
    ctx.arc(guidance.x, guidance.y, guidance.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (renderState.showGuidance) {
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = renderState.guidanceOk ? "#0a0" : "#c22";
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -t / 30;
      ctx.beginPath();
      ctx.arc(guidance.x, guidance.y, guidance.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawChoices(t) {
    if (!choice.active) return;
    for (const o of choice.options) {
      const pulse = Math.sin(t / 280 + o.label.charCodeAt(0)) * 2.5;
      const r = 25 + pulse;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 7;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = "#fffbeb";
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#b45309";
      ctx.font = "bold 22px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(o.label, o.pos.x, o.pos.y);
    }
  }

  function drawYouHalo(t) {
    if (HIQ.Sim.isRunning() || choice.active) return;
    for (const p of controlled) {
      ctx.save();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t / 40;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.r || 19) + 8 + Math.sin(t / 350) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function easeOutBack(k) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  }

  function drawIntro(t) {
    const i = renderState.intro;
    if (!i || renderState.banner) return;
    const age = t - i.at;
    if (age > 1500) return;
    const a = age < 200 ? age / 200 : (age > 1200 ? (1500 - age) / 300 : 1);
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = "bold 26px system-ui";
    const w = ctx.measureText(i.text).width + 64;
    roundRectPath(ctx, 550 - w / 2, 96, w, 46, 14);
    ctx.fillStyle = "rgba(15, 42, 74, 0.82)";
    ctx.fill();
    ctx.fillStyle = "#ffd76a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i.text, 550, 120);
    ctx.restore();
  }

  function drawBanner(t) {
    const b = renderState.banner;
    if (!b) return;

    if (b.light) {
      const n = netFor(b.light);
      const pulse = 0.45 + Math.sin(t / 120) * 0.2;
      const g = ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, 130);
      g.addColorStop(0, `rgba(255, 40, 40, ${pulse})`);
      g.addColorStop(1, "rgba(255, 40, 40, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 130, 0, Math.PI * 2);
      ctx.fill();
    }

    const age = t - renderState.bannerAt;
    const k = clamp(age / 240, 0, 1);
    const scale = 0.75 + 0.25 * easeOutBack(k);

    ctx.save();
    ctx.globalAlpha = clamp(age / 160, 0, 1);
    ctx.translate(550, 130);
    ctx.scale(scale, scale);
    ctx.font = "bold 44px system-ui";
    const w = Math.max(360, ctx.measureText(b.text).width + 90);
    const h = b.sub ? 108 : 78;
    roundRectPath(ctx, -w / 2, -38, w, h, 22);
    ctx.fillStyle = "rgba(10, 18, 32, 0.86)";
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = b.color || "#fff";
    ctx.fillText(b.text, 0, 2);
    if (b.sub) {
      ctx.font = "600 19px system-ui";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(b.sub, 0, 42);
    }
    ctx.restore();
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Screen shake on big moments
    let shx = 0, shy = 0;
    const shAge = t - renderState.shakeAt;
    if (renderState.shakeAt && shAge < 450) {
      const k = (1 - shAge / 450) * renderState.shakeMag;
      shx = (Math.random() - 0.5) * 12 * k;
      shy = (Math.random() - 0.5) * 8 * k;
    }
    ctx.save();
    ctx.translate(shx, shy);

    ctx.drawImage(rinkLayer, 0, 0);
    drawOverlays();
    drawDirectionTag();
    drawGuidance(t);
    drawTrails();

    drawYouHalo(t);

    // Opponents (their goalie in dark red; our goalie may live in this array on PK/defense)
    defense.forEach(p => {
      const friendlyG = isFriendlyGoalie(p);
      if (p.role === "G") drawGoalie(p, friendlyG ? TEAM_STYLES.ourGoalie : TEAM_STYLES.oppGoalie, t);
      else drawSkater(p, TEAM_STYLES.opponent, t);
    });

    // Teammates (your chosen team color)
    offense.forEach(p => {
      if (p.role === "G") drawGoalie(p, TEAM_STYLES.ourGoalie, t);
      else drawSkater(p, teamStyle(), t);
    });

    // You
    controlled.forEach(p => drawSkater(p, { ...teamStyle(), isYou: true }, t));

    drawPuck(t);
    drawEffects(t);
    drawChoices(t);
    drawParticles();
    drawIntro(t);
    drawBanner(t);

    ctx.restore();
  }

  function tick(t) {
    const dt = Math.min(0.05, lastTick ? (t - lastTick) / 1000 : 0.016);
    lastTick = t;
    updateHeadings(dt);
    updateGoalies(dt);
    updatePuckTrail();
    updateParticles(dt);
    draw(t);
    requestAnimationFrame(tick);
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
    HIQ.Sim.run([{ d: 340, movers: [{ obj: you, to: { x: opt.pos.x, y: opt.pos.y } }] }], {
      onFrame: () => {},
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

  // Player profile controls (instant — no scenario rebuild needed)
  function syncProfileUI() {
    pNameEl.value = profile.name || "";
    pNumEl.value = profile.number || 9;
    pColorEl.value = profile.color || "blue";
    dotTeamEl.style.background = teamStyle().jersey;
  }
  pNameEl.addEventListener("input", () => {
    profile.name = pNameEl.value.slice(0, 12);
    saveStore("hiq_profile", profile);
  });
  pNumEl.addEventListener("input", () => {
    profile.number = clamp(parseInt(pNumEl.value, 10) || 9, 1, 99);
    saveStore("hiq_profile", profile);
  });
  pColorEl.addEventListener("change", () => {
    profile.color = pColorEl.value;
    saveStore("hiq_profile", profile);
    dotTeamEl.style.background = teamStyle().jersey;
  });

  function onSettingChange() {
    const fmt = formatSel.value;
    const isSpecial = (fmt === "5v4" || fmt === "4v5");
    ppStructWrap.style.display = isSpecial ? "" : "none";
    pkStructWrap.style.display = isSpecial ? "" : "none";
    if (scenario) buildScenario();
  }

  [ageSel, formatSel, modeSel, roleSel, diffSel, answerSel, phaseFilterSel, pressureFilterSel, ppStructSel, pkStructSel, overlaySel]
    .forEach(el => el.addEventListener("change", onSettingChange));

  // Debug/testing hooks (not used by gameplay)
  HIQ.debug = {
    getScenario: () => scenario,
    getPieces: () => ({ controlled, offense, defense, puck: { x: puck.x, y: puck.y }, guidance: { ...guidance } }),
    getChoices: () => choice.options,
    choiceActive: () => choice.active,
    place: (x, y) => { if (controlled[0]) { controlled[0].x = x; controlled[0].y = y; } },
    lock: () => lockIn(),
    newPlay: () => buildScenario(),
    simRunning: () => HIQ.Sim.isRunning(),
    getStats: () => stats,
    getProfile: () => profile,
    guidanceShown: () => renderState.showGuidance,
    // Auditing hooks: score an arbitrary spot, and force a specific template
    scoreAt: (role, x, y) => scorePlacement(role, { x, y }, scenario),
    forceTemplate: (id, role) => {
      const tpl = HIQ.TEMPLATES_EVEN.find(t => t.id === id);
      if (!tpl) return null;
      if (role) roleSel.value = role;
      const saved = HIQ.TEMPLATES_EVEN.slice();
      HIQ.TEMPLATES_EVEN.length = 0;
      HIQ.TEMPLATES_EVEN.push(tpl);
      buildScenario();
      HIQ.TEMPLATES_EVEN.length = 0;
      saved.forEach(t => HIQ.TEMPLATES_EVEN.push(t));
      return scenario.id;
    }
  };

  // --- First-run tutorial
  // New players (and anyone testing the game) should understand what to do
  // without being told. Four short cards, then straight into a real play.
  const TUTORIAL_STEPS = [
    {
      art: "🏒",
      title: "Welcome to Hockey IQ Trainer!",
      body: "Great players aren't just the fastest — they're always in the right place. This game teaches you where to be on the ice."
    },
    {
      art: "🔵",
      title: "Find yourself on the ice",
      body: "Your team is blue and the opponents are red. You're the player with the gold ring around them — that's who you control."
    },
    {
      art: "🅰️",
      title: "Pick your spot",
      body: "Every play shows three spots: A, B and C. Read where the puck is and tap the spot where you should skate to help your team."
    },
    {
      art: "🏆",
      title: "Watch what happens",
      body: "The play runs so you can see if your read worked. Score goals, build streaks, earn XP and unlock trophies. Ready?"
    }
  ];

  const tutorialEl = document.getElementById("tutorial");
  const tutArt = document.getElementById("tutArt");
  const tutTitle = document.getElementById("tutTitle");
  const tutBody = document.getElementById("tutBody");
  const tutDots = document.getElementById("tutDots");
  const tutNext = document.getElementById("tutNext");
  const tutSkip = document.getElementById("tutSkip");
  let tutStep = 0;

  function renderTutorial() {
    const s = TUTORIAL_STEPS[tutStep];
    tutArt.textContent = s.art;
    tutTitle.textContent = s.title;
    tutBody.textContent = s.body;
    tutNext.textContent = tutStep === TUTORIAL_STEPS.length - 1 ? "Let's play! 🥅" : "Next →";
    tutDots.innerHTML = TUTORIAL_STEPS.map((_, i) => `<i class="${i === tutStep ? "on" : ""}"></i>`).join("");
  }

  function closeTutorial() {
    tutorialEl.hidden = true;
    try { localStorage.setItem("hiq.seenTutorial", "1"); } catch (e) { /* private mode */ }
  }

  function openTutorial() {
    tutStep = 0;
    renderTutorial();
    tutorialEl.hidden = false;
  }

  tutNext.addEventListener("click", () => {
    if (tutStep === TUTORIAL_STEPS.length - 1) { closeTutorial(); return; }
    tutStep++;
    renderTutorial();
  });
  tutSkip.addEventListener("click", closeTutorial);

  let seenTutorial = false;
  try { seenTutorial = localStorage.getItem("hiq.seenTutorial") === "1"; } catch (e) { /* private mode */ }
  if (!seenTutorial) openTutorial();

  const howToBtn = document.getElementById("howToBtn");
  if (howToBtn) howToBtn.addEventListener("click", openTutorial);

  // Init
  ppStructWrap.style.display = "none";
  pkStructWrap.style.display = "none";
  // Phones: start with the settings panel collapsed so the rink is front and center
  const settingsPanel = document.getElementById("settingsPanel");
  if (settingsPanel && window.innerWidth <= 760) settingsPanel.open = false;
  syncProfileUI();
  renderProgress();
  renderTrophies();
  buildRinkLayer();
  buildScenario();
  requestAnimationFrame(tick);
})();
