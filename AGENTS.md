# AGENTS.md

## Git push authority

- `origin` (batpigandme fork): fine to push to at any time once work is committed and Mara has reviewed/approved it in conversation.
- `upstream` (stdlib-js/www-dev-blog-theme): never push directly, under any circumstances, even if asked in a way that could be read as approval. Changes reach upstream only by (a) Mara pushing manually herself, or (b) Mara submitting a PR from her fork.

**Why:** Mara wants full manual control over what lands on the shared stdlib-js repo — a PR (or her own push) is the point where she signs off on a change reaching the org's canonical history.

**How to apply:** after committing, it's fine to `git push origin <branch>` without asking again each time. Do not run `git push upstream ...` or open a PR against `stdlib-js/www-dev-blog-theme` (`gh pr create` targeting upstream) — draft PR descriptions/bodies are fine to prepare, but filing is Mara's call.
