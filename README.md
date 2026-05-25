<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  Restools - Simple tools for NestJS framework and REST APIs
</p>

<p align="center">
  <a href="https://www.npmjs.com/org/tacxou"><img src="https://img.shields.io/npm/v/@tacxou/nestjs_module_restools.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/org/tacxou"><img src="https://img.shields.io/npm/l/@tacxou/nestjs_module_restools.svg" alt="Package License" /></a>
  <a href="https://github.com/tacxou/nestjs_module_restools/actions/workflows/ci.yml"><img src="https://github.com/tacxou/nestjs_module_restools/actions/workflows/ci.yml/badge.svg" alt="Publish Package to npmjs" /></a>
</p>
<br>

# NestJS Restools Module

Utilities for NestJS REST APIs: abstract base classes, validation pipes, query-string filters, request context, and optional Mongoose CRUD helpers.

## Overview

The package is split into a **core** entry point and **optional submodules**. Optional modules are not re-exported from the main entry so consumers are not forced to install `mongoose` or other peer dependencies.

| Module | Source folder | Import path | Extra dependencies |
|--------|---------------|-------------|-------------------|
| Core (abstracts, pipes, cluster) | `src/_abstracts`, `_pipes`, `_services` | `@tacxou/nestjs_module_restools` | `@nestjs/common`, `@nestjs/core` |
| Request context | `src/request-context` | `@tacxou/nestjs_module_restools/dist/request-context` | — |
| Search filter schema | `src/search-filter-schema` | `@tacxou/nestjs_module_restools/dist/search-filter-schema` | `mongoose` (for ObjectId filters) |
| Mongoose | `src/mongoose` | `@tacxou/nestjs_module_restools/dist/mongoose` | `mongoose`, `@nestjs/mongoose`, `@nestjs/event-emitter` |
| Real IP decorator | `src/real-ip` | `@tacxou/nestjs_module_restools/dist/real-ip` | `request-ip` |

Internal utilities under `src/_utils` (e.g. `memoize.util.ts`) are not published.

---

## Installation

### Core

```bash
yarn add @tacxou/nestjs_module_restools
# peers: @nestjs/common, @nestjs/core
```

### Optional modules

```bash
# Request context (AsyncLocalStorage for req/res in services)
# No extra packages beyond NestJS

# Search filters (query string → MongoDB-style filters)
yarn add mongoose

# Mongoose CRUD service + validation
yarn add mongoose @nestjs/mongoose @nestjs/event-emitter

# RealIp decorator (client IP from request headers)
yarn add request-ip
# import from @tacxou/nestjs_module_restools/dist/real-ip
```

After `yarn build`, optional modules are consumed from `dist/<module>` (see import examples below).

---

## Core modules

Import from the package root:

```typescript
import {
  AbstractService,
  AbstractController,
  DtoValidationPipe,
  AppClusterService,
} from '@tacxou/nestjs_module_restools'
```

### `_abstracts` — `AbstractService` & `AbstractController`

Base classes with logging and naming helpers.

**`AbstractService`**

- `logger` — Nest `Logger` named after the service.
- `request` — HTTP request from constructor context or `RequestContextStorage` (if request-context module is used).
- `eventEmitter` — optional `EventEmitter2` from context.
- `moduleName` — derived from `request.path` (first segment, capitalized) or `context.moduleName`.
- `serviceName` — class name without `Service` suffix, or `context.serviceName`.

**`AbstractController`**

- `logger`, `moduleRef`, `controllerName` (same naming pattern as services).

**Context injection**

```typescript
import { Injectable } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { AbstractService, AbstractServiceContext } from '@tacxou/nestjs_module_restools'

@Injectable()
export class OrderService extends AbstractService {
  constructor(moduleRef: ModuleRef, eventEmitter: EventEmitter2) {
    super({
      moduleRef,
      eventEmitter,
      moduleName: 'Orders',   // optional override
      serviceName: 'Order',   // optional override
    } as AbstractServiceContext)
  }

  doWork() {
    const user = this.request?.user
    this.logger.log(`Handling order for ${user?.username ?? 'anonymous'}`)
  }
}
```

Pair with [`RequestContextModule`](#request-context) so `this.request` is available without passing `req` manually.

---

### `_pipes` — `DtoValidationPipe`

Extends Nest `ValidationPipe` with:

- `transform: true` and implicit conversion enabled by default.
- Flat validation errors: `{ "field": "message", "parent.child": "message" }`.
- Custom `exceptionFactory` returning `{ statusCode: 400, message, validations }`.

**Global registration**

```typescript
import { Module } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'
import { DtoValidationPipe } from '@tacxou/nestjs_module_restools'

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: DtoValidationPipe,
    },
  ],
})
export class AppModule {}
```

**Per-controller**

```typescript
@UsePipes(DtoValidationPipe)
@Controller('users')
export class UsersController {}
```

---

### `_services` — `AppClusterService`

Runs the Nest bootstrap callback in Node cluster mode (one worker per CPU by default).

```typescript
import { NestFactory } from '@nestjs/core'
import { AppClusterService } from '@tacxou/nestjs_module_restools'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}

AppClusterService.clusterize(bootstrap, {
  clusterize: process.env.CLUSTERIZE === 'true',
  forks: 4,
  name: 'MyApi',
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `clusterize` | — | If falsy, runs `callback` once (no clustering). |
| `forks` | `os.cpus().length` | Number of worker processes. |
| `name` | `AppClusterService` | Log label. |

---

## Optional modules

Import from `dist/<module>` after building or from the published package layout:

```typescript
import { RequestContextModule } from '@tacxou/nestjs_module_restools/dist/request-context'
import { RealIp } from '@tacxou/nestjs_module_restools/dist/real-ip'
```

---

### `real-ip`

Parameter decorator that resolves the client IP via [`request-ip`](https://www.npmjs.com/package/request-ip).

```bash
yarn add request-ip
```

```typescript
import { Controller, Get } from '@nestjs/common'
import { RealIp } from '@tacxou/nestjs_module_restools/dist/real-ip'

@Controller('auth')
export class AuthController {
  @Get('ping')
  ping(@RealIp() ip: string | null) {
    return { ip }
  }
}
```

---

### `request-context`

Stores the current Express `req` / `res` in `AsyncLocalStorage` so any code in the same async chain can read them (e.g. `AbstractService.request`).

**Setup**

```typescript
import { Module } from '@nestjs/common'
import { RequestContextModule } from '@tacxou/nestjs_module_restools/dist/request-context'

@Module({
  imports: [RequestContextModule],
})
export class AppModule {}
```

`RequestContextModule` applies `RequestContextMiddleware` to all routes (`*`).

**Read context in a service**

```typescript
import { RequestContextStorage } from '@tacxou/nestjs_module_restools/dist/request-context'

const ctx = RequestContextStorage.currentContext
const req = ctx?.req
```

Flow: HTTP request → middleware → `storage.run(context, next)` → controllers / services see `currentContext`.

---

### `search-filter-schema`

Parses query-string filters and pagination into objects usable with MongoDB (or any store).

Import:

```typescript
import {
  SearchFilterSchema,
  SearchFilterOptions,
  filterSchema,
  filterOptions,
} from '@tacxou/nestjs_module_restools/dist/search-filter-schema'
```

#### `@SearchFilterSchema()` / `filterSchema()`

**Syntax:** `filters[PREFIX + FIELD]=VALUE`

| Prefix | Description |
|--------|-------------|
| `:` | Equal |
| `#` | Number equal |
| `!#` | Number not equal |
| `!:` | Not equal |
| `>` | Greater than |
| `>|` | Greater than or equal |
| `<` | Less than |
| `<|` | Less than or equal |
| `@` | In |
| `!@` | Not in |
| `@#` | Number in |
| `!@#` | Number not in |
| `^` | Regex |
| `?` | Boolean (`true` / `false` / `1` / `0`) |

**Examples**

- `filters[=subject]=53` → `{ subject: 53 }` (or string, depending on field)
- `filters[:concernedTo]=65fab2d6946a5ede152f2689` → ObjectId when `convertObjectId` is enabled
- `filters[^sequence]=/53/` → regex on `sequence`

**Controller usage**

```typescript
import { Controller, Get } from '@nestjs/common'
import {
  SearchFilterSchema,
  SearchFilterOptions,
} from '@tacxou/nestjs_module_restools/dist/search-filter-schema'

@Controller('search')
export class SearchController {
  @Get()
  search(
    @SearchFilterSchema() filters: Record<string, unknown>,
    @SearchFilterOptions() options: { limit: number; skip: number; sort: Record<string, 1 | -1> },
  ) {
    return { filters, options }
  }
}
```

**curl example**

```bash
curl --request GET \
  --url 'http://localhost/search?limit=9999&filters%5B%5Esequence%5D=%2F53%2F&sort%5Bmetadata.createdAt%5D=-1&sort%5Bsubject%5D=1'

# limit=9999
# filters[^sequence]=/53/
# sort[metadata.createdAt]=-1
# sort[subject]=1
```

Decorator options (see source): `queryKey`, `strict`, `unsafe`, `convertObjectId`, `convertNull`, `allowedFilters`, etc.

#### `@SearchFilterOptions()` / `filterOptions()`

Reads pagination and sort from the query string:

| Query key | Default | Role |
|-----------|---------|------|
| `limit` | `10` | Page size (`allowUnlimited` for no cap) |
| `skip` / `page` | `0` | Offset (if both `skip` and `page` are set, `skip` is ignored) |
| `sort[field]` | `{}` | `1` / `-1` or `asc` / `desc` |

---

### `mongoose`

Typed CRUD base service, route pipes, and exception filter for Mongoose 9.

Import:

```typescript
import {
  AbstractServiceSchema,
  ServiceSchemaInterface,
  EventEmitterSeparator,
  ObjectIdValidationPipe,
  MongooseValidationFilter,
} from '@tacxou/nestjs_module_restools/dist/mongoose'
```

Dependencies: `mongoose`, `@nestjs/mongoose`, `@nestjs/event-emitter`, and core `AbstractService` (via extends).

#### `AbstractServiceSchema<TRawDoc, THydrated>`

Generic class-level types (no per-method `<T>` shadowing):

- `TRawDoc` — plain document interface (`_id?: Types.ObjectId`, fields…).
- `THydrated` — defaults to `HydratedDocument<TRawDoc>`.

**CRUD methods** (return hydrated documents, not Mongoose `Query`):

| Method | Returns |
|--------|---------|
| `find(filter?, projection?, options?)` | `Promise<THydrated[]>` |
| `findOne(filter?, …)` | `Promise<THydrated>` (throws `NotFoundException`) |
| `findById(id, …)` | `Promise<THydrated>` |
| `count(filter?, options?)` | `Promise<number>` |
| `findAndCount(filter?, …)` | `Promise<[THydrated[], number]>` |
| `create(data?, options?)` | `Promise<THydrated>` |
| `update(id, update, options?)` | `Promise<THydrated>` |
| `upsert(filter, update, options?)` | `Promise<THydrated>` |
| `delete(id, options?)` | `Promise<THydrated>` |

**Example service**

```typescript
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ModuleRef } from '@nestjs/core'
import { HydratedDocument, Model, Types } from 'mongoose'
import { AbstractServiceSchema } from '@tacxou/nestjs_module_restools/dist/mongoose'

interface IUser {
  _id?: Types.ObjectId
  email: string
  name: string
}

type HydratedUser = HydratedDocument<IUser>

@Injectable()
export class UserService extends AbstractServiceSchema<IUser, HydratedUser> {
  protected readonly model: Model<IUser, {}, {}, {}, HydratedUser>

  constructor(
    @InjectModel('User') model: Model<IUser, {}, {}, {}, HydratedUser>,
    moduleRef: ModuleRef,
    eventEmitter: EventEmitter2,
  ) {
    super({ moduleRef, eventEmitter })
    this.model = model
  }
}
```

Use [`RequestContextModule`](#request-context) so `this.request` and `this.moduleName` work inside hooks without passing `req` in the constructor.

#### EventEmitter hooks

When `eventEmitter` is set on the service context, each operation emits async hooks:

**Event name pattern**

```
{moduleName}.{serviceName}.service.{before|after}{Operation}
```

Example: `users.user.service.beforeFind` (segments lowercased; separator is `.` — `EventEmitterSeparator`).

**Before hooks** — listeners can return partial overrides merged into the operation:

| Key | Effect |
|-----|--------|
| `filter` | Merged into query filter |
| `projection` / `options` | Merged into Mongoose options |
| `data` | Merged into create payload |
| `update` | Merged into update query |
| `_id` | Overrides id for findById / update / delete |
| `stop` | If set, thrown immediately (abort operation) |

**After hooks** — listeners can return `data`, `created`, `updated`, `deleted`, `result`, or adjust `count` on `findAndCount`.

```typescript
import { OnEvent } from '@nestjs/event-emitter'

@Injectable()
export class UserHooksListener {
  @OnEvent('users.user.service.beforeFind')
  beforeFind(payload: { filter?: Record<string, unknown>; eventName: string }) {
    return { filter: { deleted: { $ne: true } } }
  }
}
```

#### `ObjectIdValidationPipe`

Validates route/param strings and returns `Types.ObjectId`.

```typescript
import { Controller, Get, Param } from '@nestjs/common'
import { Types } from 'mongoose'
import { ObjectIdValidationPipe } from '@tacxou/nestjs_module_restools/dist/mongoose'

@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id', ObjectIdValidationPipe) id: Types.ObjectId) {
    return { id: id.toString() }
  }
}
```

#### `MongooseValidationFilter()`

Factory for an exception filter that maps Mongoose `ValidationError` and `CastError` to HTTP 406 with a `validations` map.

```typescript
import { APP_FILTER } from '@nestjs/core'
import { MongooseValidationFilter } from '@tacxou/nestjs_module_restools/dist/mongoose'

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: MongooseValidationFilter(),
    },
  ],
})
export class AppModule {}
```

Pass custom exception types: `MongooseValidationFilter([MyCustomError])`.

Debug: add `?debug=1` to the query in non-production to include `_exception` in the response body.

---

## Development

From the repository root:

```bash
yarn install
yarn build      # compile to dist/
yarn test       # Jest (*.spec.ts)
yarn test:types # TypeScript checks for mongoose typetest
yarn test:cov   # coverage
```

Source layout mirrors `dist/`:

```
src/
  index.ts                 # core exports only
  _abstracts/
  _pipes/
  _services/
  real-ip/
  request-context/
  search-filter-schema/
  mongoose/
```

---

## License

MIT — see [LICENSE](LICENSE).
