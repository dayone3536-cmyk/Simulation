# Forest Village

A small vanilla-JavaScript idle village built with PixiJS. Open `index.html` in
a browser to play.

## Work

Villagers choose their own jobs. One farmer tends each field, then up to three
woodcutters take up the remaining axes. Everyone else rests and wanders the
village. There is no job menu to manage.

Woodcutters fell nearby trees, carry the logs home, and add to your wood stock.
Each tree is worth 3 wood.

## Market

Sell wheat for gold at the market. The rate is generous and easy to read: **10
wheat is always worth 10–20 gold**, starting at 14 and shifting every 45
seconds.

## Building

Any free tile is buildable. Felling a tree frees its tile immediately, so a
cleared forest can be used for farms or to reposition your home.

## Working while the laptop is off

GitHub Actions does the work on its own machines:

- **OpenCode request** (`.github/workflows/opencode-request.yml`) — open
  **Actions → OpenCode request → Run workflow**, type what you want, and it
  commits the result to `auto/request` and opens a pull request. Your PC can be
  closed the whole time.
- **OpenCode overnight tasks** (`.github/workflows/opencode-night.yml`) — runs
  the prompts in `tasks/` every night at 00:30 India time. See
  `tasks/README.md`.
- **Syntax check** (`.github/workflows/check.yml`) — runs `node --check` on
  every JavaScript file for each push and pull request.

Committing and pushing these workflows to `main` is what makes GitHub start
running them.
