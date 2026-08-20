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
