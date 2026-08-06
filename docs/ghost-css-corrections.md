# Corrections to the 2026-08-05 Ghost/CSS meeting notes

**Scope:** this is the delta between what was said in the 2026-08-05 1:1 and what the theme actually does. It corrects the meeting record, not the design handoff — `docs/design-handoff.md` was already right, and is the document of record.

Everything below was verified by reading the theme and the running Ghost install, not inferred.

---

## 1. The headline correction: there is no Ghost grid to override

**What was concluded in the meeting:** copy Ghost's `cards.min.css` into the theme, reimplement its grid rules under the same class names, and load the result after `{{ghost_head}}` so it wins the cascade.

**What is actually true:** `cards.min.css` does not contain the grid. Verified directly against the running install's `content/public/cards.min.css` (45,401 bytes):

| Check | Result |
|---|---|
| `.gh-canvas` occurrences | **0** |
| `grid-template-columns` occurrences | 9 — all card-internal: `.kg-collection-card-grid`, `.kg-product-card-container`, `.kg-layout-split` |
| `.kg-width-wide` / `.kg-width-full` rules | `padding` and `font-size` only, and only *inside* header/signup cards — never `grid-column` |
| `240px` occurrences | 1 — `.kg-bookmark-publisher{max-width:240px}`, a text-ellipsis cap. Coincidence. |

The article grid lives in **our** `theme/assets/built/screen.css`. Ghost injects nothing that touches it. The rules that actually place wide and full-bleed cards — `.kg-width-wide{grid-column:wide-start/wide-end}` — are ours too.

**And the override is already built and shipped.** `theme/assets/css/measure.css` re-declares the entire `grid-template-columns` value for `.gh-canvas` and wins on load order at equal specificity. It has been live since July. The 240px sidenote cap is a literal in a file we own:

```css
[wide-start] minmax(auto, 240px)
[main-start] min(var(--content-width), calc(100% - var(--gap) * 2)) [main-end]
minmax(auto, 240px) [wide-end]
```

Widening the gutters is editing that number. No `cards.min.css` snapshot, no code injection, no cascade fight.

**Also:** the `?v=` query string is the same hash (`b88d67c627`) on *every* asset including `cards.min.css` — one global asset version, not per-file versioning. There is no upstream-drift risk from a copied snapshot, because there is no snapshot to take.

---

## 2. The real constraint is content, not CSS

The grid is free to change. **The 21 already-published posts are not.**

- Widen the gutters and `.kg-width-wide` figures narrow retroactively in every existing post.
- Change `--content-width` and `config.image_sizes.m.width = 720` no longer matches the column its images were sized for.

This is the actual reason 240px and 720px still stand, and it never came up in the meeting. It applies equally to the shelved TOC and to "let's just make the gutters bigger" — same cost, same shape. Worth stating plainly, because it is the constraint that survives every correction on this page.

---

## 3. One thing from the meeting that is right, for a different reason

Athan's mechanism — a `<link>` after `{{ghost_head}}` — is correct, and we do not currently do it. `{{ghost_head}}` is at `default.hbs:111`, **after** all ten of our stylesheets, and it injects `/public/cards.min.css` last. Confirmed from a captured local Ghost render:

```
/assets/css/fonts.css  →  …  →  /assets/css/footnotes.css  →  /public/cards.min.css
```

So today we cannot override any card-internal rule: callouts, bookmarks, toggles, product cards. That is a genuine gap worth closing on its own merits. It buys nothing for the grid, the gutters, or sidenote width.

---

## 4. Terms that were garbled, and where they came from

Every unfamiliar term in the meeting traces to the **appendix** of `docs/design-handoff.md` — a section explicitly headed *"Not a live decision."* Its constraints are the cost of adding a ~300px margin rail, not limits on the theme as it stands.

| Said in the room | Actual meaning |
|---|---|
| "seven rules we'd have to reimplement" | Re-declarations a **track-width change** would force. Not a tax on touching CSS at all. |
| "the rail" / "wide figures eat the margin without touching the rail" | transformer-circuits.pub's left TOC rail, x:142–390 at a 1600px viewport. Athan's guess that it meant roughly the gutter was right. |
| "870. 32 pixels" | **1872px** = 1200 + 300×2 + 36px gutters. The arithmetic closes. |
| "min width for side notes is like 992" | **1120px** (`footnotes.css`). 992 is the *TOC* threshold. Two different numbers for two different features. |
| "every gutter occupant needs min zero" | A **precondition for a TOC that does not exist**, not a bug to fix. The only gutter occupant today is `.gh-pagehead`, capped at `max-width: 200px`, so it never manifests. |
| "align-self stretch makes sticky inert" | True as CSS, same status — a precondition, not a live defect. `.gh-pagehead` already carries `height: max-content`, which is why its sticky works. |
| "you can only have 240 pixels in the side notes" | Our own number, in our own file. Changeable; see §2 for what it costs. |

---

## 5. What is actually still open

Removing the false constraints does not decide anything — it moves the open questions to where they belong. All three were deferred in the meeting as "not yet," and all three are now the live set:

- **Article measure.** ~720px→ narrower was agreed in direction, not in number. The body currently runs **85 characters**; ~72 means roughly 610px at today's 1.8rem, *or* holding 720px and raising the type size. The second lever avoids the `image_sizes` collision. State the target in characters and derive the pixels.
- **Gutter and sidenote width.** Now purely a content-cost question (§2), not a platform one.
- **Left-aligned versus centered prose.** Untouched by any of this, and the only direction in the transcript both parties warmed to without a constraint attached. It would dissolve the symmetric-gutter question rather than solve it.

---

## Provenance

Meeting: Mara + Athan 1:1, 2026-08-05. Corrections verified 2026-08-06 against `theme-readability-redux`, the theme source, and the Ghost 6.56 install at `content/public/cards.min.css`.
