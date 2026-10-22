---
created: 2026-10-22
last_edited: 2026-10-22
tags: [COMP3900, week11, spec, rta]
---

# Build spec: Week 11 "From Theme to Implication" site

Source of truth for tasks: https://smcclab.au/thirty-nine-hundred-hci/workshops/10-analysis-2.html (paraphrased below; do not copy the page wholesale). Approved plan: `/Users/kevinzhu/.claude/plans/swift-booping-wave.md`.

## House rules (apply to ALL text you write: UI copy, data, comments, README)
- English only. **Never use em dashes**; use commas, semicolons, colons, periods or parentheses.
- Never use minimising-pivot constructions (state the point directly).
- No large verbatim transcript on the site. Excerpts are paraphrases or quotes of at most 15 words.
- Informal but precise tone, written to students.
- Tutor-only strings must contain the literal marker `TUTOR_ONLY` inside a runtime string (e.g. an exported const `TUTOR_ONLY_MARK = 'TUTOR_ONLY'` that is also rendered); `scripts/check-no-tutor.sh` greps dist/ for it. Tutor-only code is imported ONLY from `src/tutor/index.ts`, which `main.ts` imports under `if (__TUTOR__) { ... }`.

## Contracts
`src/types.ts` (do not edit). Scene APIs are in the stub files in `src/scenes/`; keep every exported name and signature.

## Design tokens (match Week 7/8 "Warm Neutrals")
bg `#FFFDF9`, text `#4A4A4A`, accent `#A47551`, pill/tint `#F3EADD`, header tint `#F9F5F1`, card white with `rgba(0,0,0,.08)` border, font Inter. Add dark-mode via `prefers-color-scheme` with explicit backgrounds. Video colours: simon `#2B6672` (teal), sarah `#B5527A` (rose), stacey `#C48A1F` (amber). Label shapes: O sphere, R cube, I octahedron. 16px side gutters, no horizontal scroll at 375px.

## Session
Assumed 90 min: Intro 5, Task 1 25, Task 2 25, Task 3 25, Task 4 10. Groups of 4-5, members may have watched different videos. Research question: "How do individuals experience and make sense of their relationships with technology in everyday life?"

## Videos (YouTube ids)
- Simon (assistive technology, case study, 543 s): `g_T96uOi2l4`. Warning: physical disability and reliance on assistive technology.
- Sarah (AI partner Sinclair, TV morning show segment, 803 s): `-AjpCru_lVE`. Warning: romantic and intimate relationships with AI, emotional attachment.
- Stacey (Aibo robot dog "Mia", one-year update video, 898 s): `D2fwWA9O2qc`. Warning: loss of a companion animal and grief.
Format notes the site must show: Simon's questions are scripted by an assistive-tech service and centre on the equipment. Sarah's segment is daytime TV with a presenter's framing; from about 10:20 a sex therapist gives her own interpretation, which is NOT participant data. Stacey's video is a monologue to an audience (no interviewer); speech ends about 6:20, the rest is a music montage.

## Student pages (hash routes)
1. `#/` Plan: timeline, RQ, three video cards (warning, format note, embed or link), how to use this site, privacy note (answers stay in this browser).
2. `#/task-1`: Step 1 (10 min) individual: assumptions textarea + code table (columns: Observation or excerpt with timestamp, Initial code, Why did you assign this code?; 3-5 rows, add/remove row); Lens Prism widget beside it as a reflexivity prompt. Step 2 (8 min) group: each member introduces video and shares 2-3 observations and codes; four discussion prompts (similarities and differences across experiences; underlying meanings connecting observations; why members interpreted similar experiences differently; observations that challenge an emerging interpretation); table: Related observations and codes / What connects or distinguishes them? / What might this suggest about people's relationships with technology?; Observation Galaxy widget for clustering. Step 3 (7 min) group candidate theme: working name, central organising concept, 2-3 supporting observations ideally from different interviews, what the theme helps us understand. A theme is a pattern of shared meaning around a central organising concept and should interpret rather than only describe. Keep it for Tasks 2 and 3.
3. `#/task-2`: tutor-prepared Theme A and Theme B (from data/themes.ts) with evidence rows, each timestamp a jump link. Step 1 (10 min) critique matrix: rows = Central organising concept, Supporting observations, Strengths, Limitations or alternative interpretations; columns = Theme A, Theme B; prompt to consider how your own assumptions affect which you find convincing. Theme Crystal widget with the six criteria checkboxes per theme. Step 2 (10 min) refine the weaker theme: revised name, central concept, evidence, interpretation; five prompts (explains an underlying pattern beyond a topic?; what connects the observations across interviews?; addresses the research question?; do differences or contradictions complicate it?; how might another researcher interpret the same observations?). Step 3 (5 min) revisit original theme: one change that strengthens it, why, has your understanding of the interviews or your assumptions changed?
4. `#/task-3`: explainer: a theme says what is going on; an implication answers "so what?", names who should do or think differently and what; may concern design, research or practice (Dourish 2006). Worked example: theme = students accept AI explanations for low-stakes study but become sceptical and seek a second source when marks are on the line; weak implication = designers should make AI study tools more trustworthy (could be written without data); stronger = AI study tools could show sources and confidence when a student prepares for an assessment, rather than in every interaction. Step 1 (15 min) writer: one implication in 2-3 sentences with a sentence counter; self-checks: does it say something the theme does not, or just restate it? Could you have written it without the data? Implication Ladder widget. Step 2 (10 min) class share: a projectable "share card" showing group theme + implication. Pointers to the four published examples: Deng et al. 2022 pp. 11-16; Tahmidul Karim et al. 2025 pp. 3-5; Choi et al. 2024 pp. 221-224; Adiwangsa et al. 2024 pp. 5-8.
5. `#/task-4`: Ed post composer, 100-150 words, live word counter with colour state (under, in range, over). Prompts: (1) why might researchers develop different themes from the same qualitative dataset, and why does reflexivity matter? (2) what did you have to add to get from your theme to your implication? Use examples from your analysis.
6. `#/after`: research cluster meeting checklist (final project spec and requirements, which parts seem fun; research questions or standout theme aspects; prototyping methods; evaluation plans and data types, need not do both quantitative and qualitative; times and places for future meetings). Closing note: today is a simplified RTA exercise, full studies engage the whole dataset repeatedly; final projects with qualitative data present implications as well as themes; for quantitative results a significant difference is a finding and what it means for design is the implication.
7. `#/resources`: grouped resources from data/resources.ts, plus Extensions (collapsible): theme-vs-topic-summary flip cards (6 cards), "rewrite this weak implication" drills (4 drills with a reveal), why LLM-style themes read superficial (tie to Theme A, cite the three CHI papers in the 'ai' resource group (Schroeder 2025, Yan 2024, Rigby and Iacovides 2026)), positionality sentence starter, optional per-video reading.
Persistent chrome: sticky header with nav, "Export" button (copy Markdown / download .md / print) covering every saved field, "Clear all" with confirm. Autosave to `localStorage` key prefix `w11:`; every storage call wrapped in try/catch with in-memory fallback.

## Tutor mode (only when `__TUTOR__`)
Floating "Tutor" drawer added by `src/tutor/index.ts`: (a) run sheet from `src/tutor/content.ts` with the projector session ring timer (use `mountRing`, controls: start/pause/+1 min/next segment), (b) Theme A/B diagnosis and counter-evidence with jump links, (c) group builder: textarea of "name, simon|sarah|stacey" lines; output groups of 4-5 maximizing video variety; names only in memory, never persisted, (d) per-video tutor notes. `content.ts` exports (types defined in that file, content worker owns it):
`runSheet: { segmentId: string; tutorMoves: string[]; watchFor: string[] }[]`, `themeDiagnosis: Record<'A'|'B', { verdict: string; strengths: string[]; limitations: string[]; counterEvidence: { video: VideoId; t: number; text: string }[]; improvementPath: string }>`, `videoTutorNotes: Record<VideoId, string[]>`, `sessionDecisions: string[]` (the page gaps to settle before class), and `export const TUTOR_ONLY_MARK = 'TUTOR_ONLY'`.
