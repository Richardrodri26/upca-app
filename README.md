# UPCA App — Sistema Inteligente de Evaluación de Desempeño

Trabajo de grado. Aplicación web Next.js que genera evaluaciones de desempeño
tipo Likert a partir de manuales de funciones, usando RAG (Retrieval-Augmented
Generation).

## Topología (dos servicios)

| Servicio | Stack | Responsabilidad |
|----------|-------|-----------------|
| **Esta app** (frontend + API) | Next.js 16, React 19, Prisma 7, Better Auth | UI, auth, base de datos, orquestación de evaluaciones |
| **Servicio RAG** (separado, del compañero) | FastAPI / Python, HuggingFace Space | Ingesta de manuales, generación de preguntas Likert vía Ollama + ChromaDB |

La app habla con el servicio RAG por HTTP, únicamente desde Server Actions
(nunca desde el navegador). Contrato real:
[`docs/DOCUMENTACION_API.md`](./docs/DOCUMENTACION_API.md).

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.9 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Datos | Prisma 7 (driver adapter `@prisma/adapter-pg`), PostgreSQL |
| Auth | Better Auth (Prisma adapter, email/password, roles ADMIN/HR/EMPLOYEE) |
| Validación | Zod 4 (entradas, salidas y respuestas RAG) |
| Formularios / fetching | TanStack Form, TanStack Query |
| Lint / formato | Biome 2.2.0 (sin ESLint ni Prettier) |
| Package manager | pnpm |

## Requisitos

- Node.js 22+
- pnpm
- Docker (para PostgreSQL local)

## Setup

```bash
pnpm install
cp .env.example .env        # y completa los valores (ver variables abajo)
docker compose up -d        # PostgreSQL local
pnpm exec prisma migrate dev
pnpm exec prisma db seed    # seed definido en prisma.config.ts (tsx prisma/seed.ts)
pnpm dev
```

### Variables de entorno

Copia `.env.example` a `.env` y completa **únicamente los nombres** listados
abajo (no copies valores de ningún `.env` ajeno):

| Variable | Propósito |
|----------|-----------|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (local Docker o Neon en prod) |
| `BETTER_AUTH_SECRET` | Secreto de firmado de sesiones (Better Auth lo lee de esta var) |
| `BETTER_AUTH_URL` | URL base de la app para cookies/redirects de auth |
| `RAG_SERVICE_URL` | URL del servicio RAG del compañero (HuggingFace Space) |
| `HF_TOKEN` | Token de HuggingFace para acceder al Space del RAG |

> Better Auth carga `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` automáticamente
> desde el entorno; no se referencian explícitamente en `src/`.

## Documentación

| Documento | Ruta |
|-----------|------|
| Arquitectura | [`docs/architecture.md`](./docs/architecture.md) |
| Modelo de datos (ERD) | [`docs/erd.md`](./docs/erd.md) |
| Contrato RAG **real** | [`docs/DOCUMENTACION_API.md`](./docs/DOCUMENTACION_API.md) |
| Contrato RAG **supercedido** (registro de diseño) | [`docs/rag-api-contract.md`](./docs/rag-api-contract.md) |
| Roadmap | [`docs/roadmap.md`](./docs/roadmap.md) |

## Verificación

```bash
pnpm lint        # biome check
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run (pnpm test:watch para modo watch)
```
