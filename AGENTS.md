# AGENTS.md

## Git push authority

**Never `git push` on Mara's behalf, on any remote (`origin`, `upstream`, anything), under any circumstances.** She always pushes manually. Commit locally, tell her the branch is ready, stop there.

Applies equally to `git push --set-upstream`, force-pushes, tag pushes, `ai-config`-branch backup pushes — anything that talks to a remote.

**Why:** the push is her sign-off moment. She wants full manual control over what lands on any remote, not just shared upstreams. Prior "origin fork is fine once approved" carve-outs were subtly noisy (either she was approving every push and defeating the point, or approvals were drifting into standing permission she didn't want) and are now retired.

**How to apply:** after committing, say "committed on `<branch>`, ready to push when you are." Don't ask "shall I push?" — that's still asking. She'll push.

Read-only `git fetch` / `git ls-remote` / `gh` view/list commands are fine and don't need confirmation.

**PRs and issues:** never run `gh pr create`, `gh pr edit`, `gh issue create`, `gh pr comment`, or equivalent, on any repo, even with explicit go-ahead. Drafting the title/description/body as a local artifact for her to paste in is fine and encouraged; filing and editing are always hers.

## Local Ghost instance

The local Ghost lives in `ghost/` (gitignored), registered with ghost-cli as `ghost-stdlib-1`, at `http://localhost:2368`. Full setup and history: `~/stdlib-notes/ghost/local-ghost-instance-setup.md`.

**`ghost` is only on `PATH` after loading nvm's Node 22.** ghost-cli is installed globally inside nvm's Node 22, and Mara's default Node is deliberately *not* 22, so a fresh shell says `zsh: command not found: ghost`. Load Node 22 on the same line, and name the instance so the command works from any directory (without a name, ghost-cli only finds the install from inside `ghost/` and otherwise says "Working directory is not a recognisable Ghost installation"):

```bash
source ~/.nvm/nvm.sh && nvm use 22 && ghost stop ghost-stdlib-1
```

Same for `ghost start ghost-stdlib-1`; `ghost ls` needs no name. **`ghost restart` takes no name** (it fails with the same "not a recognisable Ghost installation" error), so point it at the folder instead: `ghost restart --dir ~/www-dev-blog-theme/ghost`. `--dir` works with every command. When giving Mara a command to run, give her this whole line, not bare `ghost stop`.

**Don't** fix this by setting `nvm alias default 22` or editing `~/.zshrc`: Mara keeps a different default Node on purpose.

**Don't use `make dev-restart`:** it stops `ghost-stdlib`, the old worktree's instance, not this one. Redeploy the theme with `make dev-deploy` (copies whatever `theme/` is checked out), then `ghost restart --dir ~/www-dev-blog-theme/ghost` as above.
