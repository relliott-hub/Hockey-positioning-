# Shipping Hockey IQ Trainer to the App Store and Google Play

An honest, practical guide to getting this game onto phones as a paid app.

---

## Start here: the realistic sequence

Don't go straight to the app stores. The sequence that wastes the least money
and time is:

1. **Now — share the web link.** Testers open a URL, no install, no accounts.
   You find out whether kids actually keep playing. This costs nothing and is
   already live.
2. **Then — "Add to Home Screen".** The game is already a full PWA: it installs
   to a phone home screen with its own icon and plays with no connection. For
   many families this *is* the app, and it costs nothing to distribute.
3. **Only then — the app stores.** Once you know people want it and you've
   fixed what testing surfaced, invest the money and the weeks of review.

Steps 1 and 2 are done and working today. Step 3 is what this document covers.

---

## What it costs

| Item | Cost | Notes |
|---|---|---|
| Apple Developer Program | **$99 USD/year**, recurring | Required to ship to the App Store at all |
| Google Play Developer | **$25 USD**, one time | Cheaper and much faster to get through |
| Apple hardware | **A Mac** | Non-negotiable for building and submitting an iOS app |
| Store commission | **15–30%** of each sale | 15% under the small-business programs (under $1M/yr) |
| Privacy policy hosting | $0 | Already handled — see `privacy.html` |

**Recommendation: start with Google Play.** It's $25 instead of $99/year,
review takes days instead of potentially weeks, and it doesn't require a Mac.
Prove the concept there, then decide if iOS is worth it.

---

## What's already done

The technical groundwork is in place:

- ✅ **Offline-capable** — plays with no connection (service worker + cached shell)
- ✅ **Installable** — web app manifest, full icon set including maskable icons
- ✅ **Mobile-first** — designed for phones, works portrait and landscape
- ✅ **Zero dependencies, zero network calls** — nothing to audit, nothing to break
- ✅ **Privacy policy** — `privacy.html`, hosted at your Pages URL
- ✅ **Capacitor config** — `capacitor.config.json`, app id `ca.hockeyiq.trainer`
- ✅ **Build script** — `npm run build:www` assembles the shippable app
- ✅ **Test suite** — `npm test` runs 29 end-to-end checks

## What's still needed

- ⬜ Developer accounts (only you can create these — identity verification)
- ⬜ Banking and tax details for paid sales (only you)
- ⬜ Store screenshots at required sizes
- ⬜ Store listing copy, keywords, category
- ⬜ Age rating questionnaires
- ⬜ A real contact email in `privacy.html`
- ⬜ The actual build + submission (iOS needs a Mac with Xcode)

---

## Packaging with Capacitor

[Capacitor](https://capacitorjs.com) wraps the web game in a native shell. The
config is already committed; the dependencies are deliberately *not* installed,
so the web game stays dependency-free until you need them.

```bash
# One-time setup
npm install
npm install -D @capacitor/cli
npm install @capacitor/core @capacitor/ios @capacitor/android

# Build the web bundle and create the native projects
npm run build:www
npx cap add android
npx cap add ios          # Mac only

# After any change to the game
npm run cap:sync

# Open in the native IDE to build and submit
npm run cap:android      # opens Android Studio
npm run cap:ios          # opens Xcode (Mac only)
```

`npm run cap:sync` rebuilds `www/` and pushes it into both native projects, so
your normal workflow stays "edit the web game, run sync".

---

## The rejection risk you need to know about

**Apple App Store Review Guideline 4.2 (Minimum Functionality).** Apple rejects
apps that are "simply a web page bundled in an app". This is the single most
likely reason a wrapped web game gets turned down, and it's worth taking
seriously rather than discovering it after paying $99.

What works in your favour already:

- The game is fully functional offline — it is genuinely not a web page viewer
- It has real interactive gameplay, not documents or forms
- It has no browser chrome, no visible URL bar, no external links

What would strengthen it further before submitting:

- A native splash screen (Capacitor provides this)
- Haptic feedback on taps and goals (`@capacitor/haptics`) — small change, makes
  it feel unmistakably native
- Screen-orientation and status-bar handling via Capacitor plugins
- Removing anything that looks like a website (the "turn your phone sideways"
  banner should probably be hidden in the native build)

Google Play has no equivalent rule and is far more permissive about wrapped
web apps.

---

## Selling it: kids' apps have extra rules

This is a children's app, which means stricter requirements on both stores.
The good news is that **the game's design already puts it in the best possible
position**: it collects nothing, transmits nothing, and has no ads or analytics.
That eliminates most of what makes kids' apps hard to ship.

**Apple — Kids Category:**
- Must not include third-party analytics or advertising ✅ (you have neither)
- Must have a privacy policy ✅ (`privacy.html`)
- Parental gate required before any external link or purchase — relevant if you
  later add "buy the full version" inside a free app
- Cannot transmit personally identifiable information ✅ (you transmit nothing)

**Google Play — Families / Designed for Families:**
- Content rating questionnaire (this will rate very cleanly)
- Must comply with the Families policy, including no data collection from
  children without consent ✅ (you collect none)
- Target audience declaration

**COPPA / GDPR-K:** These regulate collecting personal information from
children. Because the app collects none and sends nothing off-device, the
compliance burden is minimal — but *keep it that way*. The moment you add
analytics, ads, cloud save, or leaderboards, this becomes a genuinely
complicated legal area. If you ever want those, get advice first.

**Paid vs free:**
- A **paid app** ($2.99–$4.99 is typical for a kids' sports trainer) is by far
  the simplest — no in-app purchase code, no parental gates, no consumables.
- A **free app with a paid unlock** converts better but needs IAP integration,
  a parental gate, and restore-purchases handling.
- **Avoid ads entirely.** In a kids' app they invite scrutiny, hurt the
  experience, and would destroy the clean privacy position above.

---

## Store listing checklist

**Screenshots** (generate from the running game, don't mock them up):
- iPhone 6.7" — 1290×2796
- iPhone 6.5" — 1242×2688
- iPad 12.9" — 2048×2732 (only if you ship iPad support)
- Android phone — 1080×1920 or larger
- Feature graphic (Play only) — 1024×500

**Copy to prepare:**
- App name (30 chars) — "Hockey IQ Trainer"
- Subtitle (30 chars) — e.g. "Learn where to be on the ice"
- Description — lead with the problem it solves: kids are taught skills but not
  positioning; this teaches reading the play
- Keywords — hockey, positioning, youth hockey, hockey IQ, coaching, training
- Category — Education (primary), Sports (secondary)

**Timeline expectation:** Google Play, a few days. Apple, anywhere from two days
to two weeks including the account setup and any rejections. Budget for at least
one rejection on iOS and don't plan a launch date around the first submission.

---

## What I can help with next

- Generating all the store screenshots at exact required sizes
- Writing the store listing copy and description
- Adding the native polish that reduces 4.2 rejection risk (splash, haptics,
  status bar, hiding web-only UI in the native build)
- Wiring up in-app purchase if you go the free-with-unlock route

What I can't do: create your developer accounts, verify your identity, enter
your banking details, or run Xcode. Those are yours.
