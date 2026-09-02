# AGENTS.md

## Cursor Cloud specific instructions

Reelwright is a single Next.js 15 (App Router, Turbopack, React 19) app — an AI video studio. There is no monorepo, backend service, or database container to run locally; server logic lives in Next.js API routes and server actions. Standard commands are in `package.json`; only the non-obvious notes are below.

### Running the app
- Dev server: `npm run dev` serves on `http://localhost:9002` (port 9002, not the Next.js default 3000).
- Guest browsing works with no secrets: the landing page (`/`) and studio (`/studio`) use static samples from `src/lib/studio/samples.ts`. You can select characters, load a sample scene into the prompt editor, edit the prompt, and hit "Generate" — which opens the sign-in auth gate (expected guest behavior).
- Actual video generation is gated by external services that are NOT configured in this environment: it needs `GEMINI_API_KEY` bound in `apphosting.yaml` (create with `firebase apphosting:secrets:set GEMINI_API_KEY`), Firebase Admin credentials via Application Default Credentials pinned to project `studio-7012397261-f7ef4`, a signed-in Firebase user, and available credits. Buying credits additionally needs `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` and a Firestore `products` collection. Without these, everything up to the auth gate / generation call still works.
- If generate fails with opaque `5 NOT_FOUND`, check App Hosting logs for `[omni] API error` — that string is often Firestore (wrong project / missing user doc) rather than Omni. Omni requests are intentionally minimal (`model` + `input` + `store`).
- Firebase client config is hardcoded in `src/firebase/config.ts` (points at a live project); it is not env-driven.
- Firebase project id: `studio-7012397261-f7ef4` (see `.firebaserc`). Storage bucket: `studio-7012397261-f7ef4.firebasestorage.app`.
- Deploy Firestore/Storage rules from this environment with the Firebase CLI (`firebase-tools`, installed via `.cursor/environment.json`):
  - Set `FIREBASE_TOKEN` (CI token from `firebase login:ci` on a machine already logged into the Firebase project owner account).
  - Then: `npm run firebase:deploy:rules` (or `npx firebase deploy --only firestore:rules,storage --project studio-7012397261-f7ef4 --non-interactive`).
  - Without `FIREBASE_TOKEN` (or `gcloud` ADC), `firebase deploy` cannot authenticate in this cloud VM.

### Gotcha: don't build while dev is running
`npm run build` and `npm run dev` share the `.next` directory. Running a production build while the dev server is up corrupts it and the dev server starts returning HTTP 500 with `ENOENT ... _buildManifest.js.tmp` / `app-build-manifest.json` errors. If this happens, stop the dev server, `rm -rf .next`, and restart `npm run dev`.

### Lint / typecheck / tests
- `npm run lint` (`next lint`) is deprecated and, because no ESLint config exists, it prompts interactively to configure ESLint — it does not run non-interactively. `next.config.ts` sets `eslint.ignoreDuringBuilds: true`, so lint is not part of the build.
- `npm run typecheck` (`tsc --noEmit`) reports pre-existing errors in unused shadcn scaffold components under `src/components/ui/*` (they import packages not in `package.json`, e.g. `@radix-ui/react-accordion`, `recharts`, `react-day-picker`). `next.config.ts` sets `typescript.ignoreBuildErrors: true`, so `npm run build` succeeds regardless. These errors are not caused by application code.
- There is no automated test framework or test files in this repo.
