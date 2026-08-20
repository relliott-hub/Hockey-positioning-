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
  const V = HIQ.VIEW, RK = HIQ.RINK;
  // Landmarks, converted from the regulation sheet into canvas pixels.
  const PXLM = {
    leftNet:   V.pt(RK.netLeft),
    rightNet:  V.pt(RK.netRight),
    leftSlot:  V.pt(RK.slotLeft),
    rightSlot: V.pt(RK.slotRight),
    centre:    V.pt(RK.centre),
  };
  // Distances judged in feet, so "ten feet of room" means the same in any direction.
  const feetBetween = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by) / V.PX_PER_FT;
  function netFor(side) { return side === "left" ? PXLM.leftNet : PXLM.rightNet; }
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

  /* Grading against authored reads.

     There is no rule engine any more. Rules that scored a position by geometry
     were the source of the authenticity problem: a third of the answers they
     marked wrong were defensible hockey. Instead every read is authored per
     scenario and per role, in three tiers, and a placement is judged by which
     authored read it is closest to.

     best       — what we're teaching. Full marks.
     acceptable — genuinely works, second choice. Partial marks plus the reason
                  the best read is stronger.
     wrong      — a real mistake, with the reason it's a mistake. */

  // How close (in FEET) you must be to count as having chosen a given read.
  function readRadiusFt() {
    const age = ageSel.value, diff = diffSel.value;
    const base = age === "6-8" ? 20 : age === "12-14" ? 10 : 13;
    const tighten = diff === "hard" ? 0.78 : diff === "easy" ? 1.25 : 1;
    return base * tighten;
  }

  function readsFor(role, scen) {
    return (scen && scen.reads && scen.reads[role]) || null;
  }

  function gradePlacement(role, pos, scen) {
    const reads = readsFor(role, scen);
    if (!reads) return { tier: "wrong", score: 0, why: "No coaching read for this position." };

    /* Whichever authored read the player is closest to is the one they chose.
       Checking "best" first would swallow an acceptable spot that happens to
       sit inside the best spot's radius, and grade a second-choice read as
       full marks. */
    const ft = (a) => feetBetween(pos.x, pos.y, a.x, a.y);
    let nearest = { tier: "best", spot: reads.best, d: ft(reads.best) };
    for (const a of reads.acceptable) {
      const d = ft(a);
      if (d < nearest.d) nearest = { tier: "acceptable", spot: a, d };
    }
    for (const w of reads.wrong) {
      const d = ft(w);
      if (d < nearest.d) nearest = { tier: "wrong", spot: w, d };
    }

    const R = readRadiusFt();
    const better = nearest.tier === "best" ? null : reads.best;

    // Too far from anything anyone coached: off-book, and judged on how far
    // out of position it is.
    if (nearest.d > R * 1.5) {
      const dBest = ft(reads.best);
      return {
        tier: "wrong",
        score: Math.max(0, Math.round(40 - dBest * 0.9)),
        why: dBest > 45
          ? "That's the wrong part of the ice for your position on this play."
          : "You're out of position for what this play needs.",
        better,
      };
    }

    // Inside a coached read: score by tier, easing off with distance from it.
    const slip = Math.min(1, nearest.d / R);
    if (nearest.tier === "best") {
      return { tier: "best", score: Math.round(100 - 8 * slip), why: nearest.spot.why, principle: nearest.spot.principle, spot: nearest.spot };
    }
    if (nearest.tier === "acceptable") {
      return { tier: "acceptable", score: Math.round(78 - 10 * slip), why: nearest.spot.why, principle: nearest.spot.principle, spot: nearest.spot, better };
    }
    return { tier: "wrong", score: Math.round(38 - 14 * slip), why: nearest.spot.why, principle: nearest.spot.principle, spot: nearest.spot, better };
  }

  // Kept for the older call sites that just want a number.
  function scorePlacement(role, pos, scen) {
    const g = gradePlacement(role, pos, scen);
    return { score: g.score, failures: g.tier === "best" ? [] : [{ key: g.tier, msg: g.why, pts: 100 - g.score }], allFailures: [], grade: g };
  }

  function getCandidateTemplates(fmt) {
    // Special teams have not been re-authored on the new model yet, so the
    // even-strength set is used for every format rather than shipping
    // positions we can no longer vouch for.
    return HIQ.PLAYS.slice();
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
    // For the youngest players, give away the thinking behind the best read.
    const reads = readsFor(role, scen);
    if (!reads) return [];
    return ["\uD83C\uDFD2 " + reads.best.why];
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
    candidates = candidates.filter(t => phaseFilter === "any" || t.phase === phaseFilter);
    if (!candidates.length) candidates = getCandidateTemplates(fmt);
    if (!candidates.length) { statusEl.textContent = "No scenarios available for those filters."; return; }

    /* Pick a play the chosen position actually has a coached read for, and never
       one where that position is the puck carrier — "where should you go to
       help?" makes no sense when the puck is already on your stick. */
    /* Choose uniformly among every (play, mirrored?) combination this position
       can actually be coached in.

       Rolling the play and the mirror together and re-rolling on a miss biases
       the result: whether a position is the puck carrier flips with the mirror,
       so rejection sampling quietly favours one orientation and the play lands
       on the same side of the ice about twice as often. Enumerating first keeps
       both wings equally represented. */
    const combos = [];
    for (const cand of candidates) {
      for (const mirror of [false, true]) {
        const SWAP = { LW: "RW", RW: "LW", LD: "RD", RD: "LD", C: "C" };
        const sourceRole = mirror ? (SWAP[role] || role) : role;
        if (!cand.reads[sourceRole]) continue;   // this play doesn't coach it
        if (cand.carrier === sourceRole) continue; // you'd be carrying the puck
        combos.push({ cand, mirror });
      }
    }

    let play;
    if (combos.length) {
      const chosen = pick(combos);
      play = HIQ.varyPlay(chosen.cand, { mirror: chosen.mirror });
    } else {
      // Nothing coaches this position — fall back and reassign below.
      play = HIQ.varyPlay(pick(candidates));
    }

    // Fall back to a position this play does coach, if the chosen one isn't in it.
    let playRole = role;
    if (!play.reads[playRole] || play.carrier === playRole) {
      playRole = Object.keys(play.reads).find(r => r !== play.carrier) || Object.keys(play.reads)[0];
    }

    const px = HIQ.playToPixels(play);

    scenario = {
      id: play.id,
      phase: play.phase,
      name: play.name,
      situation: play.situation,
      pressure: play.pressure || "Med",
      fmt, mode, diff,
      role: playRole,
      attackDir: play.attackDir,
      isDefense: !!play.isDefense,
      forecheck: !!play.forecheck,
      carrier: play.carrier,
      reads: px.reads,
      prompt: `${play.name} — you are ${playRole}. ${play.situation}`,
    };
    if (playRole !== role) {
      scenario.roleNote = `This play doesn't use ${role} — you're playing ${playRole}.`;
    }

    puck.x = px.puck.x;
    puck.y = px.puck.y;

    // Our skaters, minus the position the player is taking.
    const teammates = Object.entries(px.players)
      .filter(([r]) => r !== playRole)
      .map(([r, pt]) => ({ role: r, x: pt.x, y: pt.y, r: 16 }));

    defense = px.opponents.map(o => ({ role: o.label, x: o.x, y: o.y, r: 16 }));
    // Their goalie sits in the net they're defending.
    const theirNet = netFor(attackSideOf(scenario));
    defense.push({ role: "G", x: theirNet.x, y: theirNet.y, r: 17 });
    // Ours in the net we're defending.
    const ourNet = netFor(ownSideOf(scenario));
    offense = teammates.concat([{ role: "G", x: ourNet.x, y: ourNet.y, r: 17 }]);

    if (mode === "single") {
      controlled = [{ role: playRole, x: PXLM.centre.x, y: PXLM.centre.y, r: 19, dragging: false }];
    } else {
      controlled = teammates.map(p => ({ ...p, r: 19, dragging: false }));
      offense = [{ role: "G", x: ourNet.x, y: ourNet.y, r: 17 }];
    }

    const best = scenario.reads[playRole].best;
    guidance = { x: best.x, y: best.y, r: readRadiusFt() * HIQ.VIEW.PX_PER_FT };

    // Positions settle before anything is derived from them.
    choice = { active: false, options: [] };
    spreadForClarity([guidance]);

    if (isChoiceMode()) {
      choice.options = generateChoices();
      choice.active = choice.options.length > 0;
      // The authored spots are fixed hockey, so it's the players that move to
      // keep the options visible.
      if (choice.active) spreadForClarity(choice.options.map(o => o.pos));
    }

    // Park the (hidden) token equidistant from the options so it skates in from
    // somewhere neutral and already on screen.
    if (choice.active && controlled.length) {
      const n = choice.options.length;
      controlled[0].x = choice.options.reduce((a, o) => a + o.pos.x, 0) / n;
      controlled[0].y = choice.options.reduce((a, o) => a + o.pos.y, 0) / n;
    }

    camera.ready = false;

    // UI
    phaseEl.textContent = scenario.phase;
    pressureEl.textContent = scenario.pressure;
    structureEl.textContent = scenario.name;
    promptEl.textContent = scenario.prompt;
    scoreEl.textContent = "—";
    lockBtn.style.display = choice.active ? "none" : "";

    /* USA Hockey's development model warns that teaching position too early can
       stifle a young player's ability to think on the fly. So for 6-8 the game
       leads with the IDEA rather than the system: one principle, stated plainly
       up front, and a generous target. The situation is still real hockey — it
       just isn't asking a seven-year-old to memorise a breakout. */
    const youngest = ageSel.value === "6-8";
    if (youngest) {
      const best = scenario.reads[scenario.role] && scenario.reads[scenario.role].best;
      const pr = best && HIQ.PRINCIPLES[best.principle];
      if (pr) promptEl.innerHTML =
        `<span class="principle">\uD83D\uDCA1 ${pr.name}</span><br/>${pr.kid} You are ${scenario.role}.`;
    }

    const showHints = (diffSel.value === "easy" || youngest);
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

    renderState.intro = { text: `${scenario.phase.toUpperCase()}  \u2022  ${scenario.name}`, at: performance.now() };
    HIQ.audio.play("faceoff");
    setCoach("think");
  }

  function spreadForClarity(keepClear) {
    // Two different jobs with two different budgets.
    // Players are anonymous dots to the eye, so they need real separation.
    // Markers are drawn on top of players and only need enough room not to be
    // hidden — and every foot a player is shoved is a foot of authored hockey
    // distorted, so that budget is deliberately smaller.
    const MIN_GAP = 62;
    const MARKER_GAP = 52;
    const skaters = [...offense, ...defense].filter(p => p.role !== "G");
    if (skaters.length < 2) return;

    // Whoever has the puck stays put, so the puck never looks orphaned.
    let carrier = null, best = Infinity;
    for (const p of skaters) {
      const d = dist(p.x, p.y, puck.x, puck.y);
      if (d < best) { best = d; carrier = p; }
    }
    const pinned = (carrier && best < 80) ? carrier : null;

    const nudge = (p, ux, uy, amount) => {
      p.x = clamp(p.x + ux * amount, 58, 1042);
      p.y = clamp(p.y + uy * amount, 58, 562);
    };

    for (let iter = 0; iter < 40; iter++) {
      let moved = false;

      for (let i = 0; i < skaters.length; i++) {
        for (let j = i + 1; j < skaters.length; j++) {
          const a = skaters[i], b = skaters[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d >= MIN_GAP) continue;
          if (d < 0.5) { dx = Math.cos(i * 2.4); dy = Math.sin(i * 2.4); d = 1; }
          const ux = dx / d, uy = dy / d;
          const half = (MIN_GAP - d) / 2;
          const aFree = a !== pinned, bFree = b !== pinned;
          if (aFree) nudge(a, -ux, -uy, bFree ? half : half * 2);
          if (bFree) nudge(b, ux, uy, aFree ? half : half * 2);
          moved = true;
        }
      }

      for (const spot of keepClear) {
        if (!spot) continue;
        for (const p of skaters) {
          let dx = p.x - spot.x, dy = p.y - spot.y;
          let d = Math.hypot(dx, dy);
          if (d >= MARKER_GAP) continue;
          if (d < 0.5) { dx = 1; dy = 0; d = 1; }
          const ux = dx / d, uy = dy / d;
          const amount = MARKER_GAP - d;
          const before = { x: p.x, y: p.y };
          nudge(p, ux, uy, amount);
          // The carrier may move off the coaching spot, but the puck goes with
          // them — possession has to survive a readability nudge.
          if (p === pinned) {
            puck.x = clamp(puck.x + (p.x - before.x), 58, 1042);
            puck.y = clamp(puck.y + (p.y - before.y), 58, 562);
          }
          moved = true;
        }
      }

      if (!moved) break;
    }

    /* Separating players and clearing markers pull against each other, so the
       relaxation above can stop with a pair still touching. Two players merged
       into one blob is the worse failure of the two — a marker is drawn on top
       and stays legible either way — so finish with a player-only pass. */
    for (let iter = 0; iter < 12; iter++) {
      let moved = false;
      for (let i = 0; i < skaters.length; i++) {
        for (let j = i + 1; j < skaters.length; j++) {
          const a = skaters[i], b = skaters[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d >= MIN_GAP) continue;
          if (d < 0.5) { dx = Math.cos(i * 2.4); dy = Math.sin(i * 2.4); d = 1; }
          const ux = dx / d, uy = dy / d;
          const half = (MIN_GAP - d) / 2;
          const aFree = a !== pinned, bFree = b !== pinned;
          if (aFree) nudge(a, -ux, -uy, bFree ? half : half * 2);
          if (bFree) nudge(b, ux, uy, aFree ? half : half * 2);
          moved = true;
        }
      }
      if (!moved) break;
    }

    /* Finally, recover any marker clearance the pass above gave up — but only
       by moves that keep every player properly separated. Overlapping players
       is the worse failure, so it is never traded away to tidy a marker. */
    for (const spot of keepClear) {
      if (!spot) continue;
      for (const p of skaters) {
        if (p === pinned) continue;
        let dx = p.x - spot.x, dy = p.y - spot.y;
        let d = Math.hypot(dx, dy);
        if (d >= MARKER_GAP) continue;
        if (d < 0.5) { dx = 1; dy = 0; d = 1; }
        const before = { x: p.x, y: p.y };
        nudge(p, dx / d, dy / d, MARKER_GAP - d);
        const clashes = skaters.some(q => q !== p &&
          Math.hypot(q.x - p.x, q.y - p.y) < MIN_GAP);
        if (clashes) { p.x = before.x; p.y = before.y; }
      }
    }
  }

  /* Camera: a 200-foot rink drawn to fit a phone leaves the actual play tiny in
     one corner. Frame the action instead, so the players fill the screen. */
  const camera = { x: 550, y: 310, scale: 1, ready: false };

  function cameraTarget() {
    const pts = [];
    const add = p => { if (p && isFinite(p.x) && isFinite(p.y)) pts.push(p); };
    offense.forEach(add);
    defense.forEach(p => { if (p.role !== "G") add(p); });
    if (!choice.active) controlled.forEach(add); // hidden while choosing
    add(puck);
    if (choice.active) choice.options.forEach(o => add(o.pos));
    if (!pts.length) return { x: 550, y: 310, scale: 1 };

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const pad = 95; // breathing room so nothing sits against the edge
    const scale = clamp(
      Math.min(canvas.width / ((maxX - minX) + pad * 2), canvas.height / ((maxY - minY) + pad * 2)),
      1, 2.1
    );
    // Centre on the action, but never pan past the boards.
    const halfW = canvas.width / (2 * scale), halfH = canvas.height / (2 * scale);
    return {
      x: clamp((minX + maxX) / 2, halfW, canvas.width - halfW),
      y: clamp((minY + maxY) / 2, halfH, canvas.height - halfH),
      scale
    };
  }

  function updateCamera() {
    const tgt = cameraTarget();
    if (!camera.ready) {
      camera.x = tgt.x; camera.y = tgt.y; camera.scale = tgt.scale;
      camera.ready = true;
      return;
    }
    // Gentle follow — enough to keep a rush in frame, slow enough not to swim.
    const k = 0.07;
    camera.x += (tgt.x - camera.x) * k;
    camera.y += (tgt.y - camera.y) * k;
    camera.scale += (tgt.scale - camera.scale) * k;
  }

  function applyCamera() {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.x, -camera.y);
  }

  function screenToWorld(x, y) {
    return {
      x: (x - canvas.width / 2) / camera.scale + camera.x,
      y: (y - canvas.height / 2) / camera.scale + camera.y
    };
  }

  // --- A/B/C choices, taken from the authored reads for this play.
  // One best, one that genuinely works, one real mistake. Nothing generated by
  // pushing a marker in a direction and calling it wrong.
  function generateChoices() {
    const role = scenario.role;
    const reads = scenario.reads[role];
    if (!reads) return [];

    const mk = (spot, tier) => ({
      pos: { x: spot.x, y: spot.y },
      why: spot.why,
      principle: spot.principle,
      tier,
      correct: tier === "best",
      res: gradePlacement(role, { x: spot.x, y: spot.y }, scenario),
    });

    const best = mk(reads.best, "best");
    const others = reads.acceptable.map(a => mk(a, "acceptable"))
      .concat(reads.wrong.map(w => mk(w, "wrong")));
    if (others.length < 2) return [];

    /* Two options a kid cannot tell apart are not a choice — they're a coin
       flip with consequences. Whatever the authored pool contains, the three
       shown must be far enough apart to read as three different decisions, so
       pick the combination with the widest minimum separation. */
    const MIN_SEP_FT = 20;
    const sepFt = (a, b) => feetBetween(a.pos.x, a.pos.y, b.pos.x, b.pos.y);

    let picked = null, pickedSpread = -1;
    for (let i = 0; i < others.length; i++) {
      for (let j = i + 1; j < others.length; j++) {
        const trio = [best, others[i], others[j]];
        const spread = Math.min(sepFt(trio[0], trio[1]), sepFt(trio[0], trio[2]), sepFt(trio[1], trio[2]));
        // Prefer a set that includes a genuine alternative, all else equal.
        const hasAcceptable = trio.some(o => o.tier === "acceptable") ? 0.5 : 0;
        if (spread + hasAcceptable > pickedSpread) { pickedSpread = spread + hasAcceptable; picked = trio; }
      }
    }
    if (!picked) return [];
    if (pickedSpread < MIN_SEP_FT) {
      // Nothing in this pool reads as three distinct decisions. Better to skip
      // the play than to ask a child to guess between two identical spots.
      console.warn(`[HIQ] ${scenario.id}/${role}: options only ${pickedSpread.toFixed(1)} ft apart — skipping.`);
      return [];
    }

    const shuffled = shuffle(picked);
    shuffled.forEach((o, i) => { o.label = "ABC"[i]; });
    return shuffled;
  }


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

  /* Pass legality.

     Every pass the simulation shows is a demonstration of hockey to a child, so
     it has to be a pass a coach would accept. The hard rule is that our own
     players never move the puck through the front of our own net — it is the
     first thing taught and the last thing forgiven. When the spot a player
     chose has no safe lane to it, the right thing to show is the defenceman
     refusing the pass, not making it. */
  function laneIsSafe(from, to) {
    const V = HIQ.VIEW;
    return !HIQ.zones.laneCrossesSlot(V.ftPt(from), V.ftPt(to), ownSideOf(scenario));
  }

  /* How the puck actually gets from here to there.

     A real breakout is rarely one pass. Going from the corner directly to the
     far-side winger would cross the front of your own net — so a team moves it
     D-to-D behind the goal first, then up. Modelling only a single direct pass
     made legitimate weak-side positioning look illegal, which is why this
     returns a route rather than a yes/no. */
  function passRoute(fromPt, target, friendlySk) {
    if (laneIsSafe(fromPt, target)) return [target];
    let relay = null, bestCost = Infinity;
    for (const p of friendlySk) {
      if (p === target || p.role === "G") continue;
      if (!laneIsSafe(fromPt, p) || !laneIsSafe(p, target)) continue;
      const cost = dist(fromPt.x, fromPt.y, p.x, p.y) + dist(p.x, p.y, target.x, target.y);
      if (cost < bestCost) { bestCost = cost; relay = p; }
    }
    return relay ? [relay, target] : [];
  }

  // Up the boards on the puck's side, near our blue line — where a pressured
  // defenceman actually puts it when nothing is open.
  function rimTarget() {
    const R = HIQ.RINK, V = HIQ.VIEW;
    const own = ownSideOf(scenario);
    const blue = own === "left" ? R.blueLineLeft : R.blueLineRight;
    const puckFt = V.ftPt(puck);
    return V.pt({
      x: own === "left" ? blue - 10 : blue + 10,
      y: puckFt.y > R.midY ? R.width - 6 : 6,
    });
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

    if (scen.forecheck) {
      /* Forechecking. We don't have the puck, but the play is in their end and
         the generic defensive script — which walks the puck down to our own
         slot — would be the wrong picture entirely. */
      const R = HIQ.RINK, V = HIQ.VIEW;
      const theirGoalLine = atk === "right" ? R.goalLineRight : R.goalLineLeft;
      const puckFt = V.ftPt(puck);
      const nearBoards = puckFt.y > R.midY ? R.width - 8 : 8;
      // Above the puck on the same wall — where a rushed breakout pass goes.
      const wall = V.pt({ x: atk === "right" ? theirGoalLine - 20 : theirGoalLine + 20, y: nearBoards });

      if (tier === "great" || tier === "good") {
        steps.push({ d: 450, msg: "You close him down — watch what he does…" });
        steps.push({
          d: 500, sound: "pass",
          movers: [mv(puck, wall.x, wall.y), ...driftAll(oppSk, [], wall, 0.08)]
        });
        steps.push({
          d: 380, sound: "catch",
          poss: "us", banner: { text: "TURNOVER! 🛡️", sub: "Your pressure forced the rushed pass.", color: "#4ade80" },
          fx: { type: "ring", x: wall.x, y: wall.y, color: "74, 222, 128" },
          movers: [mv(receiver, wall.x, wall.y)]
        });
        if (tier === "great") {
          steps.push({
            d: 620,
            movers: [
              mv(receiver, atkSlot.x, atkSlot.y), mv(puck, atkSlot.x, atkSlot.y),
              ...driftAll(friendlySk, [receiver], atkSlot, 0.14)
            ]
          });
          steps.push({ d: 260, sound: "shot", movers: [mv(puck, atkNet.x, atkNet.y)] });
          steps.push({ d: 1400, sound: "goal", shake: 1, banner: { text: "GOAL! 🚨", sub: "Forecheck straight into a goal!", color: "#4ade80", light: atk, fx: "confetti" } });
        } else {
          steps.push({ d: 1300, sound: "good", banner: { text: "PUCK BACK! ⚡", sub: "You kept it in their end — keep the pressure on.", color: "#7dd3fc" } });
        }
      } else {
        steps.push({ d: 450, msg: "Uh oh — he's got a lane…" });
        // A clean exit up the middle of the ice.
        const outFt = { x: R.centreLine, y: puckFt.y > R.midY ? R.midY + 14 : R.midY - 14 };
        const out = V.pt(outFt);
        steps.push({
          d: 640, sound: "pass",
          movers: [mv(puck, out.x, out.y), ...driftAll(oppSk, [], out, 0.16), ...driftAll(friendlySk, [], out, 0.06)]
        });
        steps.push({ d: 320, poss: "them", banner: { text: "CLEAN BREAKOUT ❌", sub: subMsg, color: "#fca5a5" } });
        if (tier === "bad") {
          const danger = slotFor(ownS);
          steps.push({
            d: 780, banner: null,
            movers: [mv(puck, danger.x, danger.y), ...driftAll(oppSk, [], danger, 0.2)]
          });
          steps.push({ d: 260, sound: "shot", movers: [mv(puck, ownNet.x, ownNet.y)] });
          steps.push({ d: 1500, sound: "goalAgainst", shake: 0.7, banner: { text: "GOAL AGAINST 😖", sub: subMsg, color: "#fca5a5", light: ownS } });
        } else {
          steps.push({ d: 1300, sound: "whistle", banner: { text: "THEY'RE OUT ❌", sub: subMsg, color: "#fca5a5" } });
        }
      }
      return steps;
    }

    if (!scen.isDefense) {
      // We have the puck.
      const route = passRoute(puck, receiver, friendlySk);

      if (!route.length) {
        /* Nowhere safe to move it, even through a teammate. The defenceman
           looks the option off and rims it rather than passing through the
           front of his own net — which is what a coach would want him to do. */
        const rim = rimTarget();
        steps.push({ d: 480, msg: "Your defenceman looks for you\u2026" });
        steps.push({
          d: 420,
          banner: { text: "NOT THROUGH THE MIDDLE", sub: "Your D won't pass across the front of his own net.", color: "#fcd34d" }
        });
        steps.push({
          d: 620, sound: "clear",
          movers: [mv(puck, rim.x, rim.y), ...driftAll(oppSk, [], rim, 0.12)]
        });
        steps.push({
          d: 1500, sound: "whistle",
          poss: "them", banner: { text: "PUCK GIVEN AWAY \u274C", sub: subMsg || "There was no safe pass to where you went.", color: "#fca5a5" }
        });
        return steps;
      }

      if (tier === "great" || tier === "good") {
        steps.push({ d: 450, msg: "Good spot! Watch the play…" });
        if (route.length > 1) {
          // The D-to-D that makes the far-side option reachable.
          const relay = route[0];
          steps.push({
            d: 460, sound: "pass",
            movers: [mv(puck, relay.x, relay.y), ...driftAll(oppSk, [], atkSlot, 0.06)],
            fx: { type: "ring", x: relay.x, y: relay.y, color: "96, 165, 250" },
            msg: "D-to-D first — never through the middle."
          });
        }
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
          // Closest to the attacking net, but only through a lane we'd accept.
          let next = null, bd = Infinity;
          for (const p of friendlySk) {
            if (p === receiver) continue;
            if (!laneIsSafe(receiver, p)) continue;
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
        // The attempted pass is picked off early — and never deeper than a lane
        // we would be willing to show in the first place.
        let mid = toward(puck, receiver, 0.55);
        if (!laneIsSafe(puck, mid)) mid = toward(puck, receiver, 0.3);
        const D = nearestTo(oppSk, mid.x, mid.y) || { x: mid.x, y: mid.y };
        steps.push({
          d: 560, sound: "pass",
          movers: [
            mv(puck, mid.x, mid.y), mv(D, mid.x, mid.y),
            ...driftAll(oppSk, [D], mid, 0.10)
          ]
        });
        if (tier === "miss") {
          steps.push({ d: 1400, sound: "whistle", poss: "them", banner: { text: "TURNOVER ❌", sub: subMsg, color: "#fca5a5" } });
        } else {
          const counter = slotFor(ownS);
          steps.push({ d: 300, poss: "them", banner: { text: "TURNOVER ❌", sub: "They're coming back the other way!", color: "#fca5a5" } });
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
        steps.push({ d: 400, sound: "catch", poss: "us", banner: { text: "TAKEAWAY! 🛡️", sub: "You read the play!", color: "#4ade80" }, fx: { type: "ring", x: cut.x, y: cut.y, color: "74, 222, 128" } });
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
          // Cleared up the wall and out of the zone, in real rink coordinates.
          // (This was a leftover pixel pair from the old, differently sized canvas.)
          const clearTo = (() => {
            const R = HIQ.RINK, V = HIQ.VIEW;
            const blue = ownS === "left" ? R.blueLineLeft : R.blueLineRight;
            const puckFt = V.ftPt(puck);
            return V.pt({
              x: ownS === "left" ? blue + 12 : blue - 12,
              y: puckFt.y > R.midY ? R.width - 8 : 8,
            });
          })();
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
  /* Outcome tiers.

     Position improves your odds; it does not decide the result. A best read
     creates a good chance and usually — not always — finishes. A read that
     works keeps the play alive and sometimes scores. A mistake normally just
     costs possession; only a bad mistake in a dangerous area ends up in your
     own net. Teaching "right spot = guaranteed goal" would be teaching a lie
     about the sport. */
  function outcomeFor(grade) {
    const roll = Math.random();
    if (grade === "best")       return roll < 0.62 ? "great" : "good";
    if (grade === "acceptable") return roll < 0.24 ? "great" : roll < 0.86 ? "good" : "miss";
    return roll < 0.72 ? "miss" : "bad";
  }

  function lockIn(chosen = null) {
    if (!scenario || HIQ.Sim.isRunning()) return;
    clearTimeout(pendingTimer);
    renderState.showGuidance = false;

    const mode = scenario.mode;
    const pass = passThreshold();
    const ageCfg = getAgeSettings();

    let grade, score, why, better, receiver, reportRole, principle;

    if (mode === "single") {
      const you = controlled[0];
      const g = chosen ? chosen.res : gradePlacement(scenario.role, { x: you.x, y: you.y }, scenario);
      grade = chosen ? chosen.tier : g.tier;
      score = g.score;
      why = chosen ? chosen.why : g.why;
      principle = chosen ? chosen.principle : g.principle;
      better = g.better || (grade !== "best" ? scenario.reads[scenario.role].best : null);
      receiver = you;
      reportRole = scenario.role;
    } else {
      const results = controlled
        .filter(p => p.role !== "G")
        .map(p => gradePlacement(p.role, { x: p.x, y: p.y }, scenario));
      score = Math.round(results.reduce((a, r) => a + r.score, 0) / Math.max(1, results.length));
      const worst = results.slice().sort((a, b) => a.score - b.score)[0];
      grade = score >= 88 ? "best" : score >= 68 ? "acceptable" : "wrong";
      why = worst ? worst.why : "";
      principle = worst ? worst.principle : null;
      better = null;
      const anchor = scenario.isDefense ? toward(puck, slotFor(ownSideOf(scenario)), 0.5) : puck;
      receiver = nearestTo(controlled.filter(p => p.role !== "G"), anchor.x, anchor.y) || controlled[0];
      reportRole = "TEAM";
    }

    const ok = grade !== "wrong";
    const failures = ok ? [] : [{ key: grade, msg: why, pts: 100 - score }];

    const tier = outcomeFor(grade);
    const top = failures[0];
    // The coaching line is the authored reason for the spot the player chose.
    const cues = [why].filter(Boolean);
    if (grade === "acceptable" && better) cues.push("The stronger read: " + better.why);
    else if (grade === "wrong" && better && ageCfg.showSecondCue) cues.push("Best here: " + better.why);
    const subMsg = cues[0] || "Not the best option this time.";

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
    if (tier === "great") { stats.goals += 1; sessionGoals += 1; }
    if (grade === "best") stats.greats += 1;
    if (grade === "best" && score >= 98) stats.perfects += 1;
    if (principle) {
      stats.byPrinciple = stats.byPrinciple || {};
      const bucket = stats.byPrinciple[principle] || { good: 0, missed: 0 };
      if (grade === "wrong") bucket.missed += 1; else bucket.good += 1;
      stats.byPrinciple[principle] = bucket;
    }
    stats.bestStreak = Math.max(stats.bestStreak, streak);
    awardXP(grade === "best" ? 100 : grade === "acceptable" ? 55 : 15);
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
        setCoach(grade === "best" ? (tier === "great" ? "goal" : "happy")
               : grade === "acceptable" ? "happy" : "sad");

        const pr = principle && HIQ.PRINCIPLES[principle];
        const prLine = pr ? `<br/><span class="principle">\uD83D\uDCA1 ${pr.name} — ${pr.kid}</span>` : "";

        if (grade === "best") {
          const outcome = tier === "great"
            ? "You got to the right spot and it ended in a goal!"
            : "You got to the right spot and kept the play alive — the chance was there.";
          statusEl.innerHTML = `<b>BEST READ \u2705</b> ${outcome}${prLine}`;
          pendingTimer = setTimeout(buildScenario, 1700);

        } else if (grade === "acceptable") {
          // The whole point: this works, and the coach still shows you better.
          statusEl.innerHTML = `<b>THAT WORKS \uD83D\uDC4D</b> ${why}` +
            (better ? `<br/><span class="muted">Even better: ${better.why}</span>` : "") + prLine;
          pendingTimer = setTimeout(buildScenario, 2600);

        } else {
          const alwaysReveal = (ageSel.value === "6-8" || diffSel.value === "easy");
          scenario._attempts = (scenario._attempts || 0) + 1;
          const reveal = alwaysReveal || scenario._attempts >= 2;

          statusEl.innerHTML = reveal
            ? `<b>NOT QUITE \u274C</b> ${why}` +
              (better ? `<br/><span class="muted">Where you wanted to be: ${better.why}</span>` : "") + prLine
            : `<b>NOT THIS TIME \u274C</b> ${why}<br/><span class="muted">Have another look \u2014 where should you be?</span>${prLine}`;

          pendingTimer = setTimeout(() => {
            restoreSnapshot();
            setBanner(null);
            if (isChoiceMode() && choice.options.length) choice.active = true;
            renderState.showGuidance = reveal;
            renderState.guidanceOk = false;
          }, 1700);
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

  /* What a parent or coach actually wants to know: not "68% correct", but which
     ideas have landed and which keep costing them. */
  function principleSummary() {
    const by = stats.byPrinciple || {};
    const rows = Object.entries(by)
      .map(([key, v]) => ({ key, ...v, total: v.good + v.missed }))
      .filter(r => r.total >= 2)
      .sort((a, b) => (a.good / a.total) - (b.good / b.total));
    if (!rows.length) return "";

    const line = (r, cls) => {
      const p = HIQ.PRINCIPLES[r.key];
      if (!p) return "";
      const pctp = Math.round((r.good / r.total) * 100);
      return `<div class="pr-row ${cls}"><b>${p.name}</b> — ${r.good} of ${r.total} (${pctp}%)<br/>` +
             `<span class="muted">${p.kid}</span></div>`;
    };

    const weakest = rows.filter(r => r.good / r.total < 0.7).slice(0, 2);
    const strongest = rows.slice().reverse().filter(r => r.good / r.total >= 0.7).slice(0, 2);

    let html = `<div class="pr-block">`;
    if (weakest.length) {
      html += `<div class="pr-head">Work on this</div>` + weakest.map(r => line(r, "weak")).join("");
    }
    if (strongest.length) {
      html += `<div class="pr-head">Going well</div>` + strongest.map(r => line(r, "strong")).join("");
    }
    return html + `</div>`;
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

    reportSummaryEl.innerHTML =
      `Attempts: ${total} &nbsp;|&nbsp; Good reads: ${correct} (${pct}%)` + principleSummary();

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
      const net = dist(p.x, p.y, PXLM.leftNet.x, PXLM.leftNet.y) < dist(p.x, p.y, PXLM.rightNet.x, PXLM.rightNet.y)
        ? PXLM.leftNet : PXLM.rightNet;
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
  rinkLayer.width = canvas.width;
  rinkLayer.height = canvas.height;

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
    const R = HIQ.RINK, V = HIQ.VIEW;
    const c = rinkLayer.getContext("2d");
    c.clearRect(0, 0, canvas.width, canvas.height);

    const X = (ft) => V.x(ft), Y = (ft) => V.y(ft), S = (ft) => V.px(ft);
    const boardsX = X(0), boardsY = Y(0);
    const boardsW = S(R.length), boardsH = S(R.width);

    // Ice
    roundRectPath(c, boardsX, boardsY, boardsW, boardsH, S(R.cornerRadius));
    const grad = c.createLinearGradient(0, boardsY, 0, boardsY + boardsH);
    grad.addColorStop(0, "#f8fcff");
    grad.addColorStop(0.5, "#eef6fd");
    grad.addColorStop(1, "#e3eff9");
    c.fillStyle = grad;
    c.fill();
    c.save();
    c.clip();

    // Faint skate marks
    for (let i = 0; i < 380; i++) {
      c.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.5)" : "rgba(160,190,220,0.18)";
      const sx = boardsX + Math.random() * boardsW;
      const sy = boardsY + Math.random() * boardsH;
      c.fillRect(sx, sy, 12 + Math.random() * 26, 1);
    }

    // Goal lines (red), full width between the boards
    c.strokeStyle = "#d94141";
    c.lineWidth = 2;
    for (const gx of [R.goalLineLeft, R.goalLineRight]) {
      c.beginPath(); c.moveTo(X(gx), boardsY); c.lineTo(X(gx), boardsY + boardsH); c.stroke();
    }

    // Blue lines (1 ft wide) and the centre red line
    c.fillStyle = "rgba(37, 99, 235, 0.75)";
    for (const bx of [R.blueLineLeft, R.blueLineRight]) {
      c.fillRect(X(bx) - S(0.5), boardsY, S(1), boardsH);
    }
    c.fillStyle = "rgba(220, 60, 60, 0.75)";
    c.fillRect(X(R.centreLine) - S(0.5), boardsY, S(1), boardsH);

    // Centre circle and dot
    c.strokeStyle = "rgba(37, 99, 235, 0.6)";
    c.lineWidth = 2;
    c.beginPath(); c.arc(X(R.centre.x), Y(R.centre.y), S(R.centreCircleR), 0, Math.PI * 2); c.stroke();
    c.fillStyle = "rgba(220, 60, 60, 0.8)";
    c.beginPath(); c.arc(X(R.centre.x), Y(R.centre.y), S(R.dotR), 0, Math.PI * 2); c.fill();

    // End-zone faceoff circles + dots
    c.strokeStyle = "rgba(217, 65, 65, 0.55)";
    c.fillStyle = "rgba(217, 65, 65, 0.8)";
    for (const k of ["leftTop", "leftBottom", "rightTop", "rightBottom"]) {
      const d = R.dots[k];
      c.beginPath(); c.arc(X(d.x), Y(d.y), S(R.faceoffCircleR), 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(X(d.x), Y(d.y), S(R.dotR), 0, Math.PI * 2); c.fill();
    }
    // Neutral-zone dots
    for (const k of ["nzLeftTop", "nzLeftBottom", "nzRightTop", "nzRightBottom"]) {
      const d = R.dots[k];
      c.beginPath(); c.arc(X(d.x), Y(d.y), S(R.dotR), 0, Math.PI * 2); c.fill();
    }

    // Creases
    c.fillStyle = "rgba(147, 197, 253, 0.55)";
    c.strokeStyle = "#d94141";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(X(R.goalLineLeft), Y(R.midY), S(R.creaseR), -Math.PI / 2, Math.PI / 2);
    c.closePath(); c.fill(); c.stroke();
    c.beginPath();
    c.arc(X(R.goalLineRight), Y(R.midY), S(R.creaseR), Math.PI / 2, -Math.PI / 2);
    c.closePath(); c.fill(); c.stroke();

    // Nets
    for (const side of ["left", "right"]) {
      const gx = side === "left" ? R.goalLineLeft : R.goalLineRight;
      const w = S(R.goalDepth), h = S(R.goalWidth);
      const x0 = side === "left" ? X(gx) - w : X(gx);
      c.fillStyle = "rgba(255,255,255,0.9)";
      c.fillRect(x0, Y(R.midY) - h / 2, w, h);
      c.strokeStyle = "#b93030";
      c.lineWidth = 2;
      c.strokeRect(x0, Y(R.midY) - h / 2, w, h);
    }

    // Rink-side lettering
    c.font = "bold 12px system-ui";
    c.fillStyle = "rgba(18, 38, 58, 0.18)";
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (const yy of [3.2, R.width - 3.2]) {
      for (const xx of [55, 100, 145]) {
        c.fillText(xx === 100 ? "\u2605 HOCKEY IQ TRAINER \u2605" : "GO  TEAM  GO!", X(xx), Y(yy));
      }
    }

    c.restore();

    // Boards
    c.lineWidth = 8;
    c.strokeStyle = "rgba(18, 38, 58, 0.12)";
    roundRectPath(c, boardsX, boardsY, boardsW, boardsH, S(R.cornerRadius));
    c.stroke();
    c.lineWidth = 4;
    c.strokeStyle = "#12263a";
    roundRectPath(c, boardsX, boardsY, boardsW, boardsH, S(R.cornerRadius));
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
      /* The house: the box from the goal posts out to the four faceoff dots.
         Drawn from the real rink definition rather than the hand-tuned pixel
         pentagon this used to be, which was sized for the old canvas and no
         longer matched either net. */
      const drawHouse = (side) => {
        const pts = HIQ.RINK.homePlate(side).map(p => HIQ.VIEW.pt(p));
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();
      };
      drawHouse("left");
      drawHouse("right");
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

    // A pale ring of "ice" behind each player, so two skaters standing close
    // together still read as two distinct figures rather than one blob.
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.arc(0, 0, R + 4.5, 0, Math.PI * 2);
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

  /* Who has the puck is the first thing you need to know to read a play, and a
     small black disc among ten players doesn't say it clearly enough. Ring the
     carrier, and spell it out in words while the player is still deciding. */
  // Single source of truth for possession, shared by the renderer and the tests.
  function findPuckCarrier() {
    const skaters = [...offense, ...defense, ...(choice.active ? [] : controlled)]
      .filter(p => p.role !== "G");
    let carrier = null, best = Infinity;
    for (const p of skaters) {
      const d = dist(p.x, p.y, puck.x, puck.y);
      if (d < best) { best = d; carrier = p; }
    }
    return (carrier && best <= 60) ? { player: carrier, dist: best } : null;
  }

  function drawPuckCarrier(t) {
    const found = findPuckCarrier();
    const carrier = found && found.player;
    if (!carrier) {
      // Nobody has it. Say so rather than leaving the player to wonder.
      if (choice.active) drawPuckTag("LOOSE PUCK", puck.x, puck.y - 20);
      return;
    }

    const r = (carrier.r || 17) + 10 + Math.sin(t / 240) * 1.6;
    ctx.save();
    // Bright halo, distinct from the gold ring that marks "you"
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.4;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -t / 50;
    ctx.beginPath();
    ctx.arc(carrier.x, carrier.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Label it plainly during the decision, where clarity matters most.
    if (choice.active) drawPuckTag("HAS PUCK", carrier.x, carrier.y - r - 13);
  }

  function drawPuckTag(label, cx, cy) {
    ctx.save();
    ctx.font = "700 12px 'Segoe UI', system-ui, Arial";
    const w = ctx.measureText(label).width + 14;
    /* Keep it inside the boards, and put it on whichever side of the player has
       room — above normally, below when they're tight to the top boards, where
       a label above would sit on whoever is behind them. */
    const V = HIQ.VIEW, R = HIQ.RINK;
    const bx = clamp(cx - w / 2, V.x(2), V.x(R.length - 2) - w);
    const nearTop = V.ftY(cy) < R.width * 0.28;
    const by = nearTop ? cy + 44 : cy - 9;
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, 18, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + w / 2, by + 9.5);
    ctx.restore();
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
    // The play title occupies the top strip for its first moment; don't collide.
    const intro = renderState.intro;
    if (intro && performance.now() - intro.at < 1500 && !renderState.banner) return;
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
      // A white collar outside the amber ring, so the marker separates cleanly
      // from a player it happens to sit near.
      ctx.lineWidth = 7;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, r + 2.5, 0, Math.PI * 2);
      ctx.stroke();
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
    // Hug the top edge: this is a transient title, and lower down it can sit
    // over an A/B/C marker the player is trying to read.
    roundRectPath(ctx, 550 - w / 2, 18, w, 44, 14);
    ctx.fillStyle = "rgba(15, 42, 74, 0.82)";
    ctx.fill();
    ctx.fillStyle = "#ffd76a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i.text, 550, 40);
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
    applyCamera();

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

    // You — hidden while choosing. Before an answer you aren't anywhere yet, and
    // a stray token parked mid-ice reads as another player and clutters the read.
    if (!choice.active) {
      controlled.forEach(p => drawSkater(p, { ...teamStyle(), isYou: true }, t));
    }

    drawPuckCarrier(t);
    drawPuck(t);
    drawEffects(t);
    drawChoices(t);
    drawParticles();

    ctx.restore();

    // Screen-space overlays — these should not scale or pan with the camera.
    ctx.save();
    ctx.translate(shx, shy);
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
    updateCamera();
    draw(t);
    requestAnimationFrame(tick);
  }

  // --- Input (drag + choice taps)
  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const isTouch = evt.touches && evt.touches.length;
    const clientX = isTouch ? evt.touches[0].clientX : evt.clientX;
    const clientY = isTouch ? evt.touches[0].clientY : evt.clientY;
    // Canvas pixels, then back through the camera transform into rink coords.
    return screenToWorld(
      (clientX - rect.left) * (canvas.width / rect.width),
      (clientY - rect.top) * (canvas.height / rect.height)
    );
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
    getCamera: () => ({ ...camera }),
    gradeAt: (role, x, y) => gradePlacement(role, { x, y }, scenario),
    outcomeFor: (grade) => outcomeFor(grade),
    readRadiusFt: () => readRadiusFt(),
    choose: (opt) => chooseOption(opt),
    // Build a sim script without running it, so every pass can be audited.
    simScriptFor: (grade, optIndex) => {
      const opts = choice.options;
      const opt = opts[optIndex] || opts[0];
      if (!opt) return null;
      const you = controlled[0];
      const saved = { x: you.x, y: you.y };
      you.x = opt.pos.x; you.y = opt.pos.y;
      const script = buildSimScript(grade === "best" ? "great" : grade === "acceptable" ? "good" : "bad", you, "audit");
      const startPoss = scenario.carrier === "opp" ? "them" : "us";
      you.x = saved.x; you.y = saved.y;
      /* Distinguish a PASS (the puck travels alone) from a CARRY (a player
         skates with it). A centre carrying the puck up the middle on a breakout
         is normal hockey; passing it through there is not. */
      const out = script.map(st => {
        const movers = st.movers || [];
        const puckMove = movers.find(m => m.obj === puck);
        const playerDests = movers.filter(m => m.obj !== puck).map(m => m.to);
        const carried = !!puckMove && playerDests.some(d =>
          d && Math.hypot(d.x - puckMove.to.x, d.y - puckMove.to.y) < 6);
        return {
          puckTo: puckMove ? { ...puckMove.to } : null,
          carried,
          poss: st.poss || null,
          dests: movers.map(m => ({ to: m.to || null })),
          banner: st.banner ? st.banner.text : null,
        };
      });
      out.startPoss = startPoss;
      return out;
    },
    // What the player is told about possession on this play.
    puckState: () => {
      const f = findPuckCarrier();
      return f
        ? { label: "HAS PUCK", role: f.player.role, dist: Math.round(f.dist) }
        : { label: "LOOSE PUCK", role: null, dist: null };
    },
    // Rink coords -> canvas pixels, so tests can tap where a thing is drawn.
    worldToScreen: (x, y) => ({
      x: (x - camera.x) * camera.scale + canvas.width / 2,
      y: (y - camera.y) * camera.scale + canvas.height / 2
    }),
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
