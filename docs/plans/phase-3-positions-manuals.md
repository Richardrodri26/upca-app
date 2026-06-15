# Phase 3: Positions and Manuals

## Objective
Implement full CRUD for positions and manual upload with RAG service integration (mockable), including data tables, forms, status tracking, and role-based access control.

## Prerequisites
- Phase 0 completed: All infrastructure in place
- Phase 1 completed: Auth working, dashboard layout with sidebar
- Phase 2 completed: All models migrated, seed data loaded, Zod schemas ready
- RAG service contract documented (see `docs/rag-api-contract.md`)

## Steps

### Step 3.1: RAG Service Client
**Files**: `src/lib/rag-client.ts`, `src/lib/validators/rag.ts`
**Action**: Create a typed HTTP client for the RAG service with Zod-validated responses.
**Details**:
- Create `src/lib/validators/rag.ts`:
  - Define schemas based on `docs/rag-api-contract.md`:
    ```typescript
    export const ragIngestResponseSchema = z.object({
      externalRef: z.string(),
      status: z.enum(["processing", "completed", "error"]),
      message: z.string().optional(),
    });

    export const ragStatusResponseSchema = z.object({
      externalRef: z.string(),
      status: z.enum(["processing", "completed", "error"]),
      processedAt: z.string().datetime().optional(),
    });
    ```
  - Adjust schemas to match the actual RAG API contract once confirmed
- Create `src/lib/rag-client.ts`:
  - Read `RAG_SERVICE_URL` from `process.env`
  - Read `MOCK_RAG` from `process.env`
  - Export `ingestManual(file: File, positionName: string, positionId: string)`:
    - Build FormData with file, position name, and position ID
    - POST to `${RAG_SERVICE_URL}/ingest`
    - Parse response with `ragIngestResponseSchema`
    - Return typed result
  - Export `getManualStatus(externalRef: string)`:
    - GET `${RAG_SERVICE_URL}/status/${externalRef}`
    - Parse with `ragStatusResponseSchema`
    - Return typed result
  - Wrap all fetch calls in try/catch, return `{ success: false, error: string }` on failure
  - When `MOCK_RAG=true`, skip real fetch calls (handled in Step 3.6)

### Step 3.2: Position Feature -- Queries and Mutations
**Files**: `src/features/positions/queries.ts`, `src/features/positions/mutations.ts`, `src/features/positions/actions.ts`
**Action**: Create TanStack Query hooks and Server Actions for position CRUD.
**Details**:
- Create `src/features/positions/actions.ts` (Server Actions):
  ```typescript
  "use server";

  export async function getPositions(search?: string, department?: string) {
    // Query positions with optional filters
    // Include manual count and evaluation count in response
  }

  export async function getPosition(id: string) {
    // Get single position with related manual and evaluations
  }

  export async function createPosition(data: CreatePositionInput) {
    // Validate with createPositionSchema
    // Check role: requireRole(["ADMIN", "HR"])
    // Create in DB, revalidate path
  }

  export async function updatePosition(data: UpdatePositionInput) {
    // Validate with updatePositionSchema
    // Check role: requireRole(["ADMIN", "HR"])
    // Update in DB, revalidate path
  }

  export async function deletePosition(id: string) {
    // Check role: requireRole(["ADMIN", "HR"])
    // Check for associated manuals/evaluations (warn or cascade)
    // Delete from DB, revalidate path
  }
  ```
- Create `src/features/positions/queries.ts`:
  ```typescript
  export function usePositions(search?: string, department?: string) {
    return useQuery({
      queryKey: ["positions", { search, department }],
      queryFn: () => getPositions(search, department),
    });
  }

  export function usePosition(id: string) {
    return useQuery({
      queryKey: ["positions", id],
      queryFn: () => getPosition(id),
      enabled: !!id,
    });
  }
  ```
- Create `src/features/positions/mutations.ts`:
  ```typescript
  export function useCreatePosition() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: createPosition,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["positions"] }),
    });
  }
  // Same pattern for useUpdatePosition, useDeletePosition
  ```

### Step 3.3: Position Pages
**Files**: `src/app/(dashboard)/positions/page.tsx`, `src/app/(dashboard)/positions/[id]/page.tsx`, `src/features/positions/components/position-form.tsx`, `src/features/positions/components/positions-table.tsx`
**Action**: Build the positions list page with data table and the position detail page.
**Details**:
- Create `src/features/positions/components/positions-table.tsx`:
  - Use shadcn Table component
  - Columns: Name, Department, Manual Status (badge), Evaluations count, Actions (edit/delete)
  - Manual Status shows: "Sin manual" if none, or the manual's status as a colored badge
  - Actions column: edit button (opens dialog), delete button (with confirmation)
  - Support sorting by name and department
- Create `src/features/positions/components/position-form.tsx`:
  - Use TanStack Form with `createPositionSchema` / `updatePositionSchema`
  - Fields: name (Input), description (Textarea), department (Input or Select with common values)
  - Submit calls the appropriate mutation
  - Render inside a shadcn Dialog
  - Support both create and edit modes (pre-fill values for edit)
- Create `src/app/(dashboard)/positions/page.tsx`:
  - Page title: "Cargos"
  - Search input (filters by name, debounced)
  - Department filter (Select with unique departments from data)
  - "Nuevo Cargo" button (opens create dialog) -- visible only for ADMIN/HR
  - Render PositionsTable
- Create `src/app/(dashboard)/positions/[id]/page.tsx`:
  - Show position details: name, description, department
  - Section: Associated manual (if any) with status and link to manual detail
  - Section: Evaluations list (if any) with status badges
  - Edit and delete buttons for ADMIN/HR

### Step 3.4: Manual Feature -- Queries and Mutations
**Files**: `src/features/manuals/queries.ts`, `src/features/manuals/mutations.ts`, `src/features/manuals/actions.ts`
**Action**: Create TanStack Query hooks and Server Actions for manual management.
**Details**:
- Create `src/features/manuals/actions.ts` (Server Actions):
  ```typescript
  "use server";

  export async function getManuals(status?: ManualStatus) {
    // Query manuals with optional status filter
    // Include position name in response
  }

  export async function uploadManual(formData: FormData) {
    // Extract file and positionId from FormData
    // Validate with uploadManualSchema
    // Check role: requireRole(["ADMIN", "HR"])
    // Save manual metadata to DB (status: PENDING)
    // Call ragClient.ingestManual()
    // On success: update status to PROCESSING, store externalRef
    // On failure: update status to ERROR
    // Revalidate path
  }

  export async function deleteManual(id: string) {
    // Check role: requireRole(["ADMIN", "HR"])
    // Check for associated evaluations (prevent delete if active evaluations exist)
    // Delete from DB
    // Revalidate path
  }

  export async function refreshManualStatus(id: string) {
    // Get manual from DB
    // Call ragClient.getManualStatus(manual.externalRef)
    // Update status in DB based on response
    // Revalidate path
  }
  ```
- Create `src/features/manuals/queries.ts`:
  ```typescript
  export function useManuals(status?: ManualStatus) {
    return useQuery({
      queryKey: ["manuals", { status }],
      queryFn: () => getManuals(status),
    });
  }

  export function useManualStatus(id: string, enabled: boolean) {
    return useQuery({
      queryKey: ["manuals", id, "status"],
      queryFn: () => refreshManualStatus(id),
      enabled,
      refetchInterval: 5000, // Poll every 5s while processing
    });
  }
  ```
- Create `src/features/manuals/mutations.ts`:
  ```typescript
  export function useUploadManual() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: uploadManual,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["manuals"] });
        queryClient.invalidateQueries({ queryKey: ["positions"] });
      },
    });
  }
  // Same pattern for useDeleteManual
  ```

### Step 3.5: Manual Pages
**Files**: `src/app/(dashboard)/manuals/page.tsx`, `src/features/manuals/components/upload-dialog.tsx`, `src/features/manuals/components/manual-status-badge.tsx`, `src/features/manuals/components/manuals-table.tsx`
**Action**: Build the manuals list page with upload functionality and status visualization.
**Details**:
- Create `src/features/manuals/components/manual-status-badge.tsx`:
  - Map ManualStatus to badge variant and color:
    - PENDING: outline/gray
    - PROCESSING: secondary/yellow
    - PROCESSED: default/green
    - ERROR: destructive/red
  - Use shadcn Badge component
- Create `src/features/manuals/components/manuals-table.tsx`:
  - Use shadcn Table component
  - Columns: File Name, Position (linked), Status (badge), Uploaded By, Date, Actions
  - Actions: delete (with confirmation), refresh status (for PROCESSING manuals)
- Create `src/features/manuals/components/upload-dialog.tsx`:
  - shadcn Dialog triggered by "Subir Manual" button
  - Position selector: shadcn Select, filtered to positions WITHOUT a manual
  - File input: accept only PDF, max 10MB
  - Optional: drag-and-drop zone for the file (using native HTML5 drag/drop)
  - Submit button with loading state
  - On submit: create FormData, call uploadManual mutation
  - Close dialog on success, show toast on error
- Create `src/app/(dashboard)/manuals/page.tsx`:
  - Page title: "Manuales de Funciones"
  - Status filter (Select with ManualStatus values + "Todos")
  - "Subir Manual" button -- visible only for ADMIN/HR
  - Render ManualsTable
  - Show empty state if no manuals exist

### Step 3.6: Mock RAG Service
**Files**: `src/lib/rag-client.ts` (modify)
**Action**: Add mock mode to the RAG client for development without the external service.
**Details**:
- In `src/lib/rag-client.ts`, check `process.env.MOCK_RAG === "true"` at the top of each function
- Mock `ingestManual`:
  ```typescript
  if (process.env.MOCK_RAG === "true") {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    return {
      success: true,
      data: {
        externalRef: `mock-ref-${Date.now()}`,
        status: "processing" as const,
      },
    };
  }
  ```
- Mock `getManualStatus`:
  ```typescript
  if (process.env.MOCK_RAG === "true") {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      data: {
        externalRef,
        status: "completed" as const,
        processedAt: new Date().toISOString(),
      },
    };
  }
  ```
- Add `MOCK_RAG=true` to `.env` for local development
- Document in `.env.example` that `MOCK_RAG=true` enables fake RAG responses

## Completion Criteria
- [ ] Positions CRUD works end-to-end: create, read (list + detail), update, delete
- [ ] Position form validates input (name required and unique, etc.)
- [ ] Manual upload saves file metadata to the database
- [ ] Manual upload calls the RAG ingest endpoint (or mock)
- [ ] Manual status badge displays correctly for all statuses
- [ ] When `MOCK_RAG=true`, the full upload and status flow works with fake data
- [ ] When RAG is available, real ingest call is made and externalRef is stored
- [ ] If RAG ingest fails, manual status is set to ERROR
- [ ] Status polling works for PROCESSING manuals (auto-refresh every 5 seconds)
- [ ] Role-based access: only ADMIN and HR can create/edit/delete positions and upload manuals
- [ ] EMPLOYEE users can view positions and manuals but cannot modify them
- [ ] Search and filter work on both positions and manuals tables
- [ ] Delete confirmation dialogs prevent accidental deletion

## RAG Integration Notes
- The RAG service is an external dependency owned by a teammate. The mock mode (`MOCK_RAG=true`) is essential for independent development.
- The ingest flow: upload file -> save metadata (PENDING) -> call RAG ingest -> update to PROCESSING -> poll status -> update to PROCESSED or ERROR.
- If the RAG service is unreachable, the upload still succeeds locally (metadata saved), but status stays PENDING or goes to ERROR.
- The `externalRef` returned by the RAG service is the key for all future interactions (status checks, question generation in Phase 4+).
- The mock always returns "completed" on status check. For more realistic testing, consider adding a counter or timestamp-based delay before returning "completed".

## Notes
- Server Actions handle both validation and authorization. Every mutating action must call `requireRole()` before proceeding.
- The `positions` query key hierarchy: `["positions"]` for list, `["positions", id]` for detail. Manual mutations invalidate both `["manuals"]` and `["positions"]` since the position detail shows manual status.
- File upload in Next.js Server Actions uses FormData. The file is NOT stored locally by default -- only metadata goes to the DB. The actual file is sent directly to the RAG service. If the RAG service needs the file later, consider storing it in a blob store (out of scope for this phase).
- The `useManualStatus` query with `refetchInterval` provides automatic polling. It should only be enabled for manuals in PROCESSING status to avoid unnecessary network requests.
- Department values in the position form could be a free-text input or a predefined Select. Start with free-text for flexibility; a fixed list can be added later if needed.
