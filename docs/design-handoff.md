# Design handoff — stdlib dev blog theme

Three design questions surfaced by the 2026-07-31 review of the deployed theme against production. This is a brief for a design session, not an implementation ticket.

**What this asks Design to do:** generate two or three concrete visual directions per problem, worked through against real content, so Mara and Athan can pick. The anatomy under each problem is the constraint surface — what is fixed, what is genuinely free to vary, and where in the codebase each direction would live.

Written against branch `theme-readability-redux`, which is the first branch to carry all of: footnotes/sidenotes, the gscan gate, native custom fonts, `page.hbs`, the search trigger, the share link, Fortran highlighting, `--content-width`, and the citation block. Everything described below as "current state" is what that branch actually renders.

---

## Platform constraint: this is a Ghost theme, not a free-form site

There is no code repo for what actually ends up published. Content is drafted as markdown in `blog-drafts`, but getting from draft to live post is a manual, copy-paste-laden process into Ghost's WYSIWYG editor — the published post lives only in Ghost's database, with no git history of its own. Only the *theme* (Handlebars templates plus CSS/JS) is in git. A from-scratch publishing pipeline was explored and deliberately rejected; Ghost's theming system is a hard constraint going forward, not an implementation detail to design around.

Concretely:

- Every direction has to be expressible as **Handlebars template changes** plus **additive CSS/JS files**. No arbitrary markup, no build step of our own.
- **`theme/assets/built/screen.css` is minified and cannot be regenerated.** The build needs a `shared` package that is not vendored, and no script rebuilds it. Never edit it. New rules ship as new files in `theme/assets/css/`, registered in `theme/default.hbs` after `built/screen.css`.
- **`theme/assets/css/screen.css` is the authored source of record but is not served.** It genuinely is the last of eighteen sources compiled into the built file, so it is the only readable map of what this theme customized on top of Ghost's Source and Journal layers — but nothing rebuilds it, so editing it is a silent no-op. Read it; never expect a change there to ship.
- Content structure is bounded by **Ghost's own primitives**: the Koenig card system (`.kg-width-wide` / `.kg-width-full` figures, separate cards that cannot share inline markdown — which is why footnote cross-links needed a JS fix), the `post_class` helper's conditional classes (`no-image` is the root cause of Problem 1), and the `.gh-canvas` named-grid-line system.
- Anything that looks right in a static mockup **still has to be verified against a real Ghost render**. Ghost's helpers inject classes and wrap content in ways a naive mock misses — this bit us directly: `{{url}}` rendering relative instead of absolute only showed up against a live page, not in the artifact mockup.
- Authoring is **WYSIWYG-only** now. The markdown in `blog-drafts` does not survive its trip into Ghost verbatim, since a human recreates it as cards. Any direction that depends on hand-written conventions in post source — where a heading sits, how content is broken into cards — has to survive that manual re-authoring step.

**`blog-drafts/docs/artwork/README.md` is not a source for this work.** That document is the editorial art direction for **figures, illustrations, and slides** — its palette, materials, and lighting guidance govern the images *inside* posts, not the theme's own typography or chrome. The only thing to take from it here is factual: feature images are authored at a default 2:1, which is a constraint the header has to accommodate. Do not derive theme colors from it.

**Carried-over constraint from `stdlib.io` (2026-07-31):** the main site and its docs are, per Athan, due for their own revamp and are not a design anchor to emulate — inspected directly, they are a plain system-ui stack, Bootstrap-era layout, no custom typography. But the docs are *intentionally* kept visually coherent with the blog today, so a blog direction that drifts too far risks breaking that family resemblance before the main site gets its own pass. Not a blocker; flag it to Athan if a direction would read as visually disconnected.

---

## Already decided — don't relitigate

- **Copy-to-clipboard buttons on the citation block are cut.** Not a design question. Already removed from the branch, along with `citation.js` and the `aria-live` status region that existed only to announce them. The citations are static, selectable text.
- **A DOI is an additive `doi` field alongside `url`**, never an override of it. Already corrected in `post.hbs`'s comment.
- **`--content-width` is shipped as a mechanism**, value unchanged at 720px. Not open here — a TOC decision is what determines whether that value ever changes. See the appendix.
- **Additive-only CSS convention holds.** Never edit `built/screen.css`.
- **Dark mode is out of scope.** See "Out of scope."

---

## Problem 1 — Header width coupling

**Current mechanism**, verbatim from `built/screen.css`:

```css
.gh-article:not(.no-image) .gh-article-header > * {
  grid-column: wide-start / wide-end;
}
```

Ghost's `post_class` adds `no-image` whenever a post has no feature image. So every direct child of the post header — byline, title, **excerpt**, feature image — goes to the wide grid track together, and only when an image is set. Without one, everything including the excerpt sits at normal main-track measure. Verified against four controlled test posts, varying image and excerpt independently; excerpt presence has no effect on its own.

**Two clarifications a mockup must get right:**

- The **excerpt is on the wide track too**, exactly like the title — it is a direct child of the header. It carries `max-width: 920px`, so it stops short of the full 1200px band, but it is *placed* wide. The narrower element is the separate post body (`.gh-content`), which sits outside the header.
- The body is **centered** under the wide header, not left-flush. `main-start`/`main-end` sit with equal buffer from `wide-start`/`wide-end`; the two tracks share a center line. A mockup that left-aligns both edges misrepresents the behavior.

Measured directly against a local Ghost 6.56 render of this branch, one post toggled between the two states at a **1280px viewport**:

| Element | With feature image | Without |
|---|---|---|
| `.gh-article-title` | x 40–1240 (**1200px**, wide track) | x 280–1000 (**720px**, main track) |
| `.gh-article-image` | x 40–1240 (1200px) | — |
| `.gh-article-excerpt` | x 40–**960** — starts at `wide-start` but stops at its own `max-width: 920px` | x 280–1000 |
| `.gh-content` body copy | x 280–1000 (720px) | x 280–1000 (720px) |
| `post_class` | `gh-article post` | `gh-article post no-image` |

Note the body's buffers: 280 − 40 = 240 on the left, 1240 − 1000 = 240 on the right. **Exactly equal** — the wide and main tracks share a center line, and the body does not shift when the header widens. Only the header moves.

**Confirmed against Journal's own upstream demo (2026-07-31)**, since Athan built this theme starting from Journal and it is a taste anchor for him: `journal.ghost.io/welcome/` shows exactly this coupling, verified by direct DOM measurement at 1280px — title, byline, and feature image all render at the wide track (1200px), body copy drops to 720px immediately after. The visual cliff between header and body is real and pronounced even on Journal's own reference site; it is not something introduced by this fork.

Mara's read on *why* it reads fine there: Journal's demo images are abstract, decorative splash graphics — free to run huge because they carry no information. stdlib's feature images (the bowtie diagram, for instance) are often actually informative content, so the same move does not have the same justification and may not translate. **That is the crux of the A/B choice, not a taste preference.**

### The misalignment is almost never visible in one screenful — including here

Journal gets away with the width cliff partly because its feature images are enormous: you cannot see the excerpt and the body at the same time without deliberately zooming out. Measured on this branch at 1440×900, the same is true of stdlib at its own authored aspect ratio:

| Feature image | Rendered height | Body copy starts at | Both visible at once? |
|---|---|---|---|
| **2:1** (the art direction's default) | 600px | y = 1129 | **No** — 229px below the fold |
| 3.5:1 (short banner) | 343px | y = 872 | Yes, barely — 28px showing |

The crossover is around **3.2:1**. Anything squarer than that pushes the body below the fold, so a reader never holds the wide header and the narrow body in one view.

**This matters because it disqualifies the most intuitive argument for decoupling.** "The cliff looks jarring" is not the case to make — in practice it is rarely seen. Three arguments do survive, and the design session should choose between them explicitly:

1. **Informative images may not want hero treatment.** The bowtie diagram is content to be read, not a splash to be felt. Hero scale suits decoration; a diagram may be better served at a size where its labels are legible, which is a different question from how wide the title is.
2. **The inconsistency is felt across posts, not within one.** A reader moving from a post with a feature image to one without sees the title and byline begin at a different horizontal position each time — 120px versus 360px at 1440. That is a memory effect, not a co-visibility one, and it is the strongest argument against the coupling.
3. **The excerpt and body are set at different measures** (71 versus 85 characters) and read in sequence. Whether that shift is a deliberate change of register or an accident of the grid is a real call.

**Two candidate directions**, not mutually exclusive with refinement:

- **A — Keep the coupling.** The header goes wide whenever there is a feature image, as it does today and as Journal does. If this wins, the open question is whether the typography and spacing still feel right at that width, and whether stdlib's more-often-informative images read as well at hero scale as Journal's decorative ones.
- **B — Decouple the image from the text.** Feature image alone goes wide, matching how in-content `.kg-width-wide` figures already behave; title, byline, and excerpt stay at consistent main-track measure whether or not an image is present. A reader's eye never has to find a different starting position depending on which post they are on, and it sidesteps the decorative-versus-informative mismatch entirely.

**Anatomy:** a new standalone file (e.g. `theme/assets/css/header-width.css`) overriding that one selector — narrower and more targeted than touching `.gh-article-header` broadly. Does not interact with `--content-width`; this is purely a `grid-column` placement question, not a measure-value question, so there are no `image_sizes` implications.

**Constraints to design against:**

- Feature images vary a lot in height and aspect ratio. The art direction sets a default **2:1** and the publishing checklist standardizes splash images at roughly 1120×640, but the bowtie diagram is tall and other posts use short banners or none. Whatever ships should hold across that range, not just the reference post.
- **Mockup requirement:** the comparison frames must render at the **same viewport width**. A reader's browser does not resize between a post with a feature image and one without; only the grid placement changes inside a constant width. Sizing the frames differently implies the window narrows, which is the wrong model.

---

## Problem 2 — Citation block

**Current state** (`theme/assets/css/citation.css`, `theme/post.hbs`): too visually heavy — bordered, background-filled boxes, small mono type, reads like a UI widget rather than reference text.

The markup to restyle, as it now stands:

```html
<section class="gh-citation gh-canvas" aria-labelledby="gh-citation-heading">
  <h2 id="gh-citation-heading" class="gh-citation-heading">Cite this post</h2>
  <div class="gh-citation-block">
    <pre class="gh-citation-text" data-citation-format="apa"><code>…</code></pre>
  </div>
  <div class="gh-citation-block">
    <pre class="gh-citation-text" data-citation-format="bibtex"><code>…</code></pre>
  </div>
</section>
```

with `.gh-citation` at `margin-top: 4rem`, `padding-top: 2.4rem`, `border-top: 1px solid var(--color-light-gray)`; `.gh-citation-heading` at 1.6rem; `.gh-citation-text` boxed with `--color-lighter-gray` fill, a `--color-light-gray` border, and a 4px radius.

**One gotcha, already fixed, that any type spec must respect:** `built/screen.css` sets `code { font-family: var(--font-mono); font-size: 15px }` **directly on the element**, so a `font-size` on the `<pre>` never takes effect regardless of load order. The rule now targets `.gh-citation-text code`. Spec type against the `<code>`, not the `<pre>`.

**Reference aesthetics already gathered:**

- [dataand.me's citation section](https://dataand.me/blog/2021-12_madam-im-yadm/#citation) — plain text, a lighter-weight code block for the BibTeX entry, no box or background around the prose citation.
- Distill.pub — a two-column label/content layout for its meta sections (Citation, Footnotes, Acknowledgments, Reuse), each clearly delineated without heavy chrome.

**Fields available today:** title, author(s), date, canonical URL — all already on the post context. DOI is not available yet (pending Rogue Scholar registration, a separate multi-week process). One question is a genuine design input rather than a policy call: **where a minted DOI is stored** — the post's `canonical_url`, which the front-matter.de workflows use, or a separate custom field — determines whether the `url` line needs a conditional or can simply read `canonical_url` when set. Worth settling the shape now so the redesign leaves the right seam.

**Aim:** the block should read as reference material appended to the post, the way a paper's citation section does — de-emphasized relative to body copy, not competing with it for weight.

**Anatomy:** `theme/assets/css/citation.css` needs a rewrite (lighter type scale, no box or background). There is no interactive state left to design around — just typography and spacing for static reference text.

---

## Problem 3 — Bottom-matter structure

**Current state:** the footnote/endnote list, the citation block, the author bio, the repeated "about stdlib" boilerplate, and the NSF acknowledgment all run together with inconsistent or absent section labeling.

The real sequence, from `blog-drafts/mara-averick/the-stakeholder-journey` — the densest example there is:

```
## Sources          ← h2; footnote definitions, each with DOI links
* * *               ← <hr>
author blurb        ← <p class="dev-theme-author-blurb">
* * *               ← <hr>
About-stdlib + star/support CTA   ← pasted verbatim into every post from common/cta.md
## Acknowledgments  ← h2; NSF award link
> Disclaimer: …     ← blockquote
```

**Reference:** Distill.pub labels each of these as its own delineated section (References, Footnotes, Reuse, Citation, Acknowledgments, Updates and Corrections). Mara's personal blog does something similar and she likes that pattern.

**Why this is not a straight port of either:** neither carries an NSF-acknowledgment disclaimer or an author-bio section, both of which stdlib's posts need. The section set here is larger than either reference model, and the ordering and grouping of NSF-required content alongside the standard citation/footnote sections is a genuinely open structural question, not just a typography one.

### Measured anatomy — three rules, two widths, two colors

The last screenful of every post currently draws three horizontal rules, and they do not line up:

| Element | Placement | Rule width | Color |
|---|---|---|---|
| `.gh-footnotes` | a grid **item** of `.gh-content` | confined to the 720px main column | `--hr-background-color` `#e7e7e7` |
| `.gh-citation` | carries `gh-canvas` **itself** | edge-to-edge | `--color-light-gray` `#e6e6e6` |
| `.gh-article-footer` | carries `gh-canvas` **itself** | edge-to-edge | `--color-light-gray` `#e6e6e6` |

Each has real content beneath it, so these are not stacked hairlines — but a 720px rule followed by two full-bleed ones makes the narrower one look like the mistake. The full-bleed footer rule is pre-existing upstream behavior; adding the citation block as a second `gh-canvas` sibling doubled it. **Reconciling these three is the concrete core of this problem.**

### The endnotes block already has a treatment to reconcile with

`footnotes.js` appends `<section class="gh-footnotes" role="doc-endnotes">` **inside** `.gh-content`, styled at `margin-top: 4rem`, `padding-top: 2rem`, `border-top`, 1.5rem type, with a `.gh-footnotes-title` h2 at 1.8rem. That is one labelled bottom-matter block already built. Problem 3 reconciles with it rather than replacing it.

`footnotes.js` will adopt a heading's text as the endnotes title — but **only when that heading is the absorbed notes' immediately-preceding sibling.** In a real stdlib post it is not, and the orphan bug is live.

**Verified against a post shaped like `the-stakeholder-journey`** (Ghost 6.56, this branch): markdown-it always emits its footnotes section at the **end of the markdown card**, and a real post continues past `## Sources` with the author blurb, the About-stdlib CTA, and `## Acknowledgments`. So the raw notes land *after all of that*, the adoption check sees a `<blockquote>` (the NSF disclaimer) rather than a heading, and the result a reader gets is:

```
## Sources          ← heading, immediately followed by <hr>. Nothing under it.
author blurb / About-stdlib CTA / ## Acknowledgments / disclaimer
## Footnotes        ← the actual notes, under a second, template-supplied heading
```

Two headings for one idea, one of them empty. Adoption only fires in the degenerate case where the definitions are the last thing in the post — which is exactly what a minimal test post looks like and exactly what a real one does not.

**So this is open, and it belongs to this problem.** The fix is a design decision, not a script tweak. The WYSIWYG re-authoring step makes it worse, since the draft's heading position and the published card structure can diverge silently. Four shapes, in rough order of preference:

1. **Template-owned, fixed label.** Drop `## Sources` from the authoring convention; the theme always titles the section. Simplest and always correct in ordering — but it commits to one word for every post.
2. **Template-owned, per-post label via an internal tag.** Same mechanism PR #8 already uses for `#sidenotes`: tag a post `#sources` and the theme titles the section "Sources" instead of the default. Internal tags are hidden from readers, surface through `post_class`, and need no template change. Keeps ordering template-owned while letting the label follow the content, at the cost of one more thing for an author to remember.
3. **Script consumes a non-adjacent author heading.** Needs a rule for which heading counts, and that rule is itself a content convention — the fragile option, and it still fails on cross-posted copies.
4. **Leave it content-owned and fix the ordering by convention** — authors put `## Sources` last. Fights the way people actually write, and the bio and acknowledgments genuinely belong after the references.

**The label question is real regardless of mechanism.** stdlib's notes are mixed: in `the-stakeholder-journey`, `[^1]` is a pure citation, `[^2]` opens with commentary before its references, `[^3]` carries a gloss alongside a DOI. "Sources" overstates the commentary ones and "Footnotes" undersells the citations. Something like "Notes and references" may be truer than either — worth deciding deliberately rather than inheriting whichever word the mechanism makes easiest.

Whatever ships must also work as plain markup on dev.to and Hashnode, which never run this script — see the cross-posting constraint below.

### Two more findings that belong here

- **Footnotes and citation headings are excluded from heading-font styling.** `built/screen.css` styles `.gh-content > [id]` with a **direct-child** selector. `<h2 id="footnote-label">` is nested inside `.gh-footnotes`, and `<h2 id="gh-citation-heading">` is not in `.gh-content` at all. Any heading-level type decision has to reach these two explicitly or they will silently diverge from every other heading in the post.
- **Cross-posting constraint.** Posts cross-post to dev.to and Hashnode, which never execute this theme's JS. Whatever section-heading solution ships has to work as plain HTML/markdown in the source content — it cannot rely on client-side JS to inject headings that would then be missing on the cross-posted copies.

### How these blocks actually get into posts

The workflow is: author the post as markdown in `blog-drafts` on GitHub, then copy-paste it by hand into the Ghost WYSIWYG editor. Nothing transcludes, nothing templates. Every bottom-matter block is pasted per post, which produces three different situations — measured across all 21 posts in `blog-drafts`:

**Author bio — a hook already exists and the theme ignores it.** Twelve posts across four authors wrap the bio in `<p class="dev-theme-author-blurb">`, and **that class is styled nowhere in the theme.** It renders as a plain italic paragraph. So the convention is already established and reliably applied; it has simply never been picked up. Any design here can key off markup authors are already writing rather than asking them to adopt something new.

**About-stdlib CTA — genuinely drifted, three variants in circulation.** Eighteen posts carry it. Nine match `blog-drafts/common/cta.md` exactly. Six use "consider **financially** supporting the project". Three are collapsed to a single line — "give us a star 🌟!" — dropping the Open Collective link and the support sentence entirely. `common/cta.md` exists as a canonical source but nothing enforces it, so the file records an intention rather than the state of the blog.

**NSF acknowledgment — consistent, but only by hand, and only on some posts.** Six of 21 posts carry it (five of Mara's, one of Athan's). The disclaimer wording is **byte-identical** across all six and the award number matches throughout. That consistency is real and worth preserving — but it is the product of careful copy-paste, not of any mechanism, and it is exactly the block where drift would be a compliance problem rather than an aesthetic one.

**Three different problems, so probably not one mechanism.** The bio is per-author and already has a class to hang off. The CTA is identical for every post and has already drifted — the strongest candidate for a Ghost Snippet or a theme partial. The NSF block is conditional (funding-dependent), carries required language, and applies to under a third of posts, so it wants whichever option makes the text hardest to alter accidentally. Whatever ships must also survive as plain markup on dev.to and Hashnode, which run none of this theme's code.

**Anatomy:** primarily `post.hbs` structure plus a pass through `theme/assets/css/` for section-heading treatment. Likely needs a content-authoring convention decided alongside the visual one.

---

## Shared reference — measured, not assumed

### The grid

```css
.gh-canvas {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--gap), auto)
    [wide-start] minmax(auto, 240px)
    [main-start] min(var(--content-width), calc(100% - var(--gap) * 2)) [main-end]
    minmax(auto, 240px) [wide-end]
    minmax(var(--gap), auto) [full-end];
}
.gh-canvas > * { grid-column: main-start / main-end; }
.kg-width-wide    { grid-column: wide-start / wide-end; }
.kg-width-full    { grid-column: full-start / full-end; }
.gh-article-image { grid-column: wide-start / wide-end; }
.gh-navigation    { grid-column: wide-start / wide-end; }
```

`--gap` is 3.6rem, dropping to 2rem below 767px. `.gh-canvas` is **not** nested inside `.gh-inner` on post pages — it spans the viewport and the track list alone does the centering. Because `minmax(auto, 240px)` has a definite max, grid fills those two tracks **before** the outer ones get anything:

| Viewport | measure | each gutter | wide band |
|---|---|---|---|
| 768 | 696 | **0** | 696 |
| 792 | 720 | **0** | 720 |
| 992 | 720 | 100 | 920 |
| 1200 | 720 | 204 | 1128 |
| **1272+** | 720 | **240** | **1200** |

Gutters are exactly 0 until the viewport exceeds 792; they saturate at 240 from 1272 up. The 1200px "wide band" is emergent (240 + 720 + 240) and only coincidentally equals `.gh-inner`'s 1200px max-width, which governs the header, footer, and index feed.

**Verified:** `gh-canvas` appears exactly twice in the whole built stylesheet, in one contiguous run, and **no `@media` or `@supports` block contains it.** Responsive behavior comes entirely from `@media (max-width: 767px) { :root { --gap: 2rem } }` re-computing `var(--gap)` inside the same track list. There is no conditional variant to account for.

### Typography

| Element | Size | Line-height | Note |
|---|---|---|---|
| `.gh-article-title` (h1) | **7.4rem** | 1.0 | Journal's default was 4.6rem |
| `.gh-article-excerpt` | **2.8rem** | **1.35** | overrides Journal's 2.1rem / 1.5; `max-width: 920px` |
| `h2` | 2.8rem | 1.15 | identical to the excerpt |
| `h3` | 2.4rem | 1.15 | |
| `h4` | 2.2rem | 1.15 | |
| `h5` | 2.0rem | 1.15 | |
| `h6` | **1.8rem** | 1.15 | identical to body copy |
| body (`.gh-content > p`) | 1.8rem | 1.6 | 1.7rem below 768px |
| `figcaption` | 1.4rem | 1.4 | left-aligned |
| `.gh-article-meta` (byline) | 1.2rem | 1.0 | uppercase |

Three findings fall straight out of that table, and together they are the substance of the readability complaint:

- **h1 → h2 is a 2.6× cliff** (7.4 → 2.8rem), while h2 → h6 spans only 2.8 → 1.8rem in five steps of 0.2–0.4rem. The subheads are nearly indistinguishable from one another, and **h6 is exactly body size**. There is no usable hierarchy below h2.
- **The excerpt is the same size as h2**, and its line-height was *tightened* to 1.35 while its size went *up* from 2.1rem.
- Breakpoints are coarse: the title jumps 7.4rem → 4.2rem at 767px with nothing between, so the entire **768–991px band renders at the full 7.4rem**.

### Measured line lengths — the readability question, in characters

Computed on the live render against the element's own text and font, identical at 1280, 1440, and 1800px:

| Element | Width | Size | **Chars/line** | Read |
|---|---|---|---|---|
| `.gh-article-title` | 1200px | 74px | **35** | fine — it's a headline |
| `.gh-article-excerpt` | 920px | 28px | **71** | inside the comfortable range |
| **`.gh-content > p`** | 720px | 18px | **85** | **too wide** |
| **`figcaption` (wide figure)** | 1200px | 14px | **184** | **far too wide** |
| `.gh-sidenote` | 240px | 13px | 38 | workable for glosses, tight for citations |

Two things this settles.

**The body measure is 85 characters, not ~72.** The readability conversation has been aimed at the measure, correctly, but the gap is larger than the framing implied. Reaching 72 means roughly **610px** at the current 1.8rem, or holding 720px and raising the type size. The first option collides with `config.image_sizes.m.width = 720`; the second does not, and is the cheaper lever. Either way the target should be stated in characters and the pixel value derived, not the other way round.

**The excerpt is not the problem.** It carries `max-width: 920px`, so it does not track the viewport — it is 920px and 71 characters at every width, including 1800. Worth stating plainly, because "the header goes wide" reads as though the excerpt sprawls, and it doesn't.

### A fourth item: caption width

Not one of the three problems, but it is the worst line length on the page and nothing in the roadmap has flagged it. A caption under a `.kg-width-wide` figure fills the full 1200px track at 14px — **184 characters**, more than twice the body — and since captions were left-aligned it runs as one long flush-left line. stdlib's captions are descriptive and long, so this is the common case, not an edge one.

**This is cheap to fix.** `theme/assets/css/captions.css` already exists and is already registered at `default.hbs:33`, so it needs no new file and no cascade work. The decision is what to constrain to, and that is a design call:

- cap at the body measure and align to the figure's left edge — keeps the caption tied to its figure;
- cap at the body measure and centre under the figure — matches the wide/main shared centre line;
- cap somewhere between, treating the caption as its own register rather than body copy.

Whichever wins should also cover `.kg-width-full` (which adds `padding: 0 1.6rem` and is wider still) and the feature-image caption in the article header.

**Two free hooks, no rebuild required:** `.gh-content > p, ul, ol, dl, blockquote` read `var(--content-font-size, 1.8rem)` and `var(--content-letter-spacing, 0)`, and neither variable is ever defined. Setting them in a new stylesheet changes body typography directly — **but** a later rule inside `@media (max-width: 767px)` hardcodes 1.7rem, so `--content-font-size` is inert below 768px. Any spec leaning on it must say what happens on mobile.

Inter is the only shipped family. Treat "add a serif" as a real proposal with a cost — font files, `fonts.css`, a token — not a free choice.

### Heading depth across all 21 posts

This bounds the type scale (and any future TOC):

| Shape | Posts | Implication |
|---|---|---|
| h2 only | 11 of 21 | the common case |
| h2 + h3 | 8 | |
| h2 + h3 + h4 | 2 | maximum useful depth is 3 |
| **h5 / h6** | **0, ever** | do not spend scale design on them |
| 0 headings | `gsoc-2025-projects-announced` | |
| 1 heading | `build-for-inheritance` | |
| **starts at h3, no h2** | `announcing-gsoc-2025` | h2 is not reliably the top level |
| 22 entries | `the-accessor-protocol` (10 h2 + 12 h3) | the overflow case |

### Color and contrast (computed)

| Pair | Ratio | Verdict |
|---|---|---|
| `--color-primary-text` `#333` on white | 12.63 | pass |
| `--color-darker-gray` `#15171a` on white | 17.96 | pass |
| `--color-secondary-text` `#757575` on white | 4.61 | passes AA body, marginal — and it is the figcaption color at 1.4rem |
| `--link-color` `#0000ff` on white | 8.59 | passes; pure blue is a deliberate aesthetic call worth revisiting |
| **stdlib orange `#e99f36` on white** | **2.22** | **fails AA for text (4.5), large text (3.0), and non-text (3.0)** |

**Partly addressed already.** The light theme now defines `--gh-target-highlight-color: #ae7728` — a darkened orange — specifically so footnote jump-target outlines clear WCAG 2.4.11's 3:1 for non-text indicators. The dark theme reuses `#f0ad3e`, already about 8:1 there.

**Still open:** `built/screen.css` uses `var(--ghost-accent-color)` as the **text color** for `.gh-card-date` and for `.gh-content a`. If the Ghost Admin accent is stdlib orange, index card dates and in-content links are failing contrast today. `.gh-aside`'s 3px left border is the one place the orange is used correctly — as decoration, never carrying text. Any palette proposal must state where the orange may carry text and where it is decoration only.

### The footnote/sidenote vocabulary is settled — reuse it

| Class | Role |
|---|---|
| `.gh-fnref` | the `<sup>` reference wrapper in body text |
| `.gh-footnotes` / `.gh-footnotes-title` | the endnotes section and its heading |
| `.gh-sidenote` / `.gh-sidenote-number` | `aria-hidden` margin clone; endnotes stay canonical |
| `.gh-aside` / `.gh-aside--margin` | author-written `<aside>`, in-flow default and margin variant |

Margin sidenotes are **not** grid items — `.gh-content.gh-canvas` gets `position: relative` and clones are absolutely positioned with JS-computed `left`, `width`, and `top`, explicitly resetting `grid-column`/`grid-row` to `auto`. They engage at `min-width: 1120px` with a 160px gutter floor, a 24px gap from the main column, and a 240px cap. Mirroring is opt-in per post via a `#sidenotes` internal Ghost tag; asides are margin-eligible independently.

**The width problem this bounds but does not solve:** 240px is genuinely tight for these drafts' notes — `the-stakeholder-journey`'s third footnote is about 380 characters, roughly 18–20 lines in that column. The honest fix is editorial, not grid: short marginal glosses in the margin, full citations in the endnotes. Proposing that authoring convention is a design contribution; widening the grid is not available (see the appendix).

### Test posts

The required stress case is a **short, thin post** — does a margin column or a section-heavy bottom matter look absurd on 500 words?

- `athan-reines/python-like-indexing-in-javascript` — **484 words, 9 headings including h3s.** Almost no prose, a deep heading tree.
- `mara-averick/zulip-community-chat` — 468 words, 3 flat h2s, no footnotes.

For density: `mara-averick/the-stakeholder-journey` (feature image, excerpt, 2:1 SVG figures, 7 footnotes, the full bottom-matter sequence) and `pranav-goswami/how-to-call-fortran-routines-from-javascript-using-nodejs` (code-heavy).

---

## Out of scope for this handoff

- **Dark mode** — paused pending a real token-bridge decision. The shipped `themes/dark/main.css` defines ~60 custom properties with **zero overlap** with what `built/screen.css` actually consumes, and `default.hbs` hardcodes `data-theme="light"` and never loads the dark file at all. A separate design pass, not a quick follow-on.
- **Table of contents** — not yet built; see the appendix.
- **CC-BY / DOI licensing** — a legal and policy call for Mara and Athan, not a design question. Leave a designed slot for a reuse/license statement; do not assert a license.
- **Search placement on narrow viewports** — flagged as a real defect but not one of the three problems. `built/screen.css` hides `.gh-head-actions` below 992px unless the burger menu is open, so the search trigger is unreachable there, and the button is a 20×20 target — under WCAG 2.5.8's 24×24 minimum. Worth its own small pass.

---

## Appendix — table of contents, for when it is scoped

Not a live decision. Recorded so the arithmetic does not have to be re-derived.

**The reference to port** is [transformer-circuits.pub's Global Workspace paper](https://transformer-circuits.pub/2026/workspace/index.html), a Distill-descended layout Athan has seen and likes. Measured by DOM inspection at a 1600px viewport: a static (non-fixed) left TOC rail at x:142–390 (**248px**); the text column at x:448–1152 (**704px**, close to the ~72-character target); `figure.wide` breaking out to roughly x:295–1305 (**~1000px**) — past the text column on both sides, using the margin space on the right and stopping just short of the TOC's right edge on the left. **Wide figures eat the margin without ever touching the rail.** That relationship is the mechanism worth porting, not the general look.

**A wider margin track is not available on real screens.** A symmetric Distill-style layout — 1200px wide band preserved plus 300px note columns both sides — needs 1872px of viewport. At 1440px there is 648px of free space after the measure, distributed *equally* across four capped tracks: **162px each**. The wide band shrinks to 1044 **and** the note column ends up narrower than the 204–240px the existing gutters already give. Asymmetric still needs ~1664px and lands at ~154px at 1440. **It only wins above roughly 1600px.**

It would also force re-declaring seven load-bearing rules by hand (`.gh-canvas > *`, `.kg-width-wide`, `.kg-width-full`, `.kg-width-full img`, `.gh-article-image`, `.gh-navigation`, the header rule, plus `.gh-pagehead`) against a stylesheet nobody can regenerate — a permanent reconciliation burden — and would visibly narrow `.kg-width-wide` on **every already-published post**.

**So: use the gutters that already exist.** They are reserved and currently unoccupied on post pages, and margin sidenotes have already claimed the right one — which leaves the left for a TOC, matching both `.gh-pagehead`'s precedent on tag and author pages and Distill's own shape.

**Mechanics that will otherwise cost a day each:**

- `minmax(auto, …)` lets an occupied gutter **de-centre the measure**. The `auto` min is the item's min-content contribution, so a TOC with 150px min-content at 992px viewport gets 175px left and 25px right — the measure sits 75px left of centre, misaligned against the 1200-centred header. Every gutter occupant needs `min-width: 0`. This is a latent existing bug with `.gh-pagehead`.
- **`position: sticky` on a grid item is bounded by its own grid row.** A TOC must span all rows — and **`grid-row: 1 / -1` does not work**, because `-1` is the end of the *explicit* grid, which is one row here. It also needs `align-self: start`; the default `stretch` makes sticky inert, which is exactly why `.gh-pagehead` carries `height: max-content`.
- **Verify `.gh-pagehead` sticky actually works** on a live tag page before treating it as proof of concept. It is row 1 of its canvas and the feed is row 2, so per the point above it very likely stops sticking as soon as row 1 scrolls past.
- Sidenote clones are appended as children of `.gh-content`, so any `grid-row`-counting logic must skip `.gh-sidenote` nodes.

**Thresholds are two, not one.** Gutters are 0 below ~792 and only reach usable prose width around 1120–1200, so a TOC can engage at 992 (where the left gutter first reaches ~100px) while sidenotes stay fixed at 1120. Each gets the width it actually needs; that is a feature, not a compromise.
