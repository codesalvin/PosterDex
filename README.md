# PosterDex

A lightweight movie-poster collection with Supabase email/password authentication and Vercel static hosting.

## Deploy to Vercel

Either import this folder's Git repository in the Vercel dashboard, or run:

```powershell
npx vercel --prod
```

There is no build command, output directory, or server function. `vercel.json` supplies clean URLs and production security headers.

## Configure Supabase

1. Create a Supabase project.
2. Open its SQL Editor and run `supabase/schema.sql`.
3. Copy the project URL and **publishable** key into `config.js`.
4. In Authentication → URL Configuration, set the Site URL to the production Vercel URL and add preview URLs as allowed redirects.
5. Keep email confirmation enabled for production.

The publishable key is intended for browser use. Never commit a secret key, legacy `service_role` key, or database password.

## Database choice

Use Supabase PostgreSQL. Supabase Auth owns user identities, the `folders` and `posters` tables store collection metadata, and the private `poster-images` bucket stores gallery files. Row-level security limits every record and storage path to its owner.

Only authenticated users can retain a collection. Poster metadata is stored in `public.posters`; gallery images are stored in the private `poster-images` bucket. Anonymous visitors cannot read or write collection rows under RLS.

## Security model

- Only the Supabase publishable key is shipped to the browser; privileged keys remain server-only.
- Imported backups and restored browser data are validated and normalized before rendering.
- Only HTTPS poster URLs are accepted.
- User-controlled text is escaped before it enters generated markup.
- Content Security Policy blocks scripts, frames, objects, forms, and network requests outside the small allowlist.
- Vercel serves the site over HTTPS and `vercel.json` adds MIME-sniffing, framing, referrer, permissions, opener, and HSTS protections.

External poster hosts still receive each image request and may log the visitor's IP address. If that privacy or link reliability becomes unacceptable, add server-owned object storage and copy approved images there.

## Data and backups

Collections load from Supabase after login and are not persisted in browser storage. Gallery images are resized and compressed before private upload and are included in JSON backups. Supabase may retain the login session token locally so users remain signed in.

If an older browser-local collection exists and the signed-in account has no cloud posters yet, PosterDex migrates that collection once and then removes the legacy browser copy.

## Project files

- `index.html` contains the page structure.
- `styles.css` contains presentation and responsive styles.
- `app.js` contains authentication, cloud collection behavior, and private image uploads.
- `folder-state.mjs` contains the tested folder filtering and move helpers.
- `config.js` contains the public Supabase project configuration.
- `supabase/schema.sql` contains the database, storage, and RLS setup.
- `vercel.json` contains deployment and security configuration.
