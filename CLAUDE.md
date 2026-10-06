# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Resttek: plataforma de gestión de restaurantes. Monorepo con npm workspaces (`packages/*`): una API Express, tres apps Angular 21 y una librería Angular compartida. La documentación del proyecto está en `docs/` (en español) y es detallada y fiable: `docs/arquitectura/`, `docs/dominio/` (glosario, modelo de datos), `docs/revisiones/`.

| Paquete | Puerto | Función |
| --- | --- | --- |
| `api` | 3000 | Express 5 + TypeScript + SQLite (ESM), autenticación JWT |
| `web-admin` | 4200 | Panel de administración (admin, manager) |
| `web-empleados` | 4201 | Vistas de cocina / barra / salón (cocinero, camarero, manager) |
| `web-clientes` | 4202 | App de pedidos para clientes (cliente) |
| `web-shared` | — | Librería consumida desde el fuente (`main: src/index.ts`, sin paso de build): store/servicio/guard de auth, interceptors HTTP, componentes de login y registro, `base.css` |

## Comandos

Desde la raíz del repo (Node 22+):

```bash
npm install
npm run seed            # puebla SQLite (idempotente, INSERT OR IGNORE)
npm run dev:api         # tsx watch, http://localhost:3000 (GET /health)
npm run dev:admin       # ng serve con proxy /api -> :3000
npm run dev:empleados
npm run dev:clientes
npm test                # vitest run, solo la API
```

- Un solo fichero de test o un test por nombre: `npm test -w @resttek/api -- ruta/al/fichero.test.ts` o `-- -t "nombre"`. Modo watch: `npm run test:watch -w @resttek/api`.
- No hay script de lint ni de tests de frontend. Los frontends se compilan con `npm run build -w @resttek/web-<nombre>`.
- Los cambios en `web-shared` no los recoge un `ng serve` en marcha: hay que reiniciar el servidor de desarrollo.
- Accede siempre a cada frontend por su propio puerto (proxy), no directamente al :3000.

Credenciales de prueba (tras el seed): la contraseña es igual al email, p. ej. `admin@resttek.com`, `gerente1@resttek.com`, `cocinero1@resttek.com`, `camarero1@resttek.com`, `cliente1@resttek.com`.

## Arquitectura de la API (`packages/api/src`)

Conviven dos estilos arquitectónicos; comprueba cuál aplica antes de editar:

- **Hexagonal + DDD, solo en `contexts/employee/`** (domain / application / infrastructure). `Employee` es la única entidad real (constructor privado + `Employee.create()`), `Email` y `Role` los únicos value objects, los casos de uso son clases con `execute()` y las interfaces llevan prefijo `I`. El cableado HTTP está en `infrastructure/http/dependencies.ts`. `contexts/shared/` contiene `Email`, los middlewares `authenticate`/`authorize` y el `errorHandler`.
- **Por capas, todo lo demás** (`restaurant`, `dish`, `ingredient`, `order`): `models/` (interfaces planas + funciones `normalizeX()`), `repositories/` (interfaz e implementación SQLite en el mismo fichero, sin prefijo `I`), `services/`, `controllers/`, `routes/`. Las dependencias se componen a mano al principio de cada `*.routes.ts`. Los routers bajo `/restaurants/:restaurantId/...` necesitan `Router({ mergeParams: true })`.

Cosas fáciles de pasar por alto:

- **Los clientes son filas de `Employee`** con `role = 'cliente'` y `restaurant_id = null`; no existe tabla de clientes. Roles válidos: `admin`, `manager`, `camarero`, `cocinero`, `cliente`.
- **La autorización real es el `authorize([...])` de la API**; los menús por rol de los frontends son solo navegación, y `authGuard` solo comprueba que haya sesión.
- **Las rutas de pedidos no usan `authorize()`**: cualquier usuario autenticado puede cambiar el estado de cualquier ítem. Al crear un pedido se expanden las cantidades: `quantity: 3` se guarda como 3 filas de `order_items` con `quantity: 1`.
- **Gestión de errores**: subclases de `AppError` en `errors/DomainErrors.ts`; el `errorHandler` decide por el nombre de la clase (404 para la lista de `*NotFoundError`, 401 `InvalidCredentialsError`, cualquier otro `AppError` 400). `OrderNotFoundError` no está en la lista de 404, y `OrderController` hace su propio try/catch en vez de `next(error)`.
- **Path aliases** (`@config`, `@errors`, `@shared`, `@employee`, `@models`, `@repositories`, `@services`, `@controllers`, `@routes`, `@scripts`) definidos en `tsconfig.json`. Los imports deben acabar en `.js` (ESM, `module: nodenext`). Están activados `strict`, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`.
- **BD**: una única instancia exportada `dbConfig` (`config/database.ts`); las tablas se crean con `CREATE TABLE IF NOT EXISTS` al arrancar. El fichero es `packages/api/resttek.db`, o `:memory:` con `NODE_ENV=test`. Las columnas snake_case se renombran a camelCase en el propio SQL.
- Los tests son unitarios, junto al código, con mocks escritos a mano (`contexts/employee/application/mocks/`, `repositories/mocks/`). `supertest` está instalado pero no se usa.

Todas las rutas cuelgan de `/api/v1`, salvo `GET /health`. Los endpoints públicos de la app de clientes están en `/api/v1/public/restaurants`.

## Arquitectura del frontend

Angular 21, standalone components, signals, zoneless (sin zone.js), guards e interceptors funcionales, rutas con lazy loading. El estado de autenticación (`AuthStore`, token y usuario en localStorage) y el token de inyección `API_URL` vienen de `@resttek/web-shared`.

- `web-admin` / `web-empleados`: carpetas por feature (`models/`, `pages/`, `services/`, `store/`). Los services devuelven Observables; los stores los envuelven con `firstValueFrom` y exponen signals de solo lectura (`loading` / `error` / datos). Los componentes solo hablan con los stores. `OrderStore` en web-empleados hace polling cada 30 s (no hay websockets).
- `web-clientes`: estructura distinta. Modelos, servicios y store viven en `core/`; los componentes inyectan los services directamente y se suscriben. `CartStore` es el único store (local, sin HTTP). Las páginas de pedidos hacen polling con `setInterval` (10 s el listado, 5 s el detalle).
