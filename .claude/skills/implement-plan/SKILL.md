---
name: implement-plan
description: Implementa el plan de una issue de GitHub (generado con plan-feature, en docs/plans/) en un git worktree aislado, tarea a tarea con TDD estricto, haciendo un commit y marcando la tarea como hecha tras cada una, hasta cumplir todos los criterios de aceptación, y deja la PR creada avisando por Slack con su enlace. Úsala cuando el usuario pida implementar, ejecutar o llevar a cabo una issue o su plan.
argument-hint: "[nº de issue de GitHub a implementar]"
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, mcp__slack__slack_list_channels, mcp__slack__slack_post_message
---

Implementa la issue de GitHub indicada por el usuario, siguiendo estos pasos en orden.

Issue: $ARGUMENTS

## 0. Localizar la issue y el plan

- Obtén el número de la issue de `$ARGUMENTS`. Si no lo hay, pídeselo al usuario con `AskUserQuestion`.
- Lee la issue con `gh issue view <número> --comments`. Si falla (no existe, sin acceso o `gh` sin autenticar), díselo al usuario y detente.
- El plan lo publicó `plan-feature` como comentario de la issue; en ese comentario figura la ruta en `docs/plans/`. Usa ese fichero como plan de trabajo (el que se marca). Si no hay comentario con plan o el fichero no existe, pregunta al usuario con `AskUserQuestion` en lugar de improvisar el plan.
- Lee el plan entero. Si no tiene tareas (`- [ ]`) ni criterios de aceptación, detente y avisa al usuario.
- Lee `CLAUDE.md` para respetar la arquitectura en capas y las convenciones (clases con métodos en `snake_case`, Node nativo, `process.env` solo en `src/config/index.js`).

## 1. Crear el git worktree

1. Comprueba con `git status` que sabes en qué rama estás. Esa será la rama base.
2. Crea el worktree dentro de la carpeta `.claude/worktrees/` del repositorio, con una rama nueva derivada del nombre del plan. Antes, asegúrate de que `.claude/worktrees/` está en `.gitignore` (añádelo si falta) para que el worktree no se cuele en los commits:
   `git worktree add .claude/worktrees/<slug-del-plan> -b feat/<slug-del-plan>`
   (usa `fix/` o `refactor/` según el **Tipo** del plan). Si la rama o la carpeta ya existen, no las pises: pregunta al usuario si reutilizarlas.
3. Si el plan o `.env` no están versionados (están en `.gitignore` o sin trackear), cópialos al worktree en la misma ruta relativa: el plan para poder marcarlo y `.env` para que `npm start`/tests funcionen.
4. Trabaja **solo dentro del worktree** a partir de aquí (rutas absolutas hacia él). No modifiques el checkout original.
5. `node`/`npm` pueden no estar en el PATH: usa `~/.nvm/versions/node/<versión>/bin` o `nvm use`.

## 2. Implementar las tareas, una a una

Procesa las tareas en el orden del plan. Nunca empieces la siguiente sin haber cerrado la actual (pasos a-f). Para cada tarea:

**a. Entender.** Relee su detalle y archivos. No inventes alcance fuera de la tarea.

**b. RED — escribe primero el test.**
- Usa `node:test` + `node:assert` (sin librerías externas), en `test/` con nombre `<Clase>.test.js`. Si el proyecto aún no tiene script de test, la primera tarea que lo necesite añade `"test": "node --env-file=.env --test"` a `package.json`.
- Escribe el test mínimo que describa el comportamiento de la tarea y ejecútalo: **debe fallar, y por la razón correcta** (aserción incumplida, no un error de sintaxis o import). Muestra el fallo.
- Si la tarea no es comportamiento testeable (solo docs, `requests.http`, configuración), indícalo explícitamente y sustituye el test por una verificación concreta (p. ej. ejecutar la petición contra la API). No lo uses como excusa para saltarte TDD en código.

**c. GREEN — implementa lo mínimo.** Escribe solo el código necesario para que el test pase, respetando las capas (`routes → controllers → services → repositories → models`). Ejecuta el test: debe pasar.

**d. REFACTOR.** Limpia duplicación y nombres con los tests en verde. Ejecuta la suite **completa** (`npm test`): no puede haber regresiones.

**e. Commit.** Un commit por tarea, que incluya código, tests y el plan con la tarea marcada:
- Marca la tarea en el plan: `- [ ] **N.` → `- [x] **N.`
- `git add` de los archivos concretos (nunca `git add -A`) y commit en **inglés** con formato Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`...), asunto en imperativo y ≤72 caracteres. Termina el mensaje con la línea de atribución indicada en el contexto de la sesión.
- Si un hook o el commit fallan, corrige la causa y crea un commit nuevo; no uses `--no-verify` ni `--amend` para saltarte el problema.

**f. Informar.** Una línea al usuario: tarea hecha, test añadido, hash del commit.

Si una tarea resulta inviable, mayor de lo previsto o contradice el plan, **detente y consulta al usuario** en lugar de improvisar. Si cambias el plan, deja constancia en él.

## 3. Verificar los criterios de aceptación

Cuando todas las tareas estén en `[x]`:

1. Ejecuta la suite completa y arranca la API si hace falta (`npm start` en segundo plano, y ejecuta las peticiones reales con `curl`) para comprobar **cada criterio** del plan, uno por uno, incluidos los casos de error/borde.
2. Marca cada criterio cumplido (`- [ ]` → `- [x]`) solo con evidencia de que se ha comprobado. Si alguno falla o no es verificable, no lo marques: añade una tarea o corrige con el mismo ciclo TDD y commit, y vuelve a verificar.
3. Haz un último commit con el plan actualizado (`docs: mark acceptance criteria as met`), salvo que ya esté incluido.
4. Detén cualquier proceso que hayas arrancado.

## 4. Cierre

Solo cuando todas las tareas estén en `[x]` y los criterios verificados:

### Crear la PR

1. Haz push de la rama desde el worktree: `git push -u origin <rama>`.
2. Crea la PR contra la rama base con `gh pr create --base <rama-base> --head <rama> --title "<título>" --body-file -` (cuerpo por stdin con heredoc, sin crear archivos). El título sigue Conventional Commits, en inglés y ≤72 caracteres. El cuerpo, en inglés, resume el cambio, lista los criterios de aceptación verificados, incluye `Closes #<número>` y termina con la línea de atribución de PR indicada en el contexto de la sesión.
3. Guarda la URL que devuelve `gh pr create`. Si falla, dilo al usuario con el error y detente: no avises en Slack de una PR que no existe.

### Aviso en Slack

1. Obtén el ID del canal `revisar-plan` con `mcp__slack__slack_list_channels` (busca por nombre, sin `#`).
2. Publica con `mcp__slack__slack_post_message` un mensaje breve en español: que la issue está implementada y lista para revisarse, con el número de la issue, el nombre del plan, la rama, el número de commits y el **enlace directo a la PR**.
3. Si el canal no existe o el envío falla, no te detengas: dilo al usuario en una línea y continúa.

Después, resume al usuario, en español: URL de la PR, rama y ruta del worktree, lista de commits, estado de cada criterio de aceptación y cualquier desviación del plan. **No elimines el worktree** salvo que el usuario lo pida; ofrécele esa opción como siguiente paso.

## Reglas

- TDD estricto: ningún código de producción sin un test que haya fallado antes.
- Un commit por tarea, nunca mezclar tareas.
- Nunca marques como hecha una tarea o criterio sin haber ejecutado su verificación.
- Código, tests y commits en inglés; comunicación con el usuario en español.
