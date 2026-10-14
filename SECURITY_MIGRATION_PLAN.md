# AURA SPORT MANAGER — staged security migration

Status: planning document only. No production access policy has been changed by this document.

## Requirements
- Primary administrator: aura.sportclubbsd@gmail.com
- Anonymous visitors may read only: schedules, results, players, attendance.
- Registered allowlisted admins may modify application data.
- Never embed passwords, service-role keys, or other secrets in frontend source.

## Current architectural risk
The application stores players, match history, active matches, finance transactions/settings, and round-robin data in a single row in public.sport_manager_state. Public read access to this row exposes private fields too, so a read-only policy on the existing row cannot meet the requirement without separating public and private data.

## Staged rollout
1. Provision the administrator account through Supabase Auth's supported invite/password setup flow. Do not commit a password.
2. Implement login and allowlist checks in the application. Validate session persistence and sign-out.
3. Introduce a dedicated public-safe projection/table containing only schedules, results, player list, and attendance. Keep finance/private fields outside this projection.
4. Test on a preview deployment:
   - anonymous SELECT returns only public-safe fields;
   - anonymous INSERT/UPDATE/DELETE fails;
   - authenticated allowlisted admin can perform intended writes;
   - authenticated non-admin cannot write;
   - current matches, results, players, attendance, and finance data remain intact.
5. Back up and reconcile existing state before enabling final RLS policies.
6. Only after preview tests pass and admin login is confirmed, revoke anonymous writes to sport_manager_state and deploy the tested application.
7. Verify production login, public views, admin edits, and finance privacy.

## Safety rule
Do not revoke existing production access or migrate the single-row state until the login-enabled application and public/private data split are implemented and verified.
