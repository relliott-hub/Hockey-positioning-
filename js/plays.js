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
      C: { x: 26, y: 56 },
      LW: { x: 33, y: 75 },
      RW: { x: 58, y: 22 },
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
        best: { x: 33, y: 75, why: "Get to the wall at the hash marks. Short, safe pass up the boards, and you're already turned up the ice." },
        acceptable: [
          { x: 62, y: 76, why: "Stretching high up the wall is a real route and it beats the forecheck when it works \u2014 but it's a long pass under pressure, and if your D gets pinned you're too far away to help." },
        ],
        wrong: [
          { x: 12, y: 72, why: "You went down to the puck. Now two of you are in one corner, one checker covers both, and there's nobody to pass to." },
          { x: 22, y: 45, why: "Never cut across the front of your own net on a breakout. A turnover there goes straight in." },
        ],
      },
      C: {
        best: { x: 26, y: 56, why: "Swing low through the middle. Low and slow, supporting your D \u2014 you're the closest option and you get it moving forward." },
        acceptable: [
          { x: 50, y: 44, why: "Waiting high in the middle lane is a genuine option and it's quick up the ice \u2014 but it's a long pass with a forechecker on your D, and if it's picked off you're behind it." },
        ],
        wrong: [
          { x: 34, y: 74, why: "You went to the same wall as your winger. Two players in one lane is one checker's job." },
          { x: 76, y: 42, why: "You left the zone early. Your D has no short option and has to throw it away." },
        ],
      },
      RW: {
        best: { x: 58, y: 22, why: "Wide on the weak side, building speed. You stretch their coverage and you take the pass going forward." },
        acceptable: [
          { x: 40, y: 38, why: "Coming into the middle to support does give another option \u2014 but that's the crowded lane, and a pass through the middle of your own zone is the one that gets picked off." },
        ],
        wrong: [
          { x: 18, y: 62, why: "You collapsed all the way back to the puck. Everyone is below it now and there's nobody to break out to." },
          { x: 86, y: 16, why: "Too far ahead. The pass can't reach you and you've taken yourself out of the play." },
        ],
      },
      RD: {
        best: { x: 16, y: 34, why: "On the far side of the net for the D-to-D. If the strong side is jammed, this is the safe reset." },
        acceptable: [
          { x: 34, y: 20, why: "Going up the weak-side wall is a real breakout route \u2014 but it's a longer pass, and you can't get back as fast if it's lost." },
        ],
        wrong: [
          { x: 60, y: 30, why: "You left up the ice before the puck did. If it's turned over there's one defender back." },
          { x: 12, y: 62, why: "Both defencemen on the same side of the net. The entire weak side is open." },
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
      C: { x: 28, y: 50 },
      LW: { x: 72, y: 68 },
      RW: { x: 30, y: 34 },
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
        best: { x: 23, y: 64, why: "Between the puck and your net, tight to their winger. Stay on the defensive side \u2014 take the pass to the slot away without diving at the puck." },
        acceptable: [],
        wrong: [
          // Kept because it is the classic mistake for this position, even though
          // it sits close to the correct spot — free-drag mode still catches it,
          // and it is documented in the spec.
          { x: 34, y: 80, why: "You chased to the boards. One pass to the middle and nobody is home." },
          { x: 12, y: 40, why: "You drifted behind your own net. You're not defending anything from back there." },
          { x: 60, y: 70, why: "You went up to cover their point. That's your winger's job \u2014 and the winger you left just walked into the slot." },
        ],
      },
      RD: {
        best: { x: 18, y: 44, why: "Net-front, weak side. The most dangerous player is the one nobody sees at the back post \u2014 that's yours." },
        acceptable: [],
        wrong: [
          { x: 32, y: 68, why: "Drifting to the strong side is the most common mistake a young defenceman makes. The front of your net is now empty." },
          { x: 48, y: 32, why: "You're too high. You've left the house, and everything dangerous happens below you." },
        ],
      },
      C: {
        best: { x: 28, y: 50, why: "Second layer in the slot, stick in the passing lane. You take the middle away so your D can stay home." },
        acceptable: [
          { x: 16, y: 66, why: "Dropping low to back up your D is real hockey \u2014 it's your job if they get beaten out of the corner. Just know the slot is empty until you get back." },
        ],
        wrong: [
          { x: 34, y: 76, why: "You went to the wall to double up. That's your winger's job, and now the middle is wide open." },
          { x: 56, y: 44, why: "You're above the circles waiting for offence. Defend first \u2014 you're the last one back through the middle." },
        ],
      },
      LW: {
        best: { x: 72, y: 68, why: "Up on their defenceman at the blue line. Take away the pass to the point and be ready to block the shot." },
        acceptable: [],
        wrong: [
          { x: 34, y: 74, why: "You collapsed to the puck. Three of you on one player and their point is free to walk in." },
          { x: 94, y: 60, why: "You're already heading up the ice for offence. The puck isn't yours yet." },
        ],
      },
      RW: {
        best: { x: 30, y: 34, why: "Low slot on the weak side, watching their far defenceman. You're the one who takes away the backdoor play." },
        acceptable: [
          { x: 72, y: 24, why: "Going up to cover the weak point is how some teams play it, and it stops the cross-ice shot \u2014 but it leaves the low slot open, and that's the more dangerous ice." },
        ],
        wrong: [
          { x: 30, y: 66, why: "You crossed to the puck side. The whole weak side is open for the cross-ice pass." },
          { x: 92, y: 22, why: "You left the zone waiting for a breakout. Your team is defending a man short." },
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
      C: { x: 172, y: 64 },
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
        best: { x: 172, y: 64, why: "Low support on the wall side. Your winger can bump it back and you're facing the net when you get it." },
        acceptable: [
          { x: 166, y: 44, why: "The high slot is a dangerous place to shoot from and it's a real option \u2014 but it's a longer pass with a defender in between." },
        ],
        wrong: [
          { x: 192, y: 74, why: "You went right to the puck. Two of you in one corner and one defender covers both." },
          { x: 146, y: 48, why: "Too high. The cycle has no low support and the puck comes straight back out." },
        ],
      },
      LW: {
        best: { x: 184, y: 45, why: "Net-front at the far post. Most goals off a cycle come from someone standing exactly there." },
        acceptable: [
          { x: 168, y: 32, why: "Weak-side support gives an outlet and keeps possession \u2014 but nobody is at the net, and that's where the puck ends up." },
        ],
        wrong: [
          { x: 192, y: 68, why: "You joined the battle in the corner. Two players down there and the net-front is empty." },
          { x: 140, y: 30, why: "You drifted out to the point. That's your defenceman's job and the net is unguarded." },
        ],
      },
      RD: {
        best: { x: 128, y: 60, why: "At the point on the puck side, just inside the blue line. You keep it in and you're a shot option." },
        acceptable: [
          { x: 152, y: 72, why: "Pinching down the wall can keep the cycle alive \u2014 but miss it and their winger is gone the other way, and you're the one chasing." },
        ],
        wrong: [
          { x: 188, y: 70, why: "All the way to the corner. If they win it, it's a two-on-one going back." },
          { x: 108, y: 56, why: "You backed off past the blue line. The puck comes out and the zone is over." },
        ],
      },
      LD: {
        best: { x: 128, y: 28, why: "Weak-side point, ready to keep it in. When it swings across, you're the one who gets the shot." },
        acceptable: [
          { x: 134, y: 48, why: "Sliding to the middle gives a better shooting angle \u2014 but you've left the weak-side boards, and that's where the puck escapes." },
        ],
        wrong: [
          { x: 170, y: 44, why: "You dropped into the slot. Both defencemen are deep with nobody on the blue line." },
          { x: 100, y: 30, why: "Back at centre already. The puck comes out easily and the cycle is wasted." },
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
      C: { x: 98, y: 42 },
      RW: { x: 112, y: 70 },
      LW: { x: 112, y: 16 },
      RD: { x: 88, y: 52 },
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
        best: { x: 112, y: 70, why: "Wide and driving. Staying wide holds their defenceman and opens the middle for your centre." },
        acceptable: [
          { x: 128, y: 56, why: "Cutting to the net late is how these get finished \u2014 but go early and their D just steps into you and the lane shuts." },
        ],
        wrong: [
          { x: 104, y: 46, why: "You cut into the middle beside your centre. One defender now covers both of you." },
          { x: 88, y: 62, why: "You're behind the puck. You can't help from back there and the extra man is gone." },
        ],
      },
      LW: {
        best: { x: 112, y: 16, why: "Wide on the far side, staying onside. You pull the two defenders apart and you're the far-post option." },
        acceptable: [
          { x: 128, y: 30, why: "Angling toward the net gets you into a scoring area \u2014 but you've moved into their defenceman, so the cross-ice pass is tighter." },
        ],
        wrong: [
          { x: 132, y: 12, why: "You went past their blue line ahead of the puck. Offside, and the whole rush comes back." },
          { x: 100, y: 34, why: "You drifted into the middle with your centre. Three of you in one lane and their two D have an easy job." },
        ],
      },
      RD: {
        best: { x: 88, y: 52, why: "Trailing the rush. If it comes back you're the late option, and you're home if it turns over." },
        acceptable: [
          { x: 110, y: 62, why: "Jumping up as a fourth attacker absolutely creates chances \u2014 just know that if they get it, you're the one caught." },
        ],
        wrong: [
          { x: 128, y: 64, why: "You charged all the way in. If they break out, it's an odd-man rush the other way." },
          { x: 64, y: 50, why: "You stopped at your own blue line. You're not supporting anything from there." },
        ],
      },
      LD: {
        best: { x: 84, y: 34, why: "Back and in the middle. Someone is the last man on a three-on-two, and that's you." },
        acceptable: [
          { x: 104, y: 26, why: "Following the play up gives another option \u2014 but you're the safety valve here, and stepping up costs you a step if it comes back." },
        ],
        wrong: [
          { x: 120, y: 30, why: "You're up with the forwards. Nobody is home and their counter has open ice." },
          { x: 84, y: 62, why: "You drifted to your partner's side. The whole middle of the ice is unguarded." },
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
      C: { x: 27, y: 52 },
      LW: { x: 72, y: 66 },
      RW: { x: 30, y: 32 },
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
        best: { x: 11, y: 68, why: "On the puck carrier with your body between them and the net. Win it, or at least keep them on the outside." },
        acceptable: [],
        wrong: [
          { x: 18, y: 46, why: "You left the battle for the net. Now they walk out of the corner untouched." },
          { x: 40, y: 68, why: "You're above the circles. Everything dangerous is happening behind you." },
        ],
      },
      RD: {
        best: { x: 17, y: 45, why: "Net-front, stick on their forward. This is where goals get scored and it's yours to protect." },
        acceptable: [],
        wrong: [
          { x: 10, y: 68, why: "Both defencemen in the corner. Nobody is in front of your own net." },
          { x: 46, y: 44, why: "You went to the blue line looking for offence. Your net is undefended." },
        ],
      },
      C: {
        best: { x: 27, y: 52, why: "Low support in the slot, ready for a loose puck. You're the link between the corner and the front of the net." },
        acceptable: [
          { x: 12, y: 68, why: "Helping in the corner is your job if your D gets beaten \u2014 honest hockey, but the slot is empty while you're down there." },
        ],
        wrong: [
          { x: 54, y: 46, why: "You're waiting high for a breakout pass. Defend first \u2014 you're the third man low." },
          { x: 20, y: 34, why: "You slid across to the weak side. That's your winger's man, and now nobody is supporting the corner at all." },
        ],
      },
      LW: {
        best: { x: 72, y: 66, why: "Up on their point man at the blue line. Take the shot away and be ready to block it." },
        acceptable: [],
        wrong: [
          { x: 16, y: 68, why: "You dropped into the corner too. Three in one battle and both their points are free." },
          { x: 94, y: 58, why: "You already left the zone. Your team is defending a man short." },
        ],
      },
      RW: {
        best: { x: 30, y: 32, why: "Low slot on the weak side, watching their far defenceman. The backdoor tap-in is the one you stop." },
        acceptable: [
          { x: 72, y: 25, why: "Covering the weak point stops the cross-ice shot and some teams play it that way \u2014 but it leaves the low slot open, and that's more dangerous ice." },
        ],
        wrong: [
          { x: 24, y: 62, why: "You crossed to the puck side. The weak side is wide open for a one-timer." },
          { x: 92, y: 20, why: "You're up ice waiting for a pass. That's five-on-four for them." },
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
      C: { x: 98, y: 44 },
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
          { x: 78, y: 38, why: "Coming back low makes the pass easy and safe \u2014 but you'll take it standing still, and a regroup is all about hitting the line with speed." },
        ],
        wrong: [
          { x: 88, y: 26, why: "You're right on top of your defenceman. One forechecker takes you both." },
          { x: 122, y: 46, why: "Too far ahead. The pass has to beat both their defencemen to reach you." },
        ],
      },
      RW: {
        best: { x: 108, y: 70, why: "Wide and building speed. You give a target up the boards and hit the blue line flying." },
        acceptable: [
          { x: 92, y: 58, why: "Coming back to support is the safe option \u2014 but you lose your speed and enter the zone from a standstill." },
        ],
        wrong: [
          { x: 132, y: 68, why: "Past their blue line before the puck. Offside, and the play is dead." },
          { x: 98, y: 48, why: "You came into the middle where your centre already is. Two players, one lane, one checker." },
        ],
      },
      LW: {
        best: { x: 108, y: 16, why: "Wide on the far side with speed. If they overload the puck side, you're the one in open ice." },
        acceptable: [
          { x: 94, y: 32, why: "Middle support is another option \u2014 but your centre is already there, and the far wall is where the space is." },
        ],
        wrong: [
          { x: 84, y: 26, why: "You came all the way back to the puck. Now nobody is ahead of it to attack with." },
          { x: 132, y: 14, why: "Offside, waiting at their blue line. The regroup was for nothing." },
        ],
      },
      LD: {
        best: { x: 82, y: 56, why: "Available for the D-to-D on the far side. If the forecheck takes one side away, you're the reset." },
        acceptable: [
          { x: 94, y: 40, why: "Tighter support makes the pass easier \u2014 but the closer you are to your partner, the easier it is for one forechecker to take you both." },
        ],
        wrong: [
          { x: 112, y: 54, why: "You joined the rush ahead of the puck. Lose it here and they're going the other way with numbers." },
          { x: 62, y: 48, why: "You retreated into your own zone. Your partner has no support and has to throw it away." },
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
