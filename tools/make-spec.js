#!/usr/bin/env node
/* Generates docs/SCENARIO-SPEC.md — the coach review document.

   Everything the game claims about hockey, written out in plain language with
   positions in feet, so it can be checked by someone who knows the sport
   without reading any code.

   Usage: node tools/make-spec.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
// In a browser `window` IS the global, so `window.HIQ = …` also defines `HIQ`.
// Mirror that here or the game's own files won't load.
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ["rink", "plays"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", `${f}.js`), "utf8"), sandbox);
}
const HIQ = sandbox.window.HIQ;
const R = HIQ.RINK;

// Describe a point the way a coach would, not as coordinates.
function describe(p, play) {
  const ourNet = play.ourNet === "left" ? R.goalLineLeft : R.goalLineRight;
  const towardOurNet = play.ourNet === "left";
  const fromOurGoalLine = towardOurNet ? p.x - ourNet : ourNet - p.x;
  const fromMid = p.y - R.midY;

  let zone;
  if (fromOurGoalLine < 0) zone = "behind your own net";
  else if (fromOurGoalLine < 64) zone = "in your defensive zone";
  else if (fromOurGoalLine < 114) zone = "in the neutral zone";
  else zone = "in the offensive zone";

  const side = Math.abs(fromMid) < 7 ? "in the middle of the ice"
    : Math.abs(fromMid) > 30 ? `tight to the ${fromMid > 0 ? "near" : "far"} boards`
    : `toward the ${fromMid > 0 ? "near" : "far"} side`;

  return `${zone}, ${side} (${Math.round(p.x)} ft from the end boards, ${Math.round(Math.abs(fromMid))} ft ${fromMid >= 0 ? "near" : "far"} of centre)`;
}

const lines = [];
const w = (s = "") => lines.push(s);

w("# Scenario Spec — for coach review");
w();
w("Every claim this game makes about hockey positioning, in plain language.");
w("Positions are in feet on a regulation 200 × 85 ft sheet.");
w();
w("**What to check:**");
w();
w("1. Would this situation actually happen in a game?");
w("2. Is the **best** read the one you would teach?");
w("3. Is each **acceptable** read genuinely defensible — something you would not correct a player for?");
w("4. Is each **wrong** read a real mistake, and is the reason given the right reason?");
w();
w("Anything you disagree with, mark it and it gets changed. The game grades");
w("strictly against what is written here, so this document *is* the hockey.");
w();
w("---");
w();

w("## The ice");
w();
w("| Feature | This game | Regulation |");
w("|---|---|---|");
w(`| Length | ${R.length} ft | 200 ft |`);
w(`| Width | ${R.width} ft | 85 ft |`);
w(`| Goal line from end boards | ${R.goalLine} ft | 11 ft |`);
w(`| Blue line from end boards | ${R.blueLine} ft | 75 ft |`);
w(`| Neutral zone | ${R.length - 2 * R.blueLine} ft | 50 ft |`);
w(`| Faceoff circle radius | ${R.faceoffCircleR} ft | 15 ft |`);
w(`| End dot from goal line | ${R.endDotFromGoalLine} ft | 20 ft |`);
w(`| End dot from centre | ${R.dotFromCentreY} ft | 22 ft |`);
w(`| Crease radius | ${R.creaseR} ft | 6 ft |`);
w();
w("One foot means the same distance in every direction, so a spacing judgement");
w("across the ice is measured the same way as one up the ice.");
w();
w("---");
w();

w("## The principles being taught");
w();
w("Every read below is tagged with the idea underneath it. The game names the");
w("principle when it gives feedback, and the coach report shows which ones a");
w("player has absorbed and which keep costing them — because the idea is what");
w("transfers to a real game, not the picture.");
w();
w("| Principle | What a kid is told |");
w("|---|---|");
for (const [, d] of Object.entries(HIQ.PRINCIPLES)) w(`| **${d.name}** | ${d.kid} |`);
w();
w("---");
w();

w("## Plays");
w();
w(`${HIQ.PLAYS.length} scenarios. Special teams are not yet re-authored and are disabled in the game.`);
w();

for (const play of HIQ.PLAYS) {
  w(`### ${play.name}`);
  w();
  w(`*${play.phase} · \`${play.id}\`*`);
  w();
  w(play.situation);
  w();
  w(`**Puck:** ${describe(play.puck, play)}  `);
  w(`**Carried by:** ${play.carrier === "opp" ? "an opponent" : play.carrier}  `);
  w(`**Attacking:** ${play.attackDir === "right" ? "left to right" : "right to left"}`);
  w();
  w("**Starting positions**");
  w();
  w("| Player | Where |");
  w("|---|---|");
  for (const [role, p] of Object.entries(play.players)) {
    w(`| ${role}${play.carrier === role ? " *(has the puck)*" : ""} | ${describe(p, play)} |`);
  }
  w();

  for (const [role, r] of Object.entries(play.reads)) {
    w(`#### Playing ${role}`);
    w();
    const pr = (o) => {
      const d = HIQ.PRINCIPLES[o.principle];
      return d ? `  *(${d.name})*` : "";
    };
    w(`**Best read** — ${describe(r.best, play)}${pr(r.best)}`);
    w();
    w(`> ${r.best.why}`);
    w();
    if (r.acceptable && r.acceptable.length) {
      w("**Also acceptable** *(partial credit — works, but not first choice)*");
      w();
      for (const a of r.acceptable) {
        w(`- ${describe(a, play)}${pr(a)}`);
        w(`  > ${a.why}`);
      }
      w();
    }
    if (r.wrong && r.wrong.length) {
      w("**Mistakes**");
      w();
      for (const x of r.wrong) {
        w(`- ${describe(x, play)}${pr(x)}`);
        w(`  > ${x.why}`);
      }
      w();
    }
  }
  w("---");
  w();
}

w("## How a choice is graded");
w();
w("A player's placement is judged by **which written read it is nearest to** —");
w("not by any geometric rule. That is deliberate: the previous version scored");
w("positions with distance formulas, and an audit found **35% of the answers it");
w("marked wrong broke none of its own coaching rules**. Every option a player");
w("sees now comes from this document.");
w();
w("| Tier | Score | What the player is told |");
w("|---|---|---|");
w("| Best | 92–100 | The read succeeded, plus the reason it's right |");
w("| Acceptable | 68–78 | \"That works\" — plus what the stronger read gives you |");
w("| Wrong | 8–38 | The specific mistake, and where they wanted to be |");
w();
w("## How outcomes are decided");
w();
w("Position improves the odds; it does not decide the result.");
w();
w("| Read | Goal | Play stays alive | Lost possession | Goal against |");
w("|---|---|---|---|---|");
w("| Best | 62% | 38% | — | — |");
w("| Acceptable | 24% | 62% | 14% | — |");
w("| Wrong | — | — | 72% | 28% |");
w();
w("A good read creating a goal every single time would teach that being in the");
w("right place guarantees the result, which is not true of the sport.");
w();

const outPath = path.join(root, "docs", "SCENARIO-SPEC.md");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"));

const roles = HIQ.PLAYS.reduce((a, p) => a + Object.keys(p.reads).length, 0);
const reads = HIQ.PLAYS.reduce((a, p) =>
  a + Object.values(p.reads).reduce((b, r) => b + 1 + r.acceptable.length + r.wrong.length, 0), 0);
console.log(`built ${outPath}`);
console.log(`  ${HIQ.PLAYS.length} plays, ${roles} coached positions, ${reads} authored reads`);
