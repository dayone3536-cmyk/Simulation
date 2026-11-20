# Standing prompt for the six-hourly run

You are running automatically on a fresh checkout of `main` of Forest Village,
a small vanilla-JavaScript + PixiJS idle game (files in `js/`, loaded in order by
`index.html`, state saved in `localStorage`).

Do **one** small, safe piece of work per run:

1. Read `README.md` and skim `js/` to see the current state.
2. Pick one small improvement or bug fix — a crash guard, a confusing label,
   a tiny bit of polish, an unused variable, a broken edge case.
3. Keep the diff small (roughly under 80 changed lines). Do **not** redesign the
   UI, rename or move files, reorder scripts in `index.html`, or change any
   `localStorage` format.
4. Run `node --check` on every JavaScript file you touch.
5. Stop. Do not commit, branch or push; the workflow handles git.

If nothing is clearly broken or worth changing, make no edits and exit — an
empty run is a good run.
