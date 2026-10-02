# MATRIX Vibe Coding 2.0 — Backend

Real Node.js/Express/TypeScript/MongoDB API replacing the frontend's old `localStorage` mock.

## Setup
```
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed            # creates the event settings doc and the SUPER_ADMIN account (no teams / problems are created)
npm run dev              # http://localhost:5000
```

See `/api` route files under `src/routes` for the full endpoint list, matching the spec in the project brief (auth, teams, admin, problems, QR, check-ins, announcements, admin accounts, settings).

## Removing legacy module data (one-time)
Participants / Submissions / Judges / Evaluations / Results / Audit Log were removed from the app. To clean an existing database:
```
npm run migrate:remove-legacy                # dry run — prints what would change, touches nothing
npm run migrate:remove-legacy -- --execute   # applies it (take a mongodump backup first)
```
