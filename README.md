# MATRIX Vibe Coding 2.0 — JEC

Cinematic 3D event platform: React + Vite + TypeScript + Tailwind + Three.js (React Three Fiber / drei) + Framer Motion.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # optional
npm run build && npm run preview
```

## IMPORTANT: add the official logo
Put the real MATRIX.JEC logo (transparent PNG recommended) at:

    public/matrix-logo.png

It is used automatically in the navbar, hero 3D scene, login/register, dashboard and footer.
Until the file exists, a plain text wordmark is shown (no substitute logo is drawn).

## Routes
`/` · `/login` · `/register` · `/dashboard` · `/dashboard/team` · `/dashboard/qr` · `/dashboard/workflow` · `/dashboard/announcements` · `/admin/*` (admin panel)

## Content
All event copy, prizes, contact details, problem statements and announcements live in `src/data/event.ts`.
Update the email, location, social links and dates there.

## Backend
The frontend talks to the Express/MongoDB API in `server/` (see `server/README.md`). Set `VITE_API_URL` in `.env`.

## Performance
- `detectTier()` (src/lib/capabilities.ts): high / medium / low / none by width, cores, memory, WebGL support, `prefers-reduced-motion`.
- Particle / rain / object counts scale by tier; `none` renders a CSS-only backdrop.
- 3D scene is lazy-loaded and wrapped in an error boundary that falls back to the CSS backdrop.
- Dashboard pages use no WebGL.

## Deploy
Static host with SPA fallback (all routes → index.html).

## Announcements (live, admin-managed)

Admin → Announcements: create / edit / publish / unpublish / delete, search + filter by status/type, priority, optional publish time and expiry. Stored in MongoDB (`Announcement` model: `title, message, type, priority, status DRAFT|PUBLISHED|UNPUBLISHED, publishedAt, expiresAt, createdBy`).

- Admin API (ADMIN/SUPER_ADMIN only): `GET/POST /api/admin/announcements`, `PUT/DELETE /api/admin/announcements/:id`, `PATCH /api/admin/announcements/:id/publish|unpublish`
- Public API (no login): `GET /api/announcements` → only `PUBLISHED`, already-live, non-expired items
- Public site (Home + team dashboard) polls every 20 s (paused when the tab is hidden) — no redeploy or reload needed
- Existing announcements (old `body`/`published` fields) are migrated automatically at server start
- Integration test: `E2E_MONGODB_URI=mongodb://localhost:27017/matrix_e2e npm test` (in `server/`)
