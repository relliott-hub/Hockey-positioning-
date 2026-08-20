/* The ice, in feet.

   Everything about this game is a claim about where a player should stand, so
   the surface those claims are measured on has to be real. Positions are held
   in FEET on a regulation 200 x 85 sheet and converted to pixels at draw time
   with one uniform scale, so a foot means the same distance up the ice as it
   does across it.

   Dimensions follow the NHL / Hockey Canada standard sheet. */
window.HIQ = window.HIQ || {};

HIQ.RINK = {
  // Surface
  length: 200,
  width: 85,
  cornerRadius: 28,

  // Lines, measured from the left end boards
  goalLine: 11,          // 11 ft from the end boards
  blueLine: 75,          // 75 ft from the end boards => 50 ft neutral zone
  centreLine: 100,

  // Circles and dots
  faceoffCircleR: 15,
  centreCircleR: 15,
  endDotFromGoalLine: 20,   // end-zone dots sit 20 ft up from the goal line
  dotFromCentreY: 22,       // and 22 ft either side of centre
  nzDotFromBlueLine: 5,     // neutral-zone dots, 5 ft outside each blue line
  dotR: 1,

  // Net and crease
  creaseR: 6,
  creaseWidth: 8,
  goalWidth: 6,
  goalDepth: 3.33,
};

// Derived landmarks, in feet. `left`/`right` refer to ends of the sheet.
(() => {
  const R = HIQ.RINK;
  const midY = R.width / 2;

  R.midY = midY;
  R.goalLineLeft = R.goalLine;
  R.goalLineRight = R.length - R.goalLine;
  R.blueLineLeft = R.blueLine;
  R.blueLineRight = R.length - R.blueLine;

  R.netLeft = { x: R.goalLineLeft, y: midY };
  R.netRight = { x: R.goalLineRight, y: midY };

  // End-zone faceoff dots
  R.dots = {
    leftTop:     { x: R.goalLineLeft + R.endDotFromGoalLine,  y: midY - R.dotFromCentreY },
    leftBottom:  { x: R.goalLineLeft + R.endDotFromGoalLine,  y: midY + R.dotFromCentreY },
    rightTop:    { x: R.goalLineRight - R.endDotFromGoalLine, y: midY - R.dotFromCentreY },
    rightBottom: { x: R.goalLineRight - R.endDotFromGoalLine, y: midY + R.dotFromCentreY },
    nzLeftTop:     { x: R.blueLineLeft - R.nzDotFromBlueLine,  y: midY - R.dotFromCentreY },
    nzLeftBottom:  { x: R.blueLineLeft - R.nzDotFromBlueLine,  y: midY + R.dotFromCentreY },
    nzRightTop:    { x: R.blueLineRight + R.nzDotFromBlueLine, y: midY - R.dotFromCentreY },
    nzRightBottom: { x: R.blueLineRight + R.nzDotFromBlueLine, y: midY + R.dotFromCentreY },
  };

  R.centre = { x: R.centreLine, y: midY };

  /* The "home plate" area — the slot. Hockey Canada teaches defending this
     space above all else, so it needs to be a real, measurable region rather
     than a vague notion of "the middle". Roughly: the width of the crease at
     the goal line, widening to the faceoff dots, up to the top of the circles. */
  R.slotLeft  = { x: R.goalLineLeft + 22,  y: midY };
  R.slotRight = { x: R.goalLineRight - 22, y: midY };

  R.homePlate = (side) => {
    const gl = side === "left" ? R.goalLineLeft : R.goalLineRight;
    const dir = side === "left" ? 1 : -1;
    return [
      { x: gl + dir * 4,  y: midY - 4 },
      { x: gl + dir * 4,  y: midY + 4 },
      { x: gl + dir * 20, y: midY + R.dotFromCentreY },
      { x: gl + dir * 42, y: midY + R.dotFromCentreY },
      { x: gl + dir * 42, y: midY - R.dotFromCentreY },
      { x: gl + dir * 20, y: midY - R.dotFromCentreY },
    ];
  };
})();

/* Canvas mapping. One scale for both axes — this is the whole point. */
HIQ.VIEW = (() => {
  const R = HIQ.RINK;
  const PX_PER_FT = 5.5;
  const MARGIN = 26; // room for the boards and a little air
  const W = Math.round(R.length * PX_PER_FT + MARGIN * 2);
  const H = Math.round(R.width * PX_PER_FT + MARGIN * 2);
  return {
    PX_PER_FT, MARGIN,
    width: W,
    height: H,
    // feet -> canvas pixels
    px: (ft) => ft * PX_PER_FT,
    x: (ftX) => MARGIN + ftX * PX_PER_FT,
    y: (ftY) => MARGIN + ftY * PX_PER_FT,
    pt: (p) => ({ x: MARGIN + p.x * PX_PER_FT, y: MARGIN + p.y * PX_PER_FT }),
    // canvas pixels -> feet
    ftX: (pxX) => (pxX - MARGIN) / PX_PER_FT,
    ftY: (pxY) => (pxY - MARGIN) / PX_PER_FT,
    ftPt: (p) => ({ x: (p.x - MARGIN) / PX_PER_FT, y: (p.y - MARGIN) / PX_PER_FT }),
  };
})();

/* Named regions of the ice.

   A scenario that says "the puck is below the goal line" while drawing it
   thirteen feet above the goal line teaches a kid the wrong vocabulary for the
   sport. These predicates let every scenario's words be checked against its
   actual geometry, automatically. */
HIQ.zones = (() => {
  const R = HIQ.RINK;
  const glOf = (side) => (side === "left" ? R.goalLineLeft : R.goalLineRight);
  const blOf = (side) => (side === "left" ? R.blueLineLeft : R.blueLineRight);
  // How deep into that end a point is: negative means behind the goal line.
  const depth = (p, side) => (side === "left" ? p.x - glOf(side) : glOf(side) - p.x);
  const fromBoards = (p) => Math.min(p.y, R.width - p.y);

  return {
    nearestEnd: (p) => (p.x < R.centreLine ? "left" : "right"),
    depth,
    fromBoards,

    // Between the goal line and the end boards.
    belowGoalLine: (p, side) => depth(p, side) < 0,

    // Below the goal line and out toward a corner, not behind the net.
    inCorner: (p, side) => depth(p, side) < 2 && fromBoards(p) <= 16,

    // Directly behind the net.
    behindNet: (p, side) => depth(p, side) < 0 && Math.abs(p.y - R.midY) < 11,

    // On the boards between the goal line and the top of the circle — where a
    // winger actually stands on a half-wall.
    onHalfWall: (p, side) => {
      const d = depth(p, side);
      return fromBoards(p) <= 12 && d >= 0 && d <= R.endDotFromGoalLine + R.faceoffCircleR;
    },

    inNeutralZone: (p) => p.x > R.blueLineLeft && p.x < R.blueLineRight,

    // A "point" is a defenceman standing on the blue line of the attacking zone.
    atBlueLine: (p, side, tol = 7) => Math.abs(p.x - blOf(side)) <= tol,

    // The dangerous ice right in front of a net.
    inFrontOfNet: (p, side) => {
      const d = depth(p, side);
      return d >= 0 && d <= 14 && Math.abs(p.y - R.midY) <= 12;
    },

    onIce: (p, inset = 2) =>
      p.x >= inset && p.x <= R.length - inset && p.y >= inset && p.y <= R.width - inset,

    /* The lane directly in front of your own net.

       Narrower than the house on purpose. The house is the scoring-danger area
       used for coverage teaching and is 22 ft wide at the dots; a centre giving
       low support on the strong side is legitimately inside it, and a pass to
       him is a normal breakout. What coaches actually forbid is moving the puck
       through the middle in front of your own goal — so this is the middle
       twelve feet, from behind the goal line out to the top of the circles. */
    inSlotLane: (p, side) => {
      const d = depth(p, side);
      // Out to about the hash marks, not the top of the circles. A pass to a
      // centre waiting high in the middle lane is a real breakout route and
      // must not be caught by this; a pass across the front of the net must.
      return d >= -3 && d <= 22 && Math.abs(p.y - R.midY) <= 12;
    },

    /* Does a pass travel through that lane?

       A turnover in front of your own net is a goal, so no coach makes this
       pass and the simulation must never show one — otherwise the game
       demonstrates the exact habit it tells kids to avoid. Sampled along the
       lane rather than solved analytically; the shapes are simple and this
       stays readable. */
    laneCrossesSlot: (from, to, side) => {
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
        if (HIQ.zones.inSlotLane(p, side)) return true;
      }
      return false;
    },
  };
})();

/* Distances in feet — used everywhere positioning is judged, so that "give him
   ten feet of room" means ten feet regardless of direction. */
HIQ.ft = {
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  clampToIce: (p, inset = 2) => {
    const R = HIQ.RINK;
    return {
      x: Math.max(inset, Math.min(R.length - inset, p.x)),
      y: Math.max(inset, Math.min(R.width - inset, p.y)),
    };
  },
  // Is this point inside the dangerous middle of the given end?
  inHomePlate: (p, side) => {
    const R = HIQ.RINK;
    const gl = side === "left" ? R.goalLineLeft : R.goalLineRight;
    const depth = side === "left" ? p.x - gl : gl - p.x;
    if (depth < -2 || depth > 42) return false;
    // widens from the crease out to the dots
    const halfWidth = depth <= 20
      ? 4 + (depth / 20) * (R.dotFromCentreY - 4)
      : R.dotFromCentreY;
    return Math.abs(p.y - R.midY) <= halfWidth;
  },
};
