/* Hockey IQ Trainer — scenario data & shared utilities
   All coordinates are in canvas space: 1100 x 620, rink 20..1080 x 20..600. */
window.HIQ = window.HIQ || {};

HIQ.util = {
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
  dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); },
  toward(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
};

HIQ.LANDMARKS = {
  leftNet:   { x: 95,   y: 310 },
  rightNet:  { x: 1005, y: 310 },
  leftSlot:  { x: 220,  y: 310 },
  rightSlot: { x: 880,  y: 310 },
  center:    { x: 550,  y: 310 }
};

/* Even-strength scenario templates.
   isDefense: true means the OPPONENTS have the puck and the player's job is coverage. */
HIQ.TEMPLATES_EVEN = [
  {
    id: "breakout_left_corner_pressure",
    phase: "Breakout",
    pressures: ["High", "Med", "Low"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 210, y: 500 },
    offenseFull: [
      { role: "C",  x: 320, y: 390 },
      { role: "LW", x: 270, y: 520 },
      { role: "RW", x: 430, y: 200 },
      { role: "LD", x: 190, y: 470 },
      { role: "RD", x: 320, y: 280 },
    ],
    defenseFull: [
      { role: "F1", x: 240, y: 480 },
      { role: "F2", x: 310, y: 430 },
      { role: "F3", x: 410, y: 320 },
      { role: "D1", x: 410, y: 420 },
      { role: "D2", x: 470, y: 260 },
      { role: "G",  x: 70,  y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — Breakout under pressure (puck in the corner). You are ${role}. Where should you go to help your team break out?`,
    guidanceByRole: {
      C:  { x: 320, y: 390, r: 90 },
      LW: { x: 270, y: 520, r: 75 },
      RW: { x: 430, y: 210, r: 95 },
      LD: { x: 220, y: 450, r: 85 },
      RD: { x: 320, y: 280, r: 95 },
    },
    rulesByRole: {
      C:  { spacingFromPuck: { min: 70, max: 220 }, beOutlet: { preferX: "greater" } },
      LW: { spacingFromPuck: { min: 40, max: 170 }, beOutlet: { preferX: "greater" } },
      RW: { spacingFromPuck: { min: 120, max: 430 } },
      LD: { spacingFromPuck: { min: 30, max: 180 } },
      RD: { spacingFromPuck: { min: 90, max: 260 }, beOutlet: { preferX: "greater" } },
    }
  },
  {
    id: "rush_middle_lane",
    phase: "Rush",
    pressures: ["Low", "Med", "High"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 560, y: 310 },
    offenseFull: [
      { role: "C",  x: 590, y: 310 },
      { role: "LW", x: 700, y: 430 },
      { role: "RW", x: 700, y: 190 },
      { role: "LD", x: 490, y: 370 },
      { role: "RD", x: 490, y: 250 },
    ],
    defenseFull: [
      { role: "D1", x: 790, y: 280 },
      { role: "D2", x: 790, y: 340 },
      { role: "F1", x: 640, y: 300 },
      { role: "F2", x: 520, y: 260 },
      { role: "F3", x: 520, y: 380 },
      { role: "G",  x: 1040, y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — Rush through the neutral zone. You are ${role}. Where should you go to be a passing option?`,
    guidanceByRole: {
      C:  { x: 590, y: 310, r: 85 },
      LW: { x: 700, y: 430, r: 95 },
      RW: { x: 700, y: 190, r: 95 },
      LD: { x: 490, y: 370, r: 95 },
      RD: { x: 490, y: 250, r: 95 },
    },
    rulesByRole: {
      C:  { spacingFromPuck: { min: 20, max: 160 }, stayAbovePuck: { margin: 55, allowDeeper: true } },
      LW: { spacingFromPuck: { min: 120, max: 320 }, beOutlet: { preferX: "greater" }, stayAbovePuck: { margin: 70, allowDeeper: true } },
      RW: { spacingFromPuck: { min: 120, max: 320 }, beOutlet: { preferX: "greater" }, stayAbovePuck: { margin: 70, allowDeeper: true } },
      LD: { spacingFromPuck: { min: 80, max: 260 } },
      RD: { spacingFromPuck: { min: 80, max: 260 } },
    }
  },
  {
    id: "ozone_right_wall_cycle",
    phase: "O-zone",
    pressures: ["Low", "Med", "High"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 900, y: 410 },
    offenseFull: [
      { role: "C",  x: 790, y: 320 },
      { role: "LW", x: 800, y: 190 },
      { role: "RW", x: 910, y: 400 },
      { role: "LD", x: 710, y: 180 },
      { role: "RD", x: 740, y: 260 },
    ],
    defenseFull: [
      { role: "F1", x: 880, y: 395 },
      { role: "F2", x: 820, y: 360 },
      { role: "F3", x: 760, y: 440 },
      { role: "D1", x: 820, y: 260 },
      { role: "D2", x: 770, y: 290 },
      { role: "G",  x: 1040, y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — O-zone, puck on the right wall. You are ${role}. Where should you go to support the puck?`,
    guidanceByRole: {
      C:  { x: 790, y: 320, r: 95 },
      LW: { x: 800, y: 200, r: 95 },
      RW: { x: 900, y: 395, r: 70 },
      LD: { x: 710, y: 210, r: 95 },
      RD: { x: 745, y: 270, r: 85 },
    },
    rulesByRole: {
      C:  { spacingFromPuck: { min: 90, max: 260 }, beOutlet: { preferX: "less" } },
      LW: { spacingFromPuck: { min: 120, max: 320 } },
      RW: { spacingFromPuck: { min: 5, max: 160 }, beOutlet: { preferX: "less" }, stayAbovePuck: { margin: 60, allowDeeper: true } },
      LD: { spacingFromPuck: { min: 220, max: 540 } },
      RD: { spacingFromPuck: { min: 180, max: 420 } },
    }
  },
  {
    id: "dzone_halfwall_defend",
    phase: "Defend",
    pressures: ["High", "Med", "Low"],
    allowedFormats: ["5v5"],
    attackDir: "left",
    isDefense: true,
    puck: { x: 290, y: 180 },
    offenseFull: [
      { role: "C",  x: 370, y: 310 },
      { role: "LW", x: 320, y: 230 },
      { role: "RW", x: 450, y: 270 },
      { role: "LD", x: 240, y: 320 },
      { role: "RD", x: 290, y: 390 },
    ],
    defenseFull: [
      { role: "O1", x: 290, y: 180 },
      { role: "O2", x: 360, y: 240 },
      { role: "O3", x: 250, y: 410 },
      { role: "O4", x: 420, y: 160 },
      { role: "O5", x: 440, y: 330 },
      { role: "G",  x: 70,  y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — Defending, puck on the half-wall. You are ${role}. Protect the middle — where should you be?`,
    guidanceByRole: {
      C:  { x: 370, y: 310, r: 95 },
      LW: { x: 320, y: 230, r: 75 },
      RW: { x: 450, y: 270, r: 95 },
      LD: { x: 240, y: 320, r: 90 },
      RD: { x: 290, y: 390, r: 90 },
    },
    rulesByRole: {
      C:  { protectSlot: { slotSide: "left", radius: 170 }, spacingFromPuck: { min: 80, max: 260 } },
      LW: { protectSlot: { slotSide: "left", radius: 210 }, spacingFromPuck: { min: 40, max: 190 } },
      RW: { protectSlot: { slotSide: "left", radius: 270 }, spacingFromPuck: { min: 120, max: 320 } },
      LD: { protectSlot: { slotSide: "left", radius: 150 }, spacingFromPuck: { min: 60, max: 230 } },
      RD: { protectSlot: { slotSide: "left", radius: 190 }, spacingFromPuck: { min: 100, max: 300 } },
    }
  },
  {
    id: "breakout_d2d_reverse",
    phase: "Breakout",
    pressures: ["Med", "High", "Low"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 240, y: 520 },
    offenseFull: [
      { role: "LD", x: 210, y: 520 },
      { role: "RD", x: 280, y: 340 },
      { role: "C",  x: 340, y: 400 },
      { role: "LW", x: 290, y: 560 },
      { role: "RW", x: 460, y: 200 },
    ],
    defenseFull: [
      { role: "F1", x: 250, y: 500 },
      { role: "F2", x: 320, y: 450 },
      { role: "F3", x: 430, y: 340 },
      { role: "D1", x: 420, y: 470 },
      { role: "D2", x: 500, y: 260 },
      { role: "G",  x: 70,  y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — Breakout: D-to-D reverse look. You are ${role}. Be an outlet and protect inside ice.`,
    guidanceByRole: {
      C:  { x: 350, y: 410, r: 95 },
      LW: { x: 290, y: 560, r: 75 },
      RW: { x: 470, y: 210, r: 95 },
      LD: { x: 240, y: 490, r: 85 },
      RD: { x: 300, y: 340, r: 95 },
    },
    rulesByRole: {
      C:  { spacingFromPuck: { min: 80, max: 240 }, beOutlet: { preferX: "greater" } },
      LW: { spacingFromPuck: { min: 40, max: 180 }, beOutlet: { preferX: "greater" } },
      RW: { spacingFromPuck: { min: 150, max: 440 } },
      LD: { spacingFromPuck: { min: 30, max: 190 } },
      RD: { spacingFromPuck: { min: 90, max: 270 }, beOutlet: { preferX: "greater" } },
    }
  },
  {
    id: "breakout_center_swing_low",
    phase: "Breakout",
    pressures: ["Low", "Med", "High"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 190, y: 310 },
    offenseFull: [
      { role: "LD", x: 210, y: 360 },
      { role: "RD", x: 260, y: 270 },
      { role: "C",  x: 300, y: 320 },
      { role: "LW", x: 260, y: 430 },
      { role: "RW", x: 420, y: 210 },
    ],
    defenseFull: [
      { role: "F1", x: 220, y: 310 },
      { role: "F2", x: 300, y: 290 },
      { role: "F3", x: 380, y: 320 },
      { role: "D1", x: 420, y: 420 },
      { role: "D2", x: 500, y: 220 },
      { role: "G",  x: 70,  y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — Breakout: Center swings low. You are ${role}. Give an angled outlet — don't crowd the puck.`,
    guidanceByRole: {
      C:  { x: 310, y: 320, r: 90 },
      LW: { x: 270, y: 430, r: 80 },
      RW: { x: 430, y: 220, r: 90 },
      LD: { x: 240, y: 350, r: 85 },
      RD: { x: 290, y: 270, r: 85 },
    },
    rulesByRole: {
      C:  { spacingFromPuck: { min: 70, max: 210 }, beOutlet: { preferX: "greater" } },
      LW: { spacingFromPuck: { min: 90, max: 260 } },
      RW: { spacingFromPuck: { min: 140, max: 360 } },
      LD: { spacingFromPuck: { min: 40, max: 180 } },
      RD: { spacingFromPuck: { min: 60, max: 220 } },
    }
  },
  {
    id: "rush_wide_drive_trailer",
    phase: "Rush",
    pressures: ["Low", "Med", "High"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 610, y: 420 },
    offenseFull: [
      { role: "LW", x: 660, y: 450 },
      { role: "C",  x: 640, y: 320 },
      { role: "RW", x: 660, y: 200 },
      { role: "LD", x: 520, y: 360 },
      { role: "RD", x: 520, y: 260 },
    ],
    defenseFull: [
      { role: "D1", x: 760, y: 300 },
      { role: "D2", x: 760, y: 360 },
      { role: "F1", x: 650, y: 380 },
      { role: "F2", x: 560, y: 280 },
      { role: "F3", x: 580, y: 430 },
      { role: "G",  x: 1040, y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — Rush: wide drive with a trailer option. You are ${role}. Keep spacing and be available.`,
    guidanceByRole: {
      LW: { x: 680, y: 460, r: 90 },
      C:  { x: 650, y: 330, r: 90 },
      RW: { x: 680, y: 190, r: 90 },
      LD: { x: 530, y: 370, r: 95 },
      RD: { x: 530, y: 250, r: 95 },
    },
    rulesByRole: {
      LW: { spacingFromPuck: { min: 40, max: 170 }, stayAbovePuck: { margin: 80, allowDeeper: true } },
      C:  { spacingFromPuck: { min: 70, max: 260 }, beOutlet: { preferX: "greater" } },
      RW: { spacingFromPuck: { min: 160, max: 420 } },
      LD: { spacingFromPuck: { min: 70, max: 360 } },
      RD: { spacingFromPuck: { min: 70, max: 360 } },
    }
  },
  {
    id: "breakout_wheel_behind_net",
    phase: "Breakout",
    pressures: ["Med", "High", "Low"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 70, y: 350 },
    offenseFull: [
      { role: "LD", x: 105, y: 380 },
      { role: "RD", x: 170, y: 250 },
      { role: "C",  x: 300, y: 350 },
      { role: "LW", x: 270, y: 500 },
      { role: "RW", x: 450, y: 180 },
    ],
    defenseFull: [
      { role: "F1", x: 180, y: 420 },
      { role: "F2", x: 280, y: 330 },
      { role: "F3", x: 420, y: 250 },
      { role: "D1", x: 430, y: 430 },
      { role: "D2", x: 480, y: 180 },
      { role: "G",  x: 70,  y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — Breakout: D wheels behind the net. You are ${role}. Give a moving outlet up ice!`,
    guidanceByRole: {
      C:  { x: 300, y: 350, r: 90 },
      LW: { x: 270, y: 500, r: 80 },
      RW: { x: 450, y: 190, r: 95 },
      LD: { x: 115, y: 385, r: 75 },
      RD: { x: 180, y: 255, r: 85 },
    },
    rulesByRole: {
      C:  { spacingFromPuck: { min: 90, max: 300 }, beOutlet: { preferX: "greater" } },
      LW: { spacingFromPuck: { min: 120, max: 330 }, beOutlet: { preferX: "greater" } },
      RW: { spacingFromPuck: { min: 200, max: 500 } },
      LD: { spacingFromPuck: { min: 25, max: 160 } },
      RD: { spacingFromPuck: { min: 80, max: 250 }, beOutlet: { preferX: "greater" } },
    }
  },
  {
    id: "nzone_regroup_d2d",
    phase: "Rush",
    pressures: ["Low", "Med", "High"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 470, y: 250 },
    offenseFull: [
      { role: "RD", x: 480, y: 255 },
      { role: "LD", x: 470, y: 380 },
      { role: "C",  x: 560, y: 315 },
      { role: "LW", x: 700, y: 440 },
      { role: "RW", x: 700, y: 185 },
    ],
    defenseFull: [
      { role: "F1", x: 600, y: 310 },
      { role: "F2", x: 680, y: 240 },
      { role: "F3", x: 680, y: 390 },
      { role: "D1", x: 820, y: 260 },
      { role: "D2", x: 820, y: 360 },
      { role: "G",  x: 1040, y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — Neutral-zone regroup. You are ${role}. Reset with speed — give the D a target!`,
    guidanceByRole: {
      C:  { x: 560, y: 315, r: 85 },
      LW: { x: 700, y: 440, r: 90 },
      RW: { x: 700, y: 185, r: 90 },
      LD: { x: 470, y: 380, r: 85 },
      RD: { x: 480, y: 255, r: 75 },
    },
    rulesByRole: {
      C:  { spacingFromPuck: { min: 60, max: 220 } },
      LW: { spacingFromPuck: { min: 150, max: 380 }, beOutlet: { preferX: "greater" }, stayAbovePuck: { margin: 70, allowDeeper: true } },
      RW: { spacingFromPuck: { min: 150, max: 380 }, beOutlet: { preferX: "greater" }, stayAbovePuck: { margin: 70, allowDeeper: true } },
      LD: { spacingFromPuck: { min: 60, max: 200 } },
      RD: { spacingFromPuck: { min: 0, max: 140 } },
    }
  },
  {
    id: "ozone_faceoff_right_dot",
    phase: "O-zone",
    pressures: ["Low", "Med"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 878, y: 450 },
    offenseFull: [
      { role: "C",  x: 862, y: 455 },
      { role: "LW", x: 830, y: 400 },
      { role: "RW", x: 845, y: 505 },
      { role: "LD", x: 760, y: 250 },
      { role: "RD", x: 760, y: 420 },
    ],
    defenseFull: [
      { role: "O1", x: 892, y: 455 },
      { role: "O2", x: 905, y: 405 },
      { role: "O3", x: 905, y: 505 },
      { role: "D1", x: 930, y: 380 },
      { role: "D2", x: 950, y: 510 },
      { role: "G",  x: 1040, y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — O-zone faceoff, right dot. You are ${role}. Line up ready for the win back!`,
    guidanceByRole: {
      C:  { x: 862, y: 455, r: 65 },
      LW: { x: 830, y: 400, r: 75 },
      RW: { x: 845, y: 505, r: 75 },
      LD: { x: 760, y: 250, r: 95 },
      RD: { x: 760, y: 420, r: 90 },
    },
    rulesByRole: {
      C:  { spacingFromPuck: { min: 10, max: 90 } },
      LW: { spacingFromPuck: { min: 40, max: 180 } },
      RW: { spacingFromPuck: { min: 30, max: 160 } },
      LD: { spacingFromPuck: { min: 180, max: 420 } },
      RD: { spacingFromPuck: { min: 120, max: 340 } },
    }
  },
  {
    id: "dzone_net_front_battle",
    phase: "Defend",
    pressures: ["High", "Med"],
    allowedFormats: ["5v5"],
    attackDir: "left",
    isDefense: true,
    puck: { x: 120, y: 480 },
    offenseFull: [
      { role: "C",  x: 260, y: 400 },
      { role: "LW", x: 390, y: 220 },
      { role: "RW", x: 390, y: 440 },
      { role: "LD", x: 150, y: 340 },
      { role: "RD", x: 190, y: 460 },
    ],
    defenseFull: [
      { role: "O1", x: 120, y: 480 },
      { role: "O2", x: 200, y: 540 },
      { role: "O3", x: 250, y: 330 },
      { role: "O4", x: 420, y: 420 },
      { role: "O5", x: 420, y: 200 },
      { role: "G",  x: 70,  y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — Defending: puck in your corner, battle at the net-front. You are ${role}. Box out and protect the house!`,
    guidanceByRole: {
      C:  { x: 260, y: 400, r: 90 },
      LW: { x: 390, y: 220, r: 90 },
      RW: { x: 390, y: 440, r: 90 },
      LD: { x: 150, y: 340, r: 75 },
      RD: { x: 190, y: 460, r: 80 },
    },
    rulesByRole: {
      C:  { protectSlot: { slotSide: "left", radius: 190 }, spacingFromPuck: { min: 90, max: 280 } },
      LW: { protectSlot: { slotSide: "left", radius: 260 }, spacingFromPuck: { min: 200, max: 450 } },
      RW: { protectSlot: { slotSide: "left", radius: 240 }, spacingFromPuck: { min: 150, max: 400 } },
      LD: { protectSlot: { slotSide: "left", radius: 120 }, spacingFromPuck: { min: 60, max: 220 } },
      RD: { protectSlot: { slotSide: "left", radius: 170 }, spacingFromPuck: { min: 40, max: 180 } },
    }
  },
  {
    id: "ozone_low_to_high_point",
    phase: "O-zone",
    pressures: ["Low", "Med", "High"],
    allowedFormats: ["5v5"],
    attackDir: "right",
    puck: { x: 930, y: 520 },
    offenseFull: [
      { role: "RW", x: 930, y: 500 },
      { role: "C",  x: 820, y: 360 },
      { role: "LW", x: 820, y: 190 },
      { role: "LD", x: 760, y: 200 },
      { role: "RD", x: 760, y: 420 },
    ],
    defenseFull: [
      { role: "D1", x: 900, y: 410 },
      { role: "D2", x: 880, y: 300 },
      { role: "F1", x: 820, y: 440 },
      { role: "F2", x: 820, y: 260 },
      { role: "F3", x: 780, y: 320 },
      { role: "G",  x: 1040, y: 310 },
    ],
    prompt: (role, fmt) => `${fmt} — O-zone: low-to-high cycle. You are ${role}. Create shot support and protect against the turnover.`,
    guidanceByRole: {
      C:  { x: 820, y: 350, r: 95 },
      LW: { x: 820, y: 200, r: 95 },
      RW: { x: 920, y: 490, r: 75 },
      LD: { x: 760, y: 220, r: 95 },
      RD: { x: 760, y: 410, r: 95 },
    },
    rulesByRole: {
      C:  { spacingFromPuck: { min: 120, max: 320 }, beOutlet: { preferX: "less" } },
      LW: { spacingFromPuck: { min: 200, max: 520 } },
      RW: { spacingFromPuck: { min: 30, max: 180 }, beOutlet: { preferX: "less" } },
      LD: { spacingFromPuck: { min: 220, max: 540 } },
      RD: { spacingFromPuck: { min: 170, max: 540 } },
    }
  }
];

/* --- Special teams structures --- */
HIQ.ppPositions = function (structure) {
  if (structure === "one3one") {
    return [
      { role: "LD", x: 740, y: 310 },
      { role: "LW", x: 860, y: 200 },
      { role: "RW", x: 860, y: 420 },
      { role: "C",  x: 880, y: 310 },
      { role: "RD", x: 980, y: 310 },
    ];
  }
  return [
    { role: "LD", x: 720, y: 200 },
    { role: "RD", x: 720, y: 420 },
    { role: "LW", x: 860, y: 200 },
    { role: "RW", x: 860, y: 420 },
    { role: "C",  x: 860, y: 310 },
  ];
};

// A penalty kill is four skaters — no phantom fifth spot.
HIQ.pkPositions = function (structure) {
  if (structure === "diamond") {
    return [
      { role: "C",  x: 840, y: 310 }, // top of the diamond, pressures the point
      { role: "LW", x: 900, y: 240 }, // strong-side flank
      { role: "RW", x: 900, y: 380 }, // weak-side flank
      { role: "LD", x: 960, y: 310 }, // net-front
    ];
  }
  return [
    { role: "C",  x: 900, y: 260 },
    { role: "LW", x: 900, y: 360 },
    { role: "LD", x: 960, y: 260 },
    { role: "RD", x: 960, y: 360 },
  ];
};

/* Build the coaching spots FROM the structure actually selected, shifted toward
   the puck. Special teams units rotate as the puck moves — a static answer would
   teach kids to stand still, which is exactly the habit we're trying to break. */
HIQ.deriveGuidance = function (positions, puck, shift, radius) {
  const out = {};
  for (const p of positions) {
    out[p.role] = {
      x: Math.round(p.x + (puck.x - p.x) * shift),
      y: Math.round(p.y + (puck.y - p.y) * shift),
      r: radius
    };
  }
  return out;
};

/* Turn one template into an effectively unlimited supply of distinct reads.

   A fixed template teaches a kid to memorise a picture: "breakout means stand
   there." Real hockey IQ is reading what is actually in front of you, so every
   play mirrors the ice, nudges the puck, and moves the support spots and the
   opposition in response. The coaching answer changes every single time. */
HIQ.varyScenario = function (tpl, opts) {
  const clamp = HIQ.util.clamp;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const SWAP = { LW: "RW", RW: "LW", LD: "RD", RD: "LD", C: "C" };

  const out = Object.assign({}, tpl);
  out.puck = { ...tpl.puck };
  out.offenseFull = tpl.offenseFull.map(p => ({ ...p }));
  out.defenseFull = tpl.defenseFull.map(p => ({ ...p }));
  out.guidanceByRole = {};
  for (const [role, g] of Object.entries(tpl.guidanceByRole || {})) out.guidanceByRole[role] = { ...g };
  out.rulesByRole = Object.assign({}, tpl.rulesByRole);

  // 1. Run the same play off the other side of the ice. Mirroring across centre
  //    ice leaves the slot where it is, so only the wings and D swap hands.
  if (opts.mirror) {
    const flip = p => ({ ...p, y: 620 - p.y });
    out.puck = flip(out.puck);
    out.offenseFull = out.offenseFull.map(p => ({ ...flip(p), role: SWAP[p.role] || p.role }));
    out.defenseFull = out.defenseFull.map(flip);
    const g = {}, r = {};
    for (const [role, v] of Object.entries(out.guidanceByRole)) g[SWAP[role] || role] = { ...v, y: 620 - v.y };
    for (const [role, v] of Object.entries(out.rulesByRole)) r[SWAP[role] || role] = v;
    out.guidanceByRole = g;
    out.rulesByRole = r;
    out.mirrored = true;
  }

  // 2. Move the puck, and move every support spot in response. Players close to
  //    the puck adjust most; the far-side D barely shifts at all.
  const jitter = opts.jitter ?? 45;
  const px = clamp(out.puck.x + rnd(-jitter, jitter), 70, 1030);
  const py = clamp(out.puck.y + rnd(-jitter, jitter), 70, 550);
  const dx = px - out.puck.x, dy = py - out.puck.y;
  out.puck = { x: Math.round(px), y: Math.round(py) };

  for (const g of Object.values(out.guidanceByRole)) {
    const d = Math.hypot(g.x - px, g.y - py);
    const respond = d < 150 ? 0.7 : d < 300 ? 0.45 : 0.2;
    g.x = Math.round(clamp(g.x + dx * respond, 60, 1040));
    g.y = Math.round(clamp(g.y + dy * respond, 60, 560));
  }

  // Teammates stand where the coaching spots now are, so the picture stays honest.
  out.offenseFull = out.offenseFull.map(p => {
    const g = out.guidanceByRole[p.role];
    return g ? { ...p, x: g.x, y: g.y } : p;
  });

  // The rule bands were written for the template's fixed picture. Now that the
  // puck moves, give them the same slack so a correct read never falls outside
  // its own rule.
  const slack = Math.ceil(jitter * 0.9);
  const widened = {};
  for (const [role, r] of Object.entries(out.rulesByRole)) {
    const copy = { ...r };
    if (r.spacingFromPuck) {
      copy.spacingFromPuck = {
        min: Math.max(0, r.spacingFromPuck.min - slack),
        max: r.spacingFromPuck.max + slack
      };
    }
    if (r.protectSlot) copy.protectSlot = { ...r.protectSlot, radius: r.protectSlot.radius + slack };
    widened[role] = copy;
  }
  out.rulesByRole = widened;

  // 3. Pressure stops being a label and starts being real: under high pressure
  //    the opposition collapses on the puck, under low pressure they sag off.
  const press = { Low: -0.12, Med: 0, High: 0.14 }[opts.pressure] || 0;
  out.defenseFull = out.defenseFull.map(p => {
    if (p.role === "G") return p;
    const bx = p.x + dx * 0.5, by = p.y + dy * 0.5;
    return {
      ...p,
      x: Math.round(clamp(bx + (px - bx) * press + rnd(-13, 13), 55, 1045)),
      y: Math.round(clamp(by + (py - by) * press + rnd(-13, 13), 55, 565))
    };
  });

  return out;
};

HIQ.buildSpecialTeamsScenario = function (fmt, ppStruct, pkStruct) {
  const pick = HIQ.util.pick;
  const puckSpots = [
    { x: 860, y: 200, label: "half wall" },
    { x: 740, y: 310, label: "point" },
    { x: 860, y: 420, label: "half wall" },
    { x: 980, y: 310, label: "net-front" },
    { x: 910, y: 520, label: "goal line" }
  ];
  const puckSpot = pick(puckSpots);

  if (fmt === "5v4") {
    const off = HIQ.ppPositions(ppStruct);
    const def = (pkStruct === "diamond")
      ? [
          { role: "PK1", x: 900, y: 250 },
          { role: "PK2", x: 900, y: 370 },
          { role: "PK3", x: 960, y: 310 },
          { role: "PK4", x: 840, y: 310 },
          { role: "G",   x: 1040, y: 310 }
        ]
      : [
          { role: "PK1", x: 900, y: 260 },
          { role: "PK2", x: 900, y: 360 },
          { role: "PK3", x: 960, y: 260 },
          { role: "PK4", x: 960, y: 360 },
          { role: "G",   x: 1040, y: 310 }
        ];

    return {
      id: `PP_${ppStruct}_${pkStruct}_${puckSpot.label}`,
      phase: "Special",
      pressures: ["Low", "Med", "High"],
      allowedFormats: ["5v4"],
      attackDir: "right",
      puck: { x: puckSpot.x, y: puckSpot.y },
      offenseFull: off,
      defenseFull: def,
      prompt: (role, fmt2) => `${fmt2} — Power Play (${ppStruct === "one3one" ? "1-3-1" : "Umbrella"}). Puck at the ${puckSpot.label}. You are ${role}. Hold your spot and stay open!`,
      // Shift gently toward the puck: on the PP you stay in your lane but present
      // yourself as an option.
      guidanceByRole: HIQ.deriveGuidance(off, puckSpot, 0.14, 100),
      // On a power play any of these five can be the one holding the puck, so a
      // minimum spacing would punish the puck carrier for standing on the puck.
      // Holding the shape is what matters, and the positional score covers that.
      rulesByRole: {
        LW: { spacingFromPuck: { min: 0, max: 500 } },
        C:  { spacingFromPuck: { min: 0, max: 500 } },
        RW: { spacingFromPuck: { min: 0, max: 500 } },
        LD: { spacingFromPuck: { min: 0, max: 560 } },
        RD: { spacingFromPuck: { min: 0, max: 560 } },
      }
    };
  }

  if (fmt === "4v5") {
    const off = HIQ.pkPositions(pkStruct);
    const oppPP = HIQ.ppPositions(ppStruct);
    const def = oppPP.map(p => ({ role: `PP-${p.role}`, x: p.x, y: p.y }))
      .concat([{ role: "G", x: 1040, y: 310 }]);

    return {
      id: `PK_${pkStruct}_${ppStruct}_${puckSpot.label}`,
      phase: "Special",
      pressures: ["Low", "Med", "High"],
      allowedFormats: ["4v5"],
      attackDir: "right",
      isDefense: true,
      puck: { x: puckSpot.x, y: puckSpot.y },
      offenseFull: off,
      defenseFull: def,
      prompt: (role, fmt2) => `${fmt2} — Penalty Kill (${pkStruct}). Puck at the ${puckSpot.label}. You are ${role}. Rotate with the puck and protect the middle!`,
      // The box/diamond rotates toward the puck as the power play moves it around.
      guidanceByRole: HIQ.deriveGuidance(off, puckSpot, 0.20, 105),
      rulesByRole: {
        C:  { protectSlot: { slotSide: "right", radius: 230 } },
        LW: { protectSlot: { slotSide: "right", radius: 230 } },
        RW: { protectSlot: { slotSide: "right", radius: 230 } },
        LD: { protectSlot: { slotSide: "right", radius: 230 } },
        RD: { protectSlot: { slotSide: "right", radius: 230 } },
      }
    };
  }

  return null;
};
