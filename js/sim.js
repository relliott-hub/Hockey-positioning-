/* Hockey IQ Trainer — play simulation runner.
   Runs a sequential list of steps; each step tweens pieces toward targets over its duration.
   Step: { d: ms, movers: [{obj, to:{x,y}}], sound: name, msg: text, banner: {text,sub,color,light}|null }
   A step without a `banner` key keeps the previous banner on screen. */
window.HIQ = window.HIQ || {};

HIQ.Sim = (() => {
  let running = false;
  let cancelled = false;
  let raf = 0;

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function run(steps, opts) {
    if (running) return false;
    running = true;
    cancelled = false;
    let i = 0, t0 = null, starts = null, banner = null;

    function frame(now) {
      if (cancelled) { running = false; return; }
      if (i >= steps.length) {
        running = false;
        if (opts.onDone) opts.onDone(banner);
        return;
      }
      const s = steps[i];
      if (starts === null) {
        t0 = now;
        if (s.sound && HIQ.audio) HIQ.audio.play(s.sound);
        if ("banner" in s) banner = s.banner;
        if (s.msg && opts.onMsg) opts.onMsg(s.msg);
        starts = (s.movers || []).map(m => ({ m, x0: m.obj.x, y0: m.obj.y }));
      }
      const p = Math.min(1, (now - t0) / (s.d || 1));
      const e = ease(p);
      for (const st of starts) {
        st.m.obj.x = st.x0 + (st.m.to.x - st.x0) * e;
        st.m.obj.y = st.y0 + (st.m.to.y - st.y0) * e;
      }
      if (opts.onFrame) opts.onFrame(banner);
      if (p >= 1) { i++; starts = null; }
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return true;
  }

  function cancel() {
    cancelled = true;
    running = false;
    cancelAnimationFrame(raf);
  }

  return { run, cancel, isRunning: () => running };
})();
