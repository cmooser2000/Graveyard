# Headstone History

A mobile-first static scavenger hunt through seven 19th-century graves at the Mount Desert Street Cemetery in Bar Harbor, Maine. Visitors walk between stones, enter the year of passing on each one, and unlock a short portrait video about that person's life.

The project was originally called "When This Was Eden"; renamed to "Headstone History" mid-development. Local working folder is still `when-this-was-eden`, GitHub repo is `cmooser2000/Graveyard`, custom domain is `headstonehistory.org` (purchased through Vercel). The localStorage progress key is still `eden_progress` — internal only, never user-visible, kept to avoid breaking any in-progress runs.

## Tech stack

Plain HTML / CSS / vanilla JS. No build step. Deployed to Vercel.

| File | Role |
|------|------|
| `index.html` | Landing page. Hero PNG masthead, intro copy, "Start / Continue Your Journey" CTA. Has an inline script that swaps the CTA to "Continue" when `localStorage.eden_progress` shows progress past grave 1. |
| `journey.html` | Reusable per-grave template. Reads `?grave=N` (1–7). Layout: Home link → chapter marker → name → years → rule → map → "Enter the year" form → video block (hidden until correct) → chapter crumb. |
| `journey.js` | Loads `data/graves.json`, renders the grave, gates access via `localStorage`, handles year submission, video playback, and preloading the next grave's video. |
| `complete.html` | Gated on `progress.completed.indexOf(7) !== -1`. Otherwise redirects to journey. |
| `about.html` | Currently lorem ipsum placeholder. |
| `styles.css` | All styles. Paper/ink palette, Mayflower Antique + OldNewspaperTypes (self-hosted in `/fonts/`, currently empty so falls back to Georgia). |
| `data/graves.json` | Source of truth for the 7 graves: `id, chapter, name, years, unlockYear, mapImage, mapCaption, prompt, video`. |
| `vercel.json` | Clean URLs, no trailing slash. |
| `/maps/`, `/videos/`, `/fonts/` | Asset directories. |

## Deployment

- **GitHub:** `cmooser2000/Graveyard` (private, SSH remote `git@github.com:cmooser2000/Graveyard.git`, branch `main`). User has SSH key configured (`~/.ssh/github`).
- **Vercel:** auto-deploys on push to `main`. No build command, no env vars.
- **Workflow:** edit → commit → push. Vercel rebuilds in ~20–40 sec.

## Working conventions (important)

- **Stage files explicitly** with `git add <paths>`. **Never `git add -A` or `git add .`** — the user often drops new media files into the folder mid-session that aren't ready to commit.
- **Kebab-case filenames, no spaces.** Rename any media the user drops in (e.g. `Map image.png` → `placeholder.png`, `Nicks Higgins-copy.mp4` → `02-higgins.mp4`).
- **Match `data/graves.json` paths exactly.** Video files: `01-alley.mp4`, `02-higgins.mp4`, …, `07-nickerson.mp4`. Vercel/Linux is case-sensitive even though macOS isn't — case matters.
- **Commit and push as soon as a change is complete.** Don't batch unrelated changes.
- **Commit messages:** focus on the *why*, not the *what*. End with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` only if requested — the user hasn't asked for this so currently omitted.
- **Don't update global git config.** Identity is set per-repo (`cmooser2000` / `cmooser2000@users.noreply.github.com`).

## Asset status

- **Videos uploaded:** chapter 1 (Alley, 44 MB), 2 (Higgins, 40 MB), 4 (Douglass, 38 MB).
- **Videos pending:** chapter 3 (Roberts), 5 (Wasgatt), 6 (Irene Alley), 7 (Nickerson).
- **Maps:** all 7 entries in `graves.json` point at `/maps/placeholder.png` (a 3.7 MB watercolor sketch). User will provide per-grave maps later; update each `mapImage` path as they land.
- **Fonts:** `/fonts/` is empty. CSS expects `MayflowerAntique.woff2` and `OldNewspaperTypes.woff2`. Body falls back to Georgia until they're added. There's a `OldNewspaperTypes 2.ttf` at the project root that may need conversion to WOFF2 + moving to `/fonts/`.
- **About page:** lorem ipsum, intentionally placeholder for now.

## Design tokens (in `styles.css`)

```
--paper:     #F0E8D6  /* cream background */
--ink:       #261C14  /* dark brown text */
--ink-muted: #6E5C46  /* secondary text */
--rule:      #A58C6E  /* hairline rules */
--font-display: 'Mayflower Antique', Georgia, serif
--font-body:    'OldNewspaperTypes', Georgia, serif
--content-max: 640px
--tap-min: 48px
```

Mobile-first; one breakpoint at 700px that bumps font sizes and padding.

## Notable behaviors / gotchas

- **Hero image** (`/hero header.png`, ~1 MB) uses `mix-blend-mode: multiply` so the PNG's white background blends into the cream paper. Relies on the BG being pure white. If we ever put the image on a non-cream surface, the math changes.
- **Video element does NOT have `playsinline`** — intentional. iOS/Android open the native fullscreen player on play. The 'pause-after-played' handler in `journey.js` reveals the Continue button if the user taps "Done" before the video ends, so they're never stuck.
- **Video preloading:** when a user lands on a grave page, the current video's `preload` is upgraded to `'auto'`. On correct unlock, a hidden `<video preload="auto">` is injected for the next grave's URL. Both are skipped if `navigator.connection.effectiveType` is `'slow-2g'` or `'2g'` or `saveData` is true. Cell service is poor at the cemetery so this matters.
- **Resume flow:** `/journey.html` with no `?grave=` param lands on the highest unlocked grave (not grave 1). The index page's CTA also detects progress and points at the right grave.
- **Map block** appears above the year form. Hidden along with the form on correct unlock (and on revisit of completed graves) — its only job is wayfinding.
- **Progress storage:** `localStorage.eden_progress = { unlocked: number[], completed: number[] }`. Grave 1 is always unlocked.

## Decisions deferred (do not re-propose unless user raises)

- **Service Worker preload cache.** Considered for video preloading robustness against iOS Safari backgrounding, but user wants to ship with the current implementation and only revisit if real-world cemetery walks show preloads dying. (Also captured in user's auto-memory.)
- **Image optimization** of the hero PNG and map placeholder. User is aware of the file sizes; flagged repeatedly. Don't keep harping.
