# Phase 2: Core Schema and Seed

## Objective
Implement the complete database schema covering all domain models (positions, manuals, evaluations, questions, assignments, responses) and create comprehensive seed data for development and testing.

## Prerequisites
- Phase 0 completed: Prisma v7 configured, PostgreSQL running
- Phase 1 completed: Auth models exist, User model has `role` field, migrations applied
- `npx prisma generate` runs successfully with existing auth models

## Steps

### Step 2.1: Complete Prisma Schema
**Files**: `prisma/schema.prisma`
**Action**: Add all domain models and enums to the existing schema (which already has auth models from Phase 1).
**Details**:
- Add enums:
  ```prisma
  enum ManualStatus {
    PENDING
    PROCESSING
    PROCESSED
    ERROR
  }

  enum EvaluationStatus {
    DRAFT
    GENERATING
    REVIEW
    ACTIVE
    CLOSED
  }

  enum QuestionStatus {
    PENDING
    APPROVED
    REJECTED
    EDITED
  }

  enum AssignmentStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
  }
  ```
- Add models:
  ```prisma
  model Position {
    id          String   @id @default(cuid())
    name        String   @unique
    description String?
    department  String?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    manual      Manual?
    evaluations Evaluation[]
  }

  model Manual {
    id          String       @id @default(cuid())
    fileName    String
    fileUrl     String?
    status      ManualStatus @default(PENDING)
    externalRef String?
    positionId  String       @unique
    uploadedById String
    createdAt   DateTime     @default(now())
    updatedAt   DateTime     @updatedAt

    position    Position     @relation(fields: [positionId], references: [id], onDelete: Cascade)
    uploadedBy  User         @relation("UploadedManuals", fields: [uploadedById], references: [id])
    evaluations Evaluation[]
  }

  model Evaluation {
    id             String           @id @default(cuid())
    title          String
    status         EvaluationStatus @default(DRAFT)
    generationTime Float?
    positionId     String
    manualId       String
    createdById    String
    createdAt      DateTime         @default(now())
    updatedAt      DateTime         @updatedAt

    position       Position         @relation(fields: [positionId], references: [id], onDelete: Cascade)
    manual         Manual           @relation(fields: [manualId], references: [id])
    createdBy      User             @relation("CreatedEvaluations", fields: [createdById], references: [id])
    questions      Question[]
    assignments    EvaluationAssignment[]
  }

  model Question {
    id              String         @id @default(cuid())
    text            String
    order           Int
    status          QuestionStatus @default(PENDING)
    originalText    String?
    relevanceRating Int?
    coherenceRating Int?
    adequacyRating  Int?
    evaluationId    String
    createdAt       DateTime       @default(now())
    updatedAt       DateTime       @updatedAt

    evaluation      Evaluation     @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
    responses       Response[]
  }

  model EvaluationAssignment {
    id           String           @id @default(cuid())
    status       AssignmentStatus @default(PENDING)
    score        Float?
    completedAt  DateTime?
    evaluationId String
    employeeId   String
    createdAt    DateTime         @default(now())
    updatedAt    DateTime         @updatedAt

    evaluation   Evaluation       @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
    employee     User             @relation("EmployeeAssignments", fields: [employeeId], references: [id])
    responses    Response[]

    @@unique([evaluationId, employeeId])
  }

  model Response {
    id           String               @id @default(cuid())
    value        Int
    questionId   String
    assignmentId String
    createdAt    DateTime             @default(now())

    question     Question             @relation(fields: [questionId], references: [id], onDelete: Cascade)
    assignment   EvaluationAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)

    @@unique([questionId, assignmentId])
  }
  ```
- Add relation fields to User model (from Phase 1):
  ```prisma
  // Add these to the existing User model
  uploadedManuals  Manual[]               @relation("UploadedManuals")
  createdEvaluations Evaluation[]         @relation("CreatedEvaluations")
  assignments      EvaluationAssignment[] @relation("EmployeeAssignments")
  ```
- Verify all relations, cascading deletes, and unique constraints are correct
- Reference `docs/erd.md` if it exists for the complete entity-relationship diagram

### Step 2.2: Migration
**Files**: `prisma/migrations/*`
**Action**: Create and apply the migration for all new models.
**Details**:
- Run: `npx prisma migrate dev --name complete-schema`
- Review the generated SQL in the migration file to confirm:
  - All tables are created with correct column types
  - Foreign keys reference the correct tables
  - Unique constraints are applied (Position.name, Manual.positionId, EvaluationAssignment(evaluationId, employeeId), Response(questionId, assignmentId))
  - Cascade deletes are set on the correct relations
- Run: `npx prisma generate`
- Open Prisma Studio (`npx prisma studio`) to verify empty tables exist

### Step 2.3: Seed Data
**Files**: `prisma/seed.ts`, `prisma.config.ts` (update seed config)
**Action**: Create a comprehensive seed script for development data.
**Details**:
- Create `prisma/seed.ts`:
  - Import PrismaClient and Better Auth's password hashing utility
  - Seed Users (use Better Auth's API or hash passwords with the same algorithm):
    - 1 ADMIN: "Admin User", admin@upca.com
    - 2 HR: "Maria Garcia" (hr1@upca.com), "Carlos Lopez" (hr2@upca.com)
    - 5 EMPLOYEES: with realistic names and emails
  - Seed Positions:
    - "Desarrollador Senior" (department: "Tecnologia")
    - "Analista de QA" (department: "Tecnologia")
    - "Gerente de Proyectos" (department: "Operaciones")
  - Seed Manuals:
    - 2 manuals linked to the first 2 positions
    - Status: PROCESSED (simulating already-ingested documents)
    - Include fake `externalRef` values (e.g., "rag-ref-001") for testing status polling
  - Seed Evaluations:
    - 1 evaluation in REVIEW status linked to "Desarrollador Senior" position/manual
    - Title: "Evaluacion Tecnica - Desarrollador Senior Q1 2026"
  - Seed Questions (10 for the evaluation):
    - Mix of statuses: 6 APPROVED, 2 PENDING, 1 REJECTED, 1 EDITED
    - Include `originalText` for the EDITED question
    - Include ratings for APPROVED questions
  - Seed Assignments:
    - 1 COMPLETED assignment (employee 1, score: 78.5, completedAt set)
    - 1 PENDING assignment (employee 2)
  - Seed Responses:
    - For the COMPLETED assignment: 10 responses (one per question, values 1-5)
  - Use transactions where appropriate to ensure data consistency
  - Add a cleanup step at the top: delete in reverse dependency order
- Update `prisma.config.ts` to add seed configuration:
  ```typescript
  seed: "tsx prisma/seed.ts"
  ```
- Run: `npx prisma db seed`
- Verify all data in Prisma Studio

### Step 2.4: Zod Schemas for Domain Models
**Files**: `src/lib/validators/position.ts`, `src/lib/validators/manual.ts`, `src/lib/validators/evaluation.ts`, `src/lib/validators/assignment.ts`
**Action**: Create Zod validation schemas for all domain operations (used by Server Actions and forms).
**Details**:
- Create `src/lib/validators/position.ts`:
  ```typescript
  export const createPositionSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    department: z.string().max(100).optional(),
  });
  export const updatePositionSchema = createPositionSchema.partial().extend({
    id: z.string().cuid(),
  });
  ```
- Create `src/lib/validators/manual.ts`:
  ```typescript
  export const uploadManualSchema = z.object({
    positionId: z.string().cuid(),
    file: z.instanceof(File)
      .refine(f => f.size <= 10 * 1024 * 1024, "Max 10MB")
      .refine(f => f.type === "application/pdf", "Solo PDF"),
  });
  ```
- Create `src/lib/validators/evaluation.ts`:
  ```typescript
  export const createEvaluationSchema = z.object({
    title: z.string().min(5).max(200),
    positionId: z.string().cuid(),
    manualId: z.string().cuid(),
  });
  export const updateQuestionSchema = z.object({
    id: z.string().cuid(),
    text: z.string().min(10),
    status: z.enum(["APPROVED", "REJECTED", "EDITED"]),
  });
  export const rateQuestionSchema = z.object({
    id: z.string().cuid(),
    relevanceRating: z.number().int().min(1).max(5).optional(),
    coherenceRating: z.number().int().min(1).max(5).optional(),
    adequacyRating: z.number().int().min(1).max(5).optional(),
  });
  ```
- Create `src/lib/validators/assignment.ts`:
  ```typescript
  export const createAssignmentSchema = z.object({
    evaluationId: z.string().cuid(),
    employeeId: z.string().cuid(),
  });
  export const submitResponseSchema = z.object({
    assignmentId: z.string().cuid(),
    responses: z.array(z.object({
      questionId: z.string().cuid(),
      value: z.number().int().min(1).max(5),
    })).min(1),
  });
  ```
- Update `src/lib/validators/index.ts` to re-export all schemas

## Completion Criteria
- [ ] All tables created in PostgreSQL (verify via `npx prisma studio` or `\dt` in psql)
- [ ] `npx prisma db seed` runs successfully and populates all tables
- [ ] Prisma Studio shows correct data with proper relations
- [ ] All Zod schemas are created and exported
- [ ] `npx prisma generate` produces a clean client with all types
- [ ] No migration warnings or drift detected

## RAG Integration Notes
- The seed creates manuals with `status: PROCESSED` and fake `externalRef` values. This simulates the state after a successful RAG ingestion, allowing downstream features (evaluations) to work without the RAG service.
- In production, `externalRef` comes from the RAG service response. In seed, we use placeholder strings.

## Notes
- The seed script must handle Better Auth's password hashing. Check if Better Auth exposes a `hashPassword` utility, or use the same underlying library (likely bcrypt or argon2) directly.
- The cleanup step in seed is critical: delete in order Response -> EvaluationAssignment -> Question -> Evaluation -> Manual -> Position -> (auth tables if needed) to avoid FK violations.
- The `@@unique` composite constraints are important: one manual per position, one assignment per employee-evaluation pair, one response per question-assignment pair.
- The `onDelete: Cascade` on Position -> Manual, Position -> Evaluation, Evaluation -> Question, etc. ensures clean deletion without orphaned records.
- Zod schemas here are for SERVER-SIDE validation in Server Actions. Form-level validation (client-side) may use the same schemas or simplified versions.
