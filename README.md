# Torchlight Talos — English userscript

English translation and advisor **by oOpsiq**.

**Current version: 0.3.0.** Management advice now follows the enabled bottom action buttons for the currently selected cell. It does not suggest switching to another Inmate. Follow-up probabilities count only Consumes performed by the resulting Inmate in that same cell. If the selection or controls cannot be read reliably, advice waits instead of falling back to the whole board. Patrol choices, events, and rewards retain their existing handling. The simulator's own controls and rules are unchanged.

English localization for the **original** [Tartarus simulator](https://torchlightskill.com/talos/). This repository ships a browser userscript and dictionaries, not a copy of the simulator. GitHub Pages is not used.

[Russian strategy guide and advisor analysis](docs/strategy-guide.ru.md): why the original advisor can recommend rerolling an Ultimate Inmate, practical decisions, and a reproducible comparison of five policies. The userscript translates the advisor; it does not replace its decision logic.

Version **0.2.0** adds a separate **Talos Advisor** with English/Russian explanations, alternatives, and risks. It considers rarity, food pairings, instruments, marks, rewards, and remaining days. [How it works and its limits](docs/advisor.md). Existing installations can update through their userscript manager. The original advisor's decision logic remains unchanged.

## Install

**0.2.1 update:** Consumes now receive the same follow-up pairing bonus as replacements, weighted by the possible resulting rarity and Code. The advisor explains the next-pair chance and preserves deterministic ordering for tied scores. On the reported Day 6 board it recommends Cell 5 consuming Cell 13, with a 75% follow-up pair chance, instead of rerolling the existing pair.

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Open [talos-english.user.js](https://raw.githubusercontent.com/oopsmelodic/torchlight-talos-en/main/dist/talos-english.user.js) and choose **Install** in the userscript manager. If the browser displays plain text, create a new script in Tampermonkey, replace its contents with that file, and save.
3. Open or reload [the original simulator](https://torchlightskill.com/talos/). English is the default. The **EN → 中文** button at the bottom switches to the original Chinese; **中文 → EN** switches back. Close an open game dialog before using this button.

If scripts do not run, follow the manager's [permission instructions](https://www.tampermonkey.net/faq.php#Q209). Disable this userscript and reload to return completely to the original site.

Start or continue a Management Practice run, then click **Advisor** at the bottom left. Choose **Русский** for Russian explanations. Make and confirm moves using the game's own buttons; the advisor updates after the action. Its language is independent of the EN/CN game translation.

## Scope

The bundled dictionary translates startup, settings, help, cell and Inmate labels, items, effects, events, rewards, results, journal entries, validation errors, dynamic tooltips, accessibility labels, and the CSS selection label. It observes DOM updates and translates native alert/confirm/prompt messages without changing their return values. Decorative rule highlighting is rebuilt around translated sentences to avoid broken words.

The script does not replace the engine, patch random numbers, change gameplay identifiers, modify input values, or translate saved JSON. It writes only its own language preferences (`talos-english-userscript-language-v1` and `talos-advisor-language-v1`). The advisor reads the local autosave, projects visible information, and checks it against the rendered board before recommending a move. It does not use hidden prisoners, seed/RNG, or future incident types. It never writes the game's save or performs moves. Existing game saves remain on the original origin. There is no translation API, telemetry, remote dependency, or background request in the userscript. The original website's network activity, analytics, assets, and behavior remain its own.

## Source and attribution

- Original author: **爱玩游戏的吉吉罗**, Douyin **2051823335**; Bilibili **二零后游戏荒**.
- Author links: [Douyin](https://v.douyin.com/okD24Xnc6wo/), [Bilibili](https://space.bilibili.com/39881994).
- [Original source repository](https://github.com/xiaoyihuang0503-cyber/torchlightskill-talos).
- Inspected version: **v0.6.14**, **2026-10-12**; source commit [`bf4397331eae2e683268c508906c9aec38f69d1a`](https://github.com/xiaoyihuang0503-cyber/torchlightskill-talos/commit/bf4397331eae2e683268c508906c9aec38f69d1a).
- No project-wide upstream license was found. No license is assigned here to the author's code or assets. The original game code, graphics, models, fonts, and audio are not included in this repository. This companion is not an official game product or an author-approved release.

The translated author notice retains the free-to-play warning and the simulator's limits: fan-made practice, assumptions in rules and probabilities, original challenge modes, no official affiliation, and no promise of actual game returns.

## Terminology

[glossary.json](glossary.json) records the Chinese term, English wording, source URL, Chinese counterpart, review date, and verification status. **27 mappings** were matched to paired [TLIDB English](https://tlidb.com/en/Hyperlink) / [Chinese](https://tlidb.com/cn/Hyperlink) entries. The [SS14 season page](https://tlidb.com/en/Tartarus_Season) is only partially translated.

**36 entries are editorial/unverified**, including `Ultimate` for the Inmate rarity 至臻, the simulator's sample instrument and treasure names, and original practice modes. Their English wording is not presented as official. In particular, an English term found for an unrelated game system does not establish the Inmate rarity's name. TLIDB's awkward `On` label for 开 is recorded faithfully in the glossary; the interface uses the editorial action label `Open`.

## Development and updates

Requires Node.js 22 or newer. No runtime dependencies are installed in the browser.

```sh
npm ci
npm test
npm run build
```

Edit `locales/*.json` for complete strings or `{0}`-style dynamic templates. The original placeholder IDs must remain intact. `zz-composed.json` contains fixes for runtime combinations. Duplicate keys must agree; the build rejects conflicting values. Explicit `context: "close-control"` distinguishes the Close command from the Off status. Edit `glossary.json` with paired source evidence when confirming a term. Build generates the installable `dist/talos-english.user.js`; commit that file with the source dictionaries.

When upstream changes, record its new version and commit, compare changed UI messages and formatting against the inspected version, add translations, then repeat unit, dynamic, and browser checks before increasing the userscript version. A missing string is left intact rather than hidden. `window.TalosEnglish.getUntranslated()` lists untranslated text locally; it uploads nothing. `window.TalosEnglish.rescan()` clears that list and checks the current document again. Author names intentionally remain Chinese.

Optional maintainer inspection scripts use ignored `.local-source/` inputs. `scripts/extract.mjs` inventories strings; `scripts/check-upstream.mjs` exercises locally inspected upstream modules. These are not required to install or build the userscript. Do not add `.local-source/` or original assets to a public commit. The local preview harness (`node scripts/preview.mjs`) requires the inspected HTML in `.local-source/index.html`; it uses the original site's live modules and assets, listens on loopback only, and is not a distributable or offline simulator.

## Validation and remaining limits

See [docs/validation.md](docs/validation.md) for scenarios and evidence boundaries. Browser testing uses an isolated local preview with the original live modules/assets and the actual generated userscript; installation through a userscript-manager extension itself has not been tested in this environment.

Recorded Chinese speech, Chinese lettering baked into original images, author display names, and raw save/configuration JSON remain original. This is a text-interface translation, not English voice acting or replacement artwork. Upstream updates may add new strings or change markup; unvisited combinations are not guaranteed by the sampled checks. No offline mode or GitHub Pages mirror is provided.
