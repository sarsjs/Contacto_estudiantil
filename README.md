# EduChain

This is the EduChain Next.js dashboard project.

## Supabase

The dashboard currently relies on a small public schema with these tables:
`users`, `groups`, `subjects`, `students`, and `timetables`. The Supabase artifacts described in
`supabase/detalle supabase.txt` (auth helpers, storage, realtime, Edge Functions, vault, etc.) are
architectural intentions; they are not materialized in the project yet. This repo ships the minimal
schema and policies needed for the UI to function and to scope access via RLS.

- Create a Supabase project, then inspect `supabase/schema.sql` and apply that script in the SQL
  editor (or run it with the Supabase CLI) so the tables exist with the expected columns and
  references.
- Grab the **Project URL** and **anon** key from **Project Settings > API**, and add them to
  `.env.local` (and your deployment provider) before starting the app:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://kdyztkrjgsasnwxngwv.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
  ```
- After the tables are created, execute `supabase/policies.sql` to enable RLS on `students` and
  `timetables` so every role only sees its allowed data. The steps are documented in
  `docs/policies.md`.

The schema also creates a `profiles` table so we can store the canonical `role` for each user.
The client-side page that handles the magic-link callback (`src/app/auth/callback/page.tsx`) now
reads that table and redirects the user by role, so the flow works incluso cuando vienes directamente
de Supabase (mira `ROLE_REDIRECTS` en la página para ajustar las rutas de cada rol).

Once the client (`src/lib/supabase/client.ts`) can reach Supabase, the UI switches from mocks to
real data. The project also bundles `scripts/check-env.js`, so any `npm run dev`, `npm run build`, or
`npm start` invocation verifies that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
are defined before launching services.
