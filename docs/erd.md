# UPCA App — Entity Relationship Diagram

Database schema for the automated performance evaluation generation system. Uses Prisma v7 with PostgreSQL, Better Auth for authentication, and role-based access control.

```mermaid
erDiagram
    User {
        String id PK
        String name
        String email
        Boolean emailVerified
        String image
        Role role "ADMIN | HR | AREA_LEAD | EMPLOYEE"
        DateTime createdAt
        DateTime updatedAt
    }

    Session {
        String id PK
        DateTime expiresAt
        String token "unique"
        DateTime createdAt
        DateTime updatedAt
        String ipAddress
        String userAgent
        String userId FK
    }

    Account {
        String id PK
        String accountId
        String providerId
        String userId FK
        String accessToken
        String refreshToken
        String idToken
        DateTime accessTokenExpiresAt
        DateTime refreshTokenExpiresAt
        String scope
        String password
        DateTime createdAt
        DateTime updatedAt
    }

    Verification {
        String id PK
        String identifier
        String value
        DateTime expiresAt
        DateTime createdAt
        DateTime updatedAt
    }

    Position {
        String id PK "cuid"
        String name "unique"
        String description
        String department
        String leaderId FK "nullable - links AREA_LEAD user"
        DateTime createdAt
        DateTime updatedAt
    }

    Manual {
        String id PK "cuid"
        String fileName
        String fileUrl
        ManualStatus status "PENDING | PROCESSING | PROCESSED | ERROR"
        String externalRef
        String positionId FK "unique (1:1)"
        String uploadedById FK
        DateTime createdAt
        DateTime updatedAt
    }

    Evaluation {
        String id PK "cuid"
        String title
        EvaluationStatus status "DRAFT | REVIEW | ACTIVE | CLOSED"
        Float generationTime "seconds - IRTO metric"
        String positionId FK
        String manualId FK
        String createdById FK
        DateTime createdAt
        DateTime updatedAt
    }

    Question {
        String id PK "cuid"
        String text
        Int order
        QuestionStatus status "PENDING | APPROVED | EDITED | REJECTED"
        String originalText
        CalibrationStatus calibrationStatus "PENDING | IN_CALIBRATION | RESOLVED"
        String evaluationId FK
        DateTime createdAt
        DateTime updatedAt
    }

    QuestionReview {
        String id PK "cuid"
        ReviewerRole reviewerRole "HR | AREA_LEAD"
        Int relevanceRating "1-5"
        Int coherenceRating "1-5"
        Int adequacyRating "1-5"
        String questionId FK
        String reviewerId FK
        DateTime createdAt
        DateTime updatedAt
    }

    QuestionConsensus {
        String id PK "cuid"
        Int relevanceRating "1-5"
        Int coherenceRating "1-5"
        Int adequacyRating "1-5"
        String resolvedById FK
        String questionId FK "unique (1:1)"
        DateTime createdAt
        DateTime updatedAt
    }

    EvaluationAssignment {
        String id PK "cuid"
        AssignmentStatus status "PENDING | IN_PROGRESS | COMPLETED"
        Float score "avg on completion"
        DateTime completedAt
        String evaluationId FK
        String employeeId FK "quien es evaluado"
        String evaluatorId FK "quien realiza la evaluacion"
        DateTime createdAt
        DateTime updatedAt
    }

    Response {
        String id PK "cuid"
        Int value "Likert 1-5"
        String questionId FK
        String assignmentId FK
        DateTime createdAt
    }

    User ||--o{ Session : "has many"
    User ||--o{ Account : "has many"
    User ||--o{ Manual : "uploaded"
    User ||--o{ Evaluation : "created"
    User ||--o{ EvaluationAssignment : "is evaluated by (employeeId)"
    User ||--o{ EvaluationAssignment : "evaluates (evaluatorId)"
    User ||--o{ Position : "leads (leaderId)"
    User ||--o{ QuestionReview : "wrote"
    User ||--o{ QuestionConsensus : "resolved"
    Position ||--|| Manual : "has one"
    Position ||--o{ Evaluation : "has many"
    Manual ||--o{ Evaluation : "has many"
    Evaluation ||--o{ Question : "has many"
    Evaluation ||--o{ EvaluationAssignment : "has many"
    Question ||--o{ Response : "has many"
    Question ||--o{ QuestionReview : "has many (max 1 per reviewerRole)"
    Question ||--|| QuestionConsensus : "has one (1:1)"
    EvaluationAssignment ||--o{ Response : "has many"
```

## Enum Legend

| Enum | Values | Description |
|------|--------|-------------|
| **Role** | `ADMIN`, `HR`, `AREA_LEAD`, `EMPLOYEE` | User access level. Default: `EMPLOYEE`. `AREA_LEAD` is the second reviewer in the two-reviewer calibration scheme. |
| **ManualStatus** | `PENDING`, `PROCESSING`, `PROCESSED`, `ERROR` | Lifecycle of a manual upload and RAG processing |
| **EvaluationStatus** | `DRAFT`, `REVIEW`, `ACTIVE`, `CLOSED` | Evaluation workflow stages |
| **QuestionStatus** | `PENDING`, `APPROVED`, `EDITED`, `REJECTED` | HR editorial review status for AI-generated questions (text quality). Orthogonal to `CalibrationStatus`. |
| **ReviewerRole** | `HR`, `AREA_LEAD` | Identifies which reviewer slot a `QuestionReview` rating fills. Max 1 review per role per question. |
| **CalibrationStatus** | `PENDING`, `IN_CALIBRATION`, `RESOLVED` | Tracks the two-reviewer validation state of a `Question`. `PENDING` = missing reviews, `IN_CALIBRATION` = reviews diverge (|Δ| ≥ 2), `RESOLVED` = consensus reached. |
| **AssignmentStatus** | `PENDING`, `IN_PROGRESS`, `COMPLETED` | Employee evaluation assignment progress |

## Unique Constraints

| Table | Constraint | Purpose |
|-------|-----------|---------|
| **Manual** | `positionId` unique | Enforces 1:1 relationship with Position |
| **EvaluationAssignment** | `(evaluationId, employeeId)` | Un solo evaluador por empleado por evaluacion |
| **Response** | `(questionId, assignmentId)` | One response per question per assignment |
| **QuestionReview** | `(questionId, reviewerRole)` | Max 1 HR + 1 AREA_LEAD review per question |
| **QuestionConsensus** | `questionId` unique | Enforces 1:1 relationship with Question |
