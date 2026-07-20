# AGENTS.md

## Git push authority

**Never `git push` on Mara's behalf, on any remote (`origin`, `upstream`, anything), under any circumstances.** She always pushes manually. Commit locally, tell her the branch is ready, stop there.

Applies equally to `git push --set-upstream`, force-pushes, tag pushes, `ai-config`-branch backup pushes — anything that talks to a remote.

**Why:** the push is her sign-off moment. She wants full manual control over what lands on any remote, not just shared upstreams. Prior "origin fork is fine once approved" carve-outs were subtly noisy (either she was approving every push and defeating the point, or approvals were drifting into standing permission she didn't want) and are now retired.

**How to apply:** after committing, say "committed on `<branch>`, ready to push when you are." Don't ask "shall I push?" — that's still asking. She'll push.

Read-only `git fetch` / `git ls-remote` / `gh` view/list commands are fine and don't need confirmation.

**PRs and issues:** never run `gh pr create`, `gh pr edit`, `gh issue create`, `gh pr comment`, or equivalent, on any repo, even with explicit go-ahead. Drafting the title/description/body as a local artifact for her to paste in is fine and encouraged; filing and editing are always hers.
