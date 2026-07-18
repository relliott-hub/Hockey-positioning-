# 🏒 Hockey IQ Trainer

A game that teaches kids of all ages **positional play** in hockey. Each play presents a real game scenario — a breakout, a rush, an offensive-zone cycle, defending, a power play, or a penalty kill — and the player picks the best spot on the ice. The game then **animates how the play turns out**: a crisp pass and a goal when the read is right, or a turnover (maybe even a goal against!) when it isn't.

## How to play

1. Pick your **age group**, **position** (C, LW, RW, LD, RD), and **difficulty**.
2. Read the play prompt (e.g., *"Breakout under pressure — where should you go?"*).
3. **Tap A, B, or C** to choose where to go on the ice (or switch to *Free drag* for advanced players and drag your player anywhere).
4. Watch the simulation:
   - **Great choice** → pass, carry, shot… **GOAL!** 🚨
   - **Good choice** → the play stays alive ⚡
   - **Poor choice** → turnover ❌ — and a really poor one can end up in your own net 😖
5. After a miss, the coach's area lights up green and you get to **try again**.

The scoreboard tracks goals for/against, your streak, and the **Coach Report** logs every attempt with the most common mistakes — handy for parents and coaches.

## Features

- **A/B/C choice mode** — kid-friendly: tap the best option and watch it play out
- **Free-drag mode** — advanced: position yourself (or your whole team in Multi mode) anywhere
- **Real player sprites** — top-down skaters with helmets, jerseys, and sticks that turn to face the puck and their skating direction; goalies with masks and leg pads
- **Living presentation** — 60 fps animation loop, puck trails, pulsing choice buttons, pop-in banners, goal-light flashes, and confetti goal celebrations
- **Animated play simulation** with sound effects (mutable) — passes, interceptions, counter-attacks, goal lights
- **All game states**: breakouts, rushes, o-zone cycles, d-zone coverage, PP (umbrella / 1-3-1), PK (box / diamond)
- **Age-aware coaching** — younger groups get bigger target areas, simpler feedback, and coach hints
- **Principle-based scoring engine** — spacing, being an outlet, protecting the slot, staying above the puck

## Running it

It's a static site — no build step. Open `index.html` in any browser, or enable **GitHub Pages** (Settings → Pages → deploy from branch) to play it at a public URL on phones and tablets.

## Project structure

```
index.html    — page markup & controls
styles.css    — styling
js/data.js    — scenario library, PP/PK structures, rink landmarks
js/audio.js   — synthesized sound effects (no audio files)
js/sim.js     — play animation runner (tweens pieces through scripted steps)
js/app.js     — game logic: scoring engine, choice generation, drawing, input
```

## Roadmap ideas

- More scenario packs (faceoff assignments, regroups, line changes, 3v3 overtime)
- Levels & badges (earn "Breakout Pro" after 5 correct breakout reads)
- Opponent movement during the decision phase (reads under time pressure)
- Save progress between sessions (localStorage profiles per kid)
