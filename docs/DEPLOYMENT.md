# Deploying the preview to GitHub Pages

The frontend is published to GitHub Pages as a **static demo** — no backend is
deployed. All data comes from an in-memory mock layer
(`frontend/src/lib/demoData.ts`), enabled by `NEXT_PUBLIC_DEMO=true` at build
time. This lets you browse the full UI (My Garage, Dealer Portal, Quick Order,
CSV upload, OEM lookup) from a `github.io` URL.

## One-time setup (must be done in the GitHub UI)

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.

That's it — there's nothing to configure on a branch; the workflow handles the
build and publish.

> If the `github-pages` environment restricts deployments to the default
> branch, either merge this branch to the default branch, or add
> `claude/machinery-ecommerce-architecture-q9szpd` under
> **Settings → Environments → github-pages → Deployment branches**.

## How it deploys

`.github/workflows/deploy-pages.yml` runs on every push to
`claude/machinery-ecommerce-architecture-q9szpd` (or `main`), and on manual
dispatch from the **Actions** tab. It:

1. Builds the Next.js app as a static export (`output: 'export'`) with
   `NEXT_PUBLIC_DEMO=true`.
2. Injects the project base path (e.g. `/Scanbolt`) from
   `actions/configure-pages`, so assets resolve correctly under the repo
   subpath.
3. Uploads `frontend/out` and deploys it with `actions/deploy-pages`.

The published URL appears in the workflow run's **deploy** job summary
(typically `https://<owner>.github.io/<repo>/`).

## Using the preview

- On the landing page, sign in with **any email containing "dealer"**
  (e.g. `dealer@bigworkshop.com`) to unlock the **Dealer Portal**; any other
  email logs in as a standard buyer. Password is ignored in demo mode.
- Try OEM lookup with `227-6949`, or Quick Order with SKUs like `FD-CAT-320D`,
  `RT-400X72.5`, `FILT-HYD-01`.

## Wanting a *real* (non-demo) deployment later?

The demo is UI-only. For live data you need to host the backend + PostgreSQL
(e.g. Render/Railway + a managed Postgres) and point the frontend at it by
building **without** `NEXT_PUBLIC_DEMO` and setting `NEXT_PUBLIC_API_URL`.
The frontend/Pages setup here stays valid; only the data source changes.
