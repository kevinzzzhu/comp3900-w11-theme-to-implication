---
created: 2026-10-23
last_edited: 2026-10-23
tags: [COMP3900, week11, firebase]
---

# Group rooms: Firebase setup

Group rooms let 4-5 students co-edit the group fields live. They use Firebase Realtime Database (RTDB) with anonymous sign-in. Without the variables below, the deployed site hides group rooms; `npm run dev` falls back to an in-browser mock that only syncs tabs of the same browser.

## Setup

1. Create a Firebase project at console.firebase.google.com (Google Analytics is not needed).
2. Build, Realtime Database, Create database. Choose a region close to Australia, for example `asia-southeast1` (Singapore). Start in locked mode; the rules in step 5 replace it. The `databaseURL` form depends on the region: `https://<project-id>-default-rtdb.firebaseio.com` for `us-central1`, and `https://<project-id>-default-rtdb.<region>.firebasedatabase.app` for other regions. Copy the exact URL shown at the top of the Data tab.
3. Build, Authentication, Sign-in method, enable **Anonymous**.
4. Project settings, General, Your apps, add a Web app. Copy its config values into:
   - Netlify: Site configuration, Environment variables, using exactly the names in `.env.example` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`). Trigger a new deploy afterwards, because Vite bakes the values in at build time.
   - Local dev: copy `.env.example` to `.env.local` and fill it in (`.env.local` is git-ignored).
5. Rules: in the Realtime Database Rules tab paste the contents of `database.rules.json` and Publish, or run `firebase deploy --only database` from this folder (needs a `firebase.json` pointing at the rules file).
6. Optional: Authentication, Settings, Authorized domains: make sure the Netlify domain is listed.

The API key in the web config is not a secret; access is controlled by the rules and anonymous auth.

## What the rules do

JSON has no comments, so each block of `database.rules.json` is explained here.

- Root `.read` / `.write` false: everything is denied unless a rule below allows it.
- `rooms/$code`: the code must match the room alphabet (6 characters, no 0, O, 1, I, L), taken from `CODE_ALPHABET` in `src/sync/config.ts`. Reading needs a signed-in user. Writing at this level is only allowed as a delete (`!newData.exists()`), which is how "Delete room data" removes data, presence and meta in one call. Writes to children are governed by the child rules.
- `meta/createdAt`: must be a number (the server timestamp) and can only be written when it does not exist yet, so a room's creation time cannot be changed.
- `d`: the shared data. Writable by any signed-in user. Up to four key levels (a table cell is `d/<fieldKey>/r/<rowId>/<colKey>`). Every key matches `^[A-Za-z0-9_-]{1,48}$`. Levels 1 to 3 are either an object or a string of at most 4000 characters; level 4 must be a string. Numbers, booleans and deeper nesting are rejected. Validation does not run for deletes, so writing `null` always works. RTDB forbids `.`, `$`, `#`, `[`, `]` and `/` in keys, so these cannot appear in a key at all.
- `p/$uid`: presence. A client may only write its own node (`$uid === auth.uid`) and the value must be a boolean. The client sets it to `true` and the server removes it on disconnect.
- `$other` false (inside a room and inside `meta`): no other children can be created.

## Test with two browsers

1. `npm run dev:student` (or open the Netlify deploy) in a normal window and a private window; the private window gets a different anonymous user.
2. On a group step (Task 1 Step 2 or 3), in window A press "New code", then "Join or start", and note the code.
3. In window B type that code and press "Join or start". Edit a group field in A; it should appear in B within a second, and the presence count should read 2.
4. Go offline in A (DevTools, Network, Offline): the room badge turns to Offline, edits stay local, and they sync when the connection returns.

## Test locally with the emulators (no Firebase project needed)

1. `firebase emulators:start --only auth,database --project demo-w11` (needs Java; `firebase.json` is already set up).
2. Create `.env.tutor.local` (git-ignored) with `VITE_FIREBASE_API_KEY=demo-key`, `VITE_FIREBASE_AUTH_DOMAIN=demo-w11.firebaseapp.com`, `VITE_FIREBASE_DATABASE_URL=http://127.0.0.1:9000?ns=demo-w11-default-rtdb`, `VITE_FIREBASE_PROJECT_ID=demo-w11`, `VITE_FIREBASE_APP_ID=demo-app` and `VITE_FIREBASE_EMULATOR=1`, then `npm run dev`.
3. Two tabs of the same browser share one anonymous user, so presence reads 1; use a private window for a second person. Delete `.env.tutor.local` afterwards.
4. Without any Firebase variables, `npm run dev` uses the in-browser mock instead (tabs of one browser only).

## Capacity and cost

The free Spark plan allows about 100 simultaneous RTDB connections, 1 GB stored and 10 GB downloaded per month. A tutorial of 25 students is well inside that; each student holds one connection. If several tutorials run at the same time on one project, add them up.

## Privacy and retention

- Group text is stored on Google servers in the region chosen in step 2.
- No names or emails are collected. Anonymous sign-in creates a random ID per browser, and presence is only a count.
- Room codes are unguessable in practice (about 887 million combinations), but anyone who has a code can read and edit that room. Tell students not to share codes outside their group and not to put sensitive personal information in the fields.
- To purge: students use "Delete room data" in the room, or after the workshop delete the `rooms` node in the console (Realtime Database, Data tab, hover `rooms`, delete). Anonymous user records can be removed under Authentication, Users.
- Before collecting student writing, check with the course convenor or ANU data guidance (for example whether consent or an ethics review is needed for later use of the text).

## Troubleshooting

- "Permission denied" or "refused access": the rules were not published, or Anonymous sign-in is not enabled (step 3 or 5).
- "Could not sign in to the group service": Anonymous sign-in is off, the API key is wrong, or the network blocks Google. Check the browser console.
- Join times out or stays on "connecting": wrong `databaseURL`. The URL must match the region of the database exactly (see step 2); a `firebaseio.com` URL for a non-US database does not work.
- Offline banner while the network is fine: same cause as above, or the Netlify deploy was not rebuilt after setting the variables.
- Group rooms are missing on the deployed site: one of the required variables (API key, database URL, project ID, app ID) is empty in the Netlify build.
