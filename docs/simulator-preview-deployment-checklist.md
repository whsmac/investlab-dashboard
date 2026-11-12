# INVESTLAB simulator preview deployment checklist

## Scope and safety
- Preview project only: `investlab-phase1-preview` (Vercel project ID `prj_mYa2ZTV1jMPCAJg5AoCwk86dnyCt`).
- Source branch: `feature/simulator-shared-symbols-20261111` (Draft PR #34).
- Do not deploy `main`, promote a preview to production, merge PRs, install TEST RPCs, or alter either Supabase project as part of this checklist.
- Before deployment, confirm the exact branch head SHA and both GitHub Actions checks pass on that SHA.

## Observed preview blocker (2026-11-12)
- Vercel deployment `dpl_JCvLfsMgauVDJrTeuN51D6DsdXRY` (commit `96bfd074`) reports `readyState=ERROR`, `errorCode=git_info_fail`.
- A new preview deployment request for commit `67bac90c` was rejected by the Vercel API with HTTP 429, `rate_limited`, message: `GitHub API rate limit exceeded`.
- These are source retrieval/API errors **before a successful preview build**; they do not establish a JavaScript build failure.
- Avoid repeatedly retrying while rate-limited. Inspect the Vercel GitHub integration permissions and Git repository connection for this preview project, then retry after the limit resets.

## Safe retry procedure
1. Confirm the latest GitHub PR #34 head SHA and successful `Simulator unit tests` / `Validate dashboard scripts` runs for **that SHA**.
2. In the **preview-only** Vercel project, confirm its linked Git repository is `whsmac/investlab-dashboard` and GitHub integration access is available.
3. Trigger a preview deployment for the exact branch head SHA (never a production target). If the API returns 429, stop and retry later rather than switching environments.
4. Verify the returned deployment reports `READY` and its Git SHA equals the checked SHA. Do not treat a historical `READY` deployment as proof the latest code is live.
5. Open `/virtual-trade-simulator.html` on the **verified READY preview URL**. Test a normal FX calculation, a blocked FX request, zero tax deduction, comma-formatted KRW inputs, and recovery after an FX failure.
6. Confirm the simulator does not write to portfolio localStorage or call Supabase. Do not expose API keys or test against production.

## Acceptance gate
A preview is accepted only when the correct SHA is deployed with state `READY`, the browser simulator loads, and its scenario and FX error-handling smoke checks pass. Until then, keep PR #34 Draft and do not claim a working preview URL.
