---
description: Crea un commit siguiendo el formato Conventional Commits
argument-hint: "[tipo(ámbito): contexto opcional]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*)
---

Crea un commit de los cambios actuales siguiendo la especificación Conventional Commits 1.0.0.

Contexto adicional del usuario (puede estar vacío): $ARGUMENTS

## Pasos

1. Ejecuta en paralelo `git status`, `git diff HEAD` y `git log -5 --oneline` para entender los cambios y el estilo del historial. Si el directorio no es un repositorio git, avísalo y detente; no ejecutes `git init` sin que el usuario lo pida.
2. Si no hay cambios, díselo al usuario y detente.
3. Usa la tool `AskUserQuestion` para mostrarle al usuario el mensaje del commit, y que decida si le parece bien. Si te da el ok, continua. Si te dice que no, proponle otro mensaje y vuelve a preguntarle.
4. Decide qué archivos entran en el commit:
   - Si hay cambios en el área de staging, commitea solo lo que está en staging.
   - Si no hay nada en staging, añade con `git add` los archivos concretos relacionados con el cambio (por nombre, nunca `git add -A` ni `git add .`).
   - No incluyas archivos con secretos (`.env`, credenciales) ni archivos generados (`node_modules`, `*.db`). Si dudas, pregunta.
   - Si los cambios mezclan varios propósitos no relacionados, propón dividirlos en varios commits y haz uno por cada propósito.
5. Redacta el mensaje y crea el commit.
6. Ejecuta `git status` para confirmar que quedó limpio y muestra al usuario el hash y el asunto del commit.

## Formato del mensaje

```
<tipo>(<ámbito opcional>)<!>: <descripción>

<cuerpo opcional>

<pie opcional>

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```

**Tipos permitidos:**

| Tipo       | Cuándo usarlo                                              |
|------------|------------------------------------------------------------|
| `feat`     | Nueva funcionalidad                                        |
| `fix`      | Corrección de un error                                     |
| `docs`     | Solo documentación (p. ej. CLAUDE.md, `.http`)             |
| `style`    | Formato sin cambio de comportamiento                       |
| `refactor` | Reestructuración sin nueva funcionalidad ni corrección     |
| `perf`     | Mejora de rendimiento                                      |
| `test`     | Añadir o corregir tests                                    |
| `build`    | Dependencias, `package.json`, `.npmrc`                     |
| `ci`       | Configuración de integración continua                      |
| `chore`    | Tareas de mantenimiento que no encajan en las anteriores   |
| `revert`   | Revierte un commit anterior                                |

**Reglas:**

- La descripción va en español, en imperativo y minúscula inicial, sin punto final, y la primera línea no supera los 72 caracteres.
- El ámbito es opcional y corresponde a la parte afectada, por ejemplo `vendehumos`, `auth`, `config`.
- Si el argumento del usuario ya indica tipo y/o ámbito (por ejemplo `fix(auth): ...`), respétalos.
- Cambios incompatibles: añade `!` tras el tipo/ámbito y un pie `BREAKING CHANGE: <explicación>`.
- El cuerpo explica el *porqué* cuando no es obvio, separado por una línea en blanco.
- Pasa el mensaje con un heredoc para conservar los saltos de línea.

## Prohibido

- No uses `--no-verify`, `--amend` ni `git push` salvo que el usuario lo pida expresamente.
- No modifiques la configuración de git.
