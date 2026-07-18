/* Hockey IQ Trainer — synthesized sound effects (no audio files needed). */
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

  // Filtered white-noise swell — used for crowd roar and ice spray
  function noiseBurst(dur, vol, when = 0, cutoff = 1100) {
    if (muted) return;
    try { ensure(); } catch (e) { return; }
    const t0 = ctx.currentTime + when;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt).connect(g).connect(ctx.destination);
    src.start(t0);
  }

  const sfx = {
    pass()        { tone(660, 0.08, "triangle", 0.12); },
    catch()       { tone(880, 0.07, "triangle", 0.10); },
    shot()        { tone(300, 0.12, "square", 0.12, 0, 180); },
    // Arena goal horn (minor-third blare) + crowd roar
    goal() {
      tone(233, 0.9, "sawtooth", 0.16);
      tone(311, 0.9, "sawtooth", 0.12);
      tone(466, 0.9, "sawtooth", 0.05);
      noiseBurst(1.5, 0.10, 0.15, 1400);
    },
    goalAgainst() {
      tone(330, 0.35, "sine", 0.14, 0, 180);
      tone(180, 0.5, "sine", 0.11, 0.3, 120);
      noiseBurst(0.9, 0.04, 0.1, 500); // low groan
    },
    whistle()     { tone(2200, 0.25, "square", 0.05); tone(2100, 0.22, "square", 0.04, 0.05); },
    good()        { tone(523, 0.12, "triangle", 0.12); tone(659, 0.12, "triangle", 0.12, 0.12); tone(784, 0.2, "triangle", 0.12, 0.24); noiseBurst(0.6, 0.03, 0.2, 1600); },
    clear()       { tone(523, 0.15, "triangle", 0.12); tone(784, 0.25, "triangle", 0.12, 0.15); },
    save()        { tone(140, 0.09, "square", 0.14); noiseBurst(0.25, 0.05, 0, 900); },
    faceoff()     { tone(180, 0.05, "square", 0.10); tone(180, 0.05, "square", 0.10, 0.12); }
  };

  return {
    play(name) { const f = sfx[name]; if (f) f(); },
    setMuted(m) { muted = m; },
    isMuted() { return muted; }
  };
})();
