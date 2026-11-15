"""Build the GitHub Actions matrix from tasks/*/task.md files.

Each task file starts with simple front matter:

    ---
    title: Short name
    base: main
    branch: auto/my-task
    once: true
    schedule: true
    ---
    Prompt text for OpenCode...
"""

import glob
import json
import os
import subprocess


def read_task(path: str):
    with open(path, encoding="utf-8") as handle:
        text = handle.read()

    meta = {}
    body = text
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) == 3:
            body = parts[2]
            for line in parts[1].splitlines():
                line = line.strip()
                if not line or ":" not in line:
                    continue
                key, value = line.split(":", 1)
                meta[key.strip().lower()] = value.strip().strip("\"'")

    return meta, body.strip()


def branch_exists(branch: str) -> bool:
    result = subprocess.run(
        ["git", "ls-remote", "--exit-code", "--heads", "origin", branch],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def main():
    task_filter = (os.environ.get("TASK_FILTER") or "").strip()
    force = (os.environ.get("FORCE") or "").lower() == "true"

    include = []
    for path in sorted(glob.glob("tasks/*/task.md")):
        task_id = os.path.basename(os.path.dirname(path))
        meta, body = read_task(path)

        if not body:
            print(f"skip {task_id}: no prompt text")
            continue

        if task_filter:
            if task_id != task_filter:
                continue
        elif meta.get("schedule", "true").lower() == "false":
            print(f"skip {task_id}: schedule disabled")
            continue

        base = meta.get("base", "main")
        branch = meta.get("branch", f"auto/{task_id}")
        once = meta.get("once", "true").lower() != "false"

        if once and not force and branch_exists(branch):
            print(f"skip {task_id}: {branch} already exists on origin")
            continue

        include.append(
            {"id": task_id, "base": base, "branch": branch, "file": path}
        )

    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as out:
        out.write("matrix=" + json.dumps({"include": include}) + "\n")
        out.write(f"count={len(include)}\n")

    print(f"{len(include)} task(s) planned: {[item['id'] for item in include]}")


if __name__ == "__main__":
    main()
