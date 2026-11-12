# PR #34 — Preview deployment recovery (TEST-only)

## Verified state (2026-11-12)

- Source branch: `feature/simulator-shared-symbols-20261111`; PR #34 remains **Draft**.
- Commit `b4e9d7d62d0b366890d3e72d2d2cc861ef4c0453`: both GitHub Actions workflows passed.
- Vercel project: `investlab-phase1-preview` (`prj_mYa2ZTV1jMPCAJg5AoCwk86dnyCt`), team `team_8NFqm8tRimMWvdpeiPzIHxhV`.
- Preview deployment `dpl_6HWKkx7zntRbkC4EPr3qgoikKWKU` returned `ERROR` / `git_info_fail`.
- A repeat deployment of the same commit (`dpl_95LWJcQhuqb4DQiYqhKMmNSKannr`) also returned `git_info_fail`. This is **not** evidence of an application build or test failure.

## Recovery sequence (no production changes)

1. Inspect the existing preview project's **Git integration**: confirm GitHub repository `whsmac/investlab-dashboard` is connected and Vercel's GitHub integration is authorized for it. Verify the selected branch and commit SHA.
2. If repository access is missing, restore the Git integration permissions through the Vercel/GitHub account UI. Do not replace the project, switch to production, or request secrets in chat.
3. Retry a **preview-only** deployment from the exact reviewed branch commit. Record deployment ID, commit SHA, `readyState`, and `errorCode`.
4. Only if deployment reaches `READY`, open `/virtual-trade-simulator.html` on that exact deployment URL. Verify that the page loads and the version is the intended commit. A previous `READY` deployment does not prove that the latest branch was deployed.
5. Run the manual acceptance checks in `docs/simulator-phase1-acceptance-checklist.md`: symbol selection from portfolio data, no writes to local portfolio or Supabase, one FX snapshot per calculation, tax deduction 0 and formatted KRW values, FX failure/retry, invalid oversell/insufficient cash.
6. Keep PR #34 as Draft. **Do not merge**, install RPCs, upload data, or change production Supabase/dashboard.

## Failure classification

| Signal | Meaning | Next action |
| --- | --- | --- |
| `git_info_fail` before build | Git source metadata/access could not be resolved | Inspect Git integration and repository access |
| `429 rate_limited` | External GitHub/Vercel request rate limit | Wait for reset, retry once; do not change code |
| Build `ERROR` with build logs | Build/runtime configuration issue | Read build logs and address the specific failure |
| `READY` | Deployment created, **not** acceptance complete | Verify URL and run browser/manual acceptance checks |

The production dashboard and production Supabase remain out of scope.
