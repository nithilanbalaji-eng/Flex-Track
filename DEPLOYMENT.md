# Deploying Flex Track

This takes Flex Track off `localhost` and onto real infrastructure:

| Piece | Runs on | Cost |
| --- | --- | --- |
| Postgres database | Supabase | Free tier |
| Express API | Railway | Free trial, then ~$5/mo |
| React frontend | Vercel | Free tier |

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

Go to **Project Settings → Database → Connection string** and copy both:

| Variable | Which string | Port | Used for |
| --- | --- | --- | --- |
| `DATABASE_URL` | Transaction pooler | `6543` | Every request at runtime |
| `DIRECT_URL` | Direct connection | `5432` | Migrations only |

Two things people get wrong here:

- **Append `?pgbouncer=true` to `DATABASE_URL`.** Without it, Prisma issues
  prepared statements that pgBouncer can't handle and you get intermittent
  `prepared statement "s0" already exists` errors under load.
- **`DIRECT_URL` must not go through the pooler.** Migrations need a real
  session; the pooler will hang or fail partway through.

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

4. Railway runs `npm run build` then `npm start`. The start script runs
   `prisma migrate deploy` first, so schema changes apply automatically on every
   deploy.
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

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Frontend loads, every request fails | `CLIENT_URL` on Railway doesn't exactly match your Vercel origin. No trailing slash, include `https://`. |
| `Network Error` in the browser | `VITE_API_URL` is wrong or missing. Remember it needs a redeploy to take effect. |
| `prepared statement "s0" already exists` | Missing `?pgbouncer=true` on `DATABASE_URL`. |
| Migrations hang or time out | `DIRECT_URL` is pointing at the pooler (6543) instead of the direct port (5432). |
| Railway build fails immediately | Root directory isn't set to `backend`. |
| `Can't reach database server` | Supabase project is paused — free-tier projects sleep after a week idle. Open the dashboard to wake it. |
