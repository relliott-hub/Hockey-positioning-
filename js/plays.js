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
      RD: { x: 7, y: 34 },
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
        best: { x: 7, y: 34, why: "Behind the net on the far side for the D-to-D. The pass goes behind the goal, never across the front of it \u2014 that's what makes it safe." },
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

  /* ------------------------------------------------------------------ */
  {
    id: "forecheck_1_2_2",
    phase: "Forecheck",
    name: "Forechecking their breakout",
    situation:
      "Their defenceman has the puck in the corner below his own goal line and " +
      "is trying to break out. You're first in on the forecheck.",
    claims: { puck: ["belowGoalLine", "inCorner"], ourDAtBlueLine: true },
    attackDir: "right",
    ourNet: "left",
    /* NOT isDefense. That flag means "we are defending our own end", and it
       flips which net counts as ours. On a forecheck the opposition has the
       puck but we are in THEIR end attacking — marking it defensive pointed
       the attacking net at our own goal. `forecheck` carries the possession
       meaning on its own. */
    forecheck: true,
    puck: { x: 194, y: 72 },
    carrier: "opp",
    players: {
      C:  { x: 178, y: 54 },
      LW: { x: 170, y: 74 },
      RW: { x: 156, y: 44 },
      RD: { x: 128, y: 62 },
      LD: { x: 128, y: 28 },
    },
    opponents: [
      { x: 194, y: 72, label: "O1" },
      { x: 193, y: 40, label: "O2" },
      { x: 178, y: 78, label: "O3" },
      { x: 176, y: 58, label: "O4" },
      { x: 172, y: 22, label: "O5" },
    ],
    reads: {
      C: {
        best: { x: 178, y: 54, why: "Angle him from the inside. Your first angle decides the whole forecheck \u2014 take the middle away so the only place he can go is the wall. You're not trying to steal it, you're trying to make him rush the pass." },
        acceptable: [
          { x: 158, y: 44, why: "Holding the middle and letting them come to you is a real forecheck and it gives up nothing the other way \u2014 but it hands their defenceman time to pick a clean first pass." },
        ],
        wrong: [
          { x: 193, y: 71, why: "You skated straight at him. With no angle he simply steps around you, and every layer behind you is now beaten." },
          { x: 196, y: 45, why: "You chased behind the net. He goes the other way and your whole forecheck is caught below the puck." },
        ],
      },
      LW: {
        best: { x: 170, y: 74, why: "Above the puck on the wall. When your centre forces the panicked pass up the boards, you're the one who steps into it." },
        acceptable: [
          { x: 190, y: 74, why: "Going in as the second man works when your centre already has him sealed on the wall \u2014 but if he doesn't, two of you are below the puck and their breakout is free." },
        ],
        wrong: [
          { x: 196, y: 52, why: "You dropped below the goal line. Everything they do now happens above you and you can't get back to it." },
          { x: 168, y: 48, why: "You left the wall for the middle. The boards are where the pass is going, and now nobody is there." },
        ],
      },
      RW: {
        best: { x: 156, y: 44, why: "High in the middle, above everyone. You're the safety valve \u2014 you stop the odd-man rush and you're first on anything that comes up the middle." },
        acceptable: [
          { x: 156, y: 22, why: "Taking the weak-side wall does shut down that outlet \u2014 but a breakout through the middle is the one that really hurts, and now nobody is covering it." },
        ],
        wrong: [
          { x: 188, y: 68, why: "Three forwards below the puck. If it comes out, there is nobody home at all." },
          { x: 130, y: 44, why: "You backed all the way to the blue line. That's your defenceman's job and the forecheck has lost its third layer." },
        ],
      },
      RD: {
        best: { x: 128, y: 62, why: "Hold the blue line on the puck side. You keep it in when it comes up the wall, and you're the shot if it comes back to you." },
        acceptable: [
          { x: 150, y: 74, why: "Pinching down the wall keeps the puck in and it's the right call when you know you'll get there \u2014 but miss it and their winger is gone the other way with you caught." },
        ],
        wrong: [
          { x: 108, y: 60, why: "You backed off into the neutral zone. The puck comes out clean and the whole forecheck was wasted." },
          { x: 186, y: 70, why: "You went all the way to the corner. If they win that battle it's a two-on-one going back." },
        ],
      },
      LD: {
        best: { x: 128, y: 28, why: "Hold the weak-side blue line. When they try to swing it across to break out, you're the one who kills it." },
        acceptable: [],
        wrong: [
          { x: 140, y: 66, why: "Both defencemen on the puck side. If it comes out the other way there is nobody there." },
          { x: 104, y: 28, why: "You retreated to centre. They walk out of their zone with speed and you've given up the line for nothing." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  /* Backchecking. Named in the teaching audit as a situation a youth player
     meets every single game and the game did not cover.

     The literature is blunt about what makes a backcheck worthless: "a
     trailing backchecker defends nothing". So every best read here is about
     getting to the DEFENSIVE SIDE of a man, and the standard assignment —
     centre takes the middle lane, wingers take the outside lanes — is the one
     taught, because somebody has to clearly own the middle. */
  {
    id: "backcheck_rush",
    phase: "Backcheck",
    name: "Backchecking a rush",
    situation:
      "You turned the puck over and they're coming back at you with speed. " +
      "You're behind the play and have to get back before they get to your net.",
    claims: { puck: ["inNeutralZone"] },
    attackDir: "left",
    ourNet: "left",
    isDefense: true,
    puck: { x: 90, y: 50 },
    carrier: "opp",
    players: {
      LD: { x: 66, y: 50 },
      RD: { x: 56, y: 36 },
      C:  { x: 96, y: 44 },
      LW: { x: 100, y: 66 },
      RW: { x: 98, y: 24 },
    },
    opponents: [
      { x: 90, y: 50, label: "O1" },
      { x: 84, y: 68, label: "O2" },
      { x: 86, y: 26, label: "O3" },
      { x: 112, y: 56, label: "O4" },
      { x: 114, y: 30, label: "O5" },
    ],
    reads: {
      C: {
        best: { x: 78, y: 46, why: "Get back through the middle and stay on the defensive side of the puck. The middle lane is yours — you take away the drop pass and the late man sneaking into the slot." },
        acceptable: [
          { x: 56, y: 44, why: "Collapsing all the way to the top of your own circles means you're definitely home — but you've skated past the trailer, and he's the one who gets the rebound." },
        ],
        wrong: [
          { x: 96, y: 62, why: "You chased the puck carrier from behind. You can't take the puck off someone you're trailing — and the middle you left is where they're going." },
          { x: 104, y: 30, why: "You turned up ice looking for the counter-attack. Your team is defending a rush with one fewer player back." },
        ],
      },
      LW: {
        best: { x: 82, y: 64, why: "Catch your man in your lane and take the inside of him. Get between him and your net — a backchecker skating behind his man is defending nothing at all." },
        acceptable: [
          { x: 62, y: 74, why: "Racing right back to your own corner means you're home first — but you've skated past your man, and he'll walk in behind you with the puck." },
        ],
        wrong: [
          { x: 96, y: 46, why: "You cut into the middle. That's your centre's lane — and the wall you just left is wide open." },
          { x: 104, y: 76, why: "You stopped and stayed high hoping for a turnover. They're attacking with numbers because you aren't back." },
        ],
      },
      RW: {
        best: { x: 80, y: 28, why: "Get back on the far side and take the inside of your man. If you beat him to the middle, your defencemen don't have to guess." },
        acceptable: [
          { x: 60, y: 20, why: "Getting all the way back to the far post stops the tap-in — but you've let your man shoot from the circle with nobody on him." },
        ],
        wrong: [
          { x: 94, y: 46, why: "You went to the puck. Your defenceman already has the carrier — the man you were supposed to take is now alone." },
          { x: 104, y: 22, why: "You stayed high waiting for the puck to come back. It isn't coming back until someone defends." },
        ],
      },
      LD: {
        best: { x: 66, y: 50, why: "Skate backwards and keep a tight gap on the carrier, forcing him toward the boards. Don't lunge — a missed poke check turns this into a breakaway." },
        acceptable: [
          { x: 44, y: 44, why: "Backing off gives you room so you can't be beaten wide — but you've let him come in and shoot from the top of the circle with speed." },
        ],
        wrong: [
          { x: 86, y: 54, why: "You stepped up and lunged at him near centre. Miss, and he's past you with nobody between him and your goalie." },
          { x: 60, y: 28, why: "You drifted onto your partner's side. Both defencemen in one lane, and the side the puck is on is unguarded." },
        ],
      },
      RD: {
        best: { x: 56, y: 36, why: "Stay inside your partner and protect the middle. One of you takes the carrier, the other takes the ice in front of the net — you're the second one." },
        acceptable: [
          { x: 36, y: 30, why: "Dropping right back to the net front means the backdoor pass is covered — but you've given them the whole slot to shoot from first." },
        ],
        wrong: [
          { x: 76, y: 30, why: "You stepped up at the far man near centre. Beat there, and it's a two-on-one on your partner." },
          { x: 56, y: 60, why: "Both defencemen on the puck side. The entire middle of your own zone is unguarded." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  /* Defending an odd-man rush. The clearest piece of coaching consensus in
     the whole sport: take the pass away and let the goalie have the shot.

     "Giving up a low-percentage shot is a win; the goalie is trained to stop
     the puck; the job is making sure the shooter, not the open teammate, gets
     it." The wrong reads are the two real ways kids lose this: lunging at the
     carrier, and sliding across to the puck and abandoning the open man. */
  {
    id: "defend_two_on_one",
    phase: "Defend",
    name: "Two on one against you",
    situation:
      "Two of them are coming in over your blue line and you're the only " +
      "defender back. Your help is behind the play. Don't let this be a goal.",
    claims: { puck: ["atBlueLine"] },
    attackDir: "left",
    ourNet: "left",
    isDefense: true,
    puck: { x: 72, y: 52 },
    carrier: "opp",
    players: {
      RD: { x: 50, y: 38 },
      LD: { x: 84, y: 66 },
      C:  { x: 88, y: 48 },
      LW: { x: 92, y: 70 },
      RW: { x: 90, y: 26 },
    },
    opponents: [
      { x: 72, y: 52, label: "O1" },
      { x: 70, y: 30, label: "O2" },
      { x: 96, y: 44, label: "O3" },
      { x: 100, y: 58, label: "O4" },
      { x: 104, y: 36, label: "O5" },
    ],
    reads: {
      RD: {
        best: { x: 50, y: 38, why: "Stay between them, a little toward the open man, with your stick flat in the passing lane. Take the pass away and let your goalie have the shot — a shot from out there is the save he wants." },
        acceptable: [
          { x: 28, y: 42, why: "Backing right in tight takes the backdoor pass away and gives your goalie a clear view — but you've handed them the whole blue line to walk in and shoot from." },
        ],
        wrong: [
          { x: 70, y: 52, why: "You lunged at the puck carrier. A missed poke check on a two-on-one is a pass to an empty net." },
          { x: 40, y: 60, why: "You slid over to the puck carrier and left the far man. He's the one who scores — that's why you play the pass, not the puck." },
        ],
      },
      LD: {
        best: { x: 64, y: 32, why: "Sprint back and pick up the open man, not the puck. The moment a second defender arrives this stops being a two-on-one — so get to the man your partner can't cover." },
        acceptable: [
          { x: 44, y: 22, why: "Getting all the way back to the far post covers the tap-in — but he can shoot from the top of the circle with nobody near him." },
        ],
        wrong: [
          { x: 70, y: 54, why: "You went to the puck. Your partner already has the carrier, and the open man is still open." },
          { x: 90, y: 60, why: "You stopped and stayed high hoping for a turnover. There's no two-on-one at all if you just get back." },
        ],
      },
      C: {
        best: { x: 72, y: 44, why: "Back through the middle and take away the drop pass. On a broken-up rush it's the trailer coming late into the slot who scores." },
        acceptable: [
          { x: 50, y: 48, why: "Collapsing to the top of your own circles means you're home if it breaks down — but you've gone past the trailer, and he gets the rebound." },
        ],
        wrong: [
          { x: 74, y: 66, why: "You went to the puck carrier. Your defenceman has him — and the middle is now wide open." },
          { x: 94, y: 30, why: "You gave up on the backcheck and turned up ice. Your defenceman is defending two players alone because of it." },
        ],
      },
      LW: {
        best: { x: 74, y: 68, why: "Catch the man in your lane and take the inside of him. Get on the defensive side — chasing from behind him helps nobody." },
        acceptable: [
          { x: 54, y: 72, why: "Getting all the way back to your own corner means you beat him home — but you skated past him on the way, so he has the puck and you don't." },
        ],
        wrong: [
          { x: 76, y: 46, why: "You cut into the middle where your centre already is. Two of you in one lane and the wall is open." },
          { x: 98, y: 72, why: "You gave up on the play. One defender against two, and you're watching from the neutral zone." },
        ],
      },
      RW: {
        best: { x: 72, y: 24, why: "Get to the far side and take the open man. Beat him to the inside and your defenceman no longer has to choose." },
        acceptable: [
          { x: 52, y: 18, why: "All the way back to the far post stops the tap-in — but it leaves him free to shoot from the circle." },
        ],
        wrong: [
          { x: 74, y: 46, why: "You came into the middle. On a two-on-one the far man is the dangerous one, and you just left him." },
          { x: 96, y: 22, why: "You stayed high waiting for the puck to come back. They have a two-on-one — it isn't coming back." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  /* Neutral-zone forecheck. The 1-2-2 is the setup the sources recommend for
     youth teams: F1 pressures and steers play to one side while the two
     forwards behind "create a wall effect that eliminates cross-ice passing
     options", with the defencemen holding their own blue line and the whole
     group "moving as a five-man unit". */
  {
    id: "nz_forecheck_1_2_2",
    phase: "Forecheck",
    name: "Holding the neutral zone",
    situation:
      "Their defenceman has carried the puck up into the neutral zone. Your " +
      "team is set up in a 1-2-2 to take the middle away and force a turnover.",
    claims: { puck: ["inNeutralZone"] },
    attackDir: "right",
    ourNet: "left",
    forecheck: true,
    puck: { x: 120, y: 58 },
    carrier: "opp",
    players: {
      C:  { x: 114, y: 54 },
      LW: { x: 102, y: 68 },
      RW: { x: 100, y: 30 },
      RD: { x: 80, y: 56 },
      LD: { x: 78, y: 30 },
    },
    opponents: [
      { x: 120, y: 58, label: "O1" },
      { x: 126, y: 30, label: "O2" },
      { x: 110, y: 76, label: "O3" },
      { x: 112, y: 18, label: "O4" },
      { x: 132, y: 44, label: "O5" },
    ],
    reads: {
      C: {
        best: { x: 114, y: 54, why: "Angle him toward the boards from the inside. In a 1-2-2 your job isn't to steal it — it's to take the middle away so the only pass left is up the wall, where your wingers are waiting." },
        acceptable: [
          { x: 94, y: 46, why: "Hanging back in the middle and letting them come to you is a containing forecheck and gives up nothing — but it hands their defenceman a free look at the whole ice." },
        ],
        wrong: [
          { x: 134, y: 62, why: "You chased him into his own zone alone. A 1-2-2 holds the neutral zone — once you're past their line, the wall behind you has nothing left to defend." },
          { x: 112, y: 24, why: "You pressured from the far side. He simply moves it to the near wall, and the side you left is the side the puck went." },
        ],
      },
      LW: {
        best: { x: 102, y: 68, why: "Stand up on the near wall and hold it. When your centre forces the pass up the boards, you step into it — standing still, not chasing." },
        acceptable: [
          { x: 122, y: 76, why: "Stepping up early to pressure their winger can win the puck high — but if it gets past you the whole wall is beaten and you're behind the play." },
        ],
        wrong: [
          { x: 98, y: 46, why: "You left the wall for the middle. Your centre has already taken the middle away — the pass is going up the boards you just abandoned." },
          { x: 78, y: 72, why: "You backed up to your own blue line. That's your defenceman's line to hold, and the forecheck has lost its second layer." },
        ],
      },
      RW: {
        best: { x: 100, y: 30, why: "Hold the far wall and stay above the puck. If they swing it across to escape, you're the one who kills it — and you're the last man if it gets through." },
        acceptable: [
          { x: 94, y: 50, why: "Sliding into the middle makes the wall tighter — but the far wall is open now, and that's exactly where a trapped team goes." },
        ],
        wrong: [
          { x: 122, y: 26, why: "You went up the ice to chase. Two forwards past the puck, and their breakout goes straight through the middle you both left." },
          { x: 78, y: 26, why: "You dropped back level with your defencemen. Three players on one line with nothing in front of them." },
        ],
      },
      RD: {
        best: { x: 80, y: 56, why: "Hold your own blue line on the puck side. A 1-2-2 only works if the back two stay up — back off and you've given them the whole neutral zone to build speed in." },
        acceptable: [
          { x: 100, y: 62, why: "Stepping up past centre squeezes them harder and aggressive teams play it that way — but one pass that beats you is an odd-man rush." },
        ],
        wrong: [
          { x: 58, y: 60, why: "You retreated into your own zone. They carry it in with speed and the forecheck never happened." },
          { x: 80, y: 34, why: "You drifted onto your partner's side. Both defencemen in one lane and the near boards are wide open." },
        ],
      },
      LD: {
        best: { x: 78, y: 30, why: "Hold the weak-side blue line. The pass that beats a 1-2-2 is the one that goes all the way across — and you're the one standing in it." },
        acceptable: [
          { x: 98, y: 22, why: "Pressing up the weak side can force them to turn back — but you're the safety valve here, and stepping up costs you a step if it goes past." },
        ],
        wrong: [
          { x: 56, y: 28, why: "You backed into your own zone. There's nothing left to stop them at the line." },
          { x: 80, y: 54, why: "Both defencemen on the puck side. The whole weak side of the neutral zone is theirs." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  /* Defensive-zone faceoff.
     The centre's spot is fixed by rule, so the coached positions are the four
     players who actually choose where to line up. On a draw the wingers take
     the opposing points — which is genuinely different from their in-play
     coverage job, and the reads say so, because a kid who notices the
     difference has learned something real.
     "All 5 players need to know their responsibility on a win AND a loss." */
  {
    id: "dzone_faceoff",
    phase: "Faceoff",
    name: "Faceoff in your own end",
    situation:
      "A draw in your own end, at the dot nearest the boards. Everybody needs " +
      "to know their job before the puck hits the ice — on a win and on a loss.",
    claims: { puck: ["atFaceoffDot"] },
    attackDir: "left",
    ourNet: "left",
    isDefense: true,
    puck: { x: 31, y: 64.5 },
    carrier: "opp",
    players: {
      C:  { x: 29, y: 62 },
      LD: { x: 21, y: 74 },
      RD: { x: 17, y: 46 },
      LW: { x: 45, y: 74 },
      RW: { x: 46, y: 30 },
    },
    opponents: [
      { x: 33, y: 67, label: "O1" },
      { x: 24, y: 77, label: "O2" },
      { x: 19, y: 36, label: "O3" },
      { x: 46, y: 68, label: "O4" },
      { x: 44, y: 28, label: "O5" },
    ],
    reads: {
      LW: {
        best: { x: 45, y: 74, why: "Line up on their defenceman on your side, between him and the boards. Win the draw back to your D and you're the one stopping their point from pinching down on him." },
        acceptable: [
          { x: 48, y: 54, why: "Lining up inside lets you help in the slot if the draw is lost — but their point is now free to walk down the wall and shoot." },
        ],
        wrong: [
          { x: 24, y: 73, why: "You lined up low beside your own defenceman. Two of you on one wall, and their point walks in completely untouched." },
          { x: 66, y: 72, why: "You lined up out at the blue line ready to leave. You're a man short in your own end before the puck has even dropped." },
        ],
      },
      RW: {
        best: { x: 46, y: 30, why: "On their far defenceman. When the draw gets swung across, the weak-side shot is the one that beats you — and on a faceoff that point is yours, not your D's." },
        acceptable: [
          { x: 26, y: 36, why: "Starting lower in the weak-side slot protects the backdoor if the draw is lost — but their far point can step into a free shot." },
        ],
        wrong: [
          { x: 46, y: 66, why: "You crossed to the strong side where your winger already is. The entire weak side of your zone is unguarded." },
          { x: 72, y: 28, why: "You're out at the blue line ready to break out. The draw hasn't happened yet and you've already left your end." },
        ],
      },
      LD: {
        best: { x: 21, y: 74, why: "Low on the boards on the draw side, inside your winger. Win it and you're the outlet; lose it and you're already between their winger and the corner." },
        acceptable: [
          { x: 18, y: 50, why: "Starting nearer the net means you'll never be beaten to the inside — but you've given up the boards, and that's exactly where a lost draw goes." },
        ],
        wrong: [
          { x: 42, y: 76, why: "You lined up above the circle. The puck comes back low behind you and their winger has it in the corner alone." },
          { x: 38, y: 54, why: "You lined up out in the middle. Nobody has the strong-side boards, and that's where the draw is going." },
        ],
      },
      RD: {
        best: { x: 17, y: 46, why: "Net-front on the weak side. On a lost draw the puck goes straight to the man in front of your net — and he's yours." },
        acceptable: [
          { x: 26, y: 26, why: "Setting up wider takes the cross-ice pass away — but it opens the front of your own net, and that's the more dangerous ice." },
        ],
        wrong: [
          { x: 24, y: 70, why: "Both defencemen on the draw side. The weak side and the front of your net are both empty." },
          { x: 44, y: 44, why: "You lined up at the top of the circle hoping for a breakout pass. That's a forward's spot and your net is unguarded." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  /* Offensive-zone faceoff. A set play: win it back and shoot, with bodies at
     the net. The reads are about being in a place that makes that work. */
  {
    id: "ozone_faceoff",
    phase: "Faceoff",
    name: "Faceoff in their end",
    situation:
      "A draw in their end, at the dot nearest the boards. A won draw here is " +
      "a scoring chance — if everyone is in a spot that can use it.",
    claims: { puck: ["atFaceoffDot"] },
    attackDir: "right",
    ourNet: "left",
    puck: { x: 169, y: 64.5 },
    carrier: "opp",
    players: {
      C:  { x: 167, y: 62 },
      LW: { x: 174, y: 74 },
      RW: { x: 180, y: 38 },
      RD: { x: 152, y: 58 },
      LD: { x: 138, y: 32 },
    },
    opponents: [
      { x: 171, y: 67, label: "O1" },
      { x: 178, y: 76, label: "O2" },
      { x: 184, y: 46, label: "O3" },
      { x: 156, y: 70, label: "O4" },
      { x: 154, y: 30, label: "O5" },
    ],
    reads: {
      LW: {
        best: { x: 174, y: 74, why: "On the wall at the hash marks, ready for the draw to come back to you. From there you have the whole boards to work with and nobody can strip you from behind." },
        acceptable: [
          { x: 182, y: 54, why: "Driving straight to the net-front off the draw is a real set play and that's where goals come from — but lose the draw and you're below everybody, and their breakout goes up your wall." },
        ],
        wrong: [
          { x: 196, y: 72, why: "You started below their goal line. The draw comes back and there is nobody on the wall to take it." },
          { x: 148, y: 76, why: "You lined up back at the blue line. That's your defenceman's spot, and your centre has nobody to win it to." },
        ],
      },
      RW: {
        best: { x: 180, y: 38, why: "Net front on the weak side. Off an offensive draw the puck gets to the net in about a second — be the one standing where the goalie can't see it coming." },
        acceptable: [
          { x: 170, y: 20, why: "Looping in from the weak side with speed gives your centre a second option and it's a genuine set play — but nobody is at the net, and that's where a draw-and-shoot ends up." },
        ],
        wrong: [
          { x: 176, y: 62, why: "You crossed to the strong side where your winger already is. Two of you on one wall and the whole weak side is empty." },
          { x: 150, y: 44, why: "You dropped back to the middle at the blue line. That's a long way from the net on a play that's over in two seconds." },
        ],
      },
      RD: {
        best: { x: 152, y: 58, why: "Up at the top of the circle on the draw side, ready to shoot. Off an offensive faceoff, that quick shot with bodies at the net is the whole point of the play." },
        acceptable: [
          { x: 132, y: 62, why: "Holding the blue line is the safe way to play it and you'll never be beaten the other way — but it's a long shot from there, and the point of an offensive draw is a quick one." },
        ],
        wrong: [
          { x: 174, y: 70, why: "You went down into the corner before the puck dropped. Lose the draw and it's a two-on-one going the other way." },
          { x: 152, y: 36, why: "You lined up in the middle on your partner's side. Nobody has the strong-side point and the won draw has nowhere to go." },
        ],
      },
      LD: {
        best: { x: 138, y: 32, why: "Weak-side point, a little higher than your partner. You keep it in when it comes across, and you're the man back if the draw is lost." },
        acceptable: [
          { x: 158, y: 26, why: "Coming down level with your partner gives you a better shot — but you're the only one back, and a lost draw becomes a rush the other way." },
        ],
        wrong: [
          { x: 140, y: 58, why: "Both defencemen on the draw side. They win it, swing it across, and nobody is there." },
          { x: 180, y: 30, why: "You dropped into the slot looking for a tip. Both points are gone and the puck goes straight out of the zone." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  /* SPECIAL TEAMS.

     These were disabled for several versions. The old versions taught a
     hardcoded umbrella and box regardless of what the player had selected,
     and were up to 282 px off the structure they claimed to be showing, so
     turning them off was the honest thing to do until they could be authored
     the same way as everything else.

     Re-authored here on the 1-3-1 and the passive box, which is what the
     sources recommend: the 1-3-1 "creates the most passing triangles and
     one-timer lanes", and the box is the kill for "youth, beginner and less
     mobile teams" because it "is forgiving, easy to teach, and rarely gives
     up a clean look if players hold their spacing".

     On special teams the job matters more than the badge on your jersey, so
     each position carries the name of the job it is doing. That vocabulary —
     point, half-wall, bumper, net front — is the thing a kid needs to be able
     to follow a coach drawing on a whiteboard. */
  {
    id: "pp_one_three_one",
    phase: "Power play",
    name: "Power play 1-3-1",
    situation:
      "You're on the power play, set up in their end in a 1-3-1. Your point " +
      "man has the puck at the blue line. Make them move, then make them pay.",
    claims: { puck: ["atBlueLine"] },
    fmt: "5v4",
    attackDir: "right",
    ourNet: "left",
    jobs: { LD: "the point", LW: "near half-wall", RW: "far half-wall", C: "the bumper", RD: "net front" },
    puck: { x: 128, y: 42 },
    carrier: "LD",
    players: {
      LD: { x: 128, y: 42 },
      LW: { x: 164, y: 71 },
      RW: { x: 164, y: 14 },
      C:  { x: 160, y: 42 },
      RD: { x: 182, y: 45 },
    },
    opponents: [
      { x: 150, y: 54, label: "K1" },
      { x: 150, y: 32, label: "K2" },
      { x: 176, y: 56, label: "K3" },
      { x: 176, y: 30, label: "K4" },
    ],
    reads: {
      LW: {
        best: { x: 164, y: 71, why: "The half-wall — level with the dot, out on the boards. From there you can shoot, feed the net front, or move it back to the point. Three options, and the box can only cover one." },
        acceptable: [
          { x: 186, y: 68, why: "Dropping toward the corner gives you a safer place to receive it — but you're below the box now, and from down there you can't shoot and you can't feed the slot." },
        ],
        wrong: [
          { x: 160, y: 46, why: "You came into the middle where your bumper already is. Two of you in one spot and one penalty killer covers you both." },
          { x: 136, y: 66, why: "You came up level with the point. A power play needs width — up there you're just a second option in the same place." },
        ],
      },
      RW: {
        best: { x: 164, y: 14, why: "Far half-wall, and stay wide. The pass across is the one a box cannot cover — but only if you're wide enough that someone has to move to reach you." },
        acceptable: [
          { x: 146, y: 26, why: "Coming in tighter makes the cross-ice pass shorter and quicker — but you're inside the box now, and your shooting lane is gone." },
        ],
        wrong: [
          { x: 186, y: 24, why: "You dropped below the circle. Down there you have no shot and no pass into the slot." },
          { x: 164, y: 42, why: "You slid into the middle. Your bumper is already there and the whole far side of the ice is now empty." },
        ],
      },
      C: {
        best: { x: 160, y: 42, why: "The bumper sits in the high slot, right in the middle of their box. You're the pass nobody expects — and you screen the goalie on every shot from the point." },
        acceptable: [
          { x: 182, y: 42, why: "Dropping to the net front gives you a tip and a rebound — but your net-front man is already there, and the middle you left is the seam that makes a 1-3-1 work." },
        ],
        wrong: [
          { x: 160, y: 68, why: "You went out to the wall where your winger already is. One penalty killer now covers both of you." },
          { x: 134, y: 42, why: "You came up to the point. Your defenceman has the puck there, and now there is nothing at all in the middle." },
        ],
      },
      RD: {
        best: { x: 182, y: 45, why: "Net front, just off the post, facing the puck. It's the hardest job on the power play: take the goalie's eyes away and be there for the rebound." },
        acceptable: [
          { x: 188, y: 66, why: "Going to the corner as an outlet keeps possession when it comes down — but nobody is screening, and the goalie sees every shot." },
        ],
        wrong: [
          { x: 160, y: 44, why: "You backed out to the high slot. That's the bumper's spot, and the goalie can see everything now." },
          { x: 182, y: 22, why: "You drifted off to the weak side. The front of the net is empty, and on a power play that's the only place a goalie gets beaten." },
        ],
      },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "pk_box",
    phase: "Penalty kill",
    name: "Penalty kill box",
    situation:
      "You're a man short and they're set up in your end. Hold the box, keep " +
      "the puck out of the middle, and make them shoot from a bad place.",
    claims: { puck: ["onHalfWall"] },
    fmt: "4v5",
    attackDir: "left",
    ourNet: "left",
    isDefense: true,
    jobs: { C: "top of the box, puck side", LW: "top of the box, weak side", LD: "low, puck side", RD: "low, weak side" },
    puck: { x: 30, y: 74 },
    carrier: "opp",
    players: {
      C:  { x: 38, y: 56 },
      LW: { x: 38, y: 30 },
      LD: { x: 22, y: 56 },
      RD: { x: 20, y: 33 },
    },
    opponents: [
      { x: 30, y: 74, label: "P1" },
      { x: 30, y: 12, label: "P2" },
      { x: 34, y: 43, label: "P3" },
      { x: 17, y: 41, label: "P4" },
      { x: 72, y: 42, label: "P5" },
    ],
    reads: {
      C: {
        best: { x: 38, y: 56, why: "Top corner of the box on the puck side, stick in the lane to the middle. On a kill you don't go and get it — you make the shot come from the worst place on the ice." },
        acceptable: [
          { x: 34, y: 76, why: "Stepping out to pressure the half-wall can force a bad pass, and that's how an aggressive kill works — but if it gets past you, your box is a man down and the slot is open." },
        ],
        wrong: [
          { x: 60, y: 48, why: "You went up to their point. He isn't your man on a kill — the four of you have to stay a box." },
          { x: 22, y: 42, why: "You collapsed into the middle beside your defencemen. Three of you in the slot, and both their half-walls can shoot whenever they like." },
        ],
      },
      LW: {
        best: { x: 38, y: 30, why: "Top corner of the box on the weak side. When they swing it across you have to be there already — a kill that chases the puck across is always one pass behind." },
        acceptable: [
          { x: 30, y: 10, why: "Going out to the far half-wall takes that shot away — but the box is broken, and the seam into the slot behind you is exactly the pass they want." },
        ],
        wrong: [
          { x: 38, y: 54, why: "You followed the puck to the strong side. Your teammate is already there and the weak side is open for a one-timer." },
          { x: 66, y: 34, why: "You went up to their point hoping for a shorthanded break. Four players have to cover five — you can't give one away." },
        ],
      },
      LD: {
        best: { x: 22, y: 56, why: "Low corner of the box, between the puck and your net. You take away the pass down to the goal line and you're first to any rebound." },
        acceptable: [
          { x: 32, y: 76, why: "Pressing out to the half-wall can block the shot — but you've left the front of your own net, and that's where a power play scores." },
        ],
        wrong: [
          { x: 20, y: 34, why: "You slid across the front of your own net. That's your partner's man — and the side you left is the side with the puck." },
          { x: 46, y: 58, why: "You're up at the top of the circle. On a kill everything dangerous happens below you, and you've left it behind." },
        ],
      },
      RD: {
        best: { x: 20, y: 33, why: "Low corner of the box on the weak side, stick on their net-front man. The backdoor tap-in is the goal a power play scores most — and it's yours to stop." },
        acceptable: [
          { x: 30, y: 14, why: "Going wide to the far half-wall takes the cross-ice shot away — but it leaves the net front, and that's the more dangerous ice." },
        ],
        wrong: [
          { x: 22, y: 54, why: "Both defencemen on the puck side. Nobody is at the back post, and that's a tap-in." },
          { x: 44, y: 36, why: "You stepped up into the high slot. Their man in the middle is your forwards' job — your net is not." },
        ],
      },
    },
  },
];

/* The principles.

   A player who learns "in this picture, go there" has learned a picture. What
   transfers to a real game is the rule underneath it — and the rule is the same
   whether you're breaking out, forechecking or defending your own corner.

   Every authored read is tagged with the principle it teaches or breaks, so the
   game can name it, and the coach report can show a parent which ideas their
   kid has actually absorbed and which ones keep costing them.

   The set is deliberately small. Six or seven ideas a child can hold in their
   head beat twenty they cannot. */
HIQ.PRINCIPLES = {
  support:   { name: "Support the puck",     kid: "Be somewhere your teammate can pass to." },
  middle:    { name: "Protect the middle",   kid: "The front of your net is the most dangerous ice." },
  above:     { name: "Stay above the puck",  kid: "Don't get caught below it." },
  lanes:     { name: "Keep your lanes apart", kid: "Two of you in one lane is one checker's job." },
  weakside:  { name: "Cover the weak side",  kid: "Someone has to be there when it comes across." },
  dontchase: { name: "Don't chase the puck", kid: "If everyone goes to the puck, nobody is anywhere." },
  yourjob:   { name: "Do your own job",      kid: "Cover your own man — don't take a teammate's." },
};

/* Which principle each read teaches, in order: best, then acceptable, then
   wrong. Assigned by hand — keyword matching got two thirds of them right,
   which is not good enough for the thing the whole game is built on. */
const PRINCIPLE_MAP = {
  breakout_corner_pressure: {
    LW: ["support", "support", "dontchase", "middle"],
    C:  ["support", "support", "lanes", "above"],
    RW: ["weakside", "lanes", "dontchase", "above"],
    RD: ["support", "support", "above", "weakside"],
  },
  dzone_halfwall_coverage: {
    LD: ["middle", "dontchase", "middle", "yourjob"],
    RD: ["middle", "weakside", "middle"],
    C:  ["middle", "yourjob", "yourjob", "above"],
    LW: ["yourjob", "dontchase", "above"],
    RW: ["weakside", "weakside", "weakside", "above"],
  },
  ozone_cycle_support: {
    C:  ["support", "support", "dontchase", "support"],
    LW: ["middle", "support", "dontchase", "yourjob"],
    RD: ["yourjob", "support", "above", "above"],
    LD: ["weakside", "weakside", "above", "above"],
  },
  rush_three_on_two: {
    RW: ["lanes", "support", "lanes", "above"],
    LW: ["lanes", "support", "above", "lanes"],
    RD: ["above", "support", "above", "support"],
    LD: ["above", "support", "above", "middle"],
  },
  dzone_corner_battle: {
    LD: ["middle", "yourjob", "above"],
    RD: ["middle", "dontchase", "above"],
    C:  ["middle", "yourjob", "above", "yourjob"],
    LW: ["yourjob", "dontchase", "above"],
    RW: ["weakside", "weakside", "weakside", "above"],
  },
  nz_regroup: {
    C:  ["support", "support", "lanes", "above"],
    RW: ["support", "support", "above", "lanes"],
    LW: ["weakside", "lanes", "above", "above"],
    LD: ["support", "lanes", "above", "support"],
  },
  forecheck_1_2_2: {
    C:  ["middle", "middle", "dontchase", "above"],
    LW: ["above", "support", "above", "yourjob"],
    RW: ["above", "weakside", "dontchase", "yourjob"],
    RD: ["yourjob", "support", "above", "dontchase"],
    LD: ["weakside", "weakside", "above"],
  },
  backcheck_rush: {
    C:  ["above", "middle", "dontchase", "above"],
    LW: ["above", "above", "yourjob", "above"],
    RW: ["yourjob", "weakside", "dontchase", "above"],
    LD: ["above", "above", "dontchase", "weakside"],
    RD: ["middle", "middle", "yourjob", "weakside"],
  },
  defend_two_on_one: {
    RD: ["middle", "middle", "dontchase", "weakside"],
    LD: ["yourjob", "weakside", "dontchase", "above"],
    C:  ["middle", "middle", "dontchase", "above"],
    LW: ["above", "above", "yourjob", "above"],
    RW: ["weakside", "weakside", "weakside", "above"],
  },
  nz_forecheck_1_2_2: {
    C:  ["middle", "middle", "dontchase", "yourjob"],
    LW: ["lanes", "above", "yourjob", "above"],
    RW: ["weakside", "weakside", "dontchase", "lanes"],
    RD: ["above", "above", "above", "weakside"],
    LD: ["weakside", "above", "above", "weakside"],
  },
  dzone_faceoff: {
    LW: ["yourjob", "middle", "lanes", "above"],
    RW: ["weakside", "weakside", "weakside", "above"],
    LD: ["yourjob", "yourjob", "above", "lanes"],
    RD: ["middle", "weakside", "weakside", "middle"],
  },
  ozone_faceoff: {
    LW: ["support", "middle", "support", "yourjob"],
    RW: ["middle", "support", "lanes", "support"],
    RD: ["support", "support", "above", "lanes"],
    LD: ["weakside", "above", "weakside", "above"],
  },
  pp_one_three_one: {
    LW: ["support", "support", "lanes", "lanes"],
    RW: ["weakside", "weakside", "support", "lanes"],
    C:  ["middle", "middle", "lanes", "lanes"],
    RD: ["middle", "support", "yourjob", "middle"],
  },
  pk_box: {
    C:  ["middle", "dontchase", "dontchase", "lanes"],
    LW: ["weakside", "weakside", "dontchase", "yourjob"],
    LD: ["middle", "middle", "yourjob", "above"],
    RD: ["weakside", "middle", "weakside", "yourjob"],
  },
};

// Attach the principle to every read, in the order the map lists them.
(() => {
  for (const play of HIQ.PLAYS) {
    const forPlay = PRINCIPLE_MAP[play.id] || {};
    for (const [role, r] of Object.entries(play.reads)) {
      const list = forPlay[role] || [];
      const ordered = [r.best, ...r.acceptable, ...r.wrong];
      ordered.forEach((opt, i) => { opt.principle = list[i] || null; });
    }
  }
})();

/* The season plan.

   Coaches do not teach positioning by showing a child a random situation and
   asking where to stand. Published practice planners are built as numbered
   plans, each with a stated theme, worked through in an order — and the order
   is not arbitrary. Hockey Canada's U13 pathway states the rule plainly:

     "skills before tactics; tactics before structure"

   and its U11 guidance introduces basic defensive-zone positioning before
   anything else, with special teams held back until U13, where players
   "should play in all situations, power play, penalty kill and special teams".

   So the units below run from your own net outward: protect the house, get out
   of your end, move it up the ice, take it back, keep it in their end, get
   back when it goes wrong, then special teams last. A player works a unit
   until the reads in it are landing, then the next one opens.

   `need` is how many distinct position-and-situation reads in the unit have to
   be answered with the best read before it is considered learned. It is capped
   by how many the unit actually contains, so a unit can always be finished.  */
HIQ.CURRICULUM = [
  {
    id: "house",
    name: "Protect the house",
    goal: "Learn the most dangerous ice on the sheet — and who guards it.",
    plays: ["dzone_corner_battle", "dzone_halfwall_coverage"],
    need: 6,
  },
  {
    id: "breakout",
    name: "Get out of your end",
    goal: "Give your defence somewhere safe to pass, and never through the middle.",
    plays: ["breakout_corner_pressure", "dzone_faceoff"],
    need: 6,
  },
  {
    id: "transition",
    name: "Move it up the ice",
    goal: "Attack with speed and width instead of all skating to the puck.",
    plays: ["nz_regroup", "rush_three_on_two"],
    need: 6,
  },
  {
    id: "forecheck",
    name: "Take it back",
    goal: "Win the puck with angles and layers, not by chasing it.",
    plays: ["forecheck_1_2_2", "nz_forecheck_1_2_2"],
    need: 6,
  },
  {
    id: "offence",
    name: "Keep it in their end",
    goal: "Hold possession, and have somebody at the net when the chance comes.",
    plays: ["ozone_cycle_support", "ozone_faceoff"],
    need: 6,
  },
  {
    id: "recover",
    name: "Get back",
    goal: "When it goes wrong, get to the defensive side of your man.",
    plays: ["backcheck_rush", "defend_two_on_one"],
    need: 6,
  },
  {
    id: "special",
    name: "Special teams",
    goal: "A man up and a man down — the jobs change, and so do their names.",
    plays: ["pp_one_three_one", "pk_box"],
    need: 5,
  },
];

/* How many coachable reads a unit actually contains, so `need` can never ask
   for more than exists. A read is coachable if the play has one for that
   position and that position isn't the one carrying the puck. */
HIQ.unitSize = function (unit) {
  let n = 0;
  for (const id of unit.plays) {
    const play = HIQ.PLAYS.find(p => p.id === id);
    if (!play) continue;
    n += Object.keys(play.reads).filter(r => r !== play.carrier).length;
  }
  return n;
};

/* Variation that cannot corrupt the hockey.

   Only ONE transform is allowed: mirroring across centre ice. The rink is
   symmetric about that line, so every distance to every landmark — the net, the
   slot, the goal line, the blue line — is preserved exactly. The same play, run
   off the other wing.

   A small positional shift used to be applied as well, and it was wrong. It
   preserved the play's internal shape but moved the whole picture relative to
   the fixed landmarks: a spot authored 13.5 ft off the centre line became 8.5
   ft off it, which put a legitimate support position inside the slot and made
   a legal breakout pass illegal. Authored geometry only means something if it
   keeps its relationship to the ice, so the shift is gone.

   The cost is less variety per scenario. The right way to buy variety back is
   more authored scenarios, not fuzzing the ones we have.
*/
HIQ.varyPlay = function (play, opts = {}) {
  const R = HIQ.RINK;
  const SWAP = { LW: "RW", RW: "LW", LD: "RD", RD: "LD", C: "C" };
  const mirror = opts.mirror ?? (Math.random() < 0.5);

  const t = (p) => (mirror ? { ...p, y: R.width - p.y } : { ...p });

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
  /* Special-teams jobs are attached to positions, so mirroring has to carry
     them across too — otherwise a mirrored power play tells the net-front
     player he's on the far half-wall. The job's own wording is side-neutral
     apart from "near"/"far", which flip with the ice. */
  if (play.jobs) {
    const flipSide = (s) => s.replace(/\b(near|far)\b/g, (m) => (m === "near" ? "far" : "near"));
    out.jobs = {};
    for (const [role, job] of Object.entries(play.jobs)) {
      out.jobs[mirror ? (SWAP[role] || role) : role] = mirror ? flipSide(job) : job;
    }
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
    forecheck: !!play.forecheck,
    fmt: play.fmt || "5v5",
    jobs: play.jobs || null,
    carrier: play.carrier,
    puck: p(play.puck),
    players: {},
    opponents: play.opponents.map(o => ({ ...p(o), label: o.label })),
    reads: {},
  };
  for (const [role, pt] of Object.entries(play.players)) out.players[role] = p(pt);
  for (const [role, r] of Object.entries(play.reads)) {
    // Carry everything the read carries — dropping a field here silently
    // disconnects it from the running game.
    const conv = (o) => ({ ...o, ...p(o) });
    out.reads[role] = {
      best: conv(r.best),
      acceptable: (r.acceptable || []).map(conv),
      wrong: (r.wrong || []).map(conv),
    };
  }
  return out;
};
