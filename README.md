---
created: 2026-10-22
last_edited: 2026-10-22
tags: [COMP3900, week11, workshop, rta, vite, typescript]
---

# Week 11: From Theme to Implication

A small static site for the COMP3900/6390 Week 11 workshop. Students work through four tasks (observations to themes, critiquing themes, implications, a reflection post) using three short videos. It is vanilla TypeScript with Vite and three.js; there is no framework and no CSS library.

## Run it

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 5173 in **tutor mode** (adds the Tutor drawer). |
| `npm run dev:student` | Dev server in student mode (what students see). |
| `npm run build` | Student build into `dist/`, then the leak check (`scripts/check-no-tutor.sh`). Deploy `dist/` to Netlify by drag-and-drop, or connect the repo (`netlify.toml` runs `npm run build`). |
| `npm run build:tutor` | Tutor build into `dist-tutor/`. Local use only; never deploy it. |

`npm run build` runs `tsc --noEmit` first, so type errors fail the build.

## Routes

`#/` plan, `#/task-1` to `#/task-4`, `#/after`, `#/resources` (includes the Extensions). Routing is hash-based, so any static host works.

## Project layout

```
index.html               shell, Inter font link
src/main.ts              routes, shell, tutor gate (if (__TUTOR__) ...)
src/types.ts             shared data contracts
src/data/                content: videos, observations, themes, lenses, resources, plan
src/scenes/              three.js widgets (galaxy, prism, crystal, ladder, ring)
src/ui/                  student UI
  state.ts, schema.ts    localStorage store (keys under w11:), Markdown export
  components.ts          text fields, editable tables, counters, widget panels
  video.ts               VideoEmbed, seekTo, TimeLink
  copy.ts                instruction copy and UI strings
  pages/                 one file per route
  extensions.ts          flip cards, rewrite drills, LLM note, positionality
src/styles/              base.css, print.css
src/tutor/               tutor-only code (see below)
scripts/check-no-tutor.sh  fails the build if tutor material reaches dist/
docs/spec.md             page-by-page spec
```

## Where to edit content

- Videos, timestamps, themes, lenses, resources: `src/data/*.ts`. The UI renders everything from these modules, so text is never hard-coded in pages.
- Task instructions, prompts, flip cards and drills: `src/ui/copy.ts`.
- Tutor run sheet, theme diagnosis, video notes, session decisions: `src/tutor/content.ts`.
- Colours and spacing: tokens at the top of `src/styles/base.css`.

House rules for all text: English, no em dashes, no minimising-pivot phrasing (state the point directly), no long transcript quotes (paraphrase, or at most 15 words).

## Tutor mode and the leak check

Everything a tutor should see lives in `src/tutor/` and nowhere else. `src/main.ts` imports it only inside `if (__TUTOR__) { import('./tutor')... }`, and `__TUTOR__` is `false` in the default build, so the whole folder is removed from the student bundle. Every tutor module carries the marker `TUTOR_ONLY`, and `scripts/check-no-tutor.sh` fails `npm run build` if that string appears anywhere in `dist/`. If you add tutor material, keep it under `src/tutor/` and never import it from `src/ui/` or `src/main.ts` outside that gate.

The drawer has a run sheet with a session ring timer (Space start/pause, Right and Left arrows for next and previous segment, Projector view for the big readout), Theme A/B diagnosis with jump links, a group builder (names stay in memory, never saved), per-video notes and session decisions.

## Privacy

- No analytics, no cookies, no accounts, no server. Answers are saved in the browser's local storage under `w11:` keys and nowhere else. "Clear all" removes them.
- If storage is blocked (private mode), the site keeps answers in memory and says so in the header; Export before closing the tab.
- YouTube is contacted only after a student presses "Load video" or clicks a timestamp while a video panel is on the page, and then only via `youtube-nocookie.com`. Fonts come from Google Fonts.
- Export gives Markdown (copy or download) or print; the print stylesheet hides navigation and 3D widgets.

## Group rooms (live sharing)

Group steps (Task 1 Steps 2 and 3, Task 2, Task 3 Step 2) can be shared live: one person taps "New code", the others type it. Only the boxes and tables on those steps are shared; Step 1 work, the Ed post and everything else stay on the student's device. Rooms use a small Firebase Realtime Database; without the `VITE_FIREBASE_*` variables the deployed site simply hides the feature. Setup, rules, privacy and the emulator test are in [docs/group-rooms.md](docs/group-rooms.md). Tutor mode's group builder prints a room code per group.

## Backup workbook (Excel)

`public/backup/Week11-group-backup.xlsx` is a plain Excel file with one tab per group (Group 1, Group 2, ...), each holding Tasks 1 to 4 top to bottom, plus a "Class view" tab that collects every group's theme and implication. Upload it once to OneDrive or Google Drive with edit access and each group types on its own tab. The site links to it from the Plan and Resources pages. Rebuild it with a different group count using `python3 scripts/make_backup_workbook.py 12`.
