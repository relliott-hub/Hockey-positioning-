# 🏒 Hockey IQ Trainer

**[▶ Play it](https://relliott-hub.github.io/Hockey-positioning-/)** — works on any
phone, tablet or computer. No login, no install, no connection needed after the
first load.

Young players get taught skating, shooting and stickhandling. What they rarely
get taught is **where to be** — and that's what separates good players from
great ones. This game puts a kid in a real situation, asks where they should
skate, and then runs the play so they can see whether their read was right.

---

## How it works

1. A play is set up — a breakout under pressure, a rush through the neutral
   zone, a defensive-zone battle, a power play.
2. Three spots appear on the ice: **A**, **B** and **C**. The player reads where
   the puck is and taps where they should go.
3. The play runs. Passes, carries, shots, saves, goals — you see whether your
   positioning made the play work.
4. The coach explains what happened, and specifically what was wrong with a
   miss: *"You chased the puck instead of holding your support spot."*

Every play is different. The ice mirrors, the puck moves, and the teammates and
opposition shift in response, so the right answer changes every single time —
kids have to read the play rather than memorise a picture.

## Features

- **Three age groups** (6–8, 9–11, 12–14) and three difficulty levels that change
  scoring tolerance, how much variation you see, and how much coaching you get
- **All three formats** — 5v5 even strength, 5v4 power play (umbrella or 1-3-1),
  4v5 penalty kill (box or diamond)
- **Every position** — C, LW, RW, LD, RD, each with its own correct read
- **Two answer styles** — tap A/B/C, or free-drag your player anywhere (advanced)
- **Make it yours** — name, jersey number, and team colour on your player
- **Progression** — XP, levels, streaks, and 12 trophies to unlock
- **Coach report** — tracks your session and shows your most common mistakes
- **Plays offline** — install it to your home screen and it works at the rink

---

## Running it locally

It's plain HTML, CSS and JavaScript — no build step, no framework, no runtime
dependencies.

```bash
# Any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly also works, though offline caching only activates
over http(s).

## Testing

```bash
npm install        # installs playwright-core (test-only dependency)
npm test           # 29 end-to-end checks against a real browser
```

The suite drives the actual game and covers the tutorial, the full gameplay
loop, drag mode, all three formats, persistence — and the **coaching
correctness invariants**:

- the ideal spot scores 100 in every age × difficulty combination
- the right answer always outscores both decoys
- every wrong answer names the mistake it represents
- plays vary enough that they can't be memorised

These exist because an audit found the game had been teaching wrong answers —
including marking a *perfect* placement as a turnover on Advanced. The tests
make sure that can't come back silently.

## Project layout

```
index.html              markup and layout
styles.css              all styling, mobile-first
js/data.js              scenario templates, special teams, scenario variation
js/sim.js               play simulation engine
js/audio.js             synthesized sound effects
js/app.js               scoring, rendering, input, progression
sw.js                   service worker (offline play)
manifest.webmanifest    installable app metadata
privacy.html            privacy policy (required for app stores)
tools/test.js           end-to-end test suite
tools/build-single-file.js   bundles everything into one shareable HTML file
tools/build-www.js      assembles www/ for native packaging
tools/make-icons.js     regenerates the icon set from one SVG source
docs/APP-STORE-GUIDE.md how to ship to the App Store and Google Play
```

## Deployment

Pushing to `main` publishes to GitHub Pages automatically via
`.github/workflows/pages.yml`. Nothing else to do.

## Roadmap

Ideas that would add the most, roughly in order of value:

- **Live read mode** — let the play develop for a couple of seconds before you
  choose, so you're reading movement rather than a still picture
- **Two-stage decisions** — after "where do you go?", ask "now what?"
  (pass, drive the net, hold the line)
- **More scenarios** — forecheck (F1/F2/F3), 2-on-1s and odd-man rushes,
  neutral-zone trap, 3v3 overtime, faceoff assignments
- **Coach mode** — a parent or coach picks the situation to drill
- **Daily challenge** — one fixed scenario a day, compare with teammates
