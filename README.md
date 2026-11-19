# vcreate Studio

Content operations app: schedule, create, edit, preview and design posters. No login.

## Run locally
```
git clone https://github.com/vcreatedev/vcreate_content_cms.git
cd vcreate_content_cms
npm start        # or: node server.js
```
Open http://localhost:3000. Needs only Node 18+, no installs.

Optional: set `ANTHROPIC_API_KEY` to use the in-site Claude buttons (`ANTHROPIC_API_KEY=... npm start`).

## Content data
`data/content.json` is the shared content. Bump `rev` after changing it so browsers pick up the new version.

## Posters
`PLAYWRIGHT_PATH=<path to playwright> node tools/poster.js '{"headline":"..","subline":"..","cta":"..","theme":"dark"}' assets/posters/name.png`
Uses the official logo files in `assets/`.

## Easiest start
Install Node.js (https://nodejs.org, LTS). Then double-click `start.bat` (Windows) or `start.command` (Mac). The browser opens at http://localhost:3000.
