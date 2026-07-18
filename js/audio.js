/* Hockey IQ Trainer — tiny synthesized sound effects (no audio files needed). */
window.HIQ = window.HIQ || {};

HIQ.audio = (() => {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  }

  function tone(freq, dur, type = "sine", vol = 0.14, when = 0, slideTo = null) {
    if (muted) return;
    try { ensure(); } catch (e) { return; }
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  const sfx = {
    pass()        { tone(660, 0.08, "triangle", 0.12); },
    catch()       { tone(880, 0.07, "triangle", 0.10); },
    shot()        { tone(300, 0.12, "square", 0.12, 0, 180); },
    goal()        { tone(220, 0.5, "sawtooth", 0.16); tone(277, 0.5, "sawtooth", 0.12, 0.05); tone(330, 0.6, "sawtooth", 0.10, 0.1); },
    goalAgainst() { tone(330, 0.35, "sine", 0.14, 0, 180); tone(180, 0.5, "sine", 0.11, 0.3, 120); },
    whistle()     { tone(2200, 0.25, "square", 0.05); tone(2100, 0.22, "square", 0.04, 0.05); },
    good()        { tone(523, 0.12, "triangle", 0.12); tone(659, 0.12, "triangle", 0.12, 0.12); tone(784, 0.2, "triangle", 0.12, 0.24); },
    clear()       { tone(523, 0.15, "triangle", 0.12); tone(784, 0.25, "triangle", 0.12, 0.15); }
  };

  return {
    play(name) { const f = sfx[name]; if (f) f(); },
    setMuted(m) { muted = m; },
    isMuted() { return muted; }
  };
})();
