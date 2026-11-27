# Studio architecture

The maintained UI is `index.html`. `legacy.html` is a compatibility redirect, not a second application. Historical React source remains in Git history (RC19).

## Composition and ownership

- `src/studio.js`: bootstrap, shared context, render dispatch, global events.
- `studio/practice-state.js`: exercise settings and restoration of free practice.
- `studio/training-focus.js`: training preferences, recommendation and plan generation.
- `studio/plan-journey.js`: active route, checkpoint, completion and diagnostic progression.
- `studio/navigation.js`: screen transitions and guide context; DOM presentation is separate from transition logic.
- `studio/setup-controller.js`: setup controls, notation preview, tempo UI and guided locks.
- `studio/training-controller.js`, `training-view.js`: training events and presentation.
- `studio/playback.js`: start, frame loop and stop. Audio engine remains in `audio.ts`.
- `studio/session-record.js`, `session-results.js`, `results-view.js`: evidence record, session persistence and result presentation.
- `studio/microphone.js`: microphone and calibration lifecycle.
- `studio/persistence.js`, `storage.js`: storage boundary, validation and backup format.
- `studio/progress.js`: progress filters and view.
- `studio/dialog.js`, `settings-dialogs.js`: modal focus and settings controls.

Domain algorithms (training, calibration, detection, scoring, analytics, recommendations) are independent of the studio controllers. Keep these algorithms free of DOM dependencies.

## Styles

The stylesheet entry preserves the existing ordered cascade. RC20 removes repeated identical declarations with matching selector and media context. Different-value overrides, media rules, keyframes and order-dependent rules remain where visual equivalence is not established. Do not flatten them mechanically.

## Regression checks

`npm test` validates domain algorithms and isolated controllers. `npm run build` checks TypeScript and production assets. `npm run test:e2e` runs training, practice, progress, layout and navigation suites against the production build. Legacy URL compatibility is included. Chromium runs the full browser suite; Firefox and WebKit run the core compatibility smoke test. CI uses the committed npm lockfile and publishes only after these checks pass. Physical microphone performance and subjective visual parity still require manual evaluation.

## Data compatibility

The existing localStorage keys and backup schema remain unchanged. The old React page no longer writes to the same storage keys through its own implementation.

## Reliability constraints

Audio operations are cancellable; scheduler gaps or missed audible clicks invalidate the active session. Raw note samples are kept for measured reports and released after results are built. Without microphone analysis, only recent notes are retained. Free practice is bounded at 24 hours to match the history schema. History updates merge current persisted records and reconcile cross-tab events; localStorage is not a transactional multi-tab database. No microphone recordings are persisted.
