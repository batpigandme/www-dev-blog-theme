# Wider-scope probe material — additional to the requested pull

**This is not the requested deliverable.** For the literal ask (query `the-stakeholder-journey`, pull `html`/metadata, confirm Problem 3) see [`NOTE.md`](./NOTE.md) — that's the short, direct answer. Everything below is Mara's deliberate widening beyond what Design asked for: other local Ghost posts that exercise scenarios `the-stakeholder-journey` never touches, kept separate so the two don't get conflated.

**Source, per file:** same as `NOTE.md` — `posts` table, `html` column, read-only `sqlite3 -readonly`, nothing modified. These files come from a **second, separate local Ghost instance** — the `ghost-footnotes-sidenotes-541185` worktree's own DB, author `Local Test Admin`, not `mara`.

This is where the actual footnote/aside/paste-strategy probing happened — a matrix of test posts, prefixed `sidenotes--` below to avoid collision:

| file | title | status |
|---|---|---|
| `sidenotes--ingest-a.html` | INGEST-A kg-card-begin | draft |
| `sidenotes--ingest-b.html` | INGEST-B lexical html node | draft |
| `sidenotes--ingest-c.html` | INGEST-C whole-body html card | draft |
| `sidenotes--ingest-d.html` | INGEST-D surgical | draft |
| `sidenotes--ingest-e-real.html` | INGEST-E real post, whole-body html card | draft |
| `sidenotes--p0-b-aside-boundary.html` | P0-B aside boundary | draft |
| `sidenotes--p0-c-md-aside.html` | P0-C markdown cards + aside | draft |
| `sidenotes--p0-markdown-paste.html` | P0 markdown paste | draft |
| `sidenotes--p0-test.html` | P0 test | draft |
| `sidenotes--test-a-lexical-paste-the-stakeholder-journey.html` | TEST-A: Lexical Paste — The Stakeholder Journey | published |
| `sidenotes--test-b-single-markdown-card.html` | TEST-B: Single Markdown Card | published |
| `sidenotes--test-c-multi-markdown-card-split.html` | TEST-C: Multi Markdown Card Split | published |
| `sidenotes--test-d-figure-caption-paste.html` | TEST-D: Figure Caption Paste | draft |
| `sidenotes--test-f-controlled-full-paragraph-paste.html` | TEST-F: Controlled Full-Paragraph Paste | draft |
| `sidenotes--the-stakeholder-journey.html` | The Stakeholder Journey: From User to Contributor | draft |

**Not pulled:** `test-e-figure-width-height` — `html` column is `NULL` in the DB (draft never rendered). `about`, `coming-soon`, `this-is-a-test-post`, `balh` — scaffold/junk, not relevant to the footnote/aside/paste bug.

## Wider scope than the original Design ask, and why

Design's original request was scoped to `the-stakeholder-journey` alone. Widening it matters because that post never puts a footnote next to a figure/aside HTML card, so it can't exercise the one interaction [PR #8](https://github.com/stdlib-js/www-dev-blog-theme/pull/8) explicitly flags as **untested**: "whether footnotes elsewhere in the same post still resolve correctly when an aside's HTML card sits between paste-derived paragraphs." Three files here are different (not uniquely special, just different) probes of that exact boundary, and are the ones worth Design's attention beyond the single requested post:

- **`sidenotes--test-d-figure-caption-paste.html`** — a naive figure/caption paste followed by a footnote. No card wrapper forms at all; the footnote degrades to a bare `<a><sup>[1]</sup></a>` / `<ol>` with no `href`/`id`. This is the "`<figure>`-equivalent inline HTML merges into surrounding prose instead of becoming a card" failure named in PR #8's `223db4b` commit, caught live.
- **`sidenotes--p0-b-aside-boundary.html`** — an `<aside class="gh-aside">` HTML card sitting between two footnote-bearing paragraphs. Both footnote refs are Lexical-stripped (`<sup>1</sup>`, `<sup>2</sup>`, no anchors) on either side of the aside.
- **`sidenotes--p0-c-md-aside.html`** — the same aside-in-the-middle scenario, but split across two separate Markdown cards. Each card produces its **own isolated `<section class="footnotes">`**, i.e., numbering restarts per card — the exact bug `footnotes.js` was built to repair, caught here specifically with an aside also present.

None of the three show a clean pass. That's the finding: the untested boundary PR #8 called out is not just theoretically risky, it's broken in every paste pattern probed so far.

## Problem 3 (`## Sources` orphan-heading) — status against actual stored HTML

Design-handoff Problem 3 (`docs/design-handoff.md:155`) describes the bug as: markdown-it appends the footnote list at the very end of the card; a heading meant to label it (`## Sources`) ends up separated from the list by the author blurb/CTA/Acknowledgments/disclaimer, so `footnotes.js`'s "adopt the immediately-preceding heading" check fails, and readers get either a duplicated/orphaned heading or a headless list. The doc also notes Athan hand-strips `## Sources` during staging as an undocumented workaround.

Three different stored states, three different outcomes:

- **Published, this worktree's DB** (`the-stakeholder-journey.html`): no `## Sources` heading at all — it's gone. The footnote list (`<section class="footnotes"><ol class="footnotes-list">`) sits at the very end, after `## Acknowledgments` and the NSF disclaimer blockquote, with nothing labeling it. This matches the handoff's *other* documented case (`do-you-want-contributors`: footnote definitions, no heading) rather than the double-heading case — consistent with Athan having manually removed the heading before/during staging, exactly as the handoff describes.
- **`sidenotes--test-a-lexical-paste-the-stakeholder-journey.html`** (explicitly the naive-paste test): this is a partial/truncated paste (only a fragment of the real post, and `## What the journey is` appears twice), but it does show a live version of the bug's *shape*: `## Sources` sits mid-document, followed by a `<p>` containing the footnote reference, then `<hr>`, then a bare `<ol><li>` with the footnote definition — no `footnotes`/`gh-footnotes` wrapper class at all. Nothing here would be recognized as a footnotes block by `footnotes.js`'s adoption logic in the first place; it would render as an ordinary heading followed by an ordinary numbered list. So: yes, the underlying WYSIWYG-paste bug is live, but this sample is too truncated to show the exact "two headings, one empty" failure mode the handoff describes — it shows a different but related failure (heading present, but structurally disconnected from a footnote block Ghost doesn't recognize as one).
- **`sidenotes--the-stakeholder-journey.html`** (draft, full-length, different paste method than test-a): heading is `## Notes`, not `## Sources`, and — unlike the other two — it sits as the **immediately-preceding sibling** of a native Ghost/Lexical footnote list (`<ol>` with `gh-fnref-N-1` anchors, not markdown-it's `fn`/`footnote-item` pattern). Order is: `## Notes` → footnote `<ol>` → `<hr>` → `<hr>` → `## Acknowledgments`. This is the one sample where adoption *should* succeed — the label sits directly next to what it labels. It uses Ghost's native footnote card rather than markdown-it's rendering, which is a different code path entirely from the other two.

**Read together:** the bug is confirmed live in what naive markdown→WYSIWYG paste actually produces (`test-a-lexical-paste`), and separately confirmed live in what real staging currently ships (published `the-stakeholder-journey`, heading silently removed by hand). The one sample that looks structurally sound (`sidenotes--the-stakeholder-journey.html`) got there via a different paste mechanism (Ghost's native Lexical footnote card) rather than markdown-it footnotes — which points at "which paste method landed the content" as a variable Problem 3 doesn't yet account for, not just heading-adjacency.

**Direct confirmation, outside this DB, and against the live site:** `https://blog.stdlib.io/do-you-want-contributors/` (fetched live, not from any local DB) shows the identical structure — `<hr><hr><h2>Acknowledgments</h2>` / NSF disclaimer / `<hr class="footnotes-sep">` / bare `<section class="footnotes"><ol class="footnotes-list">`, no heading. Confirmed sequence per Mara: she fixed the live Ghost post first ("since that's what people actually see"), then went back and made `blog-drafts` commit [`383a2cf`](https://github.com/stdlib-js/blog-drafts/commit/383a2cfe2f245eaa623d34f4c34250c8ed1cd8b1) (2026-07-30, *"Remove `Sources` header which gets orphaned in Ghost when the footnotes render properly"*) to keep the repo consistent with what's live — repo syncing to production, not the other way around. This is the same class of silent workaround already on record in memory (`footnotes-crossposting-and-silent-workarounds`, which documents Athan doing the equivalent at staging time for other posts) — production is being hand-patched by more than one person, on more than one post, and `blog-drafts` only catches up after the fact.
