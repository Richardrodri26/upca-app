# RAG Service — Endpoints esperados por UPCA App

**Para**: Compañero de tesis (servicio RAG — FastAPI/Python)
**De**: UPCA App (Next.js)
**Fecha**: 2026-06-15
**Versión**: MVP v1

---

## Resumen

La app Next.js espera **3 endpoints** en el servicio RAG. Dos son críticos para el MVP (ingest y generate), el tercero (status) es necesario para el flujo de polling.

**Base URL**: `http://localhost:8000` (configurable via `RAG_SERVICE_URL`)

---

## 1. `POST /api/manuals/ingest` — Ingesta de manual

La app envía un manual de funciones (PDF) para que lo proceses (chunking, embeddings, indexado en ChromaDB).

### Request

```
POST /api/manuals/ingest
Content-Type: multipart/form-data
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | File (PDF) | ✅ | El archivo del manual de funciones |
| `positionName` | string | ✅ | Nombre del cargo (ej: "Desarrollador Senior") |
| `positionId` | string | ✅ | ID único del cargo en nuestra DB |

### Response — Éxito (200 OK)

```json
{
  "success": true,
  "externalRef": "rag-manual-abc123",
  "chunksCount": 42,
  "message": "Manual processed successfully"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | boolean | Siempre `true` |
| `externalRef` | string | **IMPORTANTE**: ID único que generás vos. La app lo guarda para referenciar el manual en futuras llamadas |
| `chunksCount` | number | Cantidad de chunks (informativo) |
| `message` | string | Descripción amigable |

### Response — Error (4xx/5xx)

```json
{
  "success": false,
  "message": "Descripción del error"
}
```

---

## 2. `POST /api/evaluations/generate` — Generar preguntas Likert

La app pide que generes preguntas de evaluación para un cargo, basándote en el manual previamente ingerido.

### Request

```
POST /api/evaluations/generate
Content-Type: application/json
```

```json
{
  "externalRef": "rag-manual-abc123",
  "positionName": "Desarrollador Senior",
  "questionCount": 15
}
```

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `externalRef` | string | ✅ | — | La referencia que devolviste en el ingest |
| `positionName` | string | ✅ | — | Nombre del cargo (contexto para el LLM) |
| `questionCount` | number | ❌ | 10 | Cuántas preguntas generar (máx 20) |

### Response — Éxito (200 OK)

```json
{
  "success": true,
  "generationTimeMs": 12450,
  "questions": [
    { "text": "El empleado demuestra dominio en las tecnologías requeridas para el cargo" },
    { "text": "El empleado colabora efectivamente con los miembros de su equipo" }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | boolean | Siempre `true` |
| `generationTimeMs` | number | **IMPORTANTE**: Tiempo real en ms que tardó la generación. Lo usamos para la métrica IRTO de la tesis |
| `questions` | array | Lista de preguntas generadas |
| `questions[].text` | string | Texto de la pregunta en español, estilo Likert |

### Response — Error (4xx/5xx)

```json
{
  "success": false,
  "message": "Manual not found or not yet processed"
}
```

---

## 3. `GET /api/manuals/:externalRef/status` — Estado de procesamiento

La app consulta si un manual ya terminó de procesarse. Se usa para polling cuando el ingest es asíncrono.

### Request

```
GET /api/manuals/{externalRef}/status
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `externalRef` | path | La referencia del ingest |

### Response — Éxito (200 OK)

```json
{
  "status": "ready",
  "message": "Manual indexed with 42 chunks"
}
```

| Campo | Tipo | Valores posibles |
|-------|------|-----------------|
| `status` | string | `"processing"` — todavía indexando<br>`"ready"` — listo para generate<br>`"error"` — falló el procesamiento |
| `message` | string | Descripción del estado actual |

### Response — No encontrado (404)

```json
{
  "success": false,
  "message": "Manual not found"
}
```

---

## Errores — Formato común

Todos los errores siguen esta forma:

```json
{
  "success": false,
  "message": "Descripción legible del error"
}
```

Códigos HTTP que esperamos:

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 400 | Bad Request (campos faltantes, formato inválido) |
| 404 | externalRef no encontrado |
| 413 | Archivo muy grande (>20MB) |
| 422 | Archivo corrupto o no procesable |
| 500 | Error interno |
| 503 | Servicio no disponible |

---

## Notas importantes

1. **`externalRef` es clave**: Es el identificador que une nuestros sistemas. La app lo guarda en la DB apenas recibe la respuesta del ingest. Después lo usa para generate y status.

2. **`generationTimeMs` es para la tesis**: Este número alimenta la métrica IRTO (Índice de Reducción de Tiempo Operativo). Medí el wall-clock time real de generación, no un valor hardcodeado.

3. **Las preguntas van en español**: Son para empleados que responden en español. El texto debe ser claro y adecuado para escala Likert (1-5).

4. **Sin autenticación por ahora**: Para el MVP local, no hace falta API key. Si deployamos a un entorno compartido, agregamos `X-API-Key` header.

5. **Formato de pregunta**: Cada pregunta es un objeto `{ "text": "..." }`. Sin categorías, sin dimensiones — es una lista plana. Las únicas "dimensiones" las asigna HR después, durante la revisión.

---

## Cómo probar

La app ya está configurada con `MOCK_RAG=true` en desarrollo, así que podemos trabajar en paralelo sin que tu servicio esté listo. Cuando quieras probar la integración real:

1. Levantá tu servicio en `http://localhost:8000`
2. Cambiá `MOCK_RAG=false` en el `.env` de la app
3. Reiniciá el servidor Next.js

El cliente HTTP está en `src/lib/rag-client.ts` por si querés ver exactamente cómo se llaman los endpoints.
