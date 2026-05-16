# Deploying Victory Inventory to Vercel

## 1. Prerequisites

- A Neon (or any Postgres) database
- A Vercel account
- A Resend account with a verified sending domain
- A custom domain that will host the app (e.g. `inventory.victorypestsolutions.com`)

## 2. Generate runtime secrets

```bash
# NextAuth secret
openssl rand -base64 32

# Web Push VAPID keys
npx web-push generate-vapid-keys
```

Keep these handy; they go into Vercel env vars below.

## 3. Push the code

```bash
git init
git add .
git commit -m "Initial Victory Inventory commit"
gh repo create victory-inventory --private --source=. --remote=origin --push
```

## 4. Create the Vercel project

```bash
npx vercel link        # link the repo to a new Vercel project
npx vercel env pull    # pulls .env.local later, but skip on first run
```

Or via the dashboard: **New Project → Import Git Repo → victory-inventory**.

## 5. Provision a Blob store

Vercel dashboard → **Storage → Create → Blob**. Attach it to the project.
This auto-populates `BLOB_READ_WRITE_TOKEN`.

## 6. Set environment variables

In Vercel **Settings → Environment Variables**, add for Production (and Preview if desired):

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (`postgresql://…`) |
| `NEXTAUTH_SECRET` | from `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://inventory.<your-domain>.com` |
| `RESEND_API_KEY` | from Resend dashboard |
| `RESEND_FROM_EMAIL` | `noreply@<your-domain>.com` (verified sender) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from web-push generate |
| `VAPID_PRIVATE_KEY` | from web-push generate |
| `VAPID_SUBJECT` | `mailto:you@<your-domain>.com` |
| `BLOB_READ_WRITE_TOKEN` | auto-set when you attach a Blob store |

## 7. Deploy

```bash
npx vercel --prod
```

Or push to `main` if you've connected the repo to Vercel for auto-deploy.

## 8. Apply schema + seed (one-time)

From your local machine pointed at the production DB:

```bash
# Schema
DATABASE_URL="<prod connection string>" npx prisma db push

# Initial tenant + sample data
DATABASE_URL="<prod connection string>" npx tsx prisma/seed.ts
```

This creates the Victory Pest Solutions tenant, 3 locations, license types,
sample products with stock = 50 each, and 5 test users.

> ⚠️ The seed assumes `domain: "localhost"`. Update it to your production
> domain (e.g. `victorypestsolutions.com`) before running in prod, or update
> the Company row after seeding via SQL/Prisma Studio.

## 9. Point your custom domain at Vercel

In Vercel **Settings → Domains**, add `inventory.<your-domain>.com`. Follow
Vercel's DNS instructions (CNAME to `cname.vercel-dns.com`).

The middleware in `proxy.ts` reads the request host and resolves the tenant
from `Company.domain`, so the production Company row needs `domain` to match
the bare domain (e.g. `victorypestsolutions.com` — the middleware strips the
`inventory.` subdomain prefix).

## 10. Verify

1. Visit `https://inventory.<your-domain>.com/login`.
2. Sign in with one of the seeded accounts:
   - `manager@victory.com / Manager123!`
   - `sup1@victory.com / Super123!`
   - `tech1 / Tech123!`
3. Open Chrome devtools → **Application → Manifest** to confirm the PWA
   manifest is loaded and icons are valid.
4. Click the install icon in the address bar to install as a PWA.
5. On `/notifications`, click **Enable push** to subscribe.
6. Trigger an event (submit a request as a tech) and verify push + email arrive.

## Common pitfalls

- **`URL must start with prisma://`** — Prisma client was generated with
  `--no-engine`. Fix: `npx prisma generate` (without the flag).
- **Email not arriving** — Resend domain not verified, or
  `RESEND_FROM_EMAIL` doesn't match the verified domain.
- **Push works locally but not in prod** — `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  not set at build time on Vercel (must rebuild after adding).
- **Tenant not resolved** — `Company.domain` in DB doesn't match the
  bare host of the request. Check the Company row.
- **Blob uploads 403** — `BLOB_READ_WRITE_TOKEN` not set or expired.
