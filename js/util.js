/* Small shared helpers.

   These used to live at the top of js/data.js, alongside the old canvas-space
   scenario model. That model was replaced by authored plays measured in feet
   (js/rink.js, js/plays.js) after an audit found 35% of the answers it marked
   wrong broke none of its own coaching rules, and the file it lived in carried
   roughly seven hundred lines of superseded geometry plus a LANDMARKS table
   still holding coordinates for a canvas size the game no longer uses.

   Keeping dead geometry around the thing that replaced it is how a wrong model
   comes back, so it was deleted and the parts still in use moved here. */
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
