# MATRIX Vibe Coding 2.0 — Production Readiness Pass (Audit + Fixes)

This pass audited the existing full-stack codebase against a 25-point production-readiness
checklist and fixed real bugs found during that audit. **No rebuild** — the existing
architecture, UI theme, and unaffected features were left as-is.

> ⚠️ **Build/typecheck could NOT be run.** This environment has no network access
> (`npm install` fails with `403 Forbidden` against the npm registry), so `npm install`,
> `npm run typecheck`, and `npm run build` were never executed here. Every change below was
> made by careful manual code review, not verified by a compiler. **Run these yourself before
> deploying:**
> ```
> cd server && npm install && npm run build
> cd .. && npm install && npm run build
> ```

## CHANGES MADE

### 1. Dummy data removed (spec §2)
- `server/src/seed.ts` created exactly the fake teams named in the spec (CodeCrafters,
  ByteBenders, NullPointers) and ran destructive `deleteMany()` on Team/User/Judge/etc. every
  run. **Rewritten** to be non-destructive and idempotent: it now only upserts the singleton
  event-settings doc, the SUPER_ADMIN account, optional judge accounts (from a new
  `JUDGE_ACCOUNTS` env var), and a small set of real problem statements — by id, so re-running
  it never duplicates or wipes anything. It never touches Team/CheckIn data and creates zero
  fake teams.

### 2. QR permanence enforced correctly (spec §4)
- The *issuance* logic was already correct (one permanent QR minted on verification, never
  re-minted on page load/refresh) — no bug there.
- **Real bug:** team leaders had a self-service "Regenerate QR" button + `POST
  /api/teams/me/qr/regenerate` route, which the spec explicitly forbids ("only SUPER_ADMIN may
  regenerate"). **Fixed:** removed the team-facing route, controller export, API call, and UI
  button entirely. Also tightened the admin-side regenerate endpoint from `ADMIN|SUPER_ADMIN` to
  `SUPER_ADMIN`-only, matching the spec precisely.
- Added a unique index on `QRToken.tokenHash` and a compound `{team, active}` index (defense in
  depth / faster lookups, per spec §12).

### 3. Evaluation → Results pipeline fixed (spec §9/§10/§11)
- **Real bug:** `Submission.status` was set to `UNDER_REVIEW` on the *first* judge evaluation
  and never advanced to `EVALUATED`, even after every assigned judge had scored it — so the
  result/leaderboard section could never treat any submission as "done."
  **Fixed:** `judgeController.submitEvaluation` now compares the number of judges assigned to a
  submission against the number of evaluations submitted for it, and flips the status to
  `EVALUATED` (and the team's `eventStatus`) once every assigned judge has scored it.
- **Fixed:** the leaderboard now ranks only `EVALUATED` submissions (previously it aggregated
  over every submission with *any* evaluation, so a team scored by only 1 of 3 judges could
  outrank a fully-scored team on a partial average).

### 4. Security hardening added (spec §17)
- Added `helmet`, `express-mongo-sanitize`, and `express-rate-limit` (general API limiter +
  a stricter limiter specifically on `/api/auth/login` and `/api/admin/login` to slow
  credential-stuffing). Added the three packages to `server/package.json`.

### 5. Consistent error codes (spec §5/§15/§20)
- `ApiError` and the global error handler now support an optional machine-readable `code`
  alongside the human message (`{success:false, message, code}` — fully backward compatible,
  `code` is omitted when not set).
- Wired the exact codes the spec calls for through the QR/check-in flow: `TEAM_NOT_FOUND`,
  `TEAM_NOT_VERIFIED`, `INVALID_QR`, `ALREADY_CHECKED_IN`, `CHECKIN_SUCCESS`.

### 6. QR scanner duplicate-submission bug (spec §5)
- **Real bug:** the camera's frame-decode callback in `AdminCheckins.tsx` fired on every video
  frame while a QR stayed in view, and `handleScanValue` had no guard — a single scan could hit
  the verify API dozens of times per second. **Fixed:** added a ref-based scan lock (state alone
  is too slow — multiple decode callbacks can fire before a state update flushes), and the
  scanner now auto-stops the instant a code is decoded, only restarting when staff explicitly
  clicks "Start Scanner" again for the next team.

### 7. Judge-facing frontend UI — previously entirely missing
- Built `src/api/judgeApi.ts`, `src/admin/JudgeLayout.tsx` (deliberately minimal — no admin
  sidebar, so a judge account can never see team/admin/settings management even via the UI),
  and `src/admin/pages/JudgeDashboard.tsx` (lists only that judge's assigned submissions, an
  already-scored badge, and a 6-criterion scoring form with a live running total, feedback
  field, and the "one evaluation per submission" rule enforced by the backend).
- Wired role-based routing: `/admin/judge` is a separate route tree; `AdminLayout` now redirects
  a `JUDGE` account away from the full admin panel, and `AdminLogin` sends judges to
  `/admin/judge` instead of `/admin` after login. The admin sidebar also now hides the
  SUPER_ADMIN-only "Settings" link from plain `ADMIN` accounts (backend already enforced this;
  now the UI reflects it too — spec §6/§7/§8 explicitly warn against relying on hidden buttons,
  so backend enforcement was and remains the real guard, this is just UX-correctness on top).

### 8. Judge account creation — previously impossible from the app
- **Real gap found:** `AdminJudges.tsx` literally told the admin *"add them via the seed script
  or directly in MongoDB"* — there was no way to create a judge from the running application at
  all. **Fixed:** added `POST /api/admin/judges` (ADMIN or SUPER_ADMIN, matching "Manage judges"
  in both role's permission lists) which creates the account with a random temporary password
  (shown once, never retrievable again), and a create-judge form + submission-assignment picker
  in the Judges admin page.

### 9. Admin Settings — previously a stub
- **Real gap found:** the Settings page was literally a static paragraph telling the admin to
  edit MongoDB directly. **Fixed:** added `GET/PATCH /api/admin/settings` (GET for
  ADMIN+SUPER_ADMIN, PATCH restricted to SUPER_ADMIN only — "manage system settings" is a
  SUPER_ADMIN-only permission per spec §6/§7) and a real form (event name, max team size,
  registration open/closed, check-in open/closed). `resultsPublished` is intentionally **not**
  editable from this form — it only flips via the existing `POST /api/admin/results/publish`,
  which also cascades a team-status update; editing it here directly would skip that.

### 10. Misc hardening
- `.gitignore` (root) now also excludes `.env`/`.env.local` (server's already did).
- `server/.env.example` documents the new optional `JUDGE_ACCOUNTS` seed var.

## BUGS FOUND (confirmed real, listed above with fixes)
1. Seed script created hardcoded fake teams and destructively wiped collections on every run.
2. Team leaders could self-regenerate their permanent QR (spec forbids this).
3. Admin (not just SUPER_ADMIN) could also regenerate QR codes.
4. Submissions never reached `EVALUATED` status — stuck at `UNDER_REVIEW` forever.
5. Leaderboard ranked partially-evaluated submissions against fully-evaluated ones.
6. No helmet/rate-limiting/mongo-sanitize anywhere in the API.
7. Error responses had no machine-readable `code`, despite the QR/check-in flow needing one.
8. QR scanner could fire the verify API many times per second for a single scan.
9. Judge-facing UI did not exist at all (backend judge API was unreachable from the app).
10. No way to create a judge account without direct database access.
11. Admin Settings page was a non-functional stub.

## FILES MODIFIED / ADDED
**Backend:** `server/src/seed.ts`, `server/src/app.ts`, `server/src/package.json`,
`server/src/middleware/errorHandler.ts`, `server/src/services/qrService.ts`,
`server/src/controllers/qrController.ts`, `server/src/controllers/judgeController.ts`,
`server/src/controllers/adminController.ts`, `server/src/controllers/resultController.ts`,
`server/src/routes/adminRoutes.ts`, `server/src/routes/teamRoutes.ts`,
`server/src/models/QRToken.ts`, `server/.env.example`

**Frontend:** `src/api/qrApi.ts`, `src/api/adminApi.ts`, `src/api/judgeApi.ts` (new),
`src/pages/TeamQr.tsx`, `src/admin/AdminLayout.tsx`, `src/admin/AdminLogin.tsx`,
`src/admin/AdminAuthContext.tsx`, `src/admin/JudgeLayout.tsx` (new),
`src/admin/pages/JudgeDashboard.tsx` (new), `src/admin/pages/AdminJudges.tsx`,
`src/admin/pages/AdminSettings.tsx`, `src/admin/pages/AdminCheckins.tsx`, `.gitignore`

## TEST RESULTS
- Frontend build: **NOT TESTED** (no network access to `npm install` dependencies)
- Backend start: **NOT TESTED** (same reason, and no MongoDB instance available here)
- Registration: **NOT TESTED** — code path unchanged from prior working pass, no new risk introduced
- Verification: **NOT TESTED** — unchanged
- QR persistence: **NOT TESTED** — issuance logic unchanged (was already correct); regenerate
  path narrowed to SUPER_ADMIN only and manually re-read line by line
- Check-in: **NOT TESTED** — scanner lock fix reviewed manually; two-step verify/confirm flow unchanged
- Judge evaluation: **NOT TESTED** — new EVALUATED-transition logic reviewed manually; depends on
  `Judge.assignedSubmissions` counts being accurate, which depends on the assignment feature
  also added this pass
- Results: **NOT TESTED** — leaderboard filter change reviewed manually
- SUPER_ADMIN / ADMIN / JUDGE permission boundaries: **NOT TESTED end-to-end**, but every route
  change was checked against its existing `requireAdmin`/`requireSuperAdmin`/`requireRole`
  middleware, which was already backend-enforced (not just hidden buttons) before this pass
- Mobile: **NOT TESTED** — no responsiveness pass done this round; flagged as remaining work below

## REMAINING / NOT DONE THIS PASS
- Full mobile-responsiveness sweep (spec §21) — not audited this round.
- A systematic scan for duplicate/redundant `useEffect` API calls across every dashboard page
  (spec §14) — only the QR scanner's duplicate-call bug was found and fixed; other pages weren't
  individually profiled.
- ESLint/TypeScript compiler run — impossible without network access to install dependencies.
- **You must run `npm install && npm run build` (both `server/` and root) yourself** and address
  anything the compiler flags before treating this as deploy-ready.

---

## Follow-up: Dummy Team Database Cleanup

A live deployment had four dummy registrations sitting in MongoDB (`MTX-10001` CodeCrafters,
`MTX-10002` ByteBenders, `MTX-10003` NullPointers, `MTX-10004` limitless — the fourth one isn't
from `seed.ts` at all, so it was created through the app itself during earlier testing).

### 1. Files changed
- **Added** `server/src/cleanupDummyTeams.ts` — the one-time cleanup script.
- **Changed** `server/package.json` — added the `cleanup:dummy` script.
- No other files were touched for this task. `seed.ts`, auth, admin login, SUPER_ADMIN/JUDGE
  accounts, event settings, problem statements, registration, and QR verification logic were
  all left exactly as they were from the previous pass, per your instructions.

### 2. Cleanup command
```
cd server
npm run cleanup:dummy
```
Safe to run more than once — the second run will print `Teams found: 0` and exit without error.

### 3. Exact records/dependencies it will delete
Matches **only** these four exact `teamId`s — never a name pattern, never `deleteMany({})`:
`MTX-10001`, `MTX-10002`, `MTX-10003`, `MTX-10004`. For each match it deletes, in order:
Evaluations tied to that team's Submission → the Submission itself → QRTokens for that team →
CheckIn records for that team → the team's `TEAM_LEADER`/`TEAM_MEMBER` user account(s) (matched
by `team` pointing at that exact team id — **never** ADMIN/SUPER_ADMIN/JUDGE, and never a user
belonging to any other team) → the Team document itself. It prints every matched team before
deleting anything, then a count-by-count summary, exactly matching the format you specified. It
tries to run everything inside a MongoDB transaction/session; if the target deployment is a
standalone `mongod` (no replica set — transactions aren't supported there), it detects that
specific error and falls back to the same sequential deletes without a transaction, rather than
failing outright.

### 4. Build/typecheck result
**Still not fully verifiable** — this environment has no network access (`npm install` gets
`403 Forbidden` from the npm registry), so `node_modules` doesn't exist here and a real
`tsc`/build run isn't possible. I ran `npx tsc --noEmit` anyway to at least parse every file:
it reported only "cannot find module / cannot find name `process`" errors, which are exactly
what you'd expect with no `mongoose`/`@types/node` installed — not logic errors. After filtering
those out, the only remaining flags were two `Property does not exist on type '{}'` warnings in
`resultController.ts`, which trace back to Mongoose's own generic types being unresolvable
without the package installed (the surrounding code pattern is unchanged from the working
version) — not something introduced by this cleanup script. **You should run `npm install &&
npm run typecheck && npm run build` yourself** to get a real result before deploying.

### 5. Confirmation on seed.ts
Re-inspected `server/src/seed.ts` from the previous pass — it still creates only event settings,
the SUPER_ADMIN account, judges (only if you set the optional `JUDGE_ACCOUNTS` env var), and a
handful of real problem statements, all via non-destructive upserts. It contains no reference to
CodeCrafters/ByteBenders/NullPointers/limitless or `MTX-10001`–`MTX-10004`, and running it again
will never recreate any of them. I also grepped the **entire repository** (backend + frontend)
for all four team names and all four team IDs — the only matches are the cleanup script itself
(intentional) and a code comment / UI placeholder showing `MTX-10001` purely as an example of the
ID *format* (e.g. `placeholder="Team ID (e.g. MTX-10001)"`), not actual stored data. No hardcoded
dummy records remain anywhere in the codebase.

---

## Follow-up: Email OTP Two-Factor Login

Both existing login surfaces — `POST /api/auth/login` (team leader/member) and `POST
/api/admin/login` (ADMIN/SUPER_ADMIN/JUDGE) — now require a 6-digit email OTP after the
password check, before any JWT/session is issued. No existing JWT/role/middleware logic was
touched; the OTP step was inserted between "password verified" and "token issued".

### 1. Files created
- `server/src/models/Otp.ts` — OTP records: hashed code, opaque `verificationId`, expiry,
  attempts, verified/active flags. TTL index auto-cleans expired records (with a buffer so the
  app can still return a proper "expired" error rather than "not found").
- `server/src/services/emailService.ts` — Nodemailer SMTP transport from env vars + the
  responsive HTML OTP email template. Non-production-only console fallback if SMTP isn't
  configured (never in production — see the file for the guard).
- `server/src/services/otpService.ts` — `issueOtp`, `verifyOtp`, `resendOtp`: all the hashing,
  expiry, attempt-limiting, rate-limiting, and invalidate-previous-OTP logic lives here, shared
  by both login surfaces.
- `server/src/services/otpService.test.ts` — Vitest unit tests covering scenarios 1–11 from your
  testing checklist (see §16 note below — this project had no test framework at all before this,
  so Vitest was added).
- `src/api/otpApi.ts` — frontend `verifyOtp` / `resendOtp` calls (shared by both flows).
- `src/pages/VerifyOtp.tsx` — the shared `/verify-otp` page (6 separate digit inputs with
  auto-advance/backspace/paste/numeric-keyboard support, resend cooldown countdown, and all the
  error states from your spec verbatim).

### 2. Files modified
- `server/src/controllers/authController.ts` — `loginTeam` and `loginAdmin` now stop after
  issuing an OTP (`{success, requiresOtp:true, message, verificationId}`) instead of returning a
  token. Added `verifyOtp`/`resendOtp` controllers — shared by both flows since a
  `verificationId` is role-agnostic; the final JWT/cookie is only ever created inside
  `verifyOtp`, branching on the user's role to build a team-shaped or admin-shaped response, then
  reusing the exact same `signToken`/`authCookieOptions` mechanism as before.
- `server/src/routes/authRoutes.ts` — added `POST /verify-otp`, `POST /resend-otp` (public,
  pre-auth, shared by both surfaces).
- `server/src/app.ts` — added a dedicated rate limiter (`otpLimiter`) on `/api/auth/verify-otp`
  and `/api/auth/resend-otp`, reusing the existing `express-rate-limit` setup rather than
  introducing a second rate-limiting system.
- `server/package.json` — added `nodemailer`, `@types/nodemailer`, `vitest` (+ a `test` script).
- `server/.env.example` — added `SMTP_HOST/PORT/USER/PASSWORD/FROM`,
  `OTP_EXPIRES_MINUTES/RESEND_SECONDS/MAX_ATTEMPTS`.
- `src/api/authApi.ts` / `src/api/adminAuthApi.ts` — `loginTeam`/`loginAdmin` now return the OTP
  envelope instead of a session (no `setAuthToken` call here anymore — nothing to store yet).
  Also removed an already-unused `fetchMe` helper while touching this file.
- `src/context/AuthContext.tsx` / `src/admin/AdminAuthContext.tsx` — `login()` is now purely
  step 1 (password → OTP envelope, no state mutation); added `hydrate()`, called only by
  `VerifyOtp.tsx` after a successful OTP check, to populate the session state directly from the
  verify response (no extra round trip).
- `src/pages/Login.tsx` / `src/admin/AdminLogin.tsx` — on success, navigate to `/verify-otp`
  with the `verificationId` (and, for team login, the original `from` redirect target) instead
  of going straight to a dashboard.
- `src/App.tsx` — added the `/verify-otp` route (public, top-level, alongside `/login` and
  `/admin/login`).

### Design notes / how it satisfies the spec
- **JWT is genuinely never issued before OTP verification.** `loginTeam`/`loginAdmin` no longer
  touch `signToken`/`res.cookie` at all — that code only exists inside `verifyOtp` now.
- **One shared `/verify-otp` page and one shared backend pair of endpoints** handle all four
  roles (TEAM_LEADER/TEAM_MEMBER/ADMIN/SUPER_ADMIN/JUDGE) — no duplicated OTP logic per role.
  Role routing after verification is preserved exactly (ADMIN/SUPER_ADMIN → `/admin`, JUDGE →
  `/admin/judge`, team roles → wherever they were headed before login).
- **Race-safety on verification:** the "mark this OTP used" step is an atomic
  `findOneAndUpdate({..., active:true, verified:false}, {verified:true, active:false})` — if two
  requests for the same correct code arrive concurrently, only one can win; the other gets
  `OTP_ALREADY_USED`/`INVALID_VERIFICATION_ID`, never a second session.
- **Email-send failure never leaves a usable OTP behind:** if `sendOtpEmail` throws, the
  just-created OTP record is immediately deactivated and a `502 EMAIL_SEND_FAILED` is returned —
  the user was never shown a code for it, so it can't be used, and no session exists yet either.
- **Reload/back-button resilience:** `VerifyOtp.tsx` stashes `{verificationId, flow, from}` in
  `sessionStorage` (never the JWT — there isn't one yet) so a page reload during the ~5-minute
  window doesn't strand the user; if truly nothing is found it shows a clear "verification
  expired, log in again" screen with both login options.
- **User enumeration:** an unknown `verificationId` and an expired/already-used one return the
  same generic message either way; login itself still returns the pre-existing generic "Invalid
  email or password" regardless of whether the email exists.

### Testing (spec §16)
This project had **no test framework at all** before this change, so Vitest was added.
`server/src/services/otpService.test.ts` covers scenarios 1, 3–11 from your list as mocked unit
tests against the OTP state machine (in-memory fake Otp/User models + mocked email — no real
MongoDB needed to run these). Scenarios 12–15 (full admin/judge/team login round-trips and
"existing authorization still works") would need an HTTP+DB integration setup (e.g. supertest +
mongodb-memory-server) that isn't part of this project yet — I didn't want to bolt on a second,
heavier test infrastructure choice without your input. **I could not run `npm test` here** (no
network to install Vitest/nodemailer/etc.) — please run `cd server && npm install && npm test`
yourself.

### Final check (spec §17) — honest status
- Backend TypeScript check: **NOT TESTED** — same no-network limitation as every prior pass;
  `npx tsc --noEmit` was run anyway and shows only pre-existing missing-dependency noise, no new
  errors from this change (see earlier sections of this report for the same caveat).
- Frontend build: **NOT TESTED** — same reason.
- Tests: **NOT TESTED** (see above) — written but unrun.
- MongoDB connection / email sending / OTP expiry / resend cooldown: **NOT TESTED against a real
  database or SMTP server** — no MongoDB or SMTP credentials available in this environment. The
  unit tests exercise the expiry/cooldown/attempt-limit logic against the mocked model instead.
- Admin/team/judge role routing: reviewed manually, unchanged from the previous pass except for
  where the JWT gets minted.
- Existing QR/check-in functionality: untouched by this change — no QR/check-in files were
  modified this pass.

---

## Follow-up: Admin Problem Statement Management Overhaul

Problem statements are now genuinely optional end-to-end: the app works correctly with zero of
them, admins get a full CRUD panel to add/edit/publish/delete them whenever they're ready, and
nothing else in the system (login, OTP, registration, QR, check-in, team dashboard) depends on
one existing.

### 1. Files changed
**Backend:** `server/src/models/ProblemStatement.ts` (extended), `server/src/controllers/problemController.ts`
(rewritten), `server/src/routes/adminRoutes.ts` (new routes), `server/src/utils/generateId.ts`
(added `generateProblemId`), `server/src/seed.ts` (removed the 3 demo problem statements it used
to upsert).
**Frontend:** `src/lib/types.ts` (extended `ProblemStatement`), `src/api/adminApi.ts` (new calls),
`src/admin/pages/AdminProblems.tsx` (full rewrite), `src/pages/Submission.tsx` (problem selection
is only required when at least one problem statement actually exists — see below).

### 2. Database changes
`ProblemStatement` gained: `shortDescription`, `description` (now **optional**, was required),
`constraints`, `inputFormat`, `outputFormat`, `sampleInput`, `sampleOutput`, `tags: string[]`,
and `isDeleted` (soft delete). `problemId` and `title` are unchanged. No migration is needed —
these are all new optional fields, and existing documents (if any) load fine with them absent.
Draft/Published is still the existing `isPublished` boolean (not a new duplicate `status` field)
so nothing else that reads it needed to change. Added a `{isPublished, isDeleted}` index.

### 3. New/updated APIs
- `GET /api/admin/problems` — now excludes soft-deleted records (previously showed everything).
- `GET /api/admin/problems/:id` — **new**, full detail for View/Edit.
- `POST /api/admin/problems` — now only requires `title`; `problemId` is always auto-generated
  (`PRB-1001`, `PRB-1002`, … — matching the same auto-generated-ID convention as `teamId`,
  `submissionId`, etc. elsewhere in this project, rather than a user-typed code). Defaults to
  Draft (`isPublished:false`) unless the caller explicitly asks to publish.
- `PUT /api/admin/problems/:id` — edits in place (never creates a duplicate); `problemId`,
  `isPublished`, and `isDeleted` are intentionally not editable through this endpoint.
- `PATCH /api/admin/problems/:id/publish` / `.../unpublish` — **new**, dedicated status toggles.
- `DELETE /api/admin/problems/:id` — **changed to a soft delete**: sets `isDeleted:true` and
  unpublishes it, and reports how many Teams/Submissions still reference it (informational — it's
  never blocked, since the soft delete already keeps their reference valid).
- `GET /api/problems` (team-facing) — unchanged behavior (published + not-deleted only), now also
  explicitly excludes soft-deleted records.
- All admin routes remain behind the existing `requireAdmin` (ADMIN or SUPER_ADMIN) middleware —
  nothing new was opened up to other roles.

### 4. How to add a problem later
Admin Dashboard → Problem Statements → **+ Add Problem Statement** → fill in whatever fields are
ready (only Title is required) → **Save as draft**. It appears in the admin list immediately but
stays invisible to teams until published.

### 5. How Draft/Publish works
Every new problem statement starts as a Draft. From its card, **Publish** flips it to visible on
`GET /api/problems` (what teams see); **Unpublish** reverses that instantly — no data is lost
either way, it's a pure visibility toggle. Deleting is a separate, soft action (see above) with a
confirmation dialog first ("Are you sure you want to delete this problem statement?").

### 6. Zero-problem-statements verification
- Team submission flow: **this was the one real blocking bug found.** The submission form
  unconditionally required selecting a problem statement to advance past step 1 — with zero
  problems published, this made it *impossible* for any team to save a draft or submit at all.
  Fixed: the field is only required when `problems.length > 0`; with none published, the dropdown
  shows "No problem statements published yet" (disabled) and is explicitly optional.
- Everything else on your zero-problems checklist (admin login, admin dashboard, team
  registration, team login, OTP verification, QR generation, QR check-in, team dashboard, judge
  login, event settings) was already independent of `ProblemStatement` — reviewed each
  controller/page and none of them query or assume a problem statement exists. The admin
  dashboard's `problemSelection` stat and the team-detail view already handled a null/absent
  `problemStatement` reference gracefully (`$ne: null` / optional chaining) before this change.
- Seed script no longer creates any problem statements (previously seeded 3 example ones) —
  confirmed by removing that block and grepping the repo for their names/IDs: no references
  remain anywhere.

### Test results — honest status
Same environment limitation as every prior pass in this thread: **no network access**, so
`npm install`/`npm run build`/`npm run typecheck`/`npm test` could not actually be executed here.
I ran `npx tsc --noEmit` on both the backend and frontend anyway; after filtering out the
missing-`node_modules` noise, the only remaining flag is the same pre-existing
`resultController.ts` type-inference artifact from earlier passes (unrelated to this change, not
new). Please run the real toolchain yourself:
```
cd server && npm install && npm run typecheck && npm test
cd .. && npm install && npm run build
```
The 12 scenarios in your testing checklist were reasoned through against the code (CRUD paths,
publish/unpublish, soft delete, non-admin 403s via the existing `requireAdmin` middleware, and
the zero-problems path) rather than run against a live server/database, since neither is
available in this sandbox.

---

## Follow-up: Mandatory Gmail OTP Verification on Team Registration

Team registration now requires the same Gmail OTP verification as login before it's considered
complete — reusing the exact OTP infrastructure built for login (no second OTP/email system).

### Files modified
- `server/src/models/User.ts` — added `emailVerified` (default **true**, so every account created
  outside the public registration flow — admin/judge accounts, the seed script, and any team
  account that already existed before this change — is unaffected; only `registerTeam`
  explicitly sets it `false`).
- `server/src/models/Team.ts` — added `registrationStatus: 'PENDING' | 'VERIFIED'` (default
  **VERIFIED**, same backward-compatibility reasoning). This is intentionally separate from the
  existing `verificationStatus` field, which is the admin's unrelated eligibility-approval
  workflow (PENDING/VERIFIED/REJECTED) — nothing about that was touched.
- `server/src/services/teamService.ts` — `serializeTeam` now also returns `registrationStatus`.
- `server/src/services/otpService.ts` — `issueOtp`/`resendOtp` now also return a masked display
  email (`a****@gmail.com`) and the actual configured expiry in seconds, so the OTP screen can
  show exactly what your mockup asked for without hardcoding a duration.
- `server/src/controllers/authController.ts` — `registerTeam` rewritten (see below); the shared
  `verifyOtp` gained one new branch: if the verified account's `emailVerified` was still `false`,
  this is what flips it (and the team's `registrationStatus`) to verified, *before* issuing the
  JWT — this is the only place that happens, and it can't be spoofed from the frontend.
- `src/api/authApi.ts`, `src/api/adminAuthApi.ts`, `src/api/otpApi.ts` — envelope types extended
  with `maskedEmail`/`expiresInSeconds`; `registerTeam` now returns the OTP envelope instead of
  an immediate session.
- `src/context/AuthContext.tsx` — `register()` is now step 1 only (no state mutation); the
  existing `hydrate()` from the login-OTP work finishes it after verification.
- `src/pages/Register.tsx` — navigates to `/verify-otp` on success instead of the dashboard.
- `src/pages/VerifyOtp.tsx` — now shows the masked email ("We sent a 6-digit code to
  a\*\*\*\*@gmail.com") and a live "OTP expires in 05:00" countdown, in addition to the resend
  cooldown it already had from the login-OTP work. **No new page was created** — registration
  reuses the exact same `/verify-otp` screen as login, which already had the dark/green/cyan
  glassmorphism styling, 6-box input with paste/backspace/auto-advance, and resend cooldown.

### New files
None — this was implemented entirely by extending the existing OTP/email/verify-otp
infrastructure from the login-OTP feature, per your "do not create a duplicate OTP/verification
system" instruction. There is no separate `POST /api/auth/register/verify-otp` — registration
uses the same `POST /api/auth/verify-otp` and `POST /api/auth/resend-otp` that login uses.

### How it works
1. `POST /api/auth/register` validates input, then:
   - **New email:** creates the User (`emailVerified:false`) and Team
     (`registrationStatus:'PENDING'`) immediately, exactly as before, but does **not** issue a
     JWT.
   - **Email matches an already-fully-registered account:** `409 "This email is already
     registered."`
   - **Email matches a pending (never-verified) registration:** updates that same team/user with
     whatever was just submitted and reissues a fresh OTP — this is the "Continue verification OR
     request a new OTP" case from your spec, and guarantees no duplicate team is ever created for
     one email.
   - Then calls the existing `issueOtp()` and returns `{success:true,
     requiresEmailVerification:true, message, verificationId, maskedEmail, expiresInSeconds}`.
2. Frontend redirects to `/verify-otp`.
3. `POST /api/auth/verify-otp` (unchanged endpoint from the login-OTP work) verifies the code
   through the exact same hashing/expiry/attempt-limit/single-use logic already built. If the
   account's `emailVerified` was still false, this call is what sets `emailVerified:true` and
   `registrationStatus:'VERIFIED'` — then, and only then, issues the JWT/cookie and returns the
   team, exactly like a normal login would.
4. If `sendOtpEmail` throws (SMTP failure), `issueOtp` deactivates the unusable OTP and throws
   before any response is sent — the pending User/Team rows are left exactly as they were
   (`emailVerified:false`), no session is created, and the registration remains resumable.
5. A team leader who registered but never completed the OTP step can simply try to **log in**
   later with the same credentials — `loginTeam` already issues an OTP unconditionally, and
   `verifyOtp`'s new branch will complete the pending registration at that point too, with no
   special-casing needed in the login path at all.

### Explicitly NOT changed
Login OTP, the email service, QR generation/check-in, admin authentication, the Problem Statement
system, and the team dashboard — none of these files were touched by this change.

### Test results — same honest caveat as every prior pass in this thread
No network access in this sandbox, so `npm install`/build/test could not actually be run. I
re-ran the filtered `npx tsc --noEmit` check on both backend and frontend after this change — no
new errors, only the same pre-existing `resultController.ts` artifact from earlier passes. The
existing `otpService.test.ts` unit suite (login-OTP scenarios) still applies unmodified, since the
registration-completion logic (the `emailVerified` flip) lives in the controller, not in
`otpService` itself — I did not add a new automated test for that specific branch; it was
reasoned through by hand instead. Please run the real toolchain, including a real end-to-end
registration → Gmail → OTP → dashboard pass with real SMTP credentials, before treating this as
verified.

---

## Follow-up: Complete Admin Management Upgrade (Team soft-delete, Judge deactivation, Dynamic Announcements, Dynamic Results, Audit Log)

### 1. Files changed
**New backend files:** `server/src/models/AuditLog.ts`, `server/src/services/auditService.ts`,
`server/src/controllers/auditController.ts`.
**Rewritten backend files:** `server/src/controllers/adminController.ts` (team soft-delete/
restore/permanent-delete/test-cleanup + expanded dashboard stats), `server/src/controllers/
announcementController.ts` (admin listing, scheduling, priority, audit logging),
`server/src/controllers/resultController.ts` (dynamic status/title/message).
**Modified backend files:** `server/src/models/Team.ts` (`isDeleted`/`deletedAt`/`deletedBy`/
`isDummy`), `server/src/models/Announcement.ts` (full type list, `priority`, `publishAt`/
`expiresAt`), `server/src/models/Event.ts` (`resultStatus`/`resultTitle`/`resultMessage`),
`server/src/models/Judge.ts` (`deactivatedAt`/`deactivatedBy`), `server/src/controllers/
judgeController.ts` (`deleteJudge`), `server/src/services/teamService.ts` (expose the new fields;
scope `countMembersAcrossTeams` to active teams), `server/src/routes/adminRoutes.ts` (every new
route, see below).
**New frontend files:** `src/admin/pages/AdminDeletedTeams.tsx`, `src/admin/pages/AdminAuditLog.tsx`.
**Rewritten frontend files:** `src/admin/pages/AdminJudges.tsx` (delete/deactivate),
`src/admin/pages/AdminAnnouncements.tsx` (full CRUD + priority + scheduling),
`src/admin/pages/AdminResults.tsx` (status controls + editable message).
**Modified frontend files:** `src/admin/pages/AdminTeams.tsx` (delete + test-cleanup),
`src/admin/pages/AdminDashboard.tsx` (new counters), `src/admin/AdminLayout.tsx` (nav items +
**a real bug fix**, see below), `src/pages/Announcements.tsx` (URGENT badge),
`src/pages/Results.tsx` (dynamic copy/title/message), `src/api/adminApi.ts` (every new call),
`src/api/resultApi.ts`, `src/lib/types.ts`, `src/App.tsx` (new routes).

### Bug found and fixed along the way
`AdminLayout.tsx` computed a role-filtered nav array (`nav`, hiding SUPER_ADMIN-only items like
Settings from plain ADMIN accounts) but the actual `<nav>` JSX was still mapping over the raw
unfiltered `NAV` constant — so the filter was silently never applied and every admin saw every
nav item regardless of role. Fixed to render the filtered array.

### 2. APIs added/modified
```
DELETE /api/admin/teams/:teamId              soft delete (-> Deleted Teams)
GET    /api/admin/teams/deleted              list deleted teams
PATCH  /api/admin/teams/:teamId/restore      undo a soft delete
DELETE /api/admin/teams/:teamId/permanent    hard delete, SUPER_ADMIN + exact "DELETE TEAM" body text required
DELETE /api/admin/teams/test                 bulk soft-delete, scoped to { isDummy: true } ONLY
DELETE /api/admin/judges/:judgeId            deactivate (never a hard delete)
GET    /api/admin/announcements              admin listing (drafts/scheduled/expired too) — this
                                              endpoint didn't exist before; the admin page was
                                              accidentally calling the PUBLIC /api/announcements,
                                              so it could never see unpublished announcements —
                                              fixed as part of this pass
POST   /api/admin/results/unpublish          PUBLISHED -> NOT_PUBLISHED
POST   /api/admin/results/finalize           PUBLISHED -> FINAL (SUPER_ADMIN only)
PUT    /api/admin/results/message            edit the public result title/message, any time
GET    /api/admin/audit-log                  SUPER_ADMIN only
```
`GET/POST/PUT/DELETE /api/admin/problems*`, `POST /api/admin/judges`, `POST /api/admin/results/publish`,
and `POST/PUT/DELETE /api/admin/announcements` already existed from earlier passes and are
unchanged in shape (announcement create/update now also accept `priority`, `publishAt`, `expiresAt`).
All of the above sit behind the existing `requireAdmin`/`requireSuperAdmin` middleware — nothing
new was exposed to TEAM_LEADER/TEAM_MEMBER/JUDGE, who get a 403 exactly as before.

### 3. Database fields added
- **Team:** `isDeleted` (bool), `deletedAt` (Date), `deletedBy` (ref User), `isDummy` (bool) —
  all optional/defaulted, so every existing team document is unaffected until explicitly deleted.
- **Judge:** `deactivatedAt` (Date), `deactivatedBy` (ref User) — alongside the existing `active`
  boolean, which is what "Delete Judge" now flips to `false`.
- **Announcement:** `priority` (NORMAL/HIGH/URGENT), `publishAt`/`expiresAt` (Date, optional),
  expanded `type` enum (added REGISTRATION/SUBMISSION/WORKSHOP/JUDGING/OTHER to the existing
  GENERAL/URGENT/SCHEDULE/RESULT).
- **EventSettings:** `resultStatus` (NOT_PUBLISHED/PUBLISHED/FINAL, default NOT_PUBLISHED),
  `resultTitle`, `resultMessage` (strings, admin-editable) — `resultsPublished` (the existing
  boolean other code already reads) is kept in sync automatically.
- **New collection:** `AuditLog` (admin, action, targetType, targetId, result, meta, timestamps).

### 4. Team deletion flow
Admin Teams -> **Delete** -> confirmation modal (exact copy from your spec) -> `isDeleted:true`,
`deletedAt`, `deletedBy` set -> team disappears from the active list and every dashboard count,
reappears in **Deleted Teams**. Nothing else about the team (submissions, evaluations, QR, check-in)
is touched at this stage — a soft delete never cascades.

### 5. Deleted Team restore flow
Deleted Teams -> **Restore** -> confirmation -> `isDeleted:false`, `deletedAt`/`deletedBy` cleared
-> team is back in the normal Teams list, exactly as it was (its verification status, QR, and any
submission/evaluation history were never touched by the soft delete, so there's nothing to
reconstruct).
**Permanently Delete** (Deleted Teams only) requires typing `DELETE TEAM` exactly, then cascades
in one transaction (with a non-transaction fallback for a standalone MongoDB, same pattern as the
earlier `cleanupDummyTeams.ts` script): Evaluations for its Submissions -> Submissions -> QRTokens
-> CheckIns -> OTPs -> the leader's User account -> the Team document itself. Nothing outside
that exact chain is touched.
**Delete Test Teams** is a separate bulk action scoped strictly to `{ isDummy: true }` — it's a
soft delete too (moves them to Deleted Teams, from where they can still be restored or
permanently removed), never an unscoped `deleteMany({})`.

### 6. Judge deletion/deactivation flow
Judges -> **Delete Judge** -> confirmation ("Existing evaluation records will be preserved.") ->
the Judge record's `active` flips to `false` (with `deactivatedAt`/`deactivatedBy` recorded) and
the linked User account is disabled (`active:false`, blocking login) — but the Judge document,
User document, and every Evaluation that judge ever submitted are all left completely untouched.
A deactivated judge shows a "Deleted" badge in the panel and can no longer be assigned new
submissions or log in.

### 7. Dynamic Announcement flow
Admin fills in Title/Body/Type (9 options)/Priority/Published/optional Starts-at/Expires-at in the
admin page — no code change ever needed for new content. `GET /api/announcements` (team-facing)
decides visibility entirely server-side: `published:true` AND (no `publishAt` or it's already
passed) AND (no `expiresAt` or it hasn't passed yet) — never a frontend timer. Edit/Publish/
Unpublish/Delete all reuse the same `PUT`/`DELETE` endpoints as before; publish/unpublish
transitions are recorded to the audit log. URGENT-priority announcements get a small badge on the
public page (no extra animation, per your instruction not to overuse them).

### 8. Dynamic Result publishing flow
`EventSettings.resultStatus` drives everything: **NOT_PUBLISHED** (default) -> admin clicks
**Publish Results** (confirmation modal, exact copy from your spec) -> **PUBLISHED** (leaderboard
+ the admin's own configurable title/message become visible to every team) -> admin can
**Unpublish** (back to NOT_PUBLISHED, hides it again) or **Mark Final** (SUPER_ADMIN only,
one-way, stays visible) -> **FINAL**. The result title/message can be edited independently of the
publish state at any time, and is what replaces the old static "as soon as..." copy — the public
page's not-published state now reads exactly "Results are not published yet." / "The official
leaderboard will appear here once the organizers publish the results," per your mockup, with no
hardcoded release message anywhere.

### 9. Migration required
None of the new fields require a migration — every one is optional/defaulted at the schema level,
and Mongoose applies those defaults to existing documents at read time (already relied on for the
OTP-verification fields added in the previous pass). Existing teams load as `isDeleted:false`,
`isDummy:false`; existing judges as fully `active`; existing announcements keep their current
`type`/`published` and simply have no `priority`/scheduling until edited; the existing
`EventSettings` document gains `resultStatus:'NOT_PUBLISHED'` (or `'PUBLISHED'` is NOT
auto-inferred from the old `resultsPublished` boolean — if results were already published under
the old system, **run the one-time fix below** so the new status field matches):
```js
// one-time, safe to run in mongosh if resultsPublished was already true before this upgrade
db.eventsettings.updateOne({ resultsPublished: true }, { $set: { resultStatus: 'PUBLISHED' } })
```

### 10. .env changes required
None.

### 11. Exact commands to run/test
```
cd server && npm install && npm run typecheck && npm test
cd .. && npm install && npm run build
```
Then manually walk the test plan from your spec (create a team, verify, delete, confirm it's in
Deleted Teams, restore; create+assign+delete a judge and confirm evaluations are untouched;
create/publish/edit/unpublish/delete an announcement and watch the public page update; publish/
unpublish/finalize results and watch the public Results page). As with every prior pass in this
thread: **no network access in this sandbox**, so none of this could actually be executed here —
I ran the filtered `npx tsc --noEmit` check on both backend and frontend (no new errors beyond
the one pre-existing artifact carried over from earlier passes) and reviewed every route/
controller/page by hand, but a real run against a live MongoDB is still required before trusting
this in production. Per your instruction, all of the above should be tried against dummy/test
data first — the new "Delete Test Teams" action (scoped to `isDummy:true`) is exactly for that.


---

## Follow-up: Removal of Participants / Submissions / Judges / Evaluations / Results / Audit Log

Removed end-to-end (frontend, API, models, permissions, seed data). Earlier sections of this report
that describe those modules are historical and no longer reflect the code.

- **Backend deleted:** `controllers/{judge,submission,result,audit}Controller.ts`, `routes/{judge,submission,result}Routes.ts`,
  `middleware/judgeAuth.ts`, `models/{Judge,Submission,Evaluation,AuditLog}.ts`, `services/{auditService,submissionService}.ts`;
  endpoints `/api/judge/*`, `/api/submissions/*`, `/api/results/*`, `/api/admin/{participants,submissions,judges,results,audit-log}`.
- **Backend edited:** `JUDGE` role removed (User model, JWT type, admin login/OTP flow); `requireSubmissionEligible` removed;
  all `recordAudit(...)` calls removed; dashboard stats / team detail / permanent-delete no longer touch submissions or evaluations;
  Team `eventStatus` enum lost SUBMITTED / UNDER_REVIEW / EVALUATED / RESULT_PUBLISHED; Event settings lost
  `resultsPublished/resultStatus/resultTitle/resultMessage`; announcement type `RESULT` removed; seed no longer creates judges.
- **Indexes:** removed redundant `teams {isDeleted:1}` (prefix of `{isDeleted,deletedAt}`) and duplicate `otps {verificationId:1}` (already `unique`).
- **Frontend deleted:** admin pages Participants / Submissions / Judges / Evaluations / Results / Audit Log, Judge panel
  (`JudgeLayout`, `JudgeDashboard`), team Submission page, `api/{judgeApi,submissionApi}.ts`; their routes, nav items and dashboard cards/charts.
- **Team pipeline:** now 3 stages (Registered → Verified → Checked in); a checked-in team shows all stages complete.
- **DB cleanup:** `npm run migrate:remove-legacy` (dry-run by default, `-- --execute` to apply). See `server/README.md`.
