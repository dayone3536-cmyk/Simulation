---
title: Merge all remote branches into a review branch
base: main
branch: auto/merge-branches
once: true
schedule: true
---

You are working inside a small vanilla-JavaScript browser idle game (PixiJS,
files in `js/`, loaded in order by `index.html`). The current branch
(`auto/merge-branches`) started from `main`.

Goal: bring the work from the other GitHub branches into this review branch
safely. A human will review the result tomorrow, so prefer a clean, honest
report over a forced merge.

Steps:

1. Run `git fetch origin --prune` and inspect `git branch -r`.
2. Ignore `origin/main`, `origin/master`, and every `origin/auto/*` branch.
   For every other branch, try `git merge --no-edit origin/<branch>` one at a
   time, oldest first.
3. If a merge produces conflicts that you cannot resolve with full confidence,
   run `git merge --abort`, skip that branch, and record why. Never leave
   conflict markers in a file.
4. Do not change game behaviour beyond resolving real merge conflicts. Do not
   reformat files, do not rename things, do not delete branches.
5. Run `for f in js/*.js js/components/*.js; do node --check "$f"; done` and
   also check that every `<script src>` in `index.html` points at a file that
   exists.
6. Write `MERGE-REPORT.md` at the repository root listing: branches merged,
   branches skipped and why, syntax-check results, and anything a human should
   check before merging into `main`.

Do not push and do not merge into `main` yourself. The automation will commit
and push this branch for you.
