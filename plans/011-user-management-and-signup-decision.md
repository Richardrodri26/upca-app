# Plan 011: Admin user management + close open sign-up (spike + build)

> **Executor instructions**: This is part decision-spike, part build. Do the
> spike (Step 0) FIRST and STOP for operator confirmation before building —
> the sign-up policy is a product decision, not yours to make. Run every
> verification command. Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- src/lib/auth.ts "src/app/(auth)" src/features/assignments/actions.ts`
> On mismatch with the excerpts below, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (build) / policy decision (spike)
- **Depends on**: 001 (auth guards on reads — `getUsers` is reused here)
- **Category**: direction
- **Planned at**: commit `6674b8e`, 2026-07-05

## Why this matters

The ADMIN role exists and is enforced everywhere, `getUsers` already lists all
users with roles — but there is NO admin UI to create users or change roles
(roles can only be changed by editing Postgres directly), and sign-up is open
to the public internet (`emailAndPassword.enabled` + a public `/sign-up` page).
On a deployed thesis app, anyone who finds the URL self-registers as EMPLOYEE,
and that authenticated session is the key to every gated action. For the
defense, an admin needs to provision HR/evaluator/employee accounts and assign
roles from the UI. This plan closes the CRUD gap the data model already
supports and makes sign-up an intentional decision.

## Current state

- `src/lib/auth.ts:5-19` — Better Auth config; `emailAndPassword: { enabled: true }`,
  role defaults to `"EMPLOYEE"`, no email verification:

  ```ts
  export const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: true },
    user: { additionalFields: { role: { type: "string", required: true, defaultValue: "EMPLOYEE" } } },
  });
  ```

- `src/app/(auth)/sign-up/page.tsx` — public registration form (TanStack Form +
  Zod, `authClient.signUp`).
- `getUsers` (`src/features/assignments/actions.ts:131-138`) — returns
  `{ id, name, email, role }` for all users (gains an HR/ADMIN guard in plan 001).
- No `src/app/(dashboard)/admin` or `.../users` route exists.
- Auth helpers: `requireAuth({ roles: ["ADMIN"] })`. Better Auth admin
  operations (create user, set role) — CHECK the installed Better Auth version's
  API before coding; it may require the `admin` plugin. Read
  `node_modules/better-auth` docs or the config surface.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Inspect Better Auth API | read `node_modules/better-auth/dist/**` or its docs | find user-create / set-role surface |
| Dev | `pnpm dev` | starts on :3000 |

## Scope

**In scope** (build phase, AFTER spike confirmation):
- `src/features/users/` (create — actions.ts, queries.ts, components/)
- `src/app/(dashboard)/users/page.tsx` (create)
- `src/lib/auth.ts` (sign-up config, per operator decision)
- `src/app/(auth)/sign-up/page.tsx` (disable/gate, per decision)
- `src/components/dashboard/app-sidebar.tsx` (ADMIN-only nav item)

**Out of scope**:
- Password reset / email verification flows (future).
- Deleting users (evaluations reference them — soft-disable is safer; defer).
- Multi-tenant / org management.

## Git workflow

- Branch: `advisor/011-user-management`
- Suggested commits: `feat(users): admin user list with role assignment`, then
  `feat(auth): gate self-registration` (separate — the auth change is the
  risky one).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 0 (SPIKE — STOP after this): decide the sign-up policy

Investigate and write a 5-line recommendation to the operator covering:
- Should `/sign-up` stay open, become invite-only, or be removed in favor of
  admin-created accounts? (For an internal thesis HR tool, admin-created is
  the conventional answer — but the operator may want open sign-up for the
  live demo.)
- Does Better Auth's installed version expose admin user-creation and
  role-setting server-side (admin plugin?), or must you create the User +
  Account rows via Prisma + Better Auth's password hashing? Report which.

**Then STOP and report.** Do not change `auth.ts` or `sign-up` until the
operator answers. The user-list/role-assignment UI (Steps 1-3) is safe to
build regardless — proceed to it while waiting IF the operator isn't
immediately available, but leave the auth change for last.

### Step 1: `users` feature — read + role mutation

`src/features/users/actions.ts`:
- `getAllUsers()` — `requireAuth({ roles: ["ADMIN"] })`, returns
  `{ id, name, email, role, createdAt }[]` (reuse the `getUsers` query shape;
  do NOT import from assignments — copy into the users feature and consider
  deprecating the assignments one later).
- `setUserRole(userId, role)` — `requireAuth({ roles: ["ADMIN"] })`, validates
  `role` against a Zod enum `["ADMIN","HR","EMPLOYEE"]`, updates
  `prisma.user.update`. Guard: an admin must not demote themselves to the last
  admin — check `prisma.user.count({ where: { role: "ADMIN" } })` before
  demoting an ADMIN and reject if it would hit 0.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: hook + page

- `src/features/users/queries.ts` — `useAllUsers()` (query) and a
  `useSetUserRole()` mutation invalidating `["users"]`.
- `src/app/(dashboard)/users/page.tsx` — `"use client"`, ADMIN-gated (client
  guard for UX + the action guard is the real boundary). A table (reuse the
  TanStack Table pattern from `positions-table.tsx`) with a role `Select`
  (shadcn) per row calling `setUserRole`. Spanish labels.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: sidebar

Add an ADMIN-only "Usuarios" nav item to `app-sidebar.tsx`, route `/users`,
following the existing role-conditional pattern.

**Verify**: `npx tsc --noEmit` → exit 0; item shows only for ADMIN.

### Step 4 (only after Step 0 confirmation): apply the sign-up decision

Per the operator's answer, either:
- **Admin-created accounts**: add a "create user" flow to the users page using
  the API confirmed in Step 0, and gate/remove `/sign-up` (e.g. redirect
  `/sign-up` to `/sign-in`, or keep it behind a feature flag / first-admin
  bootstrap). Consider a bootstrap path so the FIRST admin can exist (seed
  script or env-driven).
- **Keep open sign-up**: document the decision in `AGENTS.md`/README and at
  minimum ensure new users can't self-select a non-EMPLOYEE role (they can't
  today — the default is enforced server-side; confirm the sign-up form can't
  pass `role`).

**Verify**: per the chosen path; if `/sign-up` is closed, hitting it
redirects; a new admin-created user can sign in.

### Step 5: Manual smoke test

1. As ADMIN: `/users` lists everyone; change an employee to HR → they gain HR
   pages on next sign-in.
2. Try to demote the only ADMIN → rejected.
3. As HR or EMPLOYEE: `/users` not in sidebar; direct navigation shows the
   client guard and the action returns unauthorized.
4. Sign-up behavior matches the operator's decision.

**Verify**: all pass.

## Test plan

`setUserRole`'s last-admin guard is a good integration-test target once plan
005's DB-test harness exists; note it on the wishlist. Zod role-enum
validation is unit-testable now if you factor it into a schema in
`src/lib/validators/`.

## Done criteria

- [ ] Step 0 recommendation delivered and operator decision recorded in the plan/PR
- [ ] `/users` (ADMIN-only) lists users and changes roles via `setUserRole`
- [ ] Last-admin demotion is blocked
- [ ] Sign-up policy applied per operator decision
- [ ] `npx tsc --noEmit` exits 0
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- **After Step 0, always** — do not touch `auth.ts`/`sign-up` without the
  operator's answer.
- Better Auth's installed version has no supported server-side user-creation
  path and hand-rolling Account rows risks breaking login — report and pause.
- Changing sign-up locks out the only way to create the first admin — design
  the bootstrap before disabling it.

## Maintenance notes

- User deletion was deliberately excluded: evaluations/assignments FK to
  users; a soft-disable (`active` flag) is the right future model.
- Email verification (`emailVerified`) is unused today; if sign-up stays open,
  enabling verification is the next hardening step.
- If this app ever goes multi-org, roles become org-scoped — this flat
  role model is a thesis-scope simplification.
