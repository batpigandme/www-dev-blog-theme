# Note on the requested pull

**Source:** `posts` table, `html` column, in `ghost/content/data/ghost-local.db` (this worktree). Schema matches what was described — `title`, `status`, `published_at`, `feature_image`, `custom_excerpt` are all present alongside `html`, no surprises. Pulled read-only via `sqlite3 -readonly`; database untouched.

**Scope, overridden by Mara:** only `the-stakeholder-journey` was pulled. `python-like-indexing-in-javascript` (Athan Reines) and `zulip-community-chat` don't exist in this local Ghost instance or in any other Ghost DB findable under `$HOME` — and per Mara, they're not needed; the request is intentionally scoped down to the one post.

## 1. `the-stakeholder-journey.html`

| field | value |
|---|---|
| title | The Stakeholder Journey |
| status | published |
| published_at | 2026-07-22 14:54:38 |
| feature_image | `__GHOST_URL__/content/images/2026/07/stakeholder_journey_og_v2@2x.png` |
| custom_excerpt | "Every project eventually faces the same question: who tends to this when the current maintainers can't? It used to have an accidental answer. The Stakeholder Journey is a tool for building an intentional one—identifying where to invest energy to find and cultivate the next generation." |

## 2. Problem 3 (`## Sources` orphan-heading) — confirmed against this stored HTML

**No, not as described — worse: the heading is gone entirely, not orphaned.** There's no `## Sources` (or any) heading at all. The footnote list (`<section class="footnotes"><ol class="footnotes-list">`) sits at the very end of the post, after `## Acknowledgments` and the NSF disclaimer blockquote, completely unlabeled. Verified identical against the live published post at `https://blog.stdlib.io/the-stakeholder-journey/` — same structure, same absence of a heading.

This is the stored end-state after a human removed the heading by hand (a documented pattern elsewhere — see `docs/rendered-posts/README.md` for corroborating evidence from a second post and its `blog-drafts` history). So: the bug is confirmed live in what's actually stored and served, not just theoretical from the draft — but what ships today isn't a duplicate/orphaned heading, it's a silently deleted one.

**Additional material beyond this request:** `docs/rendered-posts/README.md` documents a wider probe (Mara's call, broader than this request) into the footnote/aside-HTML-card interaction that PR #8 flags as untested — separate posts, separate scope, kept out of this note.
