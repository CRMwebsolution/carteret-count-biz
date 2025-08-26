# Carteret Local — StackBlitz Edition

Single-package React + Vite + Tailwind app designed to run **directly on StackBlitz**.

- Uses **Supabase** for auth, DB, and storage.
- **Payments are mocked** by default (no server required). Set `VITE_MOCK_PAYMENTS=true` to auto-activate listings in demo mode.
- Switch to real payments later by deploying a small server and setting `VITE_API_BASE_URL`.

## Use on StackBlitz
1. Upload this ZIP to https://stackblitz.com ("Create Project" → "Upload Project").
2. Open `/src/lib/supabase.ts` and set env vars via the StackBlitz **Environment** panel or edit `.env`.

   - `VITE_SUPABASE_URL` = your Supabase URL

   - `VITE_SUPABASE_ANON_KEY` = anon key

   - Ensure storage buckets exist: `listing-photos`.

3. Hit **Run** → the dev server starts automatically.

4. Visit **Add a Business** → submit a test listing (auto-activates in demo mode).


## Going Production
- Deploy the payment server (Square/Stripe) from the full starter later.
- Set `VITE_MOCK_PAYMENTS=false` and `VITE_API_BASE_URL` to your server URL.

- Wire webhooks to mark listings `active` after checkout.


## Scripts
- `npm run dev` — start Vite
- `npm run build` — build production
- `npm run preview` — preview build

