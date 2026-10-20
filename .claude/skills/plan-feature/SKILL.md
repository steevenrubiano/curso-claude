---
name: plan-feature
description: Planifica un nuevo desarrollo, una corrección de código o un refactor siguiendo la plantilla template.md (objetivo, tareas de 5-10 min y criterios de aceptación). Úsala cuando el usuario pida planificar, diseñar o desglosar un cambio antes de implementarlo.
argument-hint: "[nº de issue de GitHub] [indicaciones adicionales opcionales]"
allowed-tools: Read, Grep, Glob, Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(gh issue view:*), Bash(gh issue comment:*), mcp__slack__slack_list_channels, mcp__slack__slack_post_message
---

Planifica el cambio descrito en una issue de GitHub. **Solo planificas: no modifiques código ni crees archivos del proyecto.** La tarea no la describe el usuario en el prompt: está en una issue y tienes que ir a buscarla.

Petición del usuario: $ARGUMENTS

## Pasos

1. Obtén el número de la issue de `$ARGUMENTS`. Si no lo hay, pídeselo al usuario con `AskUserQuestion` antes de seguir.
2. Lee la issue con `gh issue view <número> --comments` (título, descripción y comentarios). Si falla (no existe, sin acceso o `gh` sin autenticar), díselo al usuario y detente. Si el objetivo sigue siendo demasiado ambiguo, usa `AskUserQuestion`; no preguntes lo que puedas resolver leyendo el código.
3. Clasifica el cambio: `feature` (nuevo desarrollo), `fix` (corrección) o `refactor`.
4. Explora el código afectado con `Read`, `Grep` y `Glob`: archivos que se tocarán, patrones existentes que conviene imitar y posibles efectos secundarios. En un `fix`, localiza primero la causa raíz; en un `refactor`, identifica qué comportamiento debe mantenerse.
5. Lee `template.md` (en este mismo directorio) y rellénalo respetando su estructura y el orden de sus secciones.
6. Publica el plan como comentario de la issue (ver "Publicación en la issue").
7. Avisa en Slack de que el plan está listo para revisarse (ver "Aviso en Slack").
8. Muestra el plan al usuario y pregúntale si quiere ajustarlo antes de implementarlo. No empieces a implementar sin su visto bueno.

## Publicación en la issue

Cuando el plan esté terminado, antes del aviso en Slack:

1. Publícalo íntegro como comentario de la issue con `gh issue comment <número> --body-file -`, pasando el plan por stdin (heredoc) para no crear archivos.
2. Si el plan está guardado en `docs/plans/`, menciona su ruta al final del comentario.
3. Si el comentario falla, no te detengas: dilo al usuario en una línea y continúa. Si se publica, guarda la URL que devuelve `gh` para incluirla en el aviso de Slack y en tu respuesta.

## Aviso en Slack

Cuando el plan esté terminado, antes de mostrarlo al usuario:

1. Obtén el ID del canal `revisar-plan` con `mcp__slack__slack_list_channels` (busca por nombre, sin `#`).
2. Publica con `mcp__slack__slack_post_message` un mensaje breve en español: que el plan está listo para revisarse, su tipo (`feature`/`fix`/`refactor`), su título, el enlace a la issue (o al comentario) y la ruta del plan si está guardado en `docs/plans/`.
3. Si el canal no existe o el envío falla, no te detengas: dilo al usuario en una línea y continúa con el paso siguiente.

## Reglas del plan

- **Objetivo:** 1-3 frases con el resultado que se busca y el porqué. Incluye lo que queda fuera del alcance si hay riesgo de confusión.
- **Tareas:**
  - Cada tarea debe poder hacerse en **5-10 minutos**. Si una tarea parece mayor, divídela en varias.
  - Indica una estimación en minutos por tarea (entre 5 y 10) y los archivos concretos que toca.
  - Ordénalas de forma que cada una deje el proyecto funcionando y sea verificable por sí sola.
  - Respeta la arquitectura en capas del proyecto (`routes → controllers → services → repositories → models`) y las convenciones de `CLAUDE.md` (clases con métodos en `snake_case`, Node nativo antes que librerías, variables de entorno solo desde `src/config/index.js`).
  - Si el cambio añade o modifica endpoints, incluye una tarea para actualizar `requests.http` y, si cambia el comportamiento descrito, `CLAUDE.md`.
  - Si el cambio añade, modifica o elimina endpoints de la API (rutas, parámetros, cuerpos, respuestas, códigos de estado o roles permitidos), incluye una tarea para actualizar `docs/api/openapi.yaml` (documento OpenAPI 3), manteniéndolo coherente con el código, y ejecutar después `node scripts/embed-openapi.mjs` para regenerar el visor `docs/api/index.html` (incrusta el YAML; no se edita a mano).
  - Si se devuelven colecciones, aplica la guía de paginación (objeto página con `items`, `self`, `first`, `prev`, `next`, `last`, `query`) de `CLAUDE.md`.
  - En un `fix`, la primera tarea reproduce el error; en un `refactor`, la primera tarea fija el comportamiento actual (p. ej. con una petición en `requests.http` o un test de `node:test`).
- **Criterios de aceptación:** lista de comprobaciones concretas, observables y verificables (p. ej. "`POST /auth/login` con credenciales inválidas devuelve 401"). Evita criterios vagos como "funciona bien". Incluye al menos un caso de error o borde cuando aplique. Si el cambio toca la API, añade el criterio "`docs/api/openapi.yaml` refleja los endpoints cambiados y sigue siendo un YAML OpenAPI 3 válido".
- **Idioma:** el plan se escribe en español; los nombres de archivos, clases y métodos se escriben tal como están en el código.
- No inventes archivos ni funciones: si algo no existe aún, di explícitamente que hay que crearlo.
