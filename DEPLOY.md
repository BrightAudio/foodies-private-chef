# Foodies — Deployment Guide

## Quick Start (Local Development)

```bash
npm install
cp .env.example .env    # Edit with your values
npx prisma db push      # Create SQLite database
npx tsx prisma/seed.ts  # Seed demo data
npm run dev
```

## Deploy to Vercel

### 1. Set Up PostgreSQL Database

The app uses SQLite locally but needs PostgreSQL in production. Options:

- **Neon** (recommended, free tier): [neon.tech](https://neon.tech)
- **Supabase**: [supabase.com](https://supabase.com)
- **Vercel Postgres**: Available in Vercel dashboard

Get your `DATABASE_URL` connection string (looks like `postgresql://user:pass@host:5432/dbname?sslmode=require`).

### 2. Switch to PostgreSQL Schema

Before deploying, swap the Prisma schema provider:

```bash
# Copy the production schema
cp prisma/schema.production.prisma prisma/schema.prisma

# Push the schema to your PostgreSQL database
DATABASE_URL="postgresql://..." npx prisma db push
```

Or edit `prisma/schema.prisma` and change:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo in the [Vercel dashboard](https://vercel.com/new).

### 4. Set Environment Variables in Vercel

In your Vercel project settings → Environment Variables, add:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | Random 32+ character string |
| `PLATFORM_FEE_PERCENT` | Yes | `30` |
| `NEXT_PUBLIC_APP_NAME` | Yes | `Foodies` |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (sk_...) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key (pk_...) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret (whsec_...) |
| `SMTP_HOST` | No | SMTP host (e.g., smtp.gmail.com) |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password or app password |
| `EMAIL_FROM` | No | From address |

### 5. Image Uploads (Production)

The local file upload (`/api/uploads`) writes to `public/uploads/` which won't persist on Vercel's serverless filesystem. For production, switch to a cloud storage provider:

- **Vercel Blob**: `@vercel/blob` — easiest with Vercel
- **AWS S3** / **Cloudflare R2**: For more control
- **Uploadthing**: Simple file upload service

To swap, update `src/app/api/uploads/route.ts` to use your chosen provider instead of `fs.writeFile`.

### 6. Stripe Webhooks (Production)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.vercel.app/api/payments/webhook`
3. Select events: `payment_intent.succeeded`, `charge.refunded`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET` env var

## Seed Production Database

To create an admin user and demo chefs in production:

```bash
DATABASE_URL="postgresql://..." npx tsx prisma/seed.ts
```

## Architecture Notes

- **Stripe & Email are optional** — the app gracefully degrades without them
- **30% platform commission** on all bookings
- **Roles**: CLIENT (default), CHEF (after onboarding), ADMIN (seeded)
- **Chef approval**: Admin must approve chefs before they appear in browse
