# Decisión: Knowledge Base vs Manuals — coexistencia de los dos flujos de carga de manuales

> **Spike plan 011.** Documento de decisión — no code. El operador revisa y
> acepta o pisa la recomendación. Fecha: 2026-07-05. **Re-escrito
> 2026-07-06**: la recomendación original (Opción A) fue reemplazada por
> Opción C por decisión del operador — ver `.bak` para la versión original.

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
KB = gestión documental / contenido RAG (upload, view/edit, save, delete del
RAG store); es la superficie canónica de creación de `Position`. Manuals =
vista registro app-side **read-only** (lista de filas `Manual` + badge de
estado + botón "Sincronizar con RAG" bulk); pierde la UI "Registrar Manual"
per-position y su path inline de find-or-create de `Position`. **Costos**:
(1) modelo mental duplicado **permanente** — "¿dónde cargo un manual?" se
responde por convención (KB escribe, Manuals lee+sync), no por unificación;
(2) necesidad de una regla explícita "sólo KB crea Positions vía
`syncPositionAndManual`" (§3); (3) dos sidebar entries para el mismo concepto
para siempre; (4) drift de UI/estado entre la tabla `Manual` (DB) y la tabla
cargos (RAG) que el usuario debe reconciliar mentalmente. **Beneficio**: zero
migration cost hoy; ambas surfaces siguen funcionando sin tocar rutas ni
mover consumers; la invariant del helper del plan 008 se preserva y se
documenta.

## 3. Recomendación: **C — Ambos quedan, roles split**

KB cubre el flujo completo de gestión documental sobre el RAG
(upload→procesar→revisar→guardar→CRUD) y Manuals ya tiene la tabla registro +
el botón bulk de sync — reusar lo que existe cuesta cero migración hoy y evita
redirigir rutas o mover consumers. La regla operativa que desambigua
"¿dónde cargo un manual?" es: **KB es la superficie de escritura** (upload,
edit, save, delete del RAG store) y **Manuals es la vista read-only** (lista +
badge de estado + botón "Sincronizar con RAG" bulk); se quita la UI "Registrar
Manual" per-position. **Sólo KB crea Positions vía `syncPositionAndManual`**
— Manuals deja de tener su propio path find-or-create de `Position`
(`registerManual` se simplifica o depreca, ver §4). La generación de
evaluaciones depende de `getPositionsWithProcessedManual` (Position + fila
`Manual` PROCESSED), **no** de la página `/manuals`, así que volver Manuals
read-only no rompe ningún consumer. C sí congela la deuda de modelo mental
(dos sidebar entries para el mismo concepto), pero la acota a una regla clara
—un solo escritor de Positions— y deja ambas surfaces funcionando sin tocar
rutas.

### Follow-up code tasks (cada uno → futuro plan)

- Conservar los flujos de escritura de KB (upload, edit, save, delete) como
  el path canónico de creación de Positions.
- Convertir `/manuals` en READ-ONLY: lista de filas `Manual` + badge de
  estado + botón "Sincronizar con RAG" (bulk). Remover la UI "Registrar
  Manual" (el flujo per-position de crear `Manual` PENDING).
- Simplificar `registerManual`: dropear su find-or-create de Position; o
  delegar al helper `syncPositionAndManual` para el caso "cargo ya en RAG", o
  deprecarla (decidir cuál y explicar).
- Surfear `syncWarning` devuelto por `guardarCargo` en `UploadCargoDialog` y
  `ViewEditCargoDialog` (follow-up del plan 008 ahora scopeado a flujos de KB
  únicamente).
- Agregar documentación explícita en código: un comentario en
  `src/lib/position-manual-sync.ts` con el texto "this is the ONLY sanctioned
  Position create path; Manuals must NOT inline its own."
- Decidir política de `department` (ver §5): agregar paso "departamento" al
  wizard de KB O un script de reconciliación que busque filas con
  `department="Sin departamento"` y prompting/derive el valor correcto.
- Actualizar `docs/roadmap.md` para mencionar KB y Manuals como surfaces
  coexistentes con roles split (dominio doc-fix del plan 006).

## 4. Implicaciones para el plan 008

Bajo la recomendación C **sobreviven**:

- `src/lib/position-manual-sync.ts` — `syncPositionAndManual` sigue siendo el
  **único** punto del codebase que hace find-or-create case-insensitive de
  `Position` + `Manual` PROCESSED. Lo siguen llamando: `guardarCargo` (KB,
  `actions.ts:83`) y el bulk loop de `syncWithRag` (`rag-sync.ts:35`).
- `src/lib/rag-sync.ts` — `syncWithRag` sobrevive como motor del botón
  "Sincronizar con RAG" que **se queda en `/manuals`** (acción bulk read-only
  a nivel UI). El helper que invoca es el mismo que usa KB al guardar.
- El contrato "todo camino de cargo pasa por el helper" se **refuerza**: KB
  write flows + bulk sync lo llaman; Manuals pierde su path inline.

**Se simplifica / pierde lógica**:

- `registerManual` (`features/manuals/actions.ts:39-99`) — **pierde su
  find-or-create de Position**. Su lógica inline "crear `Manual` PENDING →
  verificar en RAG → pasar a `PROCESSED`/`ERROR`" ya no puede crear
  `Position`. Dos caminos: **(a) delegar** al helper
  `syncPositionAndManual(cargoName)` cuando el cargo ya está indexado en RAG
  (el helper hace find-or-create + marca `PROCESSED`), dejando a
  `registerManual` como thin wrapper que sólo valida "existe en RAG"
  (`getCargos().includes(cargo)`) antes de llamarlo; o **(b) deprecar**
  `registerManual` y mover el caso "cargo ya indexado" a una acción nueva en
  KB que también llama al helper. El equipo decide en el follow-up de §3. En
  cualquiera de los dos casos, Manuals **no** inlinea su propio find-or-create
  — cumple la invariant del plan 008. Lo que `registerManual` **sí** puede
  seguir haciendo es flippear filas `Manual` existentes a `PROCESSED` cuando
  un cargo ya aparece en RAG — pero **sin crear `Position`**: llama al helper
  o se niega.
- `getManuals` y la tabla `Manual` se **preservan** como vista read-only (la
  fila `Manual` sigue siendo el registro app-side del estado de
  sincronización por cargo).
- `getPositionsWithoutManual` pierde sentido en Manuals read-only (ya no hay
  "registrar manual a un position sin manual" desde esa UI) — se evalúa si KB
  la reusa o se borra.
- `deleteManual` (`features/manuals/actions.ts:112-138`) — bajo C **se remueve
  de la UI** de Manuals (read-only no borra); el borrado queda en KB vía
  `eliminarCargo`, que ya hace bloqueo de evaluaciones + borrado RAG + borrado
  DB best-effort. La función puede quedarse como interna o borrarse.

**Caminos de sync que sobreviven**: (1) `guardarCargo` (KB) →
`syncPositionAndManual` best-effort al guardar un cargo; (2) `syncWithRag`
bulk loop (botón en `/manuals`) → `syncPositionAndManual` por cada cargo del
RAG. Ambos pasan por el helper; no se reintroduce find-or-create inline en
ningún lado.

> **Nuance a flaggear (posible contradicción)**: la regla del §3 "sólo KB
> crea Positions vía `syncPositionAndManual`" es una convención a nivel UX
> (KB es la superficie de creación canónica). A nivel código, el botón bulk
> "Sincronizar con RAG" hosteado en Manuals **también** termina creando
> Positions — pero lo hace vía el helper compartido, no vía un path inline
> propio. Si el equipo quiere que ni siquiera el bulk sync cree Positions,
> habría que mover el botón a KB o hacer que `syncWithRag` sólo flipee filas
> `Manual` existentes sin crear `Position` nuevas (cambio mayor, fuera de
> scope de C). Se deja documentado para que el equipo lo confirme.

## 5. Decisión pendiente del equipo — política de `department`

`syncPositionAndManual` (`position-manual-sync.ts:32-35`) crea `Position` con
`department: "Sin departamento"` (string literal, **no** `null`) cuando el
cargo no existe previamente. El formulario de positions
(`features/positions/components/position-form.tsx:105-120` +
`lib/validators/position.ts:12-17`) tiene `department` **opcional** (string
max 100, no requerido). El problema real: el helper escribe la **string**
`"Sin departamento"`, que **contamina el dropdown de filtro por departamento**
de `/positions` (`features/positions/actions.ts:71-78` lo lista vía
`distinct("department")`) apareciendo como un departamento falso.

El equipo debe decidir **quién llena el departamento real y cuándo**:

- **(i)** HR lo completa después vía el CRUD de positions (flujo reactivo,
  deuda visible en la tabla).
- **(ii)** Agregar un campo "departamento" al wizard de `UploadCargoDialog`
  (KB) antes de guardar, pasado a `syncPositionAndManual` como arg nuevo.
- **(iii)** Un job/listado de reconciliación "Positions con departamento
  pendiente" que HR triage.

Bajo la Opción C esta pregunta **sigue abierta**: el placeholder
`"Sin departamento"` escrito por KB sigue ahí hasta que se construya un paso
wizard (ii) o un job de reconciliación (iii). Recomendación técnica (no
vinculante): combinar **(ii) + cambiar el helper a `department: null`** +
migrar las filas existentes `"Sin departamento"` a `null`. `null` no aparece
en el dropdown (`where: { department: { not: null } }` en `actions.ts:73`),
así la deuda queda silenciada en la UI sin negar que existe. Esta decisión es
**del equipo** y bloquea el follow-up "agregar paso departamento al wizard"
del §3.
