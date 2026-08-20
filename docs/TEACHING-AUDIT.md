# Teaching audit — does this actually help kids learn the game?

An honest assessment against published youth-hockey coaching guidance, not just
against whether the code works.

Sources consulted are listed at the end.

---

## 1. The problem that prompted this audit

> *"I don't see any real difference between two options most of the time, yet the
> outcome changes."*

Measured, and true. **33% of option pairs were closer than 20 ft**, the worst at
**7.6 ft** — 42 pixels on screen, when the option markers themselves are about
36 pixels wide. They were nearly touching.

Two spots a child cannot tell apart are not a choice. They are a coin flip with
consequences attached, and a coin flip teaches nothing except that the game is
arbitrary.

**Root cause:** options were authored as small *positional nudges* rather than
genuinely different *decisions*. "Stand here" versus "stand eight feet from
here" is not a hockey decision.

**Fixed.** Every option is now a different job, and the game refuses to show a
set that isn't:

| | Before | Now |
|---|---|---|
| Closest two options | 7.6 ft (42 px) | **20.9 ft (115 px)** |
| Pairs under 20 ft | 33% | **0%** |

The research made the fix obvious. Real breakout routes are *"up the middle,
weak-side winger, strong-side winger, bump to weak-side D"* — those are 25–40 ft
apart because they are different ideas, not different addresses.

---

## 2. What the research changed about the hockey itself

**The weak-side forward belongs in the low slot, not at the point.** The
coverage guidance is explicit: the weak-side forward plays the low slot watching
the opponent's weak-side defenceman, while the strong-side forward takes away
the pass to their point. This game had *both* wingers at the points, which left
the most dangerous ice on the sheet unguarded. Corrected in both defensive-zone
scenarios — and the alternative (going up to cover the weak point) is now
offered as a legitimate second choice, because some teams genuinely play it that
way, with the trade-off explained.

**Puck-chasing is the defining youth error.** When several players chase at
once, *"everyone ends up in the same area, passing lanes disappear, defensive
coverage breaks down, and large sections of open ice are left uncovered."* Every
scenario now includes it as a wrong option, and it is naturally far from the
correct spot — which is exactly why the separation problem and the teaching
problem had the same fix.

**"Stay on the defensive side of the puck."** The single simplest defensive
principle, and now the wording used in the defensive reads.

**Weak-side D drifting to the strong side** is named in the literature as the
most common young-defenceman breakdown. It is now the primary wrong option for
that position, described in those terms.

**The house is a definable area** — the box connecting the four faceoff dots to
the goal posts. It is now a real region in the code (`inHomePlate`) rather than
a vague notion of "the middle".

---

## 3. Where this game genuinely helps

- **It drills the read, not the skill.** Kids get skating and shooting practice
  constantly and positioning practice almost never. This is the gap.
- **It never punishes a defensible decision.** A third of what a player sees is
  "that works — and here's what the stronger option gives you". That is how a
  coach talks, and it is the opposite of the arbitrary feel that prompted this
  audit.
- **Reps are cheap.** A player sees more positioning decisions in ten minutes
  here than in a month of games, and each one is explained.
- **Outcomes are honest.** A correct read scores about 62% of the time. Position
  improves your odds; it does not guarantee the result.
- **Every claim is checkable.** The scenario spec states every read in plain
  language, and the test suite verifies that the words match the ice.

## 4. Where it falls short — honestly

### The biggest gap: it teaches spots, not principles

A player learns *"in this picture, go there."* What transfers to a real game is
the underlying rule — *support the puck, protect the middle, don't chase* — and
the game states those only in the feedback text, never as something the player
is asked to apply.

**Recommendation:** name the principle behind each read and track it. Show the
player "you've made 12 good *support the puck* reads and 3 poor *protect the
middle* ones." That turns a set of memorised pictures into transferable ideas
and makes the coach report genuinely useful to a parent.

### Six scenarios is not a season

Missing situations a youth player meets **every single game**:

| Situation | Status |
|---|---|
| Forechecking (F1 / F2 / F3) | **missing** |
| Backchecking / getting back | **missing** |
| Faceoffs (all four dots) | **missing** |
| Power play | **missing** — disabled in the UI |
| Penalty kill | **missing** — disabled in the UI |
| Defending an odd-man rush | **missing** |

Forechecking is the most valuable of these: it is a genuine three-way role
decision (F1 pressures, F2 takes the strong side, F3 stays high) and it is where
young teams most often collapse into a swarm.

### The 6–8 age group may be teaching the wrong thing entirely

This is the finding I am least comfortable with. USA Hockey's development model
warns that **teaching position too early can stifle creativity and a player's
ability to think on the fly**, and that young players should not be overwhelmed
with systems.

This game has a 6–8 setting that teaches positional systems.

**Recommendation:** re-frame that tier, or remove it. For that age the
defensible content is not "stand at the hash marks" but "don't all chase the
puck" and "be somewhere your friend can pass to you" — one idea per play,
loosely scored. If we keep a 6–8 mode teaching systems, we are building
something a knowledgeable coach would object to, and that objection would be
correct.

### No evidence it works

There is no measurement that a child who plays this makes better decisions on
the ice. Everything above is reasoning from coaching principles, which is a
sound starting point and not the same thing as evidence.

**Recommendation:** before selling this, get it in front of one real coach and a
handful of players and watch. That is worth more than another twenty scenarios.

---

## 5. What I would do next, in order

1. **Name and track the principle** behind each read — turns pictures into ideas
2. **Add forechecking** — the highest-value missing situation
3. **Re-frame or remove the 6–8 tier** — currently at odds with published guidance
4. **Re-author special teams** to the same standard and re-enable them
5. **Add faceoffs and backchecking**
6. **Test with real kids and a real coach** before anything goes on sale

---

## Sources

- [USA Hockey ADM program overview](https://sahofhockey.sportngin.com/page/show/808421-usah-adm-program)
- [CAHA / USA Hockey ADM age-group best practices (10U–18U)](https://cdn1.sportngin.com/attachments/document/a86e-2813025/2022-23_10U_12U_14U_16U_18U__Updated_CAHA_USAH_ADM_Best_Practices.pdf)
- [Minnesota Hockey — player development](https://www.minnesotahockey.org/admkids)
- [USA Hockey ADM — 6U/8U player positions and learning the game](https://www.admkids.com/news_article/show/1199259)
- [Ice Hockey Systems — centre fly, weak-side wing support breakout](https://www.icehockeysystems.com/hockey-systems/center-fly-weak-side-wing-support-breakout)
- [Ice Hockey Systems — tips and drills to improve your defensive zone breakout](https://www.icehockeysystems.com/blog/coaching-tips/tips-drills-improve-your-defensive-zone-breakout)
- [The Coaches Site — breakout issues? It's likely something else](https://members.thecoachessite.com/article/breakout-issues-its-likely-something-else)
- [Defensive zone coverage habits: positioning and stick responsibility](https://training.rinkhive.com/2026/03/16/defensive-zone-coverage-habits-positioning-stick-responsibility/)
- [Better Hockey — defensive zone positioning basics](https://www.betterhockey.com/blogs/hockey-training/defensive-zone-positioning)
- [Hockey positioning tips for beginners](https://allblackhockeysticks.com/hockey-positioning-tips-for-beginners/)
- [Positionless puck chasers in youth hockey](http://www.rutschhockey.com/article_puck-chasers.php)
- [Recurring mistakes across youth hockey](https://andrewtrimble.substack.com/p/there-are-a-handful-of-recurring)
