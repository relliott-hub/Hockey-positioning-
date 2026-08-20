/* The hockey.

   Every position here is in FEET on a regulation sheet (see rink.js), and every
   read is authored rather than generated. That matters: the previous version
   built wrong answers by pushing a marker away from the right one, which meant
   a third of them were perfectly defensible hockey being marked incorrect.

   Each role gets three tiers:
     best       — the read we're teaching. Full marks.
     acceptable — a read that genuinely works, but is second choice. Partial
                  marks, and the coach explains what the better option gives you.
     wrong      — a real positioning mistake, with the reason it's a mistake.

   Principles these are built on (Hockey Canada / USA Hockey age-appropriate
   positioning):
     · Support the puck — give the carrier options in more than one lane
     · Stay above the puck defensively — don't get caught below it
     · Protect the middle — the slot is the most dangerous ice on the sheet
     · Separate your lanes — two players on one wall is one checker's job
     · Never cut across the front of your own net with the puck coming out
     · Weak side matters — someone has to be there when it swings

   `why` strings are written to be read aloud to a 10-year-old.
*/
window.HIQ = window.HIQ || {};

// Handy landmarks in feet, so the numbers below read like a coach's whiteboard.
const MID = 42.5;          // centre of the ice, top-to-bottom
const NEAR_BOARDS = 73;    // ~12 ft off the near boards
const FAR_BOARDS = 12;     // ~12 ft off the far boards

HIQ.PLAYS = [
  /* ------------------------------------------------------------------ */
  {
    id: "breakout_corner_pressure",
    phase: "Breakout",
    name: "Breakout under pressure",
    situation:
      "Your defenceman has retrieved the puck in the corner, below your own goal " +
      "line, with a forechecker closing. The team needs to get out of the zone.",
    // Claims the words make about the ice — checked automatically.
    claims: { puck: ["belowGoalLine", "inCorner"] },
    attackDir: "right",
    ourNet: "left",
    puck: { x: 8, y: 73 },
    carrier: "LD",
    players: {
      LD: { x: 8, y: 73 },
      RD: { x: 16, y: 34 },
      C:  { x: 26, y: 56 },
      LW: { x: 33, y: 75 },
      RW: { x: 58, y: 24 },
    },
    opponents: [
      { x: 14, y: 68, label: "F1" },
      { x: 26, y: 62, label: "F2" },
      { x: 44, y: 44, label: "F3" },
      { x: 62, y: 66, label: "D1" },
      { x: 66, y: 26, label: "D2" },
    ],
    reads: {
      LW: {
        best: { x: 33, y: 75, why: "On the wall at the hash marks. It's a short, safe pass up the boards and you're already facing up the ice." },
        acceptable: [
          { x: 50, y: 77, why: "Still an outlet on the wall, and it works — but it's a longer pass under pressure, and if your D gets hemmed in you're too far away to help." },
        ],
        wrong: [
          { x: 14, y: 74, why: "You dropped into the corner with your own D. Now one forechecker covers both of you and there's nobody to pass to." },
          { x: 24, y: 44, why: "Never cut across the front of your own net on a breakout. A turnover there goes straight in." },
        ],
      },
      C: {
        best: { x: 26, y: 56, why: "Swing low through the middle. You're the closest option, you're moving with speed, and you can take it either way." },
        acceptable: [
          { x: 44, y: 48, why: "You're an option in the middle lane and that can work — but you're further from the puck, so it's a harder pass with a forechecker on your D." },
        ],
        wrong: [
          { x: 33, y: 73, why: "You went to the same wall as your winger. Two players in one lane means one checker covers both." },
          { x: 72, y: 44, why: "You've left the zone early. Your D has no short option and has to dump it away." },
        ],
      },
      RW: {
        best: { x: 58, y: 24, why: "Wide on the weak side with speed. You stretch their coverage and you're ready to take a pass going forward." },
        acceptable: [
          { x: 52, y: 44, why: "Middle-lane support does give your team an option — but the middle is crowded here, and that pass gets picked off more often than the wide one." },
        ],
        wrong: [
          { x: 20, y: 62, why: "You collapsed all the way back to the puck. Now everyone is below it and there's nobody to break out to." },
          { x: 80, y: 18, why: "Too far ahead. The pass can't reach you and you've taken yourself out of the play." },
        ],
      },
      RD: {
        best: { x: 16, y: 34, why: "On the other side of the net for the D-to-D. If the strong side is jammed, this is the safe reset." },
        acceptable: [
          { x: 28, y: 24, why: "You're available for a pass and that's fine — but a little higher means a longer pass, and you can't get back as quickly if it's lost." },
        ],
        wrong: [
          { x: 58, y: 30, why: "You left up the ice before the puck did. If it's turned over there's only one defender back." },
          { x: 10, y: 62, why: "Both defencemen on the same side of the net. The whole weak side is open now." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "dzone_halfwall_coverage",
    phase: "Defend",
    name: "Defending the half-wall",
    situation:
      "The other team has the puck on the half-wall in your end, with both their " +
      "defencemen up at your blue line. They're looking for a play to the slot.",
    claims: { puck: ["onHalfWall"], opponentDAtBlueLine: true },
    attackDir: "left",
    ourNet: "left",
    isDefense: true,
    puck: { x: 30, y: 76 },
    carrier: "opp",
    players: {
      LD: { x: 23, y: 64 },
      RD: { x: 18, y: 44 },
      C:  { x: 26, y: 52 },
      LW: { x: 72, y: 68 },
      RW: { x: 72, y: 24 },
    },
    opponents: [
      { x: 30, y: 76, label: "O1" },
      { x: 19, y: 50, label: "O2" },
      { x: 16, y: 66, label: "O3" },
      { x: 73, y: 64, label: "D1" },
      { x: 73, y: 26, label: "D2" },
    ],
    reads: {
      LD: {
        best: { x: 23, y: 64, why: "Between the puck and the net, tight to their winger. You take away the pass to the slot without diving out at the puck." },
        acceptable: [
          { x: 28, y: 71, why: "Pressuring the puck carrier can work if you're sure you'll win it — but if you miss, you've opened the slot behind you." },
        ],
        wrong: [
          { x: 34, y: 80, why: "You chased all the way to the boards. One pass to the middle and nobody is home." },
          { x: 12, y: 40, why: "You drifted behind your own net. You're not defending anything from back there." },
        ],
      },
      RD: {
        best: { x: 18, y: 44, why: "Net-front on the weak side. The most dangerous player is the one nobody sees backdoor — that's yours." },
        acceptable: [
          { x: 23, y: 51, why: "You're still protecting the middle, which is the right idea — but stepping off the net-front gives their backdoor player a free look." },
        ],
        wrong: [
          { x: 30, y: 70, why: "Both defencemen went to the puck. The front of your net is now completely empty." },
          { x: 48, y: 32, why: "You're too high. You've left the house, and everything dangerous happens below you." },
        ],
      },
      C: {
        best: { x: 26, y: 52, why: "In the slot, stick in the passing lane. You're the one who takes away the middle so your D can stay home." },
        acceptable: [
          { x: 24, y: 62, why: "Helping down low on the puck side is defensible — but the moment you leave the slot, someone has to fill it, and usually nobody does." },
        ],
        wrong: [
          { x: 34, y: 74, why: "You went to the wall to double up. That's your winger's job, and now the middle is wide open." },
          { x: 56, y: 46, why: "You're above the circles waiting for offence. Defend first — you're the last one back in the middle." },
        ],
      },
      LW: {
        best: { x: 72, y: 68, why: "Up on their defenceman at the blue line, on the puck side. You block the shot lane and you're first on the puck if it comes to you." },
        acceptable: [
          { x: 60, y: 70, why: "Sagging toward the wall keeps you closer to the play — but you've given their point man time and space to walk in and shoot." },
        ],
        wrong: [
          { x: 28, y: 72, why: "You collapsed all the way down to the puck. Three of you on one player and their point is uncovered." },
          { x: 92, y: 60, why: "You're already heading up the ice for offence. The puck isn't yours yet." },
        ],
      },
      RW: {
        best: { x: 72, y: 24, why: "Weak-side point at the blue line. When they swing it across, you have to be there — that pass is their best chance to score." },
        acceptable: [
          { x: 60, y: 32, why: "Sliding toward the middle helps clog the slot, and that's not a bad instinct — but it gives their weak-side point a clean look." },
        ],
        wrong: [
          { x: 30, y: 66, why: "You crossed to the puck side. The whole weak side is now open for the cross-ice pass." },
          { x: 92, y: 20, why: "You've left the zone waiting for a breakout. Your team is defending a man short." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "ozone_cycle_support",
    phase: "O-zone",
    name: "Supporting the cycle",
    situation:
      "Your winger has the puck in the corner below their goal line and is " +
      "protecting it on the wall. Keep possession and create a scoring chance.",
    claims: { puck: ["belowGoalLine", "inCorner"], ourDAtBlueLine: true },
    attackDir: "right",
    ourNet: "left",
    puck: { x: 195, y: 73 },
    carrier: "RW",
    players: {
      RW: { x: 195, y: 73 },
      C:  { x: 178, y: 68 },
      LW: { x: 184, y: 45 },
      RD: { x: 128, y: 60 },
      LD: { x: 128, y: 28 },
    },
    opponents: [
      { x: 191, y: 69, label: "D1" },
      { x: 184, y: 40, label: "D2" },
      { x: 172, y: 50, label: "F1" },
      { x: 131, y: 58, label: "F2" },
      { x: 131, y: 30, label: "F3" },
    ],
    reads: {
      C: {
        best: { x: 178, y: 68, why: "Low support on the wall side. Your winger can bump it back to you, and you're facing the net when you get it." },
        acceptable: [
          { x: 172, y: 54, why: "The high slot is a real option and a dangerous place to shoot from — but you're a longer pass away, and there's a defender in between." },
        ],
        wrong: [
          { x: 192, y: 66, why: "You went right to the puck. Now two of you are in the same corner and one defender covers both." },
          { x: 152, y: 46, why: "You're too high. The cycle has no low support and the puck comes straight back out." },
        ],
      },
      LW: {
        best: { x: 184, y: 45, why: "Net-front on the far post. Most goals from a cycle come from someone standing right there." },
        acceptable: [
          { x: 176, y: 34, why: "Weak-side support gives an outlet and it works — but nobody is at the net, and that's where the puck ends up." },
        ],
        wrong: [
          { x: 192, y: 64, why: "You joined the puck battle in the corner. Two players down there and nobody in front of the net." },
          { x: 140, y: 26, why: "You've drifted out to the point. That's your defenceman's job and you've left the net empty." },
        ],
      },
      RD: {
        best: { x: 128, y: 60, why: "At the point on the puck side, just inside the blue line. You keep the puck in if it comes up the wall, and you're a shot option." },
        acceptable: [
          { x: 150, y: 70, why: "Pinching down the wall can create a chance — but if you miss it, their winger is gone the other way and you're the one who has to catch him." },
        ],
        wrong: [
          { x: 186, y: 68, why: "You went all the way down to the corner. If they win the puck it's a two-on-one going the other way." },
          { x: 112, y: 55, why: "You've backed off past the blue line. The puck comes out and the zone is over." },
        ],
      },
      LD: {
        best: { x: 128, y: 28, why: "Weak-side point, ready to keep it in. When the puck swings across, you're the one who gets the shot." },
        acceptable: [
          { x: 133, y: 40, why: "Sliding to the middle gives you a better shot angle — but you've left the weak-side boards, and that's where the puck escapes." },
        ],
        wrong: [
          { x: 172, y: 44, why: "You dropped into the slot. Both defencemen are now well inside the zone with nobody guarding the blue line." },
          { x: 102, y: 30, why: "You're back at centre already. The puck comes out easily and the cycle is wasted." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "rush_three_on_two",
    phase: "Rush",
    name: "Three on two",
    situation:
      "Your centre is carrying the puck through the neutral zone with numbers. " +
      "Two defenders are back and their forwards are behind the play.",
    claims: { puck: ["inNeutralZone"] },
    attackDir: "right",
    ourNet: "left",
    puck: { x: 98, y: 42 },
    carrier: "C",
    players: {
      C:  { x: 98, y: 42 },
      RW: { x: 104, y: 66 },
      LW: { x: 104, y: 20 },
      RD: { x: 84, y: 50 },
      LD: { x: 84, y: 34 },
    },
    opponents: [
      { x: 130, y: 52, label: "D1" },
      { x: 130, y: 33, label: "D2" },
      { x: 86, y: 56, label: "F1" },
      { x: 78, y: 28, label: "F2" },
      { x: 74, y: 44, label: "F3" },
    ],
    reads: {
      RW: {
        best: { x: 112, y: 70, why: "Wide and driving. Staying wide keeps their defenceman honest and opens the middle for your centre." },
        acceptable: [
          { x: 122, y: 58, why: "Cutting toward the net is a real option and can score — but go too early and their D just steps into you, and the lane closes." },
        ],
        wrong: [
          { x: 104, y: 46, why: "You cut into the middle beside your centre. Now one defender covers both of you." },
          { x: 88, y: 62, why: "You're behind the puck. On a rush you can't help from back there — the numbers advantage is gone." },
        ],
      },
      LW: {
        best: { x: 112, y: 16, why: "Wide on the far side, staying onside. You stretch the two defenders apart and you're the far-post option." },
        acceptable: [
          { x: 118, y: 28, why: "Angling toward the net gets you to a scoring area — but you've come closer to their defenceman, so the cross-ice pass is tighter." },
        ],
        wrong: [
          { x: 131, y: 20, why: "You've gone past their blue line ahead of the puck. That's offside and the whole rush comes back." },
          { x: 98, y: 34, why: "You drifted into the middle with your centre. Three players in one lane and their two D have an easy job." },
        ],
      },
      RD: {
        best: { x: 88, y: 52, why: "Trailing behind the rush. If it comes back to the point you're the late option — and you're back if it turns over." },
        acceptable: [
          { x: 104, y: 58, why: "Joining the rush as a fourth attacker can absolutely create a chance — just know that if they get it, you're the one caught." },
        ],
        wrong: [
          { x: 126, y: 62, why: "You've charged all the way in. If they break it out, it's an odd-man rush going the other way." },
          { x: 62, y: 50, why: "You've stopped at your own blue line. You're not supporting anything from there." },
        ],
      },
      LD: {
        best: { x: 84, y: 34, why: "Back and in the middle. Someone has to be the last man, and on a three-on-two that's you." },
        acceptable: [
          { x: 96, y: 28, why: "Following the play up gives your team another option — but you're the safety valve here, and stepping up costs you a step if it comes back." },
        ],
        wrong: [
          { x: 120, y: 28, why: "You're up with the forwards. Nobody is home and their counter-attack has open ice." },
          { x: 84, y: 68, why: "You've drifted to the same side as your partner. The whole middle of the ice is unguarded." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "dzone_corner_battle",
    phase: "Defend",
    name: "Puck in your corner",
    situation:
      "The other team has the puck deep in your corner, below your goal line, " +
      "and is trying to get it to the front of the net. Protect the house.",
    claims: { puck: ["belowGoalLine", "inCorner"], opponentDAtBlueLine: true },
    attackDir: "left",
    ourNet: "left",
    isDefense: true,
    puck: { x: 6, y: 71 },
    carrier: "opp",
    players: {
      LD: { x: 11, y: 68 },
      RD: { x: 17, y: 45 },
      C:  { x: 24, y: 57 },
      LW: { x: 72, y: 66 },
      RW: { x: 72, y: 25 },
    },
    opponents: [
      { x: 6, y: 71, label: "O1" },
      { x: 18, y: 50, label: "O2" },
      { x: 16, y: 62, label: "O3" },
      { x: 73, y: 62, label: "D1" },
      { x: 73, y: 27, label: "D2" },
    ],
    reads: {
      LD: {
        best: { x: 11, y: 68, why: "On the puck carrier, body between them and the net. Win the battle or at least keep them on the outside." },
        acceptable: [
          { x: 14, y: 75, why: "Angling them deeper into the corner is sound — you just have to be certain you're not getting beaten back to the net." },
        ],
        wrong: [
          { x: 17, y: 46, why: "You've left the battle and gone to the net. Now they walk out of the corner untouched." },
          { x: 44, y: 66, why: "You're up above the circles. Everything dangerous is happening behind you." },
        ],
      },
      RD: {
        best: { x: 17, y: 45, why: "Net-front, stick on their forward. This is the spot where goals are scored — you own it." },
        acceptable: [
          { x: 22, y: 53, why: "Helping toward the slot still protects the middle — but move any further and their net-front player is alone at the post." },
        ],
        wrong: [
          { x: 10, y: 69, why: "Both defencemen in the corner. Nobody is guarding the front of your own net." },
          { x: 46, y: 44, why: "You've gone up to the blue line looking for offence. Your net is undefended." },
        ],
      },
      C: {
        best: { x: 24, y: 57, why: "Low support in the slot, ready to jump on a loose puck. You're the link between the corner and the front of the net." },
        acceptable: [
          { x: 16, y: 64, why: "Going to help in the corner is honest hockey — but that's your D's battle, and when you leave, the slot is empty." },
        ],
        wrong: [
          { x: 52, y: 46, why: "You're waiting up high for a breakout pass. Defend first — you're the third man low." },
          { x: 8, y: 76, why: "Three of your players are now in one corner and there is nobody in front of your net." },
        ],
      },
      LW: {
        best: { x: 72, y: 66, why: "Up on their point man at the blue line. Take away the shot and be ready to block it." },
        acceptable: [
          { x: 58, y: 68, why: "Coming down the wall keeps you nearer the puck — but their defenceman now has time to step in and shoot." },
        ],
        wrong: [
          { x: 14, y: 66, why: "You've dropped into the corner too. Three players in one battle and their points are both free." },
          { x: 92, y: 58, why: "You've already left the zone. Your team is defending a man short." },
        ],
      },
      RW: {
        best: { x: 72, y: 25, why: "Weak-side point at the blue line. When it comes across, that's the most dangerous shot on the ice — and it's yours to stop." },
        acceptable: [
          { x: 58, y: 33, why: "Cheating toward the middle helps clog the slot — but their weak-side D now gets a clean shot with a screen." },
        ],
        wrong: [
          { x: 26, y: 62, why: "You've crossed to the puck side. The whole weak side is wide open for a one-timer." },
          { x: 92, y: 22, why: "You're up ice waiting for a pass. That's five-on-four for them." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "nz_regroup",
    phase: "Rush",
    name: "Neutral-zone regroup",
    situation:
      "Your defenceman has the puck in the neutral zone and the team is regrouping " +
      "to attack with speed instead of dumping it in.",
    claims: { puck: ["inNeutralZone"] },
    attackDir: "right",
    ourNet: "left",
    puck: { x: 88, y: 30 },
    carrier: "RD",
    players: {
      RD: { x: 88, y: 30 },
      LD: { x: 82, y: 56 },
      C:  { x: 98, y: 44 },
      RW: { x: 108, y: 70 },
      LW: { x: 108, y: 16 },
    },
    opponents: [
      { x: 100, y: 34, label: "F1" },
      { x: 110, y: 56, label: "F2" },
      { x: 112, y: 22, label: "F3" },
      { x: 128, y: 52, label: "D1" },
      { x: 128, y: 32, label: "D2" },
    ],
    reads: {
      C: {
        best: { x: 98, y: 44, why: "Middle lane, curling with speed. You're the outlet who turns a regroup into a rush." },
        acceptable: [
          { x: 92, y: 36, why: "Coming closer to your D gives an easy pass — but you'll receive it standing still, and a regroup is all about speed." },
        ],
        wrong: [
          { x: 90, y: 28, why: "You're right on top of your defenceman. One forechecker takes you both." },
          { x: 122, y: 44, why: "You're too far ahead. The pass has to go through both their defencemen to reach you." },
        ],
      },
      RW: {
        best: { x: 108, y: 70, why: "Wide and building speed. You give a target up the boards and you hit the blue line flying." },
        acceptable: [
          { x: 98, y: 62, why: "Coming back to support is a safe option — but you lose your speed, and you'll be entering the zone from a standstill." },
        ],
        wrong: [
          { x: 131, y: 68, why: "You're past their blue line before the puck. That's offside and the play is dead." },
          { x: 96, y: 46, why: "You've come into the middle where your centre already is. Two players, one lane, one checker." },
        ],
      },
      LW: {
        best: { x: 108, y: 16, why: "Wide on the far side with speed. If they overload the puck side, you're the one with open ice." },
        acceptable: [
          { x: 100, y: 30, why: "Middle support does give another option — but the middle already has your centre, and the far wall is where the space is." },
        ],
        wrong: [
          { x: 84, y: 24, why: "You've come all the way back to the puck. Now nobody is ahead of it to attack with." },
          { x: 131, y: 18, why: "You're offside waiting at their blue line. Whistle, and the regroup was for nothing." },
        ],
      },
      LD: {
        best: { x: 82, y: 56, why: "Available for the D-to-D on the other side. If the forecheck takes away one side, you're the reset." },
        acceptable: [
          { x: 88, y: 48, why: "Closer support makes the pass easier — but the tighter you are to your partner, the easier it is for one forechecker to take you both." },
        ],
        wrong: [
          { x: 112, y: 52, why: "You've joined the rush ahead of the puck. If it's lost here, they're going the other way with numbers." },
          { x: 64, y: 46, why: "You've retreated into your own zone. Your partner has no support and has to throw it away." },
        ],
      },
    },
  },
];

/* Variation that cannot corrupt the hockey.

   A handful of authored plays would be memorised in a sitting, but the previous
   approach — jittering the puck while the support spots only partly followed —
   is what broke possession and made reads inconsistent. So only two transforms
   are allowed here, and both preserve every relationship in the play exactly:

     · mirror across centre ice (the same play off the other wing)
     · shift the whole picture together by a few feet

   Everything moves as one: puck, players, opponents, and every authored read.
   The tactical picture is identical; only its place on the sheet changes. */
HIQ.varyPlay = function (play, opts = {}) {
  const R = HIQ.RINK;
  const SWAP = { LW: "RW", RW: "LW", LD: "RD", RD: "LD", C: "C" };
  const mirror = opts.mirror ?? (Math.random() < 0.5);
  const jitter = opts.jitter ?? 5;
  const dx = (Math.random() * 2 - 1) * jitter;
  const dy = (Math.random() * 2 - 1) * jitter;

  // Keep the shifted play on the ice; if it would run off, don't shift that way.
  const all = [play.puck, ...Object.values(play.players), ...play.opponents];
  for (const r of Object.values(play.reads)) {
    all.push(r.best, ...(r.acceptable || []), ...(r.wrong || []));
  }
  const ys = all.map(p => (mirror ? R.width - p.y : p.y));
  const xs = all.map(p => p.x);
  const okDx = Math.max(-Math.min(...xs) + 3, Math.min(dx, R.length - 3 - Math.max(...xs)));
  const okDy = Math.max(-Math.min(...ys) + 3, Math.min(dy, R.width - 3 - Math.max(...ys)));

  const t = (p) => ({ ...p, x: p.x + okDx, y: (mirror ? R.width - p.y : p.y) + okDy });

  const out = {
    ...play,
    mirrored: mirror,
    puck: t(play.puck),
    players: {},
    opponents: play.opponents.map(o => ({ ...t(o), label: o.label })),
    reads: {},
    carrier: mirror ? (SWAP[play.carrier] || play.carrier) : play.carrier,
  };
  for (const [role, pt] of Object.entries(play.players)) {
    out.players[mirror ? (SWAP[role] || role) : role] = t(pt);
  }
  for (const [role, r] of Object.entries(play.reads)) {
    out.reads[mirror ? (SWAP[role] || role) : role] = {
      best: t(r.best),
      acceptable: (r.acceptable || []).map(t),
      wrong: (r.wrong || []).map(t),
    };
  }
  return out;
};

/* Convert an authored play (feet) into the canvas-pixel shape the engine draws.
   One uniform scale, so distances stay honest in both directions. */
HIQ.playToPixels = function (play) {
  const V = HIQ.VIEW;
  const p = (pt) => ({ x: V.x(pt.x), y: V.y(pt.y) });
  const out = {
    id: play.id,
    phase: play.phase,
    name: play.name,
    situation: play.situation,
    attackDir: play.attackDir,
    isDefense: !!play.isDefense,
    carrier: play.carrier,
    puck: p(play.puck),
    players: {},
    opponents: play.opponents.map(o => ({ ...p(o), label: o.label })),
    reads: {},
  };
  for (const [role, pt] of Object.entries(play.players)) out.players[role] = p(pt);
  for (const [role, r] of Object.entries(play.reads)) {
    out.reads[role] = {
      best: { ...p(r.best), why: r.best.why },
      acceptable: (r.acceptable || []).map(a => ({ ...p(a), why: a.why })),
      wrong: (r.wrong || []).map(w => ({ ...p(w), why: w.why })),
    };
  }
  return out;
};
