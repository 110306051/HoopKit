# HoopKit production deployment runbook

This runbook keeps four environments separate: local, preview, production, and CI. Never copy a Supabase service-role key, Mux token secret, webhook secret, or Sentry auth token into a `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable.

## Deployment order

1. Run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:lint`, and `pnpm build`.
2. Push the verified commit to GitHub.
3. Create the Supabase Cloud project and link it with `pnpm exec supabase link --project-ref <project-ref>`.
4. Inspect the pending migrations with `pnpm exec supabase db push --dry-run`, then apply them with `pnpm exec supabase db push`.
5. Deploy `apps/api` to Railway and set the API production variables below.
6. Verify `https://<railway-domain>/v1/health/live` before configuring downstream services.
7. Create a Mux webhook for `https://<railway-domain>/v1/media/mux/webhook`, subscribe to video asset/upload events, and copy its signing secret into Railway as `MUX_WEBHOOK_SECRET`.
8. Deploy `apps/admin` to Vercel, then replace Railway `CORS_ORIGINS` and `MUX_CORS_ORIGIN` with the final Vercel/custom domain and redeploy the API.
9. Configure EAS preview variables, run the preview build, and test it on registered devices.
10. Configure the production EAS environment, create an App Store build, upload it to TestFlight, complete testing, and only then submit for review.

## Supabase Cloud

Create a new production project in the Supabase dashboard. Save the project URL, publishable key, service-role key, and database password in a password manager. Enable email confirmation and configure the Site URL/redirect allow-list before inviting testers. The database schema is sourced only from `supabase/migrations`; do not manually recreate tables in the dashboard.

The migration command does not copy local test data. Add production content through Admin, or create a separately reviewed production seed/import script. Before every future schema deployment, take a Supabase backup and run `db push --dry-run` first.

## Railway API

Create a Railway service from the GitHub repository and set its root directory to the repository root. Use:

- Build command: `pnpm install --frozen-lockfile && pnpm --filter @hoopkit/api build`
- Start command: `pnpm --filter @hoopkit/api start:prod`
- Health check: `/v1/health/live`

Railway supplies `PORT`; do not hardcode it. Required production variables:

```text
NODE_ENV=production
API_HOST=0.0.0.0
CORS_ORIGINS=https://<admin-domain>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
MUX_TOKEN_ID=<mux-token-id>
MUX_TOKEN_SECRET=<mux-token-secret>
MUX_WEBHOOK_SECRET=<production-webhook-signing-secret>
MUX_CORS_ORIGIN=https://<admin-domain>
MUX_MOBILE_CORS_ORIGIN=*
SENTRY_DSN=<api-project-dsn>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

The Mobile origin remains `*` because native applications do not have a stable browser origin and every Mux direct-upload URL is single-use. API CORS must never use `*` in production.

## Vercel Admin

Import the GitHub repository, choose `apps/admin` as Root Directory, and keep the detected Next.js build settings. Configure:

```text
NEXT_PUBLIC_API_BASE_URL=https://<railway-domain>/v1
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_SUPPORT_EMAIL=<owned-support-address>
NEXT_PUBLIC_SENTRY_DSN=<admin-browser-dsn>
SENTRY_DSN=<admin-server-dsn>
SENTRY_AUTH_TOKEN=<source-map-upload-token>
SENTRY_ORG=<sentry-org-slug>
SENTRY_PROJECT=<sentry-project-slug>
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Apply sensitive values separately to Preview and Production. After deployment, test login, every CRUD screen, media upload, report review, `/privacy`, and `/terms`.

## EAS preview and TestFlight

The application identifiers are currently `com.hoopkit.basketballtraining`. They must be globally unique and should be confirmed before the first App Store Connect record is created; changing them later creates a different app identity.

From `apps/mobile`:

```powershell
pnpm.cmd dlx eas-cli login
pnpm.cmd dlx eas-cli init
pnpm.cmd dlx eas-cli env:create preview --name EXPO_PUBLIC_API_BASE_URL --value https://<railway-domain>/v1 --visibility plaintext
pnpm.cmd dlx eas-cli env:create preview --name EXPO_PUBLIC_LEGAL_BASE_URL --value https://<admin-domain> --visibility plaintext
pnpm.cmd dlx eas-cli build --platform ios --profile preview
```

An iOS `preview` build uses internal/ad-hoc distribution and requires registered device identifiers. TestFlight is a separate production/App Store distribution flow:

```powershell
pnpm.cmd dlx eas-cli build --platform ios --profile production
pnpm.cmd dlx eas-cli submit --platform ios --profile production
```

Also configure `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in the relevant EAS environment. The Sentry auth token is a secret and must not use the `EXPO_PUBLIC_` prefix.

## Release gate

Before App Store submission, confirm:

- TestFlight has passed login, logout, registration, video upload/transcoding/playback, favorites, plan editing, training execution, account deletion, and poor-network tests.
- The Admin report queue has an actively monitored owner and a documented moderation response time.
- Privacy Policy and Terms contain the real legal entity, owned support email, retention/deletion periods, and the production third-party processor list. The included text is a technical draft, not legal advice.
- App Store Connect privacy answers match actual Supabase, Mux, and Sentry data collection.
- Screenshots, description, age rating, review credentials, support URL, privacy URL, export-compliance answers, and account-deletion review notes are complete.
- A database backup and rollback owner exist, Sentry test events arrive from API/Admin/Mobile, and no production secret is present in Git history or client bundles.
