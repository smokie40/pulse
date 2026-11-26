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

## v0.4.2 Click rejection

A new two-tone, softly enveloped click uses known 920/1840 Hz components. The microphone worklet rejects these frequencies with cascaded notch filters plus a broadband-energy criterion. A no-playing test checks actual microphone leakage; it is not a latency calibration. Synthetic tests do not guarantee performance on every pad, speaker or room.

## v0.5 Audio diagnostics

Four synthesized click timbres with matching notch frequencies, preview and independent click-level controls. Guided six-stage diagnostic records only numerical 2 ms energy features locally in memory, then replays the detection rule over sensitivity candidates. Matching counts are necessary but not proof of correct hit identity or timing. Repeat live after applying a candidate. Audio latency remains a separate problem; no automatic timing correction is applied.

## v0.5.1

Onset detector uses a decaying attack envelope and previous-hit tail rejection, with a minimum 22 ms separation. Strong new attacks can be detected during decay; weak fast strokes may still be missed. Same algorithm in replay. Diagnostic counts now use worklet capture markers and completion acknowledgement. Individual tests can be repeated and numerical features exported (no waveform/audio).

## v0.6 Workspaces

Training, free practice, progress and Audio Lab. Recognition checks are session-scoped and invalidated when audio settings change. Only checked sessions contribute to the coach and progress estimates; audio latency remains unmeasured. Audio and hit detection algorithms are unchanged.

## v0.6.1

Compact exercise settings, direct microphone toggle, and four performance display modes: grid, single-line pad notation, beat pulse, timer. Next-bar preview is optional. Silent ghost-click bars suppress moving visual timing cues in every mode. Existing detector is unchanged.

## v0.7 Integrated studio

The approved Design Study 05 HTML/CSS is the new shell, using PulseEngine, the existing AudioWorklet detector, calibration and coach modules. Existing pulse-history/settings/language storage is retained. Classic React UI remains at legacy.html. Manual tempo changes apply to future scheduled notes; adaptive and ladder tempo are automatic. Audio latency remains unmeasured.

## v0.7.1

Immediate audition on timbre selection. Distinct narrowband fundamentals (soft 920 Hz, studio 1450 Hz, digital 2250 Hz, low 620 Hz) with corresponding reference rejection filters. Soft and low timbres and onset detector remain unchanged. Recheck calibration when changing sound. Rapid preview requests supersede earlier requests.

## v0.7.2

Training screen organized around a selected skill, duration-proportional route, and focused exercises. Six skill goals; plans fit requested duration and use checked history for working tempo. Speed uses adaptive mode only when microphone and recognition are ready; otherwise a tempo ladder. Dynamics and endurance are practice goals, not automatically certified skills. Audio engine unchanged.

## v0.7.3

One duration-weighted visual route instead of duplicated timeline and rows. Separate skill selection. Optional two-minute bounded adaptive tempo check with verified microphone; incomplete checks do not establish working tempo. Timing practice and control use the same BPM, reducing click support for the control. Existing audio engine and detector unchanged.

## v0.8.0

Measured three-bar constant-tempo windows drive speed control targets. Planned accelerations capped at +20 BPM per exercise. Only completed, verified, comparable controls on two different local days confirm a tempo. Recent failed controls reduce working tempo. First-visit optional tempo check. No automatic claims about hand technique, dynamics or endurance. Thresholds are provisional training heuristics, not validated teaching standards. Audio engine and detector unchanged.

## v0.8.1

Display the package version and the deployed Git commit (short SHA) in the studio header at build time. Hover over the version for the build ID on compact displays. No changes to practice or audio logic.
