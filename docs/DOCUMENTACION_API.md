# Guía de Referencia de Integración de la API REST

Esta documentación está diseñada para desarrolladores que deseen consumir la API REST del **Agente de Recursos Humanos** (agente_rh) desde cualquier aplicación frontend (React, Next.js, Angular, aplicaciones móviles o scripts externos).

La API está construida con **FastAPI** y cuenta con endpoints para consultar perfiles de cargos oficiales, invocar el agente cognitivo de **LangGraph** para la generación de cuestionarios de desempeño basados en la base de datos de vectores, y administrar el ciclo de vida (CRUD) de la base de conocimientos.

---

## 🔒 Autenticación (Hugging Face Spaces)

Si la API está alojada en un Hugging Face Space Privado, todas las solicitudes HTTP deben incluir un token de lectura personal en las cabeceras.

### Cabecera de Autenticación Requerida:
```http
Authorization: Bearer hf_TuTokenDeLecturaPersonalAqui
Content-Type: application/json
```

---

## 🏗️ Catálogo de Endpoints

### 1. Obtener Lista Oficial de Cargos
Retorna un listado de todos los cargos cuyos manuales de funciones oficiales han sido cargados e indexados en el sistema.

* **Ruta:** `/api/cargos`
* **Método:** `GET`
* **Cabeceras:** `Content-Type: application/json` y `Authorization` (si aplica)
* **Cuerpo de la Petición:** Vacío.

#### Ejemplo de Respuesta Exitosa (HTTP 200 OK):
```json
{
  "cargos": [
    "Analista QA",
    "Coordinador de Desarrollo",
    "Desarrollador Backend Junior",
    "Desarrollador Backend Senior"
  ]
}
```

---

### 2. Generar Cuestionario de Evaluación
Genera un cuestionario de desempeño en escala Likert de 1 a 5 para un cargo específico, aplicando el enfoque técnico o de negocio suministrado.

* **Ruta:** `/api/evaluacion/generar`
* **Método:** `POST`
* **Cuerpo de la Petición (JSON):**
  * `cargo` *(String, Requerido)*: El nombre exacto del cargo a evaluar (debe coincidir con uno de los devueltos por `/api/cargos`).
  * `enfoque` *(String, Opcional)*: El enfoque o pilar sobre el cual se construirán las preguntas. Valor por defecto: `"Desempeño general de funciones y responsabilidades"`.

#### Ejemplo de Cuerpo de Petición (JSON):
```json
{
  "cargo": "Analista QA",
  "enfoque": "Trabajo bajo presión, metodologías ágiles y aseguramiento de la calidad en producción"
}
```

#### Ejemplo de Respuesta Exitosa (HTTP 200 OK):
```json
{
  "cargo": "Analista QA",
  "enfoque": "Trabajo bajo presión, metodologías ágiles y aseguramiento de la calidad en producción",
  "preguntas": "### Cuestionario de Evaluación de Desempeño...\nPreguntas en escala Likert de 1 a 5 con justificación..."
}
```

---

### 3. Procesar Documento Binario (Nuevo)
Recibe un documento de manual de funciones físico en formato **PDF** o Word (**`.docx`**), extrae su texto crudo en memoria y lo estructura a través del LLM, proponiendo una plantilla de Markdown oficial de CS3 con YAML frontmatter listo para revisión humana.

* **Ruta:** `/api/base_conocimiento/procesar`
* **Método:** `POST`
* **Content-Type:** `multipart/form-data`
* **Parámetros de Cuerpo (Form Data):**
  * `file` *(File, Requerido)*: El archivo físico `.pdf` o `.docx` en formato binario.

#### Ejemplo de Respuesta Exitosa (HTTP 200 OK):
```json
{
  "cargo_identificado": "Desarrollador Backend Junior",
  "archivo_sugerido": "desarrollador_backend_junior.md",
  "markdown_propuesto": "---\ncargo: \"Desarrollador Backend Junior\"\nhoja_origen: \"MANUAL DE FUNCIONES\"\n---\n\n# Manual de Funciones: Desarrollador Backend Junior..."
}
```

---

### 4. Guardar o Actualizar Cargo (Nuevo)
Guarda permanentemente un contenido Markdown en el disco del servidor (`cargos/`) y desencadena de manera síncrona e incremental la vectorización y actualización de ChromaDB. Si el archivo ya existía, calcula su firma hash para evitar duplicados y actualizar los registros antiguos.

* **Ruta:** `/api/base_conocimiento/guardar`
* **Método:** `POST`
* **Cuerpo de la Petición (JSON):**
  * `nombre_archivo` *(String, Requerido)*: El nombre del archivo sugerido (ej: `analista_qa.md`).
  * `contenido_markdown` *(String, Requerido)*: El contenido completo del manual de funciones estructurado en formato Markdown.

#### Ejemplo de Cuerpo de Petición (JSON):
```json
{
  "nombre_archivo": "desarrollador_backend_junior.md",
  "contenido_markdown": "---\ncargo: \"Desarrollador Backend Junior\"\nhoja_origen: \"MANUAL\"\n---\n\n# Manual de Funciones: Desarrollador Backend Junior\n..."
}
```

#### Ejemplo de Respuesta Exitosa (HTTP 200 OK):
```json
{
  "mensaje": "Base de conocimientos actualizada exitosamente de forma incremental.",
  "archivo_guardado": "desarrollador_backend_junior.md",
  "ruta_completa": "C:\\Users\\...\\cargos\\desarrollador_backend_junior.md"
}
```

---

### 5. Obtener Contenido de un Cargo Existente (Nuevo)
Recupera el contenido original en Markdown de un cargo específico registrado en la base de conocimientos.

* **Ruta:** `/api/base_conocimiento/contenido`
* **Método:** `GET`
* **Parámetros de Consulta (Query):**
  * `cargo` *(String, Requerido)*: El nombre oficial del cargo registrado.

#### Ejemplo de Respuesta Exitosa (HTTP 200 OK):
```json
{
  "nombre_archivo": "analista_qa.md",
  "contenido_markdown": "---\ncargo: \"Analista QA\"\nhoja_origen: \"ANALISTA QA\"\n---\n\n# Manual de Funciones: Analista QA\n..."
}
```

---

### 6. Eliminar Cargo de la Base de Conocimientos (Nuevo)
Elimina físicamente el archivo del manual de funciones de la carpeta `cargos/` del servidor y purga de manera incremental y síncrona todos los vectores asociados en ChromaDB, asegurando que el cargo desaparezca inmediatamente de la lista elegible.

* **Ruta:** `/api/base_conocimiento/eliminar`
* **Método:** `DELETE`
* **Parámetros de Consulta (Query):**
  * `cargo` *(String, Requerido)*: El nombre oficial del cargo que se desea eliminar.

#### Ejemplo de Respuesta Exitosa (HTTP 200 OK):
```json
{
  "mensaje": "El cargo 'Cargo de Prueba API' fue eliminado exitosamente del disco y de ChromaDB.",
  "archivo_eliminar": "cargo_de_prueba_api.md"
}
```

---

## 🚦 Códigos de Respuesta y Manejo de Errores

* **HTTP 200 OK:** Solicitud procesada correctamente.
* **HTTP 400 Bad Request:** 
  * El cargo solicitado no está registrado.
  * Extensión de archivo no soportada (solo `.pdf` y `.docx`).
  * El documento cargado en memoria está vacío.
* **HTTP 401 Unauthorized:** Cabecera de autenticación faltante o token de Hugging Face inválido.
* **HTTP 404 Not Found:** El cargo solicitado o su archivo asociado no existe en el disco.
* **HTTP 422 Unprocessable Entity:** El cuerpo JSON enviado no cumple con los formatos de tipo definidos en el esquema.
* **HTTP 500 Internal Server Error:** Ocurrió un error al leer/escribir en el disco, o en la indexación/limpieza de ChromaDB, o en la generación por LLM.

---

## 📝 Nota sobre Codificación (UTF-8)
Todas las operaciones de escritura y lectura de archivos en la API están forzadas bajo el estándar de codificación **`utf-8`**, garantizando el soporte nativo libre de corrupción para acentos, diéresis y la letra `ñ` tanto en plataformas Windows como en contenedores de producción basados en Linux.
