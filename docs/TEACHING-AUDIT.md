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

### ~~The biggest gap: it teaches spots, not principles~~ — addressed

All 242 authored reads now carry the principle they teach or break, drawn from
a deliberately small set of seven. The game names the principle in its feedback,
and the coach report leads with which ideas have landed and which keep costing
the player:

> **Work on this** — Stay above the puck: 0 of 7
> **Going well** — Protect the middle: 7 of 7

That is a sentence a parent can act on. "68% correct" is not.

### ~~Six scenarios is not a season~~ — now fourteen, and every named gap is filled

Every situation this audit listed as missing now exists:

| Situation | Status |
|---|---|
| Forechecking (F1 / F2 / F3) | **added** — 1-2-2 in their end, five coached positions |
| Neutral-zone forecheck | **added** — 1-2-2 holding the line, five positions |
| Backchecking / getting back | **added** — five positions |
| Defending an odd-man rush | **added** — the two-on-one, five positions |
| Faceoffs | **added** — defensive-zone and offensive-zone draws |
| Power play | **added** — 1-3-1, re-authored and re-enabled |
| Penalty kill | **added** — passive box, re-authored and re-enabled |

Forechecking is built on the 1-2-2 the sources recommend for youth teams, where
the two middle forwards "create a wall effect that eliminates cross-ice passing
options". The centre's read is the angle itself — skating straight at the
carrier is the wrong option, and holding the middle in a containment forecheck
is a legitimate second choice.

The **two-on-one** is the clearest piece of coaching consensus in the sport, so
it is taught as stated: take the pass away and let the goalie have the shot.
*"Giving up a low-percentage shot is a win; the goalie is trained to stop the
puck; the job is making sure the shooter, not the open teammate, gets it."* The
two wrong reads are the two real ways children lose it — lunging at the carrier
(*"a missed poke check turns a 2-on-1 into a breakaway pass"*) and sliding
across to the puck, abandoning the open man.

**Backchecking** reads are all about getting to the defensive side of a man,
because a *"trailing backchecker defends nothing"*. The standard assignment —
centre takes the middle lane, wingers the outside lanes — is the one taught,
since somebody has to clearly own the middle.

**Faceoffs** coach the four players who actually choose where to line up; the
centre's spot is fixed by rule. Worth noting for a reviewer: on a draw the
wingers take the opposing points, which is *different* from their in-play
coverage job in the defensive-zone scenarios, and the reads say so explicitly.
A child who notices that difference has learned something real.

### ~~Special teams were disabled~~ — re-authored and back on

They were switched off for several versions, and that was the right call: the
old versions drew a hardcoded umbrella and box regardless of what had been
selected, up to 282 px away from the structure they claimed to be showing.

They are now authored the same way as everything else — the **1-3-1**, which
"creates the most passing triangles and one-timer lanes", and the **passive
box**, which the sources recommend for "youth, beginner and less mobile teams"
because it "is forgiving, easy to teach, and rarely gives up a clean look if
players hold their spacing".

On special teams the job matters more than the badge on the jersey, so each
position carries the name of the job it is doing — *the point, the half-wall,
the bumper, net front, top of the box*. That vocabulary is the thing a kid needs
in order to follow a coach drawing on a whiteboard, and the game now says it out
loud. The test suite checks that a job is named on every special-teams play and
that the number of players on the ice matches the strength being advertised.

### ~~Random scenarios are not a practice plan~~ — added

This was the gap the whole re-authoring exposed. Coaches do not teach
positioning by showing a child a random situation and asking where to stand.
Published practice planners are numbered plans, each with a stated theme, worked
through in an order — and the order is not arbitrary. Hockey Canada's U13
pathway states the rule outright:

> **"skills before tactics; tactics before structure"**

and its U11 guidance introduces basic defensive-zone positioning before anything
else, holding special teams back to U13, where players *"should play in all
situations, power play, penalty kill and special teams"*.

So the game now ships as a **season plan** of seven units, running outward from
your own net: protect the house → get out of your end → move it up the ice →
take it back → keep it in their end → get back → special teams. A unit opens the
next one only once its reads are landing, and credit is tracked per *position in
a situation*, so grinding the one read you find easy advances nothing. Free play
is still a dropdown away for anyone who already knows the game.

That is the difference between a drill and a curriculum, and it is the single
biggest change in this revision.

### ~~The 6–8 age group may be teaching the wrong thing~~ — re-framed

USA Hockey's development model warns that **teaching position too early can
stifle creativity and a player's ability to think on the fly**. The game had a
6–8 setting that taught positional systems, which that guidance would object to.

The tier has been re-framed rather than removed. It now leads with the
**principle** — "Protect the middle: the front of your net is the most dangerous
ice" — instead of the system, and the target is twice as forgiving (20 ft versus
10 ft for the oldest group). The situation underneath is still real hockey; it
simply isn't asking a seven-year-old to memorise a breakout.

Removing the tier would have thrown away the audience most likely to buy this.
Teaching that age the *idea* rather than the *system* is defensible to any coach,
and it is what the guidance actually asks for.

### No evidence it works

There is no measurement that a child who plays this makes better decisions on
the ice. Everything above is reasoning from coaching principles, which is a
sound starting point and not the same thing as evidence.

**Recommendation:** before selling this, get it in front of one real coach and a
handful of players and watch. That is worth more than another twenty scenarios.

---

## 5. What I would do next, in order

1. ~~Name and track the principle behind each read~~ — **done**
2. ~~Add forechecking~~ — **done**
3. ~~Re-frame the 6–8 tier~~ — **done**, leads with the principle, not the system
4. ~~Re-author special teams and re-enable them~~ — **done**, 1-3-1 and box
5. ~~Add faceoffs and backchecking~~ — **done**, plus the neutral-zone forecheck and the two-on-one
6. ~~Sequence the scenarios the way a coach would~~ — **done**, seven units
7. **Test with real kids and a real coach** — the only item left, and the one that matters most

Everything above item 7 was reasoning from published coaching guidance, which is
a sound way to build this and is not the same as knowing it works. That has not
changed. What has changed is that there is now a season's worth of content and a
defensible order to put it in, so a coach reviewing it has something complete to
react to rather than a fragment.

### The neutral zone — added

More of a game happens between the blue lines than anywhere else, and almost
none of a young player's instruction does. Five scenarios now cover it from
every side:

| Scenario | What it teaches |
|---|---|
| `nz_trap_1_3_1` | Holding a 1-3-1: one pressures from the middle, three across the red line, one back |
| `nz_beat_the_trap` | The mirror of it — the boards and a quick D-to-D beat a trap; the middle never does |
| `nz_entry` | Width holds their defence apart, and a trailing late man answers a tight gap |
| `defend_three_on_two` | Strong-side D takes the carrier, weak-side D takes the pass, a forward back makes it even |
| `nz_faceoff` | A draw where both a win *and* a loss become a rush immediately |

Pairing the trap with beating it is deliberate. A child who has stood inside a
1-3-1 understands why the far wall is open, which is not something the second
scenario can teach on its own.

The zone-entry reads are built on the finding that controlled entries are worth
roughly **twice the offence** of a dump-in, and that a failed carry costs less
than coaches tend to assume — so the scenario teaches giving the carrier a way
in, rather than treating the dump as the default.

### Still missing

Honest list of what a youth player meets that this still does not cover:

| Situation | Note |
|---|---|
| Line changes and bench awareness | Real positional hockey, entirely absent |
| Defending a two-on-one *short-handed* | The even-strength version is in |
| Goaltending | Out of scope by design — this teaches skaters |

None of these is as large a gap as the ones closed here, and none should be
authored before a coach has looked at what already exists.

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

Added for this revision — practice planning, the new scenarios and special teams:

- [Hockey Canada — U13 player pathway (abridged)](https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Coaching/u13-program/downloads/2023/u13-player-pathway-abridged-e.pdf) — *"skills before tactics; tactics before structure"*, and players "should play in all situations"
- [Hockey Canada — skill development and progression for U11](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-11/coaches/skills) — 85% of practice on skills and tactics; basic defensive-zone positioning introduced first
- [Hockey Canada — answering questions about U9 hockey](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-9/faq) — positional play and faceoffs introduced later, on the move to full ice
- [Hockey Canada — player development definitions](https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Players/Downloads/2020/player-development-definitions-e.pdf) — practice-time splits by age
- [USA Hockey — 10U practice plan manual](https://usahockey.cachefly.net/Coaching/Manuals/10UPracticePlan.pdf) — numbered plans, each with a stated theme
- [USA Hockey — 14U/16U/18U practice plan manual](https://usahockey.cachefly.net/Coaching/Manuals/14_16_18UPracticePlan.pdf) — the "Team Systems" progression
- [Ice Hockey Systems — 1-2-2 neutral zone forecheck](https://www.icehockeysystems.com/hockey-systems/1-2-2-neutral-zone-forecheck) — the wall that removes cross-ice options
- [The Coaches Site — explained: 1-2-2 neutral zone forecheck](https://members.thecoachessite.com/article/explained-1-2-2-neutral-zone-forecheck)
- [Hockey forecheck systems: 1-2-2 vs 2-1-2 vs 1-3-1](https://hoopsking.com/blogs/ice-hockey/hockey-forecheck-systems) — why the 1-2-2 suits youth teams
- [How to play a 2-on-1 in hockey: offence & defence](https://hoopsking.com/blogs/ice-hockey/how-to-play-2-on-1-hockey) — play the pass, let the goalie have the shot
- [How to hockey — defence: improve your two-on-one skills](https://howtohockey.com/defense-improve-your-two-on-one-skills/) — stick in the lane; never lunge
- [Game theory and defending against a 2-on-1](https://puckplusplus.com/2017/12/16/game-theory-and-defending-against-a-2-on-1/) — the analytical counterpoint to "always play the pass"
- [Athletes Untapped — forecheck structure, and F3 as the high safety valve](https://athletesuntapped.com/blog/the-relentless-hunt-mastering-forecheck-structure-in-ice-hockey/) — staying above the puck
- [Wikipedia — backcheck](https://en.wikipedia.org/wiki/Backcheck) — wingers cover the last free attacker
- [The Coaches Site — offensive-zone faceoff concepts](https://members.thecoachessite.com/article/o-zone-faceoff-concepts) — all five players need a job on a win *and* a loss
- [The Coaches Site — explained: 1-3-1 power play formation](https://members.thecoachessite.com/article/explained-1-3-1-power-play-formation) — point, half-walls, bumper, net front
- [Edge Ice Academy — the role of the bumper in the 1-3-1](https://www.edgeiceacademy.com/article/the-role-of-the-bumper-in-the-1-3-1-power-play-the-engine-of-modern-offense)
- [Hockey power play setups](https://hoopsking.com/blogs/ice-hockey/hockey-power-play-setups) — the 1-3-1's passing triangles
- [Hockey penalty kill systems: box vs diamond vs wedge](https://hoopsking.com/blogs/ice-hockey/hockey-penalty-kill-systems) — the box is "forgiving, easy to teach" for youth teams
- [Better Hockey — how to kill a penalty](https://www.betterhockey.com/blogs/hockey-training/how-to-kill-a-penalty) — hold shape; the kill breaks down when one player runs around

*Note on sources: the governing-body documents (Hockey Canada, USA Hockey) are
the ones the curriculum order rests on. The coaching blogs are used for the
mechanics of individual systems, where they agree with each other; where they
disagreed — the umbrella's exact shape, diamond spacing, backcheck assignments —
the game takes the more conservative, more widely taught option and the reads
say when something is "how some teams play it" rather than the only answer.*
