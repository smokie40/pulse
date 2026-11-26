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
