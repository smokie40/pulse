# PULSE

Browser-based practice-pad training studio for drummers. React, TypeScript, Vite and Web Audio API.

## Run locally

```sh
npm install
npm run dev
```

## Deploy

In Settings → Pages, choose GitHub Actions as the source. Run the Deploy PULSE workflow if needed.

Audio analysis is experimental; use wired headphones and calibrate timing. All practice data stays in your browser.

## v0.2 Adaptive coach

Adaptive speed requires a microphone. Every four bars the engine scores the first three bars, using the fourth for input latency. The threshold is heuristic, not a validated measure of technique. Working tempo is estimated per sticking and subdivision from measured practice. Coach plans are loaded stage by stage; no server or audio uploads.

## Languages

Russian and English are selectable in the header. The browser language is used on first launch; the choice is stored locally.

### Pages setup / Публикация

Build and tests are independent of deployment. If GitHub Pages is disabled, open Settings → Pages → Source and choose GitHub Actions (not Deploy from a branch). This enables the Pages site. Then use Actions → Deploy PULSE → Run workflow. No personal access token is required for normal deployment once the site is enabled.

## v0.4 Performance workspace

One- or two-bar count-in (not scored), distraction-free live display, next-bar preview, measured session report with 30-second windows and rule-based feedback. Timing analysis remains experimental; automatic audio calibration and real-pad validation are not yet implemented.
