# Hardening report

**Verification status (read first):** the sandbox this work was done in has no npm registry access, so
`npm ci`, `npm run build`, `vitest`, and a real MongoDB were **not available**. What *was* run:
a TypeScript syntax/semantic pass with a global `tsc` (0 real syntax errors, remaining errors are only
"cannot find module / missing @types" caused by the missing dependencies — same noise as the untouched
original), and 31 unit assertions for the new pure logic executed through a small local shim.
**Nothing was run against MongoDB. Run `npm ci && npm run typecheck && npm test && npm run build`
in both `/` and `/server` before deploying.**

## A. Fixed issues
| # | Issue | Fix |
|---|---|---|
| 1 | Backend never validated `members` at registration (any size/shape reached Mongo) | `utils/memberValidation.ts`: array check, size ≤ `maxTeamSize-1` (default 4 total), per-member type/length checks, duplicate email/phone, leader-as-member rejected → HTTP 400 |
| 2 | Register page allowed **4 members + leader = 5** (UI said "x/4") | Cap is now 3 additional members (leader + 3 = 4) |
| 3 | Add-member cap could be exceeded by two simultaneous requests | Cap, lock and same-email check are inside one atomic `findOneAndUpdate` |
| 4 | Remove-member: any team account could call it, and the "verified = locked" rule was UI-only | Leader-only; verified teams locked server-side (add + remove) |
| 5 | Team ID = "newest team + 1" (race → duplicate IDs; also reused after permanent delete) | Atomic `$inc` counter (`Counter` model); seeds from highest existing ID so format/continuity is kept (`MTX-10001…`); retry on duplicate; problem IDs use the same mechanism |
| 6 | Registration: member without e-mail ("optional" in the UI) failed schema validation **after** the user row was created → orphan user, retry → 500 | Member e-mail optional in schema; Team created first, user second, with rollback (transaction when supported, compensating delete otherwise); orphaned pending users self-repair on retry |
| 7 | Team-name check built a RegExp from raw input (invalid regex → 500, ReDoS) | Escaped |
| 8 | OTP attempt counter was read-then-write (parallel guesses bypass the 5-attempt cap) | Atomic conditional `$inc` reserves an attempt before checking the code |
| 9 | Login/OTP/QR/admin handlers threw TypeErrors (→500) on non-string input | Type/length validation → 400/401 |
| 10 | Rate limiting: plain-text 429s; one shared IP bucket per route (campus NAT) and no `trust proxy` (behind a proxy ALL users share one bucket) | JSON 429s; per-IP caps are generous, strict caps keyed per email / per OTP session; `TRUST_PROXY` env; separate registration limiter |
| 11 | Admin teams list showed only the first 25 teams with **no way to reach page 2** | Pager added (Prev/Next, existing styling) |
| 12 | Unbounded lists: deleted teams, check-ins (and `getActiveTeamIds` loaded every team id) | Paginated (default 25, max 100, `limit=999999` clamps, `page=-1` → 400); check-ins via one aggregation; smaller admin lists hard-capped |
| 13 | Re-clicking "Verify" issued a new QR and silently invalidated the team's downloaded QR | Idempotent `ensureTeamQrToken` |
| 14 | QR verify: crashed to 500 on non-string payload; looked up "the" active token (ambiguous after a race); a later-rejected team still passed | Hash lookup, malformed → 400, uniform error, non-VERIFIED teams blocked |
| 15 | Check-in race / half-written state | Duplicate → clean 409 + self-heal of the flag |
| 16 | Re-verify reset `eventStatus` from PROBLEM_SELECTED/BUILDING back to VERIFIED | Only advances from earlier stages |
| 17 | DB: connect handlers attached after connect; no pool/timeouts; indexes built lazily in background; DB outage → 10 s hangs/500s | Pool + timeouts, handlers first, `ensureIndexes()` + `verifyTtlIndexes()` before listening, 503 guard while DB is down, `/api/health` reports DB |
| 18 | No startup env validation | `config/env.ts` (names only, never values); production requires real secret ≥32 chars, SMTP, non-localhost URLs |
| 19 | Process: no unhandled-rejection / shutdown handling | Added (graceful SIGTERM/SIGINT) |
| 20 | `.env.example` contained a real personal phone number and a real-looking admin e-mail (also in test fixtures) | Names only; fixtures use a dummy number |
| 21 | Frontend: no error boundary, timers/camera not released, `member.email` assumed present, no fetch timeout, unhandled announcement failure | `ErrorBoundary`, `useFlash`, scanner cleanup, null guards, 30 s timeout + friendly network error |
| 22 | `cleanup:dummy` deletes `MTX-10001..10004` — which are the IDs of the first REAL teams on a fresh DB | Dry-run by default; needs `--yes` |

Also: JWT algorithm pinned to HS256; login timing equalised for unknown e-mails; dead `routes/qrRoutes.ts` and unused service helpers removed.

## B. Database
Collections: `users`, `teams`, `otps`, `qrtokens`, `checkins`, `events` (singleton), `problemstatements`, `announcements`, `contactmessages`, **`counters`** (new, 2 tiny docs).
Indexes added (only for queries that exist): `teams.leader`, `teams.createdAt`, `teams.members.email`, `checkins.checkedInAt`, TTL on `qrtokens.expiresAt` (7 days after expiry). Already present and unchanged: unique `teamId`, `teamName`, `users.email`, `otps.verificationId`, `otps {email,createdAt}`, `qrtokens.tokenHash`, `checkins.team`.
TTL: `otps.expiresAt` (10 min after expiry, already existed) and `qrtokens.expiresAt` (new). Startup now **verifies** both exist in MongoDB.
Unlimited growth: `contactmessages` (public form, rate-limited 5/15 min/IP, no TTL by design — it is a record, not a log; there is no admin screen to read it). `verificationHistory` per team is now capped at 100 entries. Members ≤ 19 (schema backstop). No images/base64 stored.
Soft-deleted teams: excluded from lists, counts, QR and check-in; shown only in Deleted Teams; their ID, team name and leader e-mail stay reserved. They cost one document each. Permanent delete removes only that team + its QR tokens/check-ins/OTPs/leader user (verified by reading the code).
Abandoned registrations (OTP never entered) stay as PENDING teams forever → optional manual `npm run cleanup:pending` (dry-run default).
Suitability: 200 teams / 800 accounts is tiny for MongoDB (well under 1 MB of team data); every hot query is indexed.

## C. Team capacity
Max members per team: leader + 3 = **4** (`EventSettings.maxTeamSize`, default 4, admin-configurable 1–20; enforced on registration and add-member). There is **no hard limit on the number of teams**; nothing but the (currently unenforced, see below) `registrationOpen` switch would stop registrations.
There is no "update member" endpoint in this codebase (only add / remove), so validation was applied to those two.

## D. Concurrency
- Duplicate Team IDs: prevented by the atomic counter (unique index remains as a backstop + retry). Unit-tested with 10/50/100 interleaved callers against a fake store; the atomicity itself is MongoDB's `$inc` and was **not** exercised against a real server.
- Duplicate leader accounts: `users.email` unique → 409.
- Partial teams/orphan users: transaction on replica sets/Atlas, compensating delete on standalone.
- Cost note: each registration does 2 bcrypt-12 hashes (password + OTP) ≈ 0.5 s CPU on the 4-thread pool → a burst of 100 simultaneous registrations takes several seconds to clear, but is correct.

## E. Build
Not run (no registry). See the verification note at the top. `server/package.json` and root `package.json` scripts are unchanged except `cleanup:pending`.

## F. Remaining risks / decisions for you
1. **`registrationOpen`, `checkInOpen` and a team's `disabled` flag are not enforced anywhere** (admin toggles exist but do nothing). I did not change this — it changes behaviour — but you probably want registration closing to work.
2. QR tokens expire 14 days after issue while the UI says "permanent". If the event is >14 days after verification, a SUPER_ADMIN must regenerate.
3. `qrtokens.rawToken` is stored in plain text (needed to re-show the QR). A DB leak would let someone forge QRs. Fix would be HMAC-derived tokens; not done (would invalidate issued QRs).
4. Rate-limit counters are in-process memory: with several server instances each has its own counters.
5. Two team names differing only by case could still both register if submitted in the same millisecond (index is case-sensitive; I avoided adding a collation index that could fail on existing data).
6. The old `teams` text index (unused) may still exist in your DB; it can be dropped manually.
7. Admin team list/counts include PENDING (never OTP-verified) registrations.
8. Index build now fails startup loudly if MongoDB cannot build one (e.g. user lacks `createIndex`).
9. Toast `setTimeout`s in AdminProblems/Accounts/Announcements are not cancelled on unmount (harmless in React 18; left alone).
