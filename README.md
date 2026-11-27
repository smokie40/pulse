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

## v0.9.0

First-visit choice between guided coaching and free practice. Guided microphone connection, existing six-stage calibration, tempo check and return to plan. Training cards show pending speed-control target, sticking and subdivisions. Unfinished non-diagnostic plans checkpoint the next unfinished stage in local storage; the current stage restarts after interruption, not mid-beat. Audio engine unchanged. Microphone calibration is session-specific and must be repeated after reload when needed.

## v0.9.2

Separate free-practice settings from guided plan stages. Show a preparation screen before every planned stage, preserve the unfinished checkpoint when leaving for free practice, and prevent edited stages from advancing the checkpoint. Show fixed control tempo when recognition is not verified. Add browser smoke tests to the deployment pipeline. Guided tempos are locked to keep training conditions comparable; free-practice live tempo remains adjustable.

## v0.10.0

Guided tempo diagnosis uses independent 20-second steady-tempo searches, 20 BPM coarse steps, refinement to approximately 5 BPM, and a full 60-second verification. User-selected starting tempo, BPM 30–300; bounded to ten assessed search blocks and two control attempts, with one retry on insufficient recognition per block. No result without successful control. Intermediate diagnostic records do not establish working tempo. New estimates supersede older controls but do not certify multi-day mastery. Audio engine unchanged. CI uses Ubuntu 24.04 to support pinned Playwright.

## v0.11.0

Three progressive exercise levels per skill. Two distinct successful control days advance the task; failed controls reset the current evidence streak, unknown measurements never advance. Pulse controls analyze silent notes, flexibility controls analyze transitions and each subdivision, endurance controls compare early and late portions, dynamics requires a self-report after timing passes. Timing transfer uses left lead and doubles; hand choice and accent strength are not automatically detected. Skill levels are exercise milestones, not certifications of physical technique. No audio detector changes; the existing bar scheduler accepts a guided morph sequence.

## v0.12.0

Automatic recommendation selects a focus using comparable control history, repeat/confirmation needs, elapsed days and coverage. Manual focus applies to one newly started plan; pending plans remain unchanged. After at least 15 recorded minutes of speed/endurance practice in the local day, automatic recommendation rotates to another skill (a scheduling heuristic, not fatigue detection). Personal plans repeat the last successful control BPM when a second day is needed and reduce it by 5 BPM after a measured failed control. Unknown outcomes do not lower BPM. Next recommended focus appears after a completed plan. All data stays in browser storage. Audio engine unchanged.

## v0.13.0

Progress dashboard: 7/30/90-day practice volume and active days, historical successful fixed-tempo controls and two-day confirmed best, matched-BPM accuracy/RMS comparisons and six skill milestones. Filter by sticking and subdivision. No synthetic values for empty history. Export retained history as JSON. Current working tempo and milestones use all retained history; activity and comparisons use selected period. Browser history remains limited to 300 exercises; older removed data cannot be recovered. Audio engine unchanged.

## v1.0.0-rc.1

Release candidate: remove fixed 300-exercise history truncation, warn on storage failures, validate and merge history backups without duplicates, preserve local entries on invalid import, improve compact layout and keyboard dialog navigation. Browser storage remains finite; export regularly. Align 60-second control tolerance with completion logic. Added storage and mobile browser regression tests. Audio detector unchanged. Real hardware calibration and cross-browser manual validation remain release gates.

## v1.0.0-rc.2

Unified training home for first and returning visits: a recommended or unfinished session, six visible goal choices, and free-practice link. Detailed plan opens only after selection. Replacing an unfinished plan requires confirmation; recorded results remain. Optional diagnostic and editable starter reference tempo on plan preview. Steady exercise previews distinguish click from played strokes. No changes to training engine or detector.

## v1.0.0-rc.3

Compact training recommendation, prominent goal graphics and actual per-skill milestones for the current sticking/subdivision. Unassessed goals show no completed levels; resume summary shows remaining planned minutes and completed/current stages. Same three sections and training algorithms.

## v1.0.0-rc.4

Unified musical work surface: open recommendation area, direct resume and separate plan/cancel actions, explicit optional microphone and tempo check, distinct free-practice list, meaningful rhythm illustrations, editable plan sticking and subdivision, simplified performance and result presentation, evidence-first progress. Existing audio, detector, scoring, training, and storage modules are unchanged. Silent bars retain the intentional visual blackout.

## v1.0.0-rc.5

Semantic musical diagrams distinguish speed from subdivision; plan previews use consistent click/stroke graphics. Shorter entry copy, compact free-practice layout, progressive disclosure of analytics, evidence-only result histograms and interval accuracy. Raw hit times are not persisted; the current result contains aggregate timing bins. Existing detection, scoring, plan and storage modules remain unchanged.

## v1.0.0-rc.6

Larger semantic diagrams, measured home working tempo with context, compact guided setup, direct click and count-in controls for free practice, clearer live score and next-set preview, measured charts below immediate result actions. Silent intervals retain no rhythmic visual cues. No detector, scoring, or training algorithm changes.

## v1.0.0-rc.7

Optical polish: 1080px shared workspace, larger headings and musical labels, consistent spacing and fewer separators, visible keyboard focus, explicit microphone icon, clearer accent grouping, responsive layout. No changes to detection, scoring, training, or storage logic.

RC7 optical follow-up: balanced diagram typography and weights, simplified illustrative pulse, title-aligned arrows, neutral keyboard focus and a visible tempo-check action. Workspace scale and training logic unchanged.

## v1.0.0-rc.8

Unified goal and exercise selection surfaces: shared responsive grid, diagram dimensions, typography, subtle borders and hover targets; full-width adaptive mode with the same diagram scale. Compact training entry and clearer diagram semantics. New browser checks compare rendered dimensions across tabs at desktop, tablet and phone widths. Detector, scoring, training engine and storage are unchanged.

## v1.0.0-rc.9

Open score-inspired selection surfaces: title and short caption precede musical diagrams; internal vertical rules and shared horizontal rules define the choices without card fills or enclosing borders. Both tabs retain identical responsive diagram scale, typography and click targets. Adaptive mode remains a separate full-width row. No detection, scoring, storage or training algorithm changes.

## v1.0.0-rc.10

RC9 UI baseline preserved at `baseline/rc9-ui`. Direct time-signature selection, separate mode settings, keyboard focus preservation, unified setup controls, sticky stop control, no empty progress bar for unlimited practice, consolidated result summary, actual BPM scale and distinct result actions. RC9 selection matrices, detector, scoring and training algorithms retained. Additional E2E tests cover setup and results.

## v1.0.0-rc.11

Shared tempo-evidence contract and historical working-tempo calculation, including negative controls; diagnostic windows adapt to the minimum stroke count, with shared verification thresholds; checked microphone required for adaptive practice; persisted configuration normalization and immediate calibration-state refresh. No changes to the hit-detector or RC9 visual composition. Existing history retained; stricter evidence rules can change previously displayed working tempos.

## v1.0.0-rc.12

Behavior-preserving structural refactor. Studio locale catalog is resolved once, notation and musical illustrations accept explicit state, measured SVG reports are isolated, practice-field/formatting helpers are shared, and the stylesheet is moved out of HTML with the cascade preserved. Render stages are explicit functions rather than late overrides. The controller still owns navigation, microphone lifecycle and session state; those are not rewritten in this change. The classic page remains available. No change to the detector, visual baseline or measurement rules.

## v1.0.0-rc.13

Incremental live timing statistics with late-hit invalidation, bounded recent-note lookup, stable per-bar notation with moving current-note highlight, cancellation of obsolete microphone connection requests, hidden-page start guard and calibration reset on back-forward cache restoration. Final metrics retain the existing formulas. No hit-detector changes. Tests compare incremental/full statistics including long sessions and verify live SVG reuse.
