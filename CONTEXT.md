# Shahdad Site Context

## What This Project Is

This repo is the source for `shahdad.ca`, a personal website for Shahdad Neda.
It is a plain static site built with HTML, CSS, and JavaScript. There is no
framework, no build step, and no backend in this checkout.

The site currently includes:

- A homepage with sections for intro, projects, and games
- Small vanilla-JS game pages such as Snake and Tetris
- A `/todo/` route that currently acts as a redirect

## Main Sections / Features

### Homepage

The homepage lives in `index.html` and uses a left-sidebar layout with content
sections for:

- Home / intro
- Projects
- Games

The homepage links out to project/game pages inside this repo.

### Games

- `snake/` contains a standalone Snake game
- `tetris/` contains a standalone Tetris game

Each game is built as its own plain HTML/CSS/JS page.

### Todo / Planner

Important current state:

- In this checkout, `todo/index.html` is only a redirect page
- It redirects to `/Todo/` (capital `T`)
- The actual Todo / planner app source is not present in this repo right now

That means future agents should not assume the working Todo app files are in
`/Users/shahdadneda/Documents/Code/shahdadSite/todo/`.

Based on prior work/context, the Todo app concept includes:

- General tasks
- Weekend Goals
- ESS planner

The ESS planner concept is a planner with separate named day entries (for
example Tuesday/Thursday ESS days), where each day has its own tasks.

## Important Files

### Core site files

- `/Users/shahdadneda/Documents/Code/shahdadSite/index.html`
  Main homepage markup
- `/Users/shahdadneda/Documents/Code/shahdadSite/style.css`
  Main homepage/site styling
- `/Users/shahdadneda/Documents/Code/shahdadSite/fonts.css`
  Local font-face declarations for the site font setup
- `/Users/shahdadneda/Documents/Code/shahdadSite/CNAME`
  Custom domain config for deployment

### Game files

- `/Users/shahdadneda/Documents/Code/shahdadSite/snake/index.html`
- `/Users/shahdadneda/Documents/Code/shahdadSite/snake/style.css`
- `/Users/shahdadneda/Documents/Code/shahdadSite/snake/game.js`
- `/Users/shahdadneda/Documents/Code/shahdadSite/tetris/tetris.html`
- `/Users/shahdadneda/Documents/Code/shahdadSite/tetris/style.css`
- `/Users/shahdadneda/Documents/Code/shahdadSite/tetris/game.js`

### Todo route in this repo

- `/Users/shahdadneda/Documents/Code/shahdadSite/todo/index.html`
  Redirect page only, not the full planner app

## How The App Saves Data

For the website in this repo:

- The main site itself is static and does not save user data
- There is no backend or database in this checkout

For the Todo / planner work (based on prior project context):

- Data is intended to be saved in the browser with `localStorage`
- The planner is client-side only
- Tasks and planner entries persist across refreshes in the same browser
- Clearing browser storage would remove saved planner data

Because the real Todo app source is not currently in this repo, the exact live
storage keys cannot be verified from this checkout alone.

## Planner / Archive Behavior

Known planner behavior from prior project work:

- The planner has multiple sections, including General, Weekend Goals, and ESS
- ESS is meant to support multiple named day entries
- Each ESS day entry has its own separate task list
- Planner data is local to the browser
- Deleting an ESS day removes that day entry and its tasks

Archive notes:

- There is no known backend archive system in this repo
- There is no server-side history or sync layer
- “Archive” should generally be interpreted as browser-stored state or manual
  deletion unless future agents find a different Todo app source elsewhere

## Style And Theme

The visual language of the site is consistent and should be preserved unless
the user asks for a redesign.

Key style characteristics (redesigned July 2026):

- Warm near-black background (`#151412`) with warm off-white text (`#ece7de`)
- Single amber accent (`#e0a458`); muted warm gray for secondary text
- Quiet, typographic, single-column layout — list rows with hairline borders
  instead of card grids
- Monospace (`ui-monospace` stack) for metadata, hints, and scores
- Plain CSS, no component library
- “Uber Move” font through `fonts.css` (only Medium and Bold .otf files exist)
- Game pages share the same tokens: top bar with back link + inline scores,
  responsive hi-DPI canvas, DOM overlays for pause/game-over, one-line control
  hints (keyboard vs touch hint swapped via `@media (hover: none)`)
- Games have touch controls: Snake (swipe to steer, tap to pause), Tetris
  (drag to move/soft-drop, tap to rotate, flick down to hard-drop)

When adding new pages or features, future agents should try to match:

- The warm dark palette above
- Minimal but polished styling — avoid generic "AI site" tropes (gradient hero
  text, glassmorphism cards, heavy shadows); the owner explicitly dislikes them
- Vanilla HTML/CSS/JS implementation
- Responsive behavior without introducing frameworks

## Deployment / Routing Notes

- This appears to be a static site repo for deployment to `shahdad.ca`
- `CNAME` suggests a GitHub Pages style deployment setup
- Routes are folder-based (`/snake/`, `/tetris/`, `/todo/`, etc.)
- `todo/index.html` currently redirects to `/Todo/`, so route casing may matter

Future agents should verify whether the real Todo app lives:

- In another folder not checked in here
- In another repo
- Or only on the deployed site right now

## Helpful Guidance For Future Agents

- Start by checking whether the requested page actually exists in this checkout
- Be careful with route casing: `/todo/` and `/Todo/` may not be the same thing
- If the user asks about Todo / ESS planner internals, confirm where the real
  source files live before making assumptions
- Prefer small vanilla HTML/CSS/JS changes over introducing tooling
- Do not assume there is a build step, package manager, or test runner
- If changing layout, check the parent containers and grid widths first because
  the site uses a few nested grid-based layouts

## Current Caveat

This context doc is intentionally honest about the gap between:

- The site files that are definitely present in this repo
- The Todo / ESS planner behavior discussed during prior work

If a future agent needs to modify the live Todo app, the first task should be
to locate the actual `/Todo/` source of truth.
