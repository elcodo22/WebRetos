# AGENTS.md

This file provides guidance to coding agents (Copilot, Claude Code, Cursor, etc.) when working with this repository.

---

## Project Overview

**Retos Audiovisuales** — a Spanish-language timed audiovisual challenge platform where users participate in weekly creative challenges, upload short videos (≤ 90 s), and browse an archive of past challenges. Retro CRT aesthetic with pixel typography.

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.2.10 |
| Language | TypeScript | 5.9 |
| UI | React + Tailwind CSS | 19.2.4 / 4.3 |
| Font | Bitcount Grid Single (Google Fonts) | — |
| Database & Auth | Supabase (PostgreSQL + Auth + RLS) | — |
| Video hosting | Cloudflare Stream (direct upload) | — |
| External API | RAE dictionary | — |
| Deployment | Vercel (inferred) | — |

---

## Next.js 16 — Breaking Changes

<!-- BEGIN:nextjs-agent-rules -->
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Key differences from previous Next.js:
- Uses **`proxy.ts`** at the project root instead of `middleware.ts` for request interception.
- Turbopack is the default bundler (configured in `next.config.ts`).
- `next/font/google` API may differ — check docs before modifying font imports.
- `revalidateTag` accepts multiple tags in a single call.

---

## Architecture

### Directory Structure

```
WebRetos/
├── app/                        # Next.js App Router
│   ├── (site)/                 # Route group — home (no URL prefix)
│   ├── admin/                  # Admin panel (CRUD retos)
│   ├── auth/                   # Supabase auth callbacks
│   ├── login/ · registro/      # Auth pages
│   ├── subir/                  # Video upload (authenticated)
│   ├── reto/[id]/              # Archived challenge detail
│   ├── u/[username]/           # User profile
│   ├── archivos/ · ajustes/    # Archive redirect / settings placeholder
│   └── api/                    # Route handlers (dictionary, stream, archive)
├── components/
│   ├── admin/                  # Admin forms
│   ├── archivos/               # Archive carousel + search
│   ├── auth/                   # Login/registro forms
│   ├── diccionario/            # Clickable RAE dictionary integration
│   ├── layout/                 # Header, CRT shell, snap layouts, cursors
│   ├── perfil/                 # Profile overlays + carousel
│   ├── reto/                   # Challenge hero, feed, countdown, video
│   └── video/                  # Stream player + upload form
├── lib/
│   ├── cloudflare/stream.ts    # Cloudflare Stream API
│   ├── supabase/               # Client variants, auth, retos logic
│   ├── mocks/                  # Mock data (being replaced by real DB)
│   └── *.ts                    # Shared utilities (auth-urls, diccionario, etc.)
├── types/database.ts           # Supabase generated types
├── supabase/migrations/        # SQL migration files
├── public/cursors/             # Custom CRT cursors
├── proxy.ts                    # Session middleware (Next.js 16 pattern)
├── next.config.ts              # Minimal — Turbopack root
└── package.json
```

### Routing

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Home — active challenge hero + archive carousel | Public |
| `/login` | Login + password recovery | Public |
| `/registro` | Registration with OTP verification | Public |
| `/subir` | Upload video for active challenge | Required |
| `/admin` | Create/manage challenges | Admin only |
| `/reto/[id]` | Archived challenge detail + video feed | Public |
| `/u/[username]` | User profile | Public |
| `/archivos` | Redirects to `/?to=archivos` | Public |
| `/ajustes` | Settings (placeholder) | Required |

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/diccionario?palabra=...` | GET | Proxy to RAE dictionary API |
| `/api/retos-archivo` | GET | JSON list of archived challenges |
| `/api/stream/upload-url` | POST | Creates Cloudflare Stream direct upload URL |

---

## Database

### Tables

| Table | Purpose |
|-------|---------|
| `perfiles` | User profiles (linked to `auth.users` via trigger) |
| `retos` | Challenges — queue system with state machine |
| `obras` | Video submissions (Cloudflare Stream UIDs) |
| `reportes` | Video reports |

### Enums

- **`estado_reto`**: `activo` → `en_cola` → `finalizado` \| `eliminado`
- **`estado_obra`**: `pendiente` → `aprobado` \| `rechazado` \| `cuarentena`

### Challenge Queue System

- Only one challenge can be `activo` at a time (lasts 7 days).
- New challenges enter `en_cola` with `orden_cola` position.
- Deleting an active challenge auto-promotes the next queued one.
- `reordenarCola()` compacts queue positions after changes.

### RLS Policies

- `perfiles`: users see/edit their own; public reads allowed.
- `obras`: users see their own; public sees `aprobado` after `fecha_fin`; admins have full access.

### Migrations

Run in order from `supabase/migrations/`. Currently 5 files covering: `retos` schema, queue system, `obras`, and `perfiles` with auth trigger.

---

## Authentication

- Email/password signup with OTP verification.
- PKCE callback at `/auth/callback`.
- Profile auto-created via PostgreSQL trigger `handle_new_user()` on `auth.users` INSERT.
- Password recovery via Supabase magic link email.
- Admin check: `perfiles.es_admin = true` (guard in `lib/supabase/admin.ts`).

---

## Video Upload Flow

1. Client requests direct upload URL via `POST /api/stream/upload-url`.
2. Server creates URL on Cloudflare Stream (`maxDurationSeconds: 90`).
3. Client uploads video directly to Cloudflare (no server relay).
4. Server Action `guardarObra()` saves metadata to `obras` table.
5. One submission per user per challenge enforced at DB + action level.

---

## Development Environment

- **Node.js**: ≥ 20.9.0
- **OS**: Windows 11, PowerShell
- **Package manager**: npm (`package-lock.json`)

### Commands

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint (flat config)
```

### Environment Variables

Create a `.env.local` file with:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical URL for auth redirects |
| `CLOUDFLARE_ACCOUNT_ID` | Yes (upload) | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Yes (upload) | Cloudflare API token |
| `NEXT_PUBLIC_CLOUDFLARE_STREAM_MAX_DURATION_SECONDS` | Optional | Max video duration (default: 90) |
| `RAE_API_KEY` | Optional | RAE dictionary API key |

All `.env*` files are gitignored. No `SUPABASE_SERVICE_ROLE_KEY` is used — all operations go through the anon key + RLS.

---

## UI / Design System

### Visual Language

- **CRT aesthetic**: scanlines overlay, beam sweep animations, power on/off transitions.
- **Background**: `#006eff` (blue) with white foreground.
- **Typography**: Bitcount Grid Single (pixel/monospace font), `monospace` fallback.
- **Cursors**: custom `.cur` and `.png` cursors (arrow, pointer, loupe, stopwatch, text beam).
- **Grid**: 10-column desktop (16px gutter, 18px margin) → 4-column mobile (10px/14px).
- **Animations**: respect `prefers-reduced-motion`.

### Key Layout Components

| Component | Role |
|-----------|------|
| `CrtShell` | Root wrapper — scanlines + beam overlays |
| `CrtPowerProvider` | CRT on/off transition on navigation |
| `SearchOverlayProvider` | Full-screen archive search overlay |
| `DiccionarioProvider` | Context for RAE dictionary popups |
| `home-snap` | Snap-scroll between challenge hero and archive |

### Custom CSS Classes

- `.crt-shell`, `.crt-screen`, `.crt-scanlines`, `.crt-beam` — CRT effect layers.
- `.site-grid` — responsive grid system.
- `.site-dots` — decorative dot-pattern dividers.
- `.diccionario-word` — clickable word styling (scale on hover).
- `.page-loading`, `.page-loading-wheel` — loading spinner.
- `.cursor-loupe`, `.cursor-stopwatch` — custom cursor zones.

---

## Supabase Client Variants

| File | Use case |
|------|----------|
| `lib/supabase/client.ts` | Browser (Client Components) |
| `lib/supabase/server.ts` | Server Components + Server Actions |
| `lib/supabase/public.ts` | Anon client without cookies (cacheable reads) |
| `lib/supabase/session.ts` | Session refresh in `proxy.ts` |

Always use the appropriate variant. Never import `server.ts` in client components.

---

## Mock Data

Some features still use mock data (`lib/mocks/`):
- Profile pages (`perfil.ts`)
- Challenge video feed (`reto-feed.ts`)
- Archive list mixed with DB data (`retos-archivo.ts`, controlled by `MOSTRAR_MOCKS_ARCHIVO`)

Mock data is being progressively replaced with real Supabase queries.

---

## Key Design Decisions

- **Spanish-first**: all UI copy, comments, variable names, and DB column names are in Spanish.
- **No `src/` directory**: all code lives at the project root.
- **`proxy.ts` over `middleware.ts`**: Next.js 16 session refresh pattern.
- **RLS-only security**: no service role key, all access controlled via Supabase Row Level Security.
- **Direct upload to Cloudflare**: server never handles video bytes, only creates upload URLs.
- **Single submission per challenge**: enforced both in UI and Server Action.
- **Clickable dictionary**: every word in challenge descriptions can be tapped to see its RAE definition.
- **Admin-only challenge management**: no public creation of challenges.

---

## Code Style

- **Language**: TypeScript strict mode. No `any` unless absolutely necessary.
- **Imports**: path alias `@/*` maps to project root.
- **Components**: React Server Components by default; add `"use client"` only when needed.
- **Server Actions**: `"use server"` at file top, return `{ error?, success? }` pattern.
- **Naming**: Spanish for domain entities (`reto`, `obra`, `perfil`), English for technical terms (`createClient`, `getSession`).
- **CSS**: Tailwind utilities + custom CSS in `globals.css` for complex effects.
- **No test framework yet**: project is early-stage.

---

## Frequent Edit Locations

| What to edit | File |
|---|---|
| Challenge CRUD logic | `app/admin/actions.ts` |
| Video upload logic | `app/subir/actions.ts` |
| Database types | `types/database.ts` |
| Challenge state/queue | `lib/supabase/retos.ts` |
| Auth helpers | `lib/supabase/auth.ts` |
| Cloudflare integration | `lib/cloudflare/stream.ts` |
| CRT visual effects | `app/globals.css` |
| Session refresh (proxy) | `proxy.ts` |
| Root layout + providers | `app/layout.tsx` |
| Grid/responsive design | `app/globals.css` (`:root` vars) |

---

## Adding New Features — Checklist

1. **New page**: create `app/route-name/page.tsx`. Use Server Components unless interactivity is needed.
2. **New Server Action**: create `actions.ts` in the route folder with `"use server"` directive.
3. **New component**: place in `components/domain/` matching the feature area.
4. **New table**: add migration in `supabase/migrations/`, update `types/database.ts`.
5. **Auth-protected page**: call `getSession()` and redirect to `/login` if null.
6. **Admin-protected page**: call `requireAdmin()` (auto-redirects).
7. **Revalidation**: call `revalidateTag`/`revalidatePath` after mutations that affect public pages.
