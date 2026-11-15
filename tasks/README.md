# Overnight tasks

Each folder here is one job for the `OpenCode overnight tasks` workflow
(`.github/workflows/opencode-night.yml`). GitHub runs it on a fresh Ubuntu
machine, so your PC can be off.

## Adding a task

1. Create a new folder, for example `tasks/003-fishing/`.
2. Add a `task.md` file inside it.
3. Start the file with this header, then write the prompt below it:

```markdown
---
title: Fishing dock
base: main
branch: auto/fishing
once: true
schedule: true
---

Implement a fishing dock that ...
```

| Field      | Meaning                                                        |
| ---------- | -------------------------------------------------------------- |
| `base`     | Branch the work starts from (default `main`).                   |
| `branch`   | Branch the result is pushed to (default `auto/<folder name>`).  |
| `once`     | `true` = skip if that result branch already exists on GitHub.   |
| `schedule` | `false` = only run it manually, never on the nightly schedule.  |

Commit and push the new task folder to `main`. It is picked up the next night.

## Running one now

GitHub → Actions → **OpenCode overnight tasks** → **Run workflow**. Type the
folder name (for example `002-woodcutter`) to run only that task, or leave it
empty to run all pending tasks. Tick `force` to re-run a task whose result
branch already exists.

## Where results go

Every task gets its own branch (`auto/...`) and a pull request. Nothing is
merged into `main` automatically, so a bad run can never damage your work.
