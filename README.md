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

1. A play is set up — a breakout under pressure, a forecheck, a faceoff in your
   own end, a two-on-one against you, a power play.
2. Three spots appear on the ice: **A**, **B** and **C**. The player reads where
   the puck is and taps where they should go.
3. The play runs. Passes, carries, shots, saves, goals — you see whether your
   positioning made the play work.
4. The coach explains what happened, and specifically what was wrong with a
   miss: *"You chased the puck instead of holding your support spot."*

Every scenario can run off either wing, and the position you're asked to play
changes, so there are a few hundred distinct reads to work through rather than a
handful of pictures. The positions themselves are *not* randomised: a spot only
means something in relation to the net, the goal line and the slot, and an
earlier version that nudged plays around by a few feet turned legal breakouts
into illegal ones. Variety comes from authoring more scenarios instead.

## How it's taught

The game ships working through a **season plan** of seven units, in the order
coaches actually teach: protect the house → get out of your end → move it up the
ice → take it back → keep it in their end → get back → special teams. A unit
opens the next one only when its reads are landing, and credit counts once per
position in a situation, so repeating the one read you find easy gets you
nowhere. Free play serves anything, for someone who already knows the game.

The order isn't invented — it follows Hockey Canada's "skills before tactics;
tactics before structure", which introduces defensive-zone positioning first and
holds special teams back until U13.

## Features

- **14 scenarios, 62 coached positions, 242 authored reads** — every one written
  by hand with the reason it's right, and the principle it teaches
- **Seven principles**, named in the feedback and tracked in the coach report, so
  a kid learns the idea rather than the picture
- **Three age groups** (6–8, 9–11, 12–14) and three difficulty levels that change
  scoring tolerance and how much coaching you get. The 6–8 tier leads with the
  principle instead of the system, which is what USA Hockey's development model
  asks for
- **All three strengths** — 5v5 even strength, 5v4 power play (1-3-1), 4v5
  penalty kill (box), with each player told the job they're doing: the point,
  the half-wall, the bumper, net front
- **Every position** — C, LW, RW, LD, RD, each with its own correct read
- **Two answer styles** — tap A/B/C, or free-drag your player anywhere (advanced)
- **Make it yours** — name, jersey number, and team colour on your player
- **Progression** — XP, levels, streaks, and 12 trophies to unlock
- **Coach report** — tracks your session and shows your most common mistakes
- **Plays offline** — install it to your home screen and it works at the rink
- **Runs smoothly on a phone** — players and chips are pre-rendered rather than
  re-traced every frame, and the pixel buffer is sized to what the device can
  actually afford, so a slow phone gives up a little sharpness instead of
  dropping frames

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
npm test           # 81 end-to-end checks against a real browser
```

Run it against the single-file bundle too, since that is what gets shared:

```bash
npm run build:single
GAME_URL="file://$PWD/dist/hockey-iq-trainer.html" npm test
```

The suite drives the actual game and covers the tutorial, the full gameplay
loop, drag mode, all three strengths, the season plan and persistence — plus
the **coaching correctness invariants**:

- the coached best read scores 100 in every age × difficulty combination
- every authored spot grades as the tier it was written as
- no two options a player chooses between are closer than 20 ft
- every read names the principle behind it, and every principle is taught
- the simulation never shows a pass across the front of your own net
- every situation's wording matches where things actually are on the ice
- the season plan serves one unit at a time and only a best read advances it
- nobody is ever pushed off the ice by the spacing pass
- a frame costs a sane number of canvas operations, and frames don't stall

Each of these exists because something was found to be wrong. An audit found
the game marking *perfect* placements as turnovers; a third of option pairs
were once closer than 20 ft; and the simulation once demonstrated the exact
pass the game tells kids never to make. The tests are there so none of that
can come back quietly.

## Project layout

```
index.html              markup and layout
styles.css              all styling, mobile-first
js/util.js              small shared helpers
js/rink.js              the ice in feet — dimensions, landmarks, named zones
js/plays.js             the hockey — authored scenarios, principles, season plan
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
- **More scenarios** — neutral-zone faceoffs, the three-on-two, 3v3 overtime
  (the forecheck, backcheck, odd-man rush, end-zone faceoffs and special teams
  are all in)
- **Coach mode** — a parent or coach picks the situation to drill
- **Daily challenge** — one fixed scenario a day, compare with teammates

The single most valuable next step isn't on this list: it's putting the game in
front of one real coach and a handful of players. Everything here is reasoned
from published coaching guidance, which is a sound way to build it and is not
the same as knowing it works. See `docs/SCENARIO-SPEC.md` — it states every
claim the game makes about hockey in plain language, so a coach can review it
without reading any code.
