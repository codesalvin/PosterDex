# PosterDex

A dependency-free movie-poster collection that deploys as a static site. Collections, gallery images, filters, ordering, and backups run entirely in the browser.

## Deploy to Vercel

Either import this folder's Git repository in the Vercel dashboard, or run:

```powershell
npx vercel --prod
```

There is no build command, output directory, environment variable, API key, or server function to configure. `vercel.json` supplies clean URLs and production security headers.

## Does it need a database?

No—not for the current product. PosterDex stores poster metadata in `localStorage`; the poster files remain on their original HTTPS hosts. This keeps hosting free and removes accounts, backend code, secrets, migrations, and database maintenance.

Add a database only when the product needs one of these:

- accounts or authentication;
- collection sync across devices;
- public/shared collections;
- server-owned poster uploads instead of external links;
- moderation, analytics tied to users, or collaborative editing.

At that point, use authentication plus a relational database for collection metadata and object storage for uploaded images. Do not store image binaries directly in database rows.

## Security model

- No secrets are shipped to the browser.
- Imported backups and restored browser data are validated and normalized before rendering.
- Only HTTPS poster URLs are accepted.
- User-controlled text is escaped before it enters generated markup.
- Content Security Policy blocks scripts, frames, objects, forms, and network requests outside the small allowlist.
- Vercel serves the site over HTTPS and `vercel.json` adds MIME-sniffing, framing, referrer, permissions, opener, and HSTS protections.

External poster hosts still receive each image request and may log the visitor's IP address. If that privacy or link reliability becomes unacceptable, add server-owned object storage and copy approved images there.

## Data and backups

Browser storage is device/profile-specific and can be cleared by the user or browser. Gallery images are resized and compressed locally before storage, and are included in JSON backups. The built-in Export and Import buttons are the backup path. No collection data reaches Vercel.

## Project files

- `index.html` contains the page structure.
- `styles.css` contains presentation and responsive styles.
- `app.js` contains collection behavior and browser storage.
- `vercel.json` contains deployment and security configuration.
