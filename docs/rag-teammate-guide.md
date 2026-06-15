# Guia para el Servicio RAG (FastAPI + Ollama + ChromaDB)

**Proyecto**: UPCA App (Trabajo de Grado)
**Destinatario**: Companero encargado del servicio RAG (FastAPI/Python)
**Fecha**: 2026-06-15

---

## Tabla de contenidos

1. [Resumen del Sistema](#1-resumen-del-sistema)
2. [Contrato API (resumen)](#2-contrato-api-resumen)
3. [Lo que el RAG debe devolver](#3-lo-que-el-rag-debe-devolver)
4. [Formato de preguntas Likert](#4-formato-de-preguntas-likert)
5. [Consideraciones para el Prompt Engineering](#5-consideraciones-para-el-prompt-engineering)
6. [Esquema JSON esperado](#6-esquema-json-esperado)
7. [Manejo de errores](#7-manejo-de-errores)
8. [Testing y desarrollo local](#8-testing-y-desarrollo-local)
9. [Metricas de la tesis](#9-metricas-de-la-tesis)
10. [Checklist para el companero](#10-checklist-para-el-companero)

---

## 1. Resumen del Sistema

El sistema completo se compone de dos servicios independientes que se comunican mediante REST API:

- **Aplicacion Next.js (frontend + backend):** se encarga de la autenticacion, gestion de usuarios, interfaz grafica y orquestacion general del flujo. Este servicio ya esta en desarrollo y es el que va a consumir tu API.
- **Servicio RAG (FastAPI/Python):** se encarga del procesamiento de documentos (manuales de cargo), la generacion de embeddings, el almacenamiento vectorial y la generacion de preguntas de evaluacion mediante LLM.

El stack tecnologico del servicio RAG es:

| Componente | Tecnologia |
|------------|------------|
| Framework web | FastAPI (Python) |
| LLM para generacion | Gemma4 (via Ollama) |
| Modelo de embeddings | qwen3-embedding (via Ollama) |
| Base de datos vectorial | ChromaDB |
| Formatos de entrada | PDF, DOCX |

El flujo general es el siguiente:

1. Un administrador sube un manual de cargo (PDF o DOCX) desde la app Next.js.
2. La app Next.js envia el archivo al servicio RAG para su procesamiento (ingestion).
3. El servicio RAG parsea el documento, lo divide en chunks, genera embeddings y los almacena en ChromaDB.
4. Cuando se solicita generar una evaluacion, la app Next.js pide al servicio RAG que genere preguntas Likert basadas en el contenido del manual.
5. El servicio RAG recupera los chunks relevantes de ChromaDB, los usa como contexto para Gemma4 y devuelve las preguntas generadas.

La comunicacion es simple: la app Next.js llama 3 endpoints en el servicio RAG. El servicio recibe las peticiones, realiza el procesamiento con su stack de RAG y devuelve las respuestas en JSON.

---

## 2. Contrato API (resumen)

Para la especificacion completa y formal del contrato, consultar `docs/rag-api-contract.md`. A continuacion se presenta un resumen rapido:

| Endpoint | Metodo | Proposito |
|----------|--------|-----------|
| `/api/manuals/ingest` | POST | Recibir archivo PDF/Word, procesarlo, dividirlo en chunks, generar embeddings e indexar en ChromaDB |
| `/api/evaluations/generate` | POST | Generar preguntas Likert a partir de un manual ya indexado |
| `/api/manuals/:externalRef/status` | GET | Consultar el estado de procesamiento de un manual |

---

## 3. Lo que el RAG debe devolver

### Para ingestion (`POST /api/manuals/ingest`)

El servicio debe recibir el archivo via `multipart/form-data` junto con los campos `positionName` y `positionId`. Debe devolver:

- **`externalRef`** (string): un identificador unico que el servicio RAG asigna internamente para referenciar el manual dentro de ChromaDB. Este ID es el que la app Next.js va a usar en todas las solicitudes posteriores relacionadas con ese manual.
- **`chunksCount`** (number): la cantidad de chunks que se generaron a partir del documento.

Formatos soportados obligatorios:

- **PDF** (`.pdf`)
- **DOCX** (`.docx`)

### Para generacion (`POST /api/evaluations/generate`)

El servicio debe recibir un JSON con `externalRef`, `positionName` y `questionCount`. Debe devolver:

- **`questions`**: un array de objetos, cada uno con:
  - `text` (string): el enunciado de la pregunta en espanol.
- **`generationTimeMs`** (number): tiempo en milisegundos que tomo la generacion completa (wall-clock time). Este valor es **CRITICO** para la metrica IRTO de la tesis, asi que debe medirse con precision.

Las preguntas deben cumplir con el formato Likert (ver seccion 4). Deben ser variadas y cubrir diferentes aspectos del cargo segun lo que aparezca en el manual (competencias tecnicas, habilidades blandas, responsabilidades, etc.), pero no necesitan una categoria explicita asignada.

**Ejemplo de pregunta correcta:**

> "El empleado demuestra dominio en las tecnologias requeridas para el cargo"

**Ejemplo de pregunta incorrecta:**

> "El empleado sabe programar?" -- Esta es una pregunta de si/no, no es formato Likert.

---

## 4. Formato de preguntas Likert

Las preguntas generadas son para evaluaciones de desempeno laboral. Una buena pregunta Likert para este contexto debe cumplir con las siguientes caracteristicas.

### Debe ser un enunciado, no una pregunta

- **Correcto:** "El empleado gestiona eficazmente los conflictos dentro de su equipo de trabajo"
- **Incorrecto:** "El empleado gestiona bien los conflictos?"

El evaluador lee la afirmacion y selecciona que tan frecuentemente el empleado cumple con lo que se describe.

### Debe ser evaluable en una escala

La escala tipica es:

| Valor | Etiqueta (opcion A) | Etiqueta (opcion B) |
|-------|---------------------|---------------------|
| 1 | Nunca | Totalmente en desacuerdo |
| 2 | Casi nunca | En desacuerdo |
| 3 | A veces | Ni de acuerdo ni en desacuerdo |
| 4 | Casi siempre | De acuerdo |
| 5 | Siempre | Totalmente de acuerdo |

### Debe relacionarse con competencias especificas del manual

Cada pregunta debe estar anclada a una competencia, habilidad o responsabilidad que aparezca en el manual de cargo procesado. No se deben inventar competencias que no esten en el documento.

### Debe ser clara, no ambigua, y en espanol profesional

- Evitar dobles negaciones.
- Evitar jerga informal.
- Cada enunciado debe evaluar una sola competencia (no combinar dos aspectos en un mismo item).

### Cantidad recomendada

- **10 a 15 preguntas** por evaluacion.
- Esto asegura cobertura adecuada sin sobrecargar al evaluador.

---

## 5. Consideraciones para el Prompt Engineering

Estas recomendaciones son para que el prompt que se le pase a Gemma4 genere preguntas de alta calidad de forma consistente.

### Incluir el nombre del cargo en el prompt

El nombre del puesto (por ejemplo, "Analista de Sistemas", "Gerente de Proyectos") debe ser parte del contexto del prompt. Esto ayuda al modelo a ajustar el nivel de especificidad de las preguntas.

### Usar los chunks recuperados como contexto de grounding

Los fragmentos relevantes del manual deben incluirse en el prompt como contexto. Esto es lo que hace que sea RAG y no generacion pura. Ejemplo de estructura:

```
Contexto del manual de cargo para el puesto "{positionName}":
---
{chunks recuperados de ChromaDB}
---

Instrucciones: ...
```

### Instruir al LLM a devolver JSON directamente

Incluir en el prompt una instruccion explicita de que la salida debe ser un JSON valido. Especificar la estructura esperada dentro del propio prompt para que el modelo la siga.

### Usar few-shot examples

Incluir 2-3 ejemplos de preguntas bien formuladas en el prompt para que el modelo entienda el patron esperado. Por ejemplo:

```
Ejemplo de salida esperada:
{
  "questions": [
    {
      "text": "El empleado demuestra dominio en las tecnologias requeridas para el cargo"
    },
    {
      "text": "El empleado comunica de manera efectiva los avances y obstaculos de sus tareas"
    }
  ]
}
```

### Temperatura recomendada

Usar un valor de temperatura entre **0.3 y 0.5**. Esto produce salidas consistentes y profesionales sin ser demasiado repetitivas. Valores mas altos tienden a generar enunciados mas creativos pero menos predecibles en formato.

---

## 6. Esquema JSON esperado

Estos son los esquemas exactos que la aplicacion Next.js espera recibir. La app valida las respuestas con Zod, asi que cualquier desviacion va a causar un error de validacion.

### Respuesta de ingestion (`POST /api/manuals/ingest`)

```json
{
  "success": true,
  "externalRef": "string",
  "chunksCount": 0,
  "message": "string"
}
```

### Respuesta de generacion (`POST /api/evaluations/generate`)

```json
{
  "success": true,
  "generationTimeMs": 0,
  "questions": [
    {
      "text": "string"
    }
  ]
}
```

### Respuesta de status (`GET /api/manuals/:externalRef/status`)

```json
{
  "status": "processing|ready|error",
  "message": "string"
}
```

El campo `status` solo puede tener uno de estos tres valores: `"processing"`, `"ready"` o `"error"`.

### Respuesta de error (todos los endpoints)

Cuando ocurre un error, todos los endpoints deben devolver esta estructura:

```json
{
  "success": false,
  "message": "string"
}
```

---

## 7. Manejo de errores

Todos los endpoints deben manejar errores de forma consistente. La regla general es: siempre devolver JSON, incluso cuando hay errores. Nunca devolver HTML, texto plano o respuestas vacias.

### Codigos HTTP esperados

| Codigo HTTP | Situacion |
|-------------|-----------|
| 400 | Input invalido (falta un campo requerido, formato de archivo no soportado, JSON malformado, etc.) |
| 404 | Manual no encontrado (el `externalRef` proporcionado no existe en ChromaDB) |
| 422 | Archivo no procesable (PDF corrupto, DOCX con formato inesperado, archivo encriptado, etc.) |
| 500 | Error interno del servidor (fallo de Ollama, error de ChromaDB, excepcion no manejada, etc.) |

### Recomendaciones adicionales

- Los mensajes de error deben estar en **espanol** para mantener consistencia con la interfaz del usuario final.
- Los mensajes deben ser descriptivos. Por ejemplo: `"El archivo proporcionado no es un PDF o DOCX valido"` en lugar de `"Error de formato"`.
- En caso de errores de Ollama (modelo no disponible, timeout, etc.), envolver el error con un mensaje claro: `"El servicio de generacion de lenguaje no esta disponible en este momento"`.

---

## 8. Testing y desarrollo local

### URL del servicio

La aplicacion Next.js va a llamar al servicio RAG en `http://localhost:8000` por defecto. Esta URL es configurable mediante la variable de entorno `RAG_SERVICE_URL` en el lado de Next.js, pero para desarrollo local lo mas simple es usar el puerto 8000.

### Endpoints mock para pruebas iniciales

Si se necesita probar la comunicacion entre ambos servicios antes de tener la pipeline RAG completa, se pueden crear endpoints mock que devuelvan respuestas hardcodeadas. Esto permite que ambos equipos avancen en paralelo. Ejemplo minimo en FastAPI:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/manuals/ingest")
async def mock_ingest():
    return {
        "success": True,
        "externalRef": "mock-ref-001",
        "chunksCount": 12,
        "message": "Documento procesado exitosamente"
    }

@app.post("/api/evaluations/generate")
async def mock_generate():
    return {
        "success": True,
        "generationTimeMs": 4500,
        "questions": [
            {
                "text": "El empleado demuestra dominio en las tecnologias requeridas para el cargo"
            },
            {
                "text": "El empleado comunica de manera efectiva los avances de sus tareas"
            }
        ]
    }

@app.get("/api/manuals/{external_ref}/status")
async def mock_status(external_ref: str):
    return {
        "status": "ready",
        "message": "El manual esta listo para generar evaluaciones"
    }
```

### CORS

Es imprescindible habilitar CORS para `http://localhost:3000` en el entorno de desarrollo. La app Next.js puede hacer llamadas al servicio RAG tanto desde el servidor (server-side) como desde el cliente durante desarrollo. El ejemplo de arriba ya incluye la configuracion de CORS necesaria.

---

## 9. Metricas de la tesis

La tesis tiene dos metricas clave que dependen directamente de la calidad del servicio RAG. Es importante entender que significan para priorizar correctamente el trabajo.

### IAP (Indice de Aceptacion de Preguntas)

- **Meta:** >= 80% de las preguntas generadas deben recibir una calificacion promedio >= 4.0/5.0 por parte de revisores de Recursos Humanos.
- **Dimensiones de evaluacion:** pertinencia, coherencia y adecuacion.
- **Implicacion practica:** la calidad de las preguntas generadas es lo que determina si la tesis es exitosa en este indicador. Cada pregunta mal formulada, ambigua o irrelevante baja este indice. Es preferible generar menos preguntas pero de mayor calidad.
- **Donde impacta el servicio RAG:** el prompt engineering, la calidad del chunking y la seleccion de chunks relevantes son los factores que mas influyen en esta metrica.

### IRTO (Indice de Reduccion de Tiempo Operativo)

- **Meta:** >= 60% de reduccion de tiempo respecto al proceso manual.
- **Implicacion practica:** si un profesional de RRHH tarda 45 minutos en redactar una evaluacion manualmente, el sistema debe hacerlo en significativamente menos tiempo (idealmente en segundos o pocos minutos).
- **Donde impacta el servicio RAG:** el campo `generationTimeMs` que devuelve el endpoint de generacion es la medicion directa de esta metrica. Debe ser un valor preciso de wall-clock time desde que se recibe la solicitud hasta que se tiene la respuesta lista. No excluir el tiempo de retrieval ni de post-procesamiento; debe ser el tiempo total de la operacion.

---

## 10. Checklist para el companero

Usar esta lista para rastrear el progreso de implementacion:

### Ingestion

- [ ] `POST /api/manuals/ingest` -- aceptar `multipart/form-data` con los campos `file`, `positionName`, `positionId`
- [ ] Parsear archivos PDF
- [ ] Parsear archivos DOCX
- [ ] Dividir documentos en chunks logicos (por secciones, parrafos o una estrategia hibrida)
- [ ] Generar embeddings con qwen3-embedding via Ollama
- [ ] Almacenar embeddings en ChromaDB con `positionId` como metadata
- [ ] Devolver `externalRef` y `chunksCount` en la respuesta

### Generacion

- [ ] `POST /api/evaluations/generate` -- aceptar JSON con `externalRef`, `positionName`, `questionCount`
- [ ] Recuperar chunks relevantes de ChromaDB usando `externalRef`
- [ ] Generar preguntas Likert via Gemma4 con prompt engineering adecuado
- [ ] Medir y devolver `generationTimeMs` con precision

### Status

- [ ] `GET /api/manuals/:externalRef/status` -- devolver estado de procesamiento (`processing`, `ready`, `error`)

### Transversales

- [ ] Manejo de errores consistente con respuestas JSON en todos los endpoints
- [ ] Codigos HTTP apropiados (400, 404, 422, 500)
- [ ] Mensajes de error descriptivos en espanol
- [ ] Configuracion de CORS para `http://localhost:3000`
