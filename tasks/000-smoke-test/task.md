---
title: Smoke test the automation
base: main
branch: auto/smoke-test
once: true
schedule: false
---

This is a smoke test for the overnight automation.

1. Create the file `.github/smoke/ok.txt` containing the current UTC date and
   time (run `date -u` and put its output in the file).
2. Change nothing else.

Keep it short: this run only proves that OpenCode, the model, git and the push
step all work on GitHub's runner.
