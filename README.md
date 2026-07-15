<!--

@license Apache-2.0

Copyright (c) 2022 The Stdlib Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

-->

# Theme

> A Ghost theme for the official stdlib development blog.

A theme for [Ghost][ghost].

## Footnotes, sidenotes, and asides

The theme repairs and upgrades footnotes at render time via [`theme/assets/js/footnotes.js`][footnotes-js] and [`theme/assets/css/footnotes.css`][footnotes-css] (loaded directly, unminified, as the theme's CSS/JS minification pipeline is currently unavailable).

### Footnotes

Ghost emits inconsistent (and often broken) footnote markup depending on how content enters the editor. On each post, the script detects and normalizes all of the following into a single endnotes section with sequential numbering, working bidirectional links, and [DPUB-ARIA][dpub-aria] roles (`doc-noteref`, `doc-endnotes`, `doc-endnote`, `doc-backlink`):

-   content pasted into the Lexical editor, which strips footnote `id` and fragment `href` attributes;
-   Markdown cards, including posts split across multiple cards (which otherwise produce duplicate `id`s and per-card renumbering);
-   hand-rolled endnotes (`<sup><a href="#fn-1" id="ref-1">` references paired with `id="fn-1"` notes);
-   literal, unrendered `[^label]` references and `[^label]: …` definition paragraphs.

If a heading (e.g., "Sources") directly precedes the absorbed notes, its text is adopted as the endnotes-section title.

By default, footnotes are **endnotes only** — a plain numbered list at the end of the post, no margin mirroring. To also mirror each note into the right margin beside its reference (on viewports at least 1200px wide), tag the post `#sidenotes` in Ghost. `#`-prefixed tags are internal — hidden from readers, never shown on tag pages — but Ghost's built-in `post_class` helper still reflects them as a class on `<article>` (`tag-hash-sidenotes`), which `footnotes.js` checks; no template change is needed to use it. Margin copies are `aria-hidden` visual clones (non-tabbable, `id`-stripped); the endnotes remain the canonical, interactive copy at every viewport width, tagged or not.

Author asides (below) are margin-eligible independently of this tag — writing an `<aside>` is already an explicit, per-element request for margin placement, unlike footnote mirroring, which is automatic and therefore opt-in.

**Planned extension, not yet implemented**: per-footnote control (letting one note skip mirroring on an otherwise-`#sidenotes`-tagged post) is a possible follow-up, but is only reachable for hand-rolled notes — Ghost auto-generates and strips markup for the other three detection patterns, so there's no attribute an author could attach to those to carry a per-note override.

**Known limitation**: a Markdown card containing *only* footnote definitions (no in-card references) may be dropped entirely by Ghost at render time and cannot be recovered client-side. When authoring in Markdown cards, paste the whole post as a single card.

### What you'll see while editing vs. once published

The theme's repair happens client-side, on the *published* page — the Ghost editor never runs `footnotes.js`. That gap matters differently depending on how a footnote entered the post:

| How it was authored | While editing (Koenig) | Published, before JS runs | Published, after `footnotes.js` runs |
|---|---|---|---|
| Pasted into the Lexical editor | Looks essentially fine — numbered bracket refs (`[1]`) and a trailing numbered list with `↩︎` backlinks. **Nothing in the editor signals a problem.** | Broken: refs and backlinks carry no `href`/`id` at all — clicking does nothing. | Fully repaired, DPUB-ARIA, working links. |
| Single Markdown card | Editing that card shows its own self-contained preview; nothing looks wrong. | **Already works** — Ghost's native markdown-it-footnote output has real, working `id`/`href` pairs. | Same links, upgraded to consistent numbering and DPUB-ARIA roles (plus a margin sidenote if the post is tagged `#sidenotes`). |
| Footnotes split across multiple Markdown cards | Each card previews fine *on its own* — the problem only exists once cards are concatenated. | Broken: each card numbers its footnotes from 1, producing duplicate `id`s across cards and backlinks that jump to the wrong card. | Repaired — refs resolve to their own card's definition, renumbered sequentially across the whole post. |
| Hand-rolled `<sup><a href="#fn-1" id="ref-1">` + `<p id="fn-1">` (HTML card) | The HTML card shows raw source, not a rendered preview, while editing. | Already works — you wrote the `id`/`href` pairs yourself. | Folded into the same numbering sequence as any other footnotes on the post, DPUB-ARIA added (plus a margin sidenote if the post is tagged `#sidenotes`). |
| Literal `[^label]` / `[^label]: …` typed directly in the post body (not inside a Markdown card) | **The one case that looks obviously wrong while editing** — renders as plain visible bracket text, no special styling. | Still literal bracket text. | Converted into a real, working footnote. |

**The practical takeaway**: previewing a post in the Ghost editor does not tell you whether its footnotes will actually work once published — the Lexical-paste case in particular can look completely normal while editing and still ship broken links. **Always check the live published page**, not just the editor preview, before considering a post done. Newsletter emails render the raw Ghost output with no client-side JS, so none of this repair applies there — footnote links will not work in emails regardless of authoring method.

### Asides

Authors can add a sidenote that is not a footnote with an HTML card:

```html
<aside class="gh-aside" role="note" aria-label="Side note">
    <p>Aside text here. Links are fine.</p>
</aside>
```

On wide viewports, the aside floats in the right margin; on narrow viewports (or if JavaScript is unavailable), it renders as a visually delineated in-flow block. Add `data-placement="inline"` to keep it a full-width callout at all widths. The `aria-label` may be customized (e.g., `aria-label="Historical note"`).

**Always add an aside as its own deliberate HTML card** (`/html` in the Koenig editor) — writing `<aside>` inline in a Markdown card, or pasting it as part of a larger block, does not reliably produce that card. Render correctness once it's in a card is confirmed against Ghost's actual markdown-card renderer, [`@tryghost/kg-markdown-html-renderer`][kg-markdown-html-renderer].

**While editing**, the HTML card shows raw source, not a rendered preview — the aside will not visually look like a margin note in Koenig. It only takes on its margin position once published, when `footnotes.js` runs.

**Known open item**: whether footnotes elsewhere in the post still resolve correctly with an aside's HTML card sitting between paste-derived paragraphs — not yet verified; see the PR's test plan.

## License

See [LICENSE][stdlib-license].

## Copyright

Copyright (c) 2022. The Stdlib [Authors][stdlib-authors].

<!-- links -->

[ghost]: http://github.com/tryghost/ghost/

[footnotes-js]: https://github.com/stdlib-js/www-dev-blog-theme/blob/main/theme/assets/js/footnotes.js

[footnotes-css]: https://github.com/stdlib-js/www-dev-blog-theme/blob/main/theme/assets/css/footnotes.css

[dpub-aria]: https://www.w3.org/TR/dpub-aria-1.0/

[kg-markdown-html-renderer]: https://github.com/TryGhost/Koenig/tree/main/packages/kg-markdown-html-renderer

[stdlib-authors]: https://github.com/stdlib-js/www-dev-blog-theme/graphs/contributors

[stdlib-license]: https://raw.githubusercontent.com/stdlib-js/www-dev-blog-theme/main/LICENSE

<!-- /.links -->
