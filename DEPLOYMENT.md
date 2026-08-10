# Deploying Flex Track

This takes Flex Track off `localhost` and onto real infrastructure:

| Piece | Runs on | Cost |
| --- | --- | --- |
| Postgres database | Supabase | Free tier |
| Express API | Railway or Render | Railway ~$5/mo · Render free |
| React frontend | Vercel | Free tier |

> **Render's free tier** works identically — same build command, same start
> command, same environment variables. The one difference is that free instances
> sleep after 15 minutes idle, so the first request after a quiet period takes
> 50+ seconds to wake. Everything below applies to either host.

> **Supabase hosts your database, not your API.** Supabase gives you Postgres,
> Auth and Edge Functions — but a Node/Express server still needs a host of its
> own. That's what Railway is for here.

---

## 1. Create the Supabase database

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Give it a name, set a **database password**, and save that password somewhere —
   you need it in the next step and Supabase won't show it again.
3. Pick the region closest to your users.
4. Wait ~2 minutes for provisioning.

### Get the two connection strings

Click the green **Connect** button at the top of the dashboard, then open the
**ORMs** tab. Supabase hands you both variables already named correctly:

| Variable | Which string | Port | Used for |
| --- | --- | --- | --- |
| `DATABASE_URL` | Transaction-mode pooler | `6543` | Every request at runtime |
| `DIRECT_URL` | Session-mode pooler | `5432` | Migrations only |

What matters is the **mode**, not whether it goes through a pooler:

- **Transaction mode (6543)** reuses connections aggressively, which is what you
  want for lots of short queries — but it can't hold the session state migrations
  need. It also can't handle Prisma's prepared statements, which is why
  `?pgbouncer=true` must stay on the end of `DATABASE_URL`. Drop that flag and
  you get intermittent `prepared statement "s0" already exists` errors under load.
- **Session mode (5432)** keeps a connection for the life of the session, so
  migrations work. This is Supabase's recommended `DIRECT_URL` on IPv4 networks.
  (There is also a true direct connection at `db.<ref>.supabase.co`, but it's
  IPv6-only, so most people should use the session pooler instead.)

Replace `[YOUR-PASSWORD]` in both strings with your actual database password.

---

## 2. Push the schema to Supabase

From `backend/` on your own machine, put the two URLs in `.env`, then:

```bash
npx prisma migrate deploy
```

That creates every table. Optionally load the demo accounts and sample plan:

```bash
npx prisma db seed
```

Verify in Supabase under **Table Editor** — you should see `User`, `WorkoutPlan`,
`GymLog`, `CalorieEntry` and the rest.

---

## 3. Deploy the API to Railway

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo** →
   pick `Flex-Track`.
2. **Set the root directory to `backend`.** Railway defaults to the repo root,
   which has no `package.json`, and the build will fail with a confusing error.
3. Add these environment variables under **Variables**:

```
DATABASE_URL      <pooled Supabase string, with ?pgbouncer=true>
DIRECT_URL        <direct Supabase string>
JWT_SECRET        <see below>
NODE_ENV          production
CLIENT_URL        https://your-app.vercel.app
```

Generate a real `JWT_SECRET` — never ship the example one, since anyone who
knows it can forge a login token for any account:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

You'll fill in `CLIENT_URL` properly in step 5, once Vercel has given you a URL.

4. Set the **Build Command** to:

```
npm ci --include=dev && npm run build
```

`--include=dev` is not optional. `NODE_ENV=production` makes npm skip
`devDependencies` by default, and that's where TypeScript and every `@types/*`
package lives — without it the build fails with a wall of
`Could not find a declaration file for module 'express'` errors.

The start script is `prisma migrate deploy && node dist/index.js`, so schema
changes apply automatically on every deploy. That's also why the `prisma` CLI is
a regular dependency rather than a dev one: hosts prune `devDependencies` after
building, and pruning it would break startup.
5. Under **Settings → Networking**, click **Generate Domain**. You'll get
   something like `flex-track-production.up.railway.app`.

Check it's alive:

```
https://<your-railway-domain>/api/health-check
```

You should see `{"status":"ok",...}`.

---

## 4. Deploy the frontend to Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import `Flex-Track`.
2. Set **Root Directory** to `frontend`. Vercel detects Vite automatically.
3. Add one environment variable:

```
VITE_API_URL    https://<your-railway-domain>/api
```

Include `/api` at the end and no trailing slash.

> `VITE_` variables are baked in at **build** time, not read at runtime. If you
> change this later you must redeploy — editing it alone does nothing.

4. Deploy. You'll get a URL like `flex-track.vercel.app`.

---

## 5. Connect the two

Go back to Railway and set `CLIENT_URL` to your actual Vercel URL:

```
CLIENT_URL    https://flex-track.vercel.app
```

Railway redeploys automatically. Without this, every browser request is blocked
by CORS and the app appears to load but nothing works.

To also allow Vercel's preview deploys, comma-separate them:

```
CLIENT_URL    https://flex-track.vercel.app,https://flex-track-git-dev-you.vercel.app
```

Open your Vercel URL and log in. You're live.

---

## 6. Optional extras

### Real AI plans

Add to Railway:

```
ANTHROPIC_API_KEY    sk-ant-...
```

Without it the AI Coach uses the built-in rule-based generator, which always
works but produces template-assembled plans. With it, plans are genuinely
personalized. The UI labels which engine produced each plan.

### Apple Health sync

This only works once deployed — a HealthKit export shortcut on your phone can't
reach `localhost`. Now that the API has a public URL, the webhook shown in
**Settings** becomes usable:

```
https://<your-railway-domain>/api/health/webhook
```

Point *Health Auto Export* (iOS App Store) or a Shortcuts automation at it, with
your personal key from the Settings page in the body.

---

## Email: password reset

Password reset is fully built, but it needs an email provider to reach real
users. **Without one, reset links are printed to the server log instead of being
sent** — which works locally but means nobody can recover an account in
production.

### Setting it up (about 10 minutes)

1. Sign up at [resend.com](https://resend.com) — the free tier covers 3,000
   emails a month, which is plenty at this stage.
2. Create an API key.
3. Set these on your API host (Render/Railway):

```
RESEND_API_KEY=re_...
MAIL_FROM=Flex Track <noreply@yourdomain.com>
```

**`MAIL_FROM` must use a domain you've verified with Resend.** The default
`onboarding@resend.dev` only delivers to your own Resend account address, so
reset emails to anyone else will silently go nowhere. If you don't own a domain
yet, that's the one thing worth buying before launch.

### How the flow is secured

- Tokens are 256-bit random values, and only their **SHA-256 hash** is stored —
  a database leak can't be replayed into account takeover.
- Links expire after `PASSWORD_RESET_TTL_MINUTES` (default 60) and work **once**.
- Requesting a new link **invalidates any outstanding ones**.
- The endpoint returns the same response whether or not the address exists, so
  it can't be used to discover who has an account.
- Both endpoints are rate limited to 20 requests per hour per IP.
- Accounts created through Google/Apple have no password to reset; they get an
  email explaining which button to use rather than a dead link.

---

## Monetization: ads and Premium

Flex Track shows ads to everyone without an active subscription, and Premium
($2.99/month) removes them. The gating is already built and working end to end —
what's missing is a payment provider, because that needs your accounts.

### How the pieces fit

`showAds` is computed **on the server** from the user's subscription state and
returned with the user object, so a client can't unlock Premium by editing local
storage. `<AdSlot>` renders nothing at all when it's false.

Ad placements currently live on the dashboard, the gym log, the crews page and
plan detail. Add more by dropping `<AdSlot placement="somewhere" />` into a page.

### Wiring real ads

The `<AdSlot>` component renders an in-house promo rather than a fake advert.
Replace its body with your ad network's unit and leave the surrounding gating
alone:

- **Web** — Google AdSense. Requires site approval, which takes a few days and
  wants real content and a privacy policy in place first.
- **iOS** — Google AdMob, via the native app. AdSense units do not work inside a
  native app wrapper.

### Taking payment — and the Apple rule that governs it

**Apple requires In-App Purchase for digital subscriptions and rejects Stripe
for them.** They take 30% in year one, 15% after that. This is not negotiable
for an App Store build, so the backend supports both paths:

| Surface | Provider | Endpoint |
| --- | --- | --- |
| Web (Vercel) | Stripe | `POST /api/subscription/checkout` |
| iOS app | Apple IAP | `POST /api/subscription/apple/verify` |

Both converge on the same subscription state, so the rest of the app never needs
to know which one paid.

**To enable Stripe** — create a $2.99/month recurring price, then set on your API
host:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
```

Until those are set, `/checkout` returns a clear 501 and the paywall shows an
honest message instead of a broken flow.

**To enable Apple IAP** — create an auto-renewable subscription in App Store
Connect with product id `flextrack_premium_monthly`, then set:

```
APPLE_IAP_SHARED_SECRET=...
```

### Testing Premium without paying

In development only, the paywall shows a **"Dev: activate without paying"**
button (`POST /api/subscription/dev-activate`). It refuses to run when
`NODE_ENV=production`, so it can't be abused on your live deployment.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Frontend loads, every request fails | `CLIENT_URL` on Railway doesn't exactly match your Vercel origin. No trailing slash, include `https://`. |
| `Network Error` in the browser | `VITE_API_URL` is wrong or missing. Remember it needs a redeploy to take effect. |
| `prepared statement "s0" already exists` | Missing `?pgbouncer=true` on `DATABASE_URL`. |
| Migrations hang or time out | `DIRECT_URL` is pointing at the pooler (6543) instead of the direct port (5432). |
| Railway build fails immediately | Root directory isn't set to `backend`. |
| `Can't reach database server` | Supabase project is paused — free-tier projects sleep after a week idle. Open the dashboard to wake it. |
