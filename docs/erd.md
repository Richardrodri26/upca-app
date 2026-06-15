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
        Role role "ADMIN | HR | EMPLOYEE"
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
        Int relevanceRating "1-5 nullable"
        Int coherenceRating "1-5 nullable"
        Int adequacyRating "1-5 nullable"
        String evaluationId FK
        DateTime createdAt
        DateTime updatedAt
    }

    EvaluationAssignment {
        String id PK "cuid"
        AssignmentStatus status "PENDING | IN_PROGRESS | COMPLETED"
        Float score "avg on completion"
        DateTime completedAt
        String evaluationId FK
        String employeeId FK
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
    User ||--o{ EvaluationAssignment : "assigned to"
    Position ||--|| Manual : "has one"
    Position ||--o{ Evaluation : "has many"
    Manual ||--o{ Evaluation : "has many"
    Evaluation ||--o{ Question : "has many"
    Evaluation ||--o{ EvaluationAssignment : "has many"
    Question ||--o{ Response : "has many"
    EvaluationAssignment ||--o{ Response : "has many"
```

## Enum Legend

| Enum | Values | Description |
|------|--------|-------------|
| **Role** | `ADMIN`, `HR`, `EMPLOYEE` | User access level. Default: `EMPLOYEE` |
| **ManualStatus** | `PENDING`, `PROCESSING`, `PROCESSED`, `ERROR` | Lifecycle of a manual upload and RAG processing |
| **EvaluationStatus** | `DRAFT`, `REVIEW`, `ACTIVE`, `CLOSED` | Evaluation workflow stages |
| **QuestionStatus** | `PENDING`, `APPROVED`, `EDITED`, `REJECTED` | HR review status for AI-generated questions |
| **AssignmentStatus** | `PENDING`, `IN_PROGRESS`, `COMPLETED` | Employee evaluation assignment progress |

## Unique Constraints

| Table | Constraint | Purpose |
|-------|-----------|---------|
| **Manual** | `positionId` unique | Enforces 1:1 relationship with Position |
| **EvaluationAssignment** | `(evaluationId, employeeId)` | One assignment per employee per evaluation |
| **Response** | `(questionId, assignmentId)` | One response per question per assignment |
