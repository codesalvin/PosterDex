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

Use Supabase PostgreSQL. Supabase Auth owns user identities, the `posters` table stores collection metadata, and the private `poster-images` bucket stores gallery files. Row-level security limits every record and storage path to its owner.

The current UI authenticates users, while collections still work local-first in `localStorage`. The included schema is ready for cloud collection sync without storing image binaries in database rows.

## Security model

- Only the Supabase publishable key is shipped to the browser; privileged keys remain server-only.
- Imported backups and restored browser data are validated and normalized before rendering.
- Only HTTPS poster URLs are accepted.
- User-controlled text is escaped before it enters generated markup.
- Content Security Policy blocks scripts, frames, objects, forms, and network requests outside the small allowlist.
- Vercel serves the site over HTTPS and `vercel.json` adds MIME-sniffing, framing, referrer, permissions, opener, and HSTS protections.

External poster hosts still receive each image request and may log the visitor's IP address. If that privacy or link reliability becomes unacceptable, add server-owned object storage and copy approved images there.

## Data and backups

Browser storage is still device/profile-specific until cloud collection sync is enabled. Gallery images are resized and compressed locally and included in JSON backups. The built-in Export and Import buttons remain the backup path.

## Project files

- `index.html` contains the page structure.
- `styles.css` contains presentation and responsive styles.
- `app.js` contains collection behavior and browser storage.
- `config.js` contains the public Supabase project configuration.
- `supabase/schema.sql` contains the database, storage, and RLS setup.
- `vercel.json` contains deployment and security configuration.
