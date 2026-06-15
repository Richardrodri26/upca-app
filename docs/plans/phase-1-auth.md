# Phase 1: Authentication

## Objective
Implement the full authentication flow using Better Auth: sign-in, sign-up, session management, role-based route protection, and the initial dashboard layout shell.

## Prerequisites
- Phase 0 completed: Docker running, Prisma configured, shadcn/ui installed, TanStack Query/Form available
- PostgreSQL database running and accessible
- `.env` file with `DATABASE_URL` set

## Steps

### Step 1.1: Better Auth Installation
**Files**: `.env`
**Action**: Install Better Auth and generate the auth secret.
**Details**:
- Install: `pnpm add better-auth`
- Generate a secret: `npx auth@latest secret`
- Add to `.env`:
  ```
  BETTER_AUTH_SECRET=<generated-secret>
  BETTER_AUTH_URL=http://localhost:3000
  ```
- Both variables must be present before the auth server can start

### Step 1.2: Auth Configuration
**Files**: `src/lib/auth.ts`, `src/lib/auth-client.ts`
**Action**: Configure the Better Auth server instance and client.
**Details**:
- Create `src/lib/auth.ts` (server-side only):
  - Import `betterAuth` from `better-auth`
  - Import `prismaAdapter` from `better-auth/adapters/prisma`
  - Import the Prisma client from `@/lib/prisma`
  - Configure:
    ```typescript
    export const auth = betterAuth({
      database: prismaAdapter(prisma, { provider: "postgresql" }),
      emailAndPassword: { enabled: true },
      session: {
        // Extend session to include user role
      },
    });
    ```
  - Add session callback or plugin to expose `role` on the session user object
- Create `src/lib/auth-client.ts` (client-side):
  - Import `createAuthClient` from `better-auth/react`
  - Export: `signIn`, `signUp`, `signOut`, `useSession`
  - Configure with `baseURL` pointing to the app

### Step 1.3: Prisma Schema -- Auth Models
**Files**: `prisma/schema.prisma`, migration files
**Action**: Add Better Auth required models and the custom role field.
**Details**:
- Run `npx auth generate` to auto-add Better Auth models (user, session, account, verification) to the schema
- Manually add to the User model:
  ```prisma
  role Role @default(EMPLOYEE)
  ```
- Add the Role enum:
  ```prisma
  enum Role {
    ADMIN
    HR
    EMPLOYEE
  }
  ```
- Run migration: `npx prisma migrate dev --name auth-models`
- Run: `npx prisma generate`
- Verify generated client includes the Role enum and updated User type

### Step 1.4: API Route
**Files**: `src/app/api/auth/[...all]/route.ts`
**Action**: Create the catch-all API route that Better Auth uses for all auth endpoints.
**Details**:
- Create the route file:
  ```typescript
  import { auth } from "@/lib/auth";
  import { toNextJsHandler } from "better-auth/next-js";

  export const { GET, POST } = toNextJsHandler(auth);
  ```
- This handles: `/api/auth/sign-in`, `/api/auth/sign-up`, `/api/auth/sign-out`, `/api/auth/session`, etc.

### Step 1.5: Auth Middleware
**Files**: `src/middleware.ts` or `src/lib/auth-middleware.ts`
**Action**: Protect dashboard routes and create role-checking utilities.
**Details**:
- Option A -- Next.js middleware (`src/middleware.ts`):
  - Check for session cookie on `/(dashboard)` routes
  - Redirect to `/sign-in` if no session
  - Export matcher config for dashboard routes
- Option B -- Layout-level check (simpler, recommended for Better Auth):
  - In dashboard layout, call `auth.api.getSession()` server-side
  - Redirect if no session
- Create `src/lib/auth-middleware.ts` with helper:
  ```typescript
  export async function requireRole(roles: Role[]) {
    // Get session, check user.role against allowed roles
    // Throw or redirect if unauthorized
  }
  ```
- This helper will be used in Server Actions for role-based access control

### Step 1.6: Auth Pages
**Files**: `src/app/(auth)/layout.tsx`, `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/features/auth/schemas.ts`
**Action**: Build the sign-in and sign-up forms using TanStack Form with Zod validation.
**Details**:
- Create `src/features/auth/schemas.ts`:
  ```typescript
  export const signInSchema = z.object({
    email: z.string().email("Email invalido"),
    password: z.string().min(8, "Minimo 8 caracteres"),
  });

  export const signUpSchema = z.object({
    name: z.string().min(2, "Minimo 2 caracteres"),
    email: z.string().email("Email invalido"),
    password: z.string().min(8, "Minimo 8 caracteres"),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Las passwords no coinciden",
    path: ["confirmPassword"],
  });
  ```
- Create `src/app/(auth)/layout.tsx`:
  - Centered layout (flexbox, min-h-screen)
  - No sidebar, no navigation -- just the auth card
- Create `src/app/(auth)/sign-in/page.tsx`:
  - Use shadcn Card, Input, Label, Button
  - Use TanStack Form with `signInSchema` validator
  - On submit: call `signIn.email()` from auth-client
  - On success: redirect to `/` (dashboard)
  - Show error messages from the API
  - Link to sign-up page
- Create `src/app/(auth)/sign-up/page.tsx`:
  - Same pattern as sign-in but with name and confirm password fields
  - On submit: call `signUp.email()` from auth-client
  - On success: redirect to `/` (dashboard)
  - Link to sign-in page

### Step 1.7: Dashboard Layout Shell
**Files**: `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/page.tsx`
**Action**: Create the authenticated layout with sidebar and the initial dashboard page.
**Details**:
- Create `src/app/(dashboard)/layout.tsx`:
  - Server component that checks session (redirect to /sign-in if none)
  - Uses shadcn Sidebar component for navigation
  - Sidebar items (links only, pages come in later phases):
    - Dashboard (/)
    - Positions (/positions)
    - Manuals (/manuals)
    - Evaluations (/evaluations)
    - Results (/results) -- visible only for ADMIN/HR
  - Header area with user avatar/name and sign-out dropdown
  - Main content area renders `{children}`
- Create `src/app/(dashboard)/page.tsx`:
  - Simple welcome page: "Bienvenido, {user.name}"
  - Show current role as a badge
  - Placeholder cards for quick stats (empty for now)
- Wire signOut button:
  - Call `signOut()` from auth-client
  - Redirect to `/sign-in` on success

## Completion Criteria
- [ ] User can sign up with email and password
- [ ] User can sign in and is redirected to the dashboard
- [ ] Session persists across page reloads (cookie-based)
- [ ] Unauthenticated users accessing dashboard routes are redirected to /sign-in
- [ ] Role field is stored in the database and accessible in the session
- [ ] Sign out clears the session and redirects to /sign-in
- [ ] Dashboard layout renders with sidebar navigation
- [ ] Auth forms show validation errors (client-side via Zod, server-side from API)

## RAG Integration Notes
No RAG integration in this phase.

## Notes
- Better Auth manages its own tables (user, session, account, verification). The `npx auth generate` command adds these to the Prisma schema automatically.
- The `role` field is a custom addition to the User model. Better Auth does not manage it -- we do.
- TanStack Form uses a different API than react-hook-form. The key patterns are: `useForm()` with `defaultValues`, `form.Field` render prop, and `validatorAdapter` for Zod integration.
- The dashboard layout is a shell in this phase. Navigation links will lead to 404s until the corresponding feature pages are built in later phases.
- Session checking in the layout (server-side) is preferred over middleware for Better Auth because it gives access to the full session object including custom fields like `role`.
