# Responsive Design Implementation Plan

## Status: PROPOSED — planning only, no code changed yet

**Tipo**: Plan cross-cutting (no es una fase numerada del roadmap; toca todas las fases 1-6 ya completadas)
**Fecha**: 2026-07-08
**Depende de**: Nada (trabajo de UI puro sobre código ya existente)

---

## 1. Summary / Goal

El área autenticada (`src/app/(dashboard)/`) fue construida sin pensar en viewports angostos: la mayoría de las páginas usan filas `flex` sin `flex-wrap`, tablas TanStack Table sin fallback para mobile, y grids de formulario a 2 columnas fijas. El objetivo de este plan es hacer que todo el flujo HR/ADMIN/EMPLOYEE sea usable en viewports desde 360px (celular chico) hasta desktop, sin romper el layout actual en breakpoints grandes.

Este plan es **solo de planificación**. No se debe implementar nada de lo aquí descrito hasta que un humano lo revise y apruebe.

Hallazgo importante que cambia el alcance esperado: el **shell de navegación (sidebar) ya es responsive**. `src/components/ui/sidebar.tsx` es el primitivo shadcn/Base UI estándar y ya reemplaza el sidebar fijo por un `Sheet` deslizable cuando `useIsMobile()` (`src/hooks/use-mobile.ts`, breakpoint 768px) detecta mobile. `AppSidebar` (`src/components/dashboard/app-sidebar.tsx`) y `DashboardClientLayout` (`src/components/dashboard/dashboard-client-layout.tsx`) ya consumen ese patrón correctamente. **No hace falta construir un drawer de navegación desde cero** — el trabajo real está en el contenido de cada página (tablas, filtros, headers, grids).

Tampoco existen gráficos/charts en el proyecto (no hay `recharts`, `chart.js`, `d3`, etc. — se confirmó por grep). Los "resultados" son Cards de estadísticas + tablas + un botón de export a `.xlsx` (`src/features/results/utils/export-xlsx.ts`). Esto simplifica la Fase D respecto a lo que se asumía originalmente: no hay que resolver redimensionado de gráficos, solo tablas y stat cards.

---

## 2. Current State Audit

### 2.1 Ya funciona bien (no tocar / bajo riesgo)

| Área | Archivo | Por qué está OK |
|------|---------|------------------|
| Sidebar mobile | `src/components/ui/sidebar.tsx:182-206` | `isMobile` renderiza `Sheet` con drawer completo; ya tiene `SheetTitle`/`SheetDescription` para a11y |
| Trigger de sidebar | `src/components/dashboard/dashboard-client-layout.tsx:29-33` | Header sticky con `SidebarTrigger` visible en todos los breakpoints |
| Dialogs | `src/components/ui/dialog.tsx:56` | `max-w-[calc(100%-2rem)] sm:max-w-sm` — ya evita overflow horizontal en mobile por defecto |
| Auth pages | `src/app/(auth)/layout.tsx`, `sign-in/page.tsx` | Single column, `max-w-sm`, ya mobile-first |
| Respuesta de evaluación (Likert) | `src/features/assignments/components/likert-question.tsx:27-58` | Usa `flex-wrap` + `min-w-16` en los botones 1-5, ya se apila bien en mobile |
| `my-evaluations` y `my-results` (vista EMPLOYEE) | `src/app/(dashboard)/my-evaluations/page.tsx`, `my-results/page.tsx` | Ya usan Cards apiladas en vez de tabla — el rol que más probablemente usa mobile ya tiene buena base |
| Stat card grids | `src/app/(dashboard)/page.tsx:51,174`, `evaluations/[id]/page.tsx:99`, `evaluations/[id]/results/page.tsx:93` | Ya usan `grid gap-4 md:grid-cols-N` / `sm:grid-cols-N` |
| Tabla base (scroll horizontal) | `src/components/ui/table.tsx:9-12` | El wrapper ya tiene `overflow-x-auto`, así que ninguna tabla rompe el layout — solo requiere scroll lateral, no hay "trampa" de overflow de página completa |

### 2.2 Roto o degradado en mobile (con file:line)

**Tablas sin fallback de mobile — el problema más repetido (8 ocurrencias):**
- `src/features/positions/components/positions-table.tsx` (Nombre, Departamento, Manual, Evaluaciones, Acciones — 5 columnas)
- `src/app/(dashboard)/users/page.tsx:328-386` (Nombre, Email, Rol con `<Select>` inline, Creado — 4 columnas, el Select de rol es interactivo dentro de la celda)
- `src/features/knowledge-base/components/cargos-rag-table.tsx`
- `src/features/manuals/components/manuals-table.tsx`
- `src/app/(dashboard)/evaluations/page.tsx:91-138`
- `src/app/(dashboard)/evaluations/[id]/assignments/page.tsx:90-123`
- `src/app/(dashboard)/evaluations/[id]/results/page.tsx:172-206`
- `src/app/(dashboard)/evaluations/[id]/results/[employeeId]/page.tsx:102-149`

Todas usan `TableCell`/`TableHead` con `whitespace-nowrap` (`src/components/ui/table.tsx:73,86`), así que en mobile el usuario solo puede hacer scroll horizontal a ciegas — no hay indicador visual de que hay más columnas, ni una primera columna fija para mantener contexto mientras se scrollea.

**Filas de filtros sin `flex-wrap`:**
- `src/features/positions/components/positions-page-client.tsx:130-155` — `<div className="flex gap-4">` con `Input.max-w-sm` + `Select.w-48` lado a lado, sin wrap
- `src/features/manuals/components/manuals-page-client.tsx:88-105` — mismo patrón, `Select.w-48`
- `src/app/(dashboard)/evaluations/page.tsx:61-73` — mismo patrón

En viewports <400px estos anchos fijos (`max-w-sm` = 384px, `w-48` = 192px) ya exceden el ancho disponible sumados, y al no envolver se ven forzados a comprimirse o generar scroll horizontal en el contenedor padre.

**Grid de formulario fijo a 2 columnas:**
- `src/features/assignments/components/employee-selector.tsx:106` — `<div className="grid grid-cols-2 gap-4">` con dos `<select>` nativos (empleado evaluado / evaluador), cada uno con opciones tipo `"Nombre — email@dominio.com"`. En 360px de ancho cada columna queda con ~160px reales, y los `<select>` truncan el texto de las opciones.

**Headers `flex justify-between` sin wrap (título largo + acciones):**
- `src/app/(dashboard)/evaluations/[id]/page.tsx:66-96` — título de evaluación + badge de estado a la izquierda, botón "Cerrar Evaluación" + link "Volver" a la derecha, sin `flex-wrap`
- `src/features/evaluations/components/review-summary-bar.tsx:41-60` — mismo patrón, más agravado porque es `sticky top-0`
- `src/features/evaluations/components/review-summary-bar.tsx:84-104` — fila de "Average ratings" (Pertinencia/Coherencia/Adecuación) con `flex gap-6` sin wrap, 3 pares label+valor
- `src/features/manuals/components/manuals-page-client.tsx:66-86` — título + 2 botones ("Sincronizar con RAG" + "Registrar Manual"), sin wrap
- `src/features/evaluations/components/question-review-card.tsx:92-143` — `CardHeader` con `flex flex-row items-start justify-between`: metadata de la pregunta a la izquierda, hasta 3 botones (Aprobar/Rechazar/Editar) a la derecha, sin wrap

**Acoplamiento frágil de padding:**
- `src/features/evaluations/components/review-summary-bar.tsx:40` — usa `-mx-6 px-6` para "cancelar" el padding del `<main>` y pegar la barra sticky al borde. Este valor está hardcodeado contra `src/components/dashboard/dashboard-client-layout.tsx:34` (`<main className="flex-1 p-6">`). Si en la Fase A se vuelve el padding del main responsive (ej. `p-4 sm:p-6`), este componente se rompe visualmente y hay que actualizarlo en el mismo cambio.

**Padding fijo del contenedor principal:**
- `src/components/dashboard/dashboard-client-layout.tsx:34` — `<main className="flex-1 p-6">` — 24px fijos en todos los breakpoints. No es catastrófico, pero en 360px de ancho resta ~13% del viewport a cada lado innecesariamente comparado con reducir a `p-4` (16px) bajo `sm`.

---

## 3. Proposed Approach

### 3.1 Estrategia de breakpoints

Mobile-first con los breakpoints estándar de Tailwind 4 (no hay override en `globals.css`, se confirmó): `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`. Regla general: los estilos base (sin prefijo) deben asumir 360-390px de ancho (el rango real más chico de celulares actuales), y los prefijos agregan complejidad hacia arriba — nunca al revés.

### 3.2 Shell de layout y navegación (ya resuelto, solo pulir)

No se reconstruye el sidebar. Tareas de pulido:
- `dashboard-client-layout.tsx`: cambiar `p-6` fijo por `p-4 sm:p-6` en el `<main>`.
- Acoplar `review-summary-bar.tsx` al mismo valor responsive (`-mx-4 px-4 sm:-mx-6 sm:px-6`) en el mismo commit que el punto anterior, para no romperlo.
- Verificar que el `header` sticky (`h-14`, con `SidebarTrigger` + "UPCA") no necesita cambios — ya es compacto.

### 3.3 Tablas → estrategia híbrida

No se propone convertir las 8 tablas a cards — es alto esfuerzo y varias (assignments, results por empleado) tienen uso predominantemente desktop (HR revisando en escritorio). Estrategia por nivel de tráfico mobile esperado:

- **Default para todas las tablas** (bajo esfuerzo, aplica una sola vez en el primitivo compartido): agregar sticky a la primera columna vía `TableHead`/`TableCell` cuando reciban una prop `sticky`, usando `sticky left-0 bg-background z-[1]` en `src/components/ui/table.tsx`. Esto mantiene contexto (nombre/título) visible mientras se hace scroll horizontal, sin tocar cada tabla individualmente más que pasar la prop a la primera columna.
- **Card fallback bajo `md`** solo para las tablas de mayor tráfico mobile: `positions-table.tsx` y `evaluations/page.tsx` (HR revisando desde el celular es plausible en este dominio — PyME). Patrón: renderizar `<Table className="hidden md:table">` + un `<div className="flex flex-col gap-2 md:hidden">` con Cards apiladas reutilizando los mismos datos/columnas ya definidos con `columnHelper`.
- El resto de las tablas (users, cargos-rag, manuals, assignments, results, employee results) se quedan con scroll horizontal + primera columna sticky. Riesgo aceptado, ver sección 5.

### 3.4 Formularios y filtros

- Filas de filtros (`positions-page-client.tsx`, `manuals-page-client.tsx`, `evaluations/page.tsx`): agregar `flex-wrap` y cambiar anchos fijos (`max-w-sm`, `w-48`) por `w-full sm:max-w-sm` / `w-full sm:w-48`, para que cada control ocupe el ancho completo apilado en mobile y vuelva a su ancho fijo desde `sm`.
- `employee-selector.tsx:106`: cambiar `grid-cols-2` por `grid-cols-1 sm:grid-cols-2`.
- Los diálogos de formulario (`position-form.tsx`, `upload-dialog.tsx`, users create dialog) ya heredan el comportamiento responsive del `Dialog` base — no requieren cambios, salvo `view-edit-cargo-dialog.tsx` que fuerza `max-w-2xl`: verificar en QA que el `Textarea.h-96` con contenido markdown no fuerce scroll de página en viewports muy bajos (landscape mobile ~375x667 con teclado abierto).

### 3.5 Headers con título + acciones

Patrón único a aplicar en los 5 archivos listados en 2.2 ("Headers flex justify-between sin wrap"): cambiar `flex items-center justify-between` (o `items-start`) por `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`, dejando que en mobile el título quede arriba y las acciones abajo en su propia fila (con `flex-wrap gap-2` en el grupo de botones cuando hay 2+).

---

## 4. Phased Task Breakdown

Cada fase es independiente y desplegable por separado (no hay dependencias duras entre ellas, salvo que la Fase A introduce el token de padding responsive que la Fase C reutiliza en `review-summary-bar`).

### Phase A — Layout shell & padding (S)
- `src/components/dashboard/dashboard-client-layout.tsx`: `p-6` → `p-4 sm:p-6` en `<main>`
- `src/features/evaluations/components/review-summary-bar.tsx:40`: actualizar `-mx-6 px-6` a juego con el nuevo padding responsive
- Smoke test manual del drawer de sidebar en 375px y 768px (ya funciona, solo confirmar que no regresionó)

### Phase B — Tablas (L)
- `src/components/ui/table.tsx`: agregar soporte de columna sticky (prop o clase utilitaria reusable)
- Aplicar sticky a primera columna en las 8 tablas listadas en 2.2
- Construir fallback de Cards bajo `md` para `positions-table.tsx` y `evaluations/page.tsx` (las dos de mayor tráfico mobile esperado)
- Ajustar `users/page.tsx`: el `<Select>` de rol dentro de celda necesita probarse específicamente en mobile (interacción touch dentro de tabla con scroll horizontal)

### Phase C — Filtros, formularios y headers (M)
- `positions-page-client.tsx`, `manuals-page-client.tsx`, `evaluations/page.tsx`: filas de filtro con `flex-wrap` + anchos `w-full sm:w-*`
- `employee-selector.tsx`: `grid-cols-1 sm:grid-cols-2`
- 5 headers con patrón `flex-col sm:flex-row` (ver 3.5): `evaluations/[id]/page.tsx`, `review-summary-bar.tsx` (título+acciones y fila de ratings), `manuals-page-client.tsx`, `question-review-card.tsx`
- QA de `view-edit-cargo-dialog.tsx` en viewport bajo con teclado virtual abierto

### Phase D — Resultados y export (S)
- No hay charts que ajustar (confirmado por grep, ver sección 1)
- `evaluations/[id]/results/page.tsx`: header con botón "Exportar a Excel" — aplicar el mismo patrón de 3.5 si el título de evaluación es largo
- `evaluations/[id]/results/[employeeId]/page.tsx`: el grid `grid-cols-2 sm:grid-cols-4` (línea 65) ya es responsive, solo confirmar en QA que no trunca en 360px
- Verificar que la descarga de `.xlsx` (interacción de archivo del navegador) funciona igual en mobile Safari/Chrome — no es un cambio de código, es un ítem de QA

### Phase E — QA pass cruzado (M)
- Recorrer los 3 roles (ADMIN, HR, EMPLOYEE) en 360px, 390px, 768px, 1024px, 1440px
- Chrome DevTools device toolbar como mínimo; idealmente 1 dispositivo Android real y 1 iOS real (ver riesgos)
- Checklist por página: sin overflow horizontal de página completa, sin texto cortado, botones con área táctil ≥40px, sidebar drawer abre/cierra correctamente, formularios usables con teclado virtual abierto

---

## 5. Effort Estimates & Suggested Order

| Fase | Esfuerzo | Orden sugerido | Justificación del orden |
|------|----------|-----------------|--------------------------|
| A — Layout shell & padding | S | 1 | Introduce el token de padding que Fase C reutiliza; bajo riesgo, alto impacto visual inmediato |
| B — Tablas | L | 2 | Es el problema más repetido (8 tablas) y el de mayor esfuerzo; conviene resolverlo temprano mientras hay foco dedicado |
| C — Filtros/formularios/headers | M | 3 | Depende del token de Fase A; son cambios acotados por archivo, se pueden paralelizar entre sí |
| D — Resultados y export | S | 4 | Alcance reducido al confirmarse que no hay charts; mayormente QA |
| E — QA pass cruzado | M | 5 (siempre último) | Debe correr después de A-D; también sirve como red de seguridad si se decide saltear alguna fase |

**Total estimado**: ~1.5-2 semanas de una persona a tiempo parcial (proyecto de tesis), asumiendo Fase B como la de mayor incertidumbre real (decisión de diseño de cards vs. scroll para cada tabla puede iterar).

---

## 6. Risks / Tradeoffs

- **Tabla → Card es duplicación de markup**: mantener dos representaciones (`Table` desktop + `Card` mobile) de los mismos datos en `positions-table.tsx` y `evaluations/page.tsx` implica que un cambio de columna futuro debe tocar dos lugares. Mitigación: derivar ambas vistas de la misma definición de `columnHelper` donde sea posible, o aceptar la duplicación acotada a solo 2 tablas (no las 8).
- **Sticky first column + Base UI**: `sidebar.tsx` y otros primitivos usan Base UI (no Radix); no se validó si `position: sticky` dentro del wrapper `overflow-x-auto` de `table.tsx` tiene algún conflicto con estilos existentes (`bg-background` en fila hover). Requiere verificación visual, no solo de código.
- **Testing solo en DevTools vs. dispositivos reales**: el viewport de Chrome DevTools no reproduce comportamiento real de teclado virtual (que reduce la altura visible y puede tapar botones sticky como el de "Finalizar Evaluación" en `my-evaluations/[assignmentId]/page.tsx:132`) ni gestos de scroll horizontal con momentum en iOS Safari. Se recomienda al menos una pasada en un dispositivo Android y uno iOS reales antes de dar la Fase E por cerrada.
- **`users/page.tsx` Select interactivo dentro de tabla con scroll horizontal**: es el caso más delicado de Fase B — un `<Select>` (Base UI) dentro de una celda que a su vez está en un contenedor con scroll horizontal táctil puede generar conflictos de gestos (swipe para scrollear vs. tap para abrir el select). Vale la pena probarlo temprano en Fase B antes de replicar el patrón sticky a esa tabla específica.
- **Alcance de "todas las tablas a cards" fue descartado deliberadamente**: dado que el uso real de HR/ADMIN es mayormente desktop (gestión de datos, no consumo casual), forzar cards en las 8 tablas sería sobre-ingeniería para este proyecto de tesis. Si el uso real en producción demuestra lo contrario, se puede extender el patrón de Fase B a las tablas restantes como trabajo futuro.
