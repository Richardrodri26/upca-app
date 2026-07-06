# Decisión: Knowledge Base vs Manuals — coexistencia de los dos flujos de carga de manuales

> **Spike plan 011.** Documento de decisión — no code. El operador revisa y
> acepta o pisa la recomendación. Fecha: 2026-07-05.

## Nota de drift

El plan 011 se escribió mientras la feature **knowledge-base estaba SIN
commitear**. El feature **ya está commiteado** en `a2f83f1`
(`feat(knowledge-base): RAG-backed cargo CRUD + integrates generator/manuals`)
y el plan 008 consolidó el sync helper en `945ef64`. El drift caveat del plan
**ya no aplica** — los dos flujos están tal cual los describe el plan, más el
helper unificado. `git status --short src/features/knowledge-base
src/features/manuals` vuelve limpio.

## 1. Contexto

### Flujo Manuals (`/manuals`)
`src/features/manuals/` + `src/app/(dashboard)/manuals/page.tsx`. HR ve la
tabla de filas `Manual` (`getManuals`, `actions.ts:19-37`) con badge de estado
(`manual-status-badge.tsx`). El botón **"Registrar Manual"** abre
`UploadDialog` (`upload-dialog.tsx`) que lista **Positions sin manual**
(`getPositionsWithoutManual`, `actions.ts:9-17`) y, al confirmar, llama
`registerManual(positionId)` (`actions.ts:39-99`): crea una fila `Manual` en
`PENDING`, consulta `getCargos()` al RAG, verifica que `position.name` exista
case-insensitivamente en el índice RAG, y pasa la fila a `PROCESSED` con
`externalRef = position.name` — o a `ERROR` si no está indexado. Es el flujo
"el compañero ya subió el PDF al RAG out-of-band; yo lo vinculo acá". El botón
**"Sincronizar con RAG"** dispara `syncManualsWithRag` (`actions.ts:101-110`)
→ `syncWithRag()` (`src/lib/rag-sync.ts`) que itera `getCargos()` y llama
`syncPositionAndManual` por cada cargo. `deleteManual` (`actions.ts:112-138`)
borra la fila `Manual` (bloquea si hay evaluaciones ACTIVE/REVIEW) pero **no
toca el RAG**.

### Flujo Knowledge Base (`/knowledge-base`)
`src/features/knowledge-base/` + `src/app/(dashboard)/knowledge-base/page.tsx`.
HR ve la lista de cargos indexados en RAG (`getKnowledgeBaseCargos` →
`getCargos()`) con badge "Vinculado al sistema" / "Solo en RAG" calculado
contra `Manual.externalRef` (`page.tsx:6-18`). **"Agregar Cargo"** abre
`UploadCargoDialog` (`upload-cargo-dialog.tsx`): upload PDF/DOCX →
`procesarDocumento` (`actions.ts:22-60`) pide al RAG que lo pase a markdown →
el usuario revisa/edita el markdown → `guardarCargo` (`actions.ts:62-99`) llama
`guardarCargoRAG` (indexa en ChromaDB) y luego **best-effort** sincroniza la
DB local con `syncPositionAndManual` (`actions.ts:82-92`). El fallo de sync
**ya no se traga**: se captura en `syncWarning` y se devuelve al cliente
— pero **`UploadCargoDialog` no lo muestra** (`upload-cargo-dialog.tsx:99-109`
sólo mira `result.success`/`result.error`). **"Ver / Editar"** abre
`ViewEditCargoDialog` que recupera el markdown vía `obtenerContenidoCargo` y
al guardar reusa `guardarCargo`. **"Eliminar"** llama `eliminarCargo`
(`actions.ts:110-152`): bloquea si hay evaluaciones ACTIVE/REVIEW sobre el
`manual.externalRef`, borra del RAG, y best-effort borra la fila `Manual` local
(mismo patrón de `syncWarning` no surfaced).

### Dependencia del flujo de generación de evaluaciones
`getPositionsWithProcessedManual` (`features/evaluations/actions.ts:56-69`)
consulta `Position` con `manual.status = PROCESSED` y lo consume
`/evaluations/generate` (`page.tsx:24,38`) y `features/evaluations/queries.ts`.
`generateEvaluation` (`actions.ts:75-96`) valida `position.manual.status ===
"PROCESSED"` antes de llamar al RAG y crea la `Evaluation` contra
`manualId`. **La generación depende de la fila `Manual` PROCESSED, NO de la
página `/manuals`** — cualquier opción que preserve la escritura de filas
`Manual` PROCESSED vía `syncPositionAndManual` deja la generación intacta.

### Sidebar
`src/components/dashboard/app-sidebar.tsx:25-32` — ambos items conviven bajo
`adminHrItems`: `"Manuales" → /manuals` y `"Base de Conocimientos" →
/knowledge-base`. Costo actual de UX: dos entradas para "lo mismo" (cargar un
manual), modelo mental duplicado.

### Helper unificado (plan 008)
`src/lib/position-manual-sync.ts` — `syncPositionAndManual` es el **único**
punto del codebase que hace el find-or-create case-insensitive de `Position` +
`Manual` PROCESSED. Lo llaman: `guardarCargo` (`actions.ts:83`) y el loop de
`syncWithRag` (`rag-sync.ts:35`). El bug que arregló (drift de mayúsculas →
`Position` duplicada) es real; cualquier opción **debe** seguir usándolo y no
reintroducir find-or-create inline.

## 2. Opciones

### A. KB reemplaza Manuals
`/manuals` se retira; la fila `Manual` pasa a ser detalle de implementación
sincronizado desde RAG. KB cubre los dos casos: **(a) subir+procesar+guardar**
(`UploadCargoDialog` actual) y **(b) "vincular cargo ya indexado"** (caso
hoy cubierto por `registerManual`: el RAG ya tiene el cargo, sólo hay que
crear `Position`+`Manual` local) — basta una acción nueva en KB que llame
`syncPositionAndManual(cargoName)` sin upload. **Costos**: (1) rework de
consumers de `/manuals` — sólo `getPositionsWithoutManual` y
`registerManual` se quedan sin UI; `getPositionsWithProcessedManual` se
preserva intacto; (2) migrar el botón "Sincronizar con RAG" (bulk) a KB; (3)
redirect de `/manuals` → `/knowledge-base` por una release. **Beneficio**:
una sola entrada de menú, un solo modelo mental, una sola feature dir.

### B. Manuals absorbe KB
El wizard upload→review→save de KB se muda a `features/manuals/` como la
path de upload; `/knowledge-base` se retira. **Costos**: (1) `manuals/`
pasa a contener tanto el wizard de upload+IA (pesado, RAG-céntrico) como la
tabla registro + "registrar ya indexado" — la feature dir se vuelve híbrida
y grande; (2) el nombre "Manuales" deja de describir la realidad (el source
of truth es el RAG, no la fila `Manual`); (3) hay que mover
`UploadCargoDialog`, `ViewEditCargoDialog`, `CargosRagTable`,
`mutations.ts` y las 5 actions de KB. **Beneficio**: una sola entrada. Pero
el costo semántico es mayor que A: "Manuales" absorbe un concepto (RAG store)
que no le es natural.

### C. Ambos quedan, roles split
KB = gestión documental / contenido RAG (upload, view/edit, delete del RAG).
Manuals = vista registro app-side (read-only + botón sync). **Costos**: (1)
modelo mental duplicado **permanente** — "¿dónde cargo un manual?" sigue
siendo ambigua; (2) necesidad de una regla explícita de qué flujo crea
`Position` (hoy ambos pueden, vía `syncPositionAndManual`); (3) dos sidebar
entries para el mismo concepto para siempre; (4) drift de UI/estado entre la
tabla `Manual` (DB) y la tabla cargos (RAG) que el usuario debe reconciliar
mentalmente. **Beneficio**: zero migration cost hoy. Pero congela la
deuda.

## 3. Recomendación: **A — KB reemplaza Manuals**

KB ya cubre el flujo completo (upload→procesar→revisar→guardar→CRUD sobre
RAG) y el caso "cargo ya indexado en RAG" se reduce a una acción secundaria
que llama al mismo `syncPositionAndManual`, sin segundo feature. La
generación de evaluaciones depende de `getPositionsWithProcessedManual`
(Position + fila `Manual` PROCESSED), **no** de la página `/manuals`, así
que retirar la UI de Manuals no rompe ningún consumer real — sólo
`getPositionsWithoutManual` y `registerManual` pierden UI, y ambos se
reemplazan por la nueva acción "Vincular cargo ya indexado" en KB. El
helper `syncPositionAndManual` del plan 008 queda como **único** punto de
creación, que es justo la invariant que 008 buscaba consolidar. La opción C
congela la deuda de modelo mental; la opción B cuesta más migración
semántica que A y produce un "Manuales" que ya no significa manuales. A es
la opción de menor costo total y la única que cierra la ambigüedad de HR.

### Follow-up code tasks (cada uno → futuro plan)

- Agregar acción "Vincular cargo ya indexado" en KB (`syncPositionAndManual`
  sin upload) que reemplace `registerManual`.
- Surfear `syncWarning` en `UploadCargoDialog` y `ViewEditCargoDialog` tras
  guardar (follow-up explicit del plan 008 cuya timing dependía de este
  spike).
- Mover el botón "Sincronizar con RAG" (bulk `syncWithRag`) a la página KB.
- Retirar `/manuals` (route + sidebar entry) y agregar redirect
  `/manuals → /knowledge-base`.
- Remover `features/manuals/` (acciones `registerManual`, `getManuals`,
  `getPositionsWithoutManual`, `deleteManual`, `syncManualsWithRag`,
  components, mutations, queries) — o migrar lo que reutilice KB.
- Auditar callers de `getPositionsWithoutManual` / `registerManual` /
  `deleteManual` fuera de `features/manuals/` antes de borrar.
- Decidir política de `department` (ver §5) y, según decisión, agregar paso
  "departamento" al wizard de KB o un job de reconciliación.
- Cambiar `syncPositionAndManual` para que escriba `department: null` (no
  la string `"Sin departamento"`) y migrar filas existentes con esa string
  a `null`.
- Actualizar `docs/roadmap.md` para mencionar KB como entrada canónica de
  cargos/manuales.

## 4. Implicaciones para el plan 008

Bajo la recomendación A **sobreviven**:

- `src/lib/position-manual-sync.ts` — `syncPositionAndManual` sigue siendo
  el **único** punto de creación de `Position`+`Manual` PROCESSED. Tanto
  `guardarCargo` como el bulk loop de `syncWithRag` lo siguen llamando.
- `src/lib/rag-sync.ts` — `syncWithRag` sobrevive, repurposeado como
  acción "Sincronizar todo" dentro de KB (en vez de botón en `/manuals`).
- El contrato "todo camino de cargo pasa por el helper" se refuerza: la
  nueva acción "Vincular cargo ya indexado" también lo llama.

**No sobrevive**:

- `registerManual` (`features/manuals/actions.ts:39-99`) — su lógica inline
  de "crear `Manual` PENDING → verificar en RAG → pasar a `PROCESSED`/`ERROR`"
  se reemplaza por `syncPositionAndManual` directo (que ya hace find-or-create
  case-insensitive y marca `PROCESSED`). La verificación "existe en RAG" se
  mantiene pero como un guard previo (`getCargos().includes(cargo)`) en la
  nueva acción KB, no como creación-then-flip.
- `deleteManual` (`features/manuals/actions.ts:112-138`) — se reemplaza por
  `eliminarCargo` de KB, que ya hace el bloqueo de evaluaciones + borrado
  RAG + borrado DB best-effort. Hoy `deleteManual` **sólo borra la fila DB**
  (no toca RAG) — es un comportamiento inconsistente que A elimina.
- `getManuals` y `getPositionsWithoutManual` pierden su UI consumer; se
  evalúa caso por caso si KB las reusa (p.ej. `getKnowledgeBaseCargos`
  ya cubre el listado) o se borran.

El follow-up de plan 008 "surfear `syncWarning` en el diálogo" **se
transfiere** a la lista de follow-ups de A arriba — su timing ya no es
independiente: va atado al redesign del diálogo KB.

## 5. Decisión pendiente del equipo — política de `department`

`syncPositionAndManual` (`position-manual-sync.ts:32-35`) crea `Position` con
`department: "Sin departamento"` (string literal, **no** `null`) cuando el
cargo no existe previamente. El formulario de positions
(`features/positions/components/position-form.tsx:105-120` +
`lib/validators/position.ts:12-17`) tiene `department` **opcional** (string
max 100, no requerido) — el plan lo describía como "requiere un departamento
real", pero en realidad el schema lo permite vacío. El problema real es otro:
el helper escribe la **string** `"Sin departamento"`, que **contamina el
dropdown de filtro por departamento** de `/positions`
(`features/positions/actions.ts:71-78` lo lista vía `distinct("department")`)
apareciendo como un departamento falso.

El equipo debe decidir **quén llena el departamento real y cuándo**:

- **(i)** HR lo completa después vía el CRUD de positions (flujo reactivo,
  deuda visible en la tabla).
- **(ii)** Agregar un campo "departamento" al wizard de `UploadCargoDialog`
  antes de guardar, pasado a `syncPositionAndManual` como arg nuevo.
- **(iii)** Un job/listado de reconciliación "Positions con departamento
  pendiente" que HR triaga.

Recomendación técnica (no vinculante): combinar **(ii) + cambiar el helper a
`department: null`** + migrar las filas existentes `"Sin departamento"` a
`null`. `null` no aparece en el dropdown de departments
(`where: { department: { not: null } }` en `actions.ts:73`), así la deuda
queda silenciada en la UI sin negar que existe. La opción (i) sola no resuelve
la contaminación del dropdown; la (iii) es útil como red de seguridad pero no
como flujo principal. Esta decisión es **del equipo** y bloquea el follow-up
"agregar paso departamento al wizard" del §3.
