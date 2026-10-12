# Validation — userscript 0.1.0

Date: 2026-10-12. Original simulator v0.6.14; inspected revision is recorded in [source.json](source.json).

## Automated checks

- `npm test`: 10 passing tests. Covers dynamic nested templates, arbitrary numeric values, new DOM nodes and attributes, EN/CN reversal, native dialog messages, unknown-string diagnostics, unchanged input/save contents, implicit option values, retained click listeners, contextual Close/Off labels, and reordered highlighted rules.
- `npm run build`: 1,488 dictionary entries/templates and 63 glossary records. Repeated entries are included in this count; conflicting duplicates and altered placeholder IDs fail the build. Generated script has no runtime translation service or network request.
- `node scripts/check-upstream.mjs`: 48 completed seeded runs across Normal, Tusk, Prey, Scratch Marks, Rat Nest, and the three original challenge loadouts. Six seeds per mode; the final seed also exercises optional actions.
- 2,865 actions: 792 patrol visits, 816 day endings, 1,008 Consumes, 149 reward choices, 33 incident decisions, 8 replacements, 32 deliveries, 22 skipped deliveries, 3 scouts, and 2 reward refreshes.
- State equality is asserted after every action between two runs of the same unmodified engine, one accompanied by translated DOM rendering. Saved engine JSON remains byte-for-byte unchanged by the translator. All 48 export/import round trips and 48 undo checks pass.
- 2,237 unique collected dynamic messages were translated with zero remaining Han characters. This collection includes generated room descriptions, objective/reward panels, results, logs, and journals. It is a deterministic sample, not exhaustive proof of every possible game history.
- An additional render check of all 8 sample Torture Instruments and 4 Warden's Treasures confirmed English descriptions and retained colored rule spans, including reordered numbers and same-tier wording.
- `git diff --check` passes.

The engine check requires ignored local upstream inspection inputs, which are deliberately not shipped. Public CI runs the self-contained unit tests and verifies that the committed userscript matches the build.

## Browser checks

Tested the actual generated userscript in an isolated loopback preview, loading the original site's live JavaScript, styles, models, images, and audio. Only the preview removes analytics and injects the userscript; it does not modify engine modules. The original site's saves were not touched.

- Translated author notice and warnings; startup choices and displayed v0.6.14.
- New Normal run with a fixed seed; destination selection, confirmation, Execution Efficiency incident and translated journal.
- Reload and continue the saved run; objective explanation tooltip.
- Export dialog with original JSON schema, seed, actions, and Chinese engine data retained.
- Import of a Scratch Marks fixture through the browser file chooser; Consume, Ultimate milestone, instrument choice, application, and Undo One Step restoring the choice.
- Sound settings, option labels, mute/unmute, and beast preview controls. The interface reported Audio ready; audible output was not independently assessed.
- Gameplay Guide with matchups, rarity ladder, marks, assumptions, and reward explanations.
- EN → CN → EN restores the original Chinese text and returns to English.
- 2560×1440 desktop gameplay and reward cards; 390×844 portrait layout and successful end-day confirmation. Narrow-layout title wrapping and Confirm text were adjusted; the language button no longer covers Confirm.
- Final sampled screen: no visible untranslated text except the intentional language-switch label; no broken visible images; browser console returned no errors or warnings.

## Evidence limits

### Advisor 0.2.0 — 2026-10-12

- 21 self-contained tests pass (11 advisor tests plus 10 translation tests); build and whitespace checks pass.
- Independent original-engine acceptance: 200 completed games, 20,355 applied actions across Normal/Tusk/Prey/Scratch/Nest. Every candidate was checked against legal actions; input state stayed unchanged by the advisor; every explanation rendered in EN/RU. No Legendary/Ultimate replacements. All eight tool labels are unit-tested; sampled games selected seven tools (Burning Stake was not selected). This is compatibility evidence, not a comparative strategy benchmark.
- Browser: continued Day 11; recommended replacing Magic Cell 10 while keeping Ultimate Cell 2; displayed 52% downgrade and 11.25% pairing chances. Executed replacement manually, observed a new End recommendation, and used Undo to restore the original advice. Imported Scratch, observed the Ultimate 100% forecast, consumed the marked target, and opened the helper inside the reward dialog; it recommended Lost Key Ring with 15 closed cells.
- RU/EN panel controls, 2560×1440 desktop and 390×844 mobile layout, animation waiting state, and a clean sampled console were checked in the loopback preview. User saves on the original site were not touched. Extension installation remains untested here.
- A combined original Scratch/milestone status message still contains mixed Chinese/English; the new advisor's explanation is fully localized. This existing translation gap does not affect the recommendation and is not claimed as fixed by this release.

### Advisor 0.2.1 — follow-up pairing regression

- 23 tests pass, including the reported five-Inmate board, consumed-target removal, Chromatic confinement, custom Code weights, Saw branches, and stable ordering of effectively equal replacement scores.
- Repeated the original-engine acceptance on the same 200 seeded games: 20,413 legal applied actions, all games completed, zero Legendary/Ultimate replacements. All generated explanations render in EN/RU.
- Sample mean Chromatic by scene (40 games each), 0.2.0 → 0.2.1: Normal 3.575 → 3.75; Tusk 6.3 → 5.875; Prey 4.275 → 4.275; Scratch 3.975 → 4.675; Nest 4.1 → 3.8. Outcomes are mixed: this fixes a ranking asymmetry, not a demonstrated universal improvement. These small samples do not establish statistical superiority.
- The 0.2.0 browser layout checks remain applicable to the unchanged panel layout; 0.2.1 adds localized explanation text. No new extension installation check was performed.

### General limits

- This environment did **not** install the script through Tampermonkey or another extension on the original origin. The tested integration is the same generated script loaded directly in the preview. Userscript-manager permission and browser-specific execution issues remain an installation acceptance gap.
- All modes and endings were exercised in the engine harness; not every mode, ending, reward combination, or error dialog was played manually in the browser.
- Network-resource inspection was limited to successful live operation, visible image checks, and the console. It is not an exhaustive HAR audit of every optional sound/model.
- Chinese speech and text baked into images are unchanged. Original creator handles are intentionally preserved and explicitly excluded from untranslated-text diagnostics. Save/configuration JSON is deliberately untranslated.
- 27 glossary entries have paired TLIDB evidence; 36 are marked editorial/unverified. Future upstream changes can require new translations or selector adjustments.
- This is an English text companion for the online original. It is not an offline simulator, a GitHub Pages mirror, or an official release.
