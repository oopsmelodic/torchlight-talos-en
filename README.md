# Torchlight Talos — English userscript

English localization for the **original** [Tartarus simulator](https://torchlightskill.com/talos/). This repository ships a browser userscript and dictionaries, not a copy of the simulator. GitHub Pages is not used.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Open [talos-english.user.js](https://raw.githubusercontent.com/oopsmelodic/torchlight-talos-en/main/dist/talos-english.user.js) and choose **Install** in the userscript manager. If the browser displays plain text, create a new script in Tampermonkey, replace its contents with that file, and save.
3. Open or reload [the original simulator](https://torchlightskill.com/talos/). English is the default. The **EN → 中文** button at the bottom switches to the original Chinese; **中文 → EN** switches back. Close an open game dialog before using this button.

If scripts do not run, follow the manager's [permission instructions](https://www.tampermonkey.net/faq.php#Q209). Disable this userscript and reload to return completely to the original site.

## Scope

The bundled dictionary translates startup, settings, help, cell and Inmate labels, items, effects, events, rewards, results, journal entries, validation errors, dynamic tooltips, accessibility labels, and the CSS selection label. It observes DOM updates and translates native alert/confirm/prompt messages without changing their return values. Decorative rule highlighting is rebuilt around translated sentences to avoid broken words.

The script does not replace the engine, patch random numbers, change gameplay identifiers, modify input values, or translate saved JSON. It writes only its own language preference (`talos-english-userscript-language-v1`). Existing game saves remain on the original origin. There is no translation API, telemetry, remote dependency, or background request in the userscript. The original website's network activity, analytics, assets, and behavior remain its own.

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
