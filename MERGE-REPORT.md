# Merge report — `auto/merge-branches`

Date: 2026-11-15
Base branch: `auto/merge-branches` (started from `main` at `413ec70`)
Remotes inspected with `git fetch origin --prune`.

## Summary

- **No game code was modified.** The review branch is identical to `main` apart from this report.
- **5 branches were processed with `git merge --no-edit` and were already up to date** — all of
  their commits are already reachable from `main`.
- **1 branch was skipped** because it has no common history with `main` and Git refused the merge.

## Branches processed (oldest tip first)

| # | Branch | Tip commit | Tip date | Result |
|---|--------|-----------|----------|--------|
| 1 | `origin/Famrs` | `66f4f22` | 2026-11-12 | **Skipped** — unrelated history (see below) |
| 2 | `origin/A` | `e908849` | 2026-11-14 | Already up to date |
| 3 | `origin/traidng` | `0bdf247` | 2026-11-14 | Already up to date |
| 4 | `origin/home-upgrade` | `44320a8` | 2026-11-14 | Already up to date |
| 5 | `origin/farm-grow-times` | `3ba932a` | 2026-11-15 | Already up to date |
| 6 | `origin/feature/hearth-loop` | `d15d368` | 2026-11-15 | Already up to date |

`origin/main`, `origin/master` and `origin/auto/*` branches were intentionally ignored.

### Notes on the "already up to date" branches

`git merge` reported `Already up to date` for each of these, and
`git merge-base --is-ancestor origin/<branch> HEAD` succeeded for all five. Their work is
already present in `main` through earlier merge commits, notably:

- `3695535` — `Merge branch 'A'`
- `e264fce` / `f2e809a` — `farm-grow-times`
- `b92c52a` — `home-upgrade`
- `f2e809a` — `feature/hearth-loop`
- `traidng` — its tip `0bdf247` is already in the main history.

No merge commits were created because there was nothing left to merge.

## Skipped branch

### `origin/Famrs` (`66f4f22`, "m")

- The branch is a single orphan commit: `git merge-base origin/main origin/Famrs` finds **no merge base**.
- `git merge --no-edit origin/Famrs` fails with:
  `fatal: refusing to merge unrelated histories`.
- The commit adds exactly one file: a 400-line, self-contained `index.html` ("Forest Village")
  at the repository root. It has no `js/` modules, no current asset layout, and would replace the
  current modular `index.html` rather than add to it.
- No merge was started, so there is nothing to abort, no `MERGE_HEAD`, and no conflict markers.

**Reason for skipping:** merging an unrelated history would require `--allow-unrelated-histories`
and would almost certainly overwrite/conflict with the current `index.html`; that cannot be done
with full confidence and is beyond a normal merge. A human should decide whether this old
monolithic version contains anything worth salvaging manually.

## Validation

### JavaScript syntax (`node --check`)

All 17 JavaScript files pass:

```text
js/01-config-renderer.js            OK
js/02-icons-hud-rng.js              OK
js/03-atlases-world.js              OK
js/04-selection.js                  OK
js/05-camera-input.js               OK
js/06-render-home.js                OK
js/07-villagers.js                  OK
js/08-farms.js                      OK
js/09-farm-loop-bootstrap.js        OK
js/10-home-upgrade.js               OK
js/11-wood.js                       OK
js/12-jobs.js                       OK
js/13-hearth.js                     OK
js/components/buildings-home.js     OK
js/components/farms.js              OK
js/components/trees-and-world.js    OK
js/components/villagers.js          OK
```

Command used:

```sh
for f in js/*.js js/components/*.js; do node --check "$f"; done
```

### `<script src>` check in `index.html`

All local scripts referenced by `index.html` exist (query strings such as `?v=3` ignored):

```text
js/01-config-renderer.js        OK
js/02-icons-hud-rng.js          OK
js/03-atlases-world.js          OK
js/04-selection.js              OK
js/05-camera-input.js           OK
js/06-render-home.js            OK
js/07-villagers.js              OK
js/08-farms.js                  OK
js/09-farm-loop-bootstrap.js    OK
js/10-home-upgrade.js           OK
js/11-wood.js                   OK
js/12-jobs.js                   OK
js/13-hearth.js                 OK
```

External CDN scripts (not checked for local existence):

```text
https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.js
https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
```

## Things for a human to check before merging into `main`

1. **This branch adds no game changes.** It only adds `MERGE-REPORT.md`; everything else already
   matches `main`. If actual new work was expected from the other branches, verify that the earlier
   merges into `main` really preserved the intended behavior (the commits are reachable, but no
   runtime/gameplay testing was performed here).
2. **`origin/Famrs` needs a decision.** It is an unrelated, single-commit orphan containing an old
   standalone `index.html`. Decide whether to discard it, or manually port any useful parts.
3. **`js/06-render-home.js` is live again.** It was deleted in `a00611d` but is present in the
   current tree and is loaded by `index.html`; the syntax check passes, but confirm the render path
   is still the one you want.
4. **No gameplay/runtime testing was done.** Only static syntax and file-existence checks were run.
   It would be worth opening the game once before merging into `main`.
5. `opencode.json` is an untracked local file and was intentionally left untouched.

## Repository state

- No merge is in progress (`git status` shows no conflicts).
- No conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) exist in `*.js`, `*.html` or `*.css`.
- No branches were deleted, renamed, or pushed.
