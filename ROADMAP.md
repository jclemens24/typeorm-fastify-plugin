---
Codebase Audit & Release Roadmap: typeorm-fastify-plugin
Current State
2 source files (plugin.ts — 81 lines, pinoLogger.ts — 122 lines), 1 test file (302 lines, MySQL-only via TAP). v3.0.0 published Oct 2024. 16 stars, 3 forks, single maintainer, 0 open issues. CI runs Node 20 + MySQL only. Last release 6+ months ago.
The plugin is functional but thin — it initializes a DataSource, decorates fastify with .orm, sets up onClose cleanup, and has a Pino logger bridge. That's it.
---

❌ Bugs & Code Issues (Fix Now)

1. typeorm is a direct dependency — should be peerDependency
   You called this out. typeorm@^0.3.26 in dependencies means npm installs a potentially different TypeORM version than the consumer's. TypeORM relies on global entity metadata — duplicate versions = metadata corruption, decorator failures, "Entity not found" runtime bombs. Same argument for fastify-plugin to a lesser degree.
2. PluginDataSource type is unsound
   type NamespacedDataSource = { [namespace: string]: DataSource };
   export type PluginDataSource = DataSource & NamespacedDataSource;
   The index signature [string]: DataSource conflicts with every DataSource method and property. TypeScript thinks fastify.orm.manager is both an EntityManager AND a DataSource. Worse — in namespace mode, fastify.decorate('orm', Object.create(null)) creates a plain object that is not a DataSource, but fastify.orm is typed as one. Calling fastify.orm.getRepository() in namespace mode crashes at runtime.
3. onClose hooks mix async styles
   fastify.addHook('onClose', (instance, done) => {
   instance.orm.destroy().then(() => { done(); });
   });
   No .catch(). If destroy() rejects, done() is never called → Fastify hangs on shutdown. Also inconsistent — the plugin function itself is async but the hook uses callback style.
4. delete options.namespace mutates caller's object
   Line 25 destructures then deletes from the options reference. If a consumer holds a reference to their config object, namespace silently disappears from it.
5. Logger assignment is a no-op for pre-built DataSources
   if (!options.connection.options.logger) {
   options.connection.logger = new PinoTypeormLogger(fastify.log);
   }
   options.connection.logger is a DataSource instance property, but TypeORM reads logger from options.logger at initialize() time. This assignment to .logger directly may not take effect depending on when initialization occurs. The check is correct (options.logger) but the write target is wrong.
6. return Promise.resolve() is redundant in async functions — Lines 62 & 75. Cosmetic, but signals unfamiliarity with async/await.
7. @types/react in devDependencies — Stray dependency. No React in this project.
8. SECURITY.md says v2.0.x is supported — Current version is v3.0.0.
9. Tests import from build/ not src/ — Testing compiled output, not source. Mixed imports (../build/plugin.js + ../src/plugin.ts type import) in the same file.
10. CI only tests Node 20 + MySQL — No Node 22 (current LTS). No SQLite for fast unit tests. No Postgres despite it being a reported issue (#252).

---

🔧 Missing Features (Ranked by User Value)
Ranked by what a consumer shipping to production actually needs, informed by what @fastify/postgres, @fastify/mongodb, and @fastify/mysql all provide that this plugin doesn't:
Tier 1 — Production Blockers
Feature Why
Health check helper K8s readiness/liveness probes need SELECT 1 pings. Zero DB plugins in the Fastify ecosystem ship this. First-mover advantage.
Proper error handling on init If DataSource.initialize() fails (bad creds, DB down), consumers get an opaque TypeORM error with no retry. Wrap with connection timeout + retry + meaningful error.
Connection retry with backoff DB briefly unavailable at startup = plugin throws, server crashes. Every mature DB client does retry.
Fix the type system The PluginDataSource intersection type is actively lying. Namespace mode and non-namespace mode need separate, accurate types via declaration merging or generics.
Tier 2 — DX Wins
Feature Why
Transaction helper @fastify/postgres has .transact() — wrap a callback in BEGIN/COMMIT/ROLLBACK automatically. TypeORM's DataSource.transaction() exists but isn't surfaced. A fastify.orm.transact(async (manager) => {...}) API or request-scoped request.orm with auto-transaction would be a massive DX win.
Request-scoped EntityManager Decorate request.orm with a per-request QueryRunner-backed EntityManager. Auto-release on response. This is how @fastify/postgres does request.pg.
Migration helpers Expose dataSource.runMigrations(), undoLastMigration(), showMigrations() through the plugin or as a CLI hook. TypeORM has the full API — just not wired.
synchronize: true production guard Log a loud warning (or throw) if synchronize: true + NODE_ENV=production. This has destroyed production databases.
Tier 3 — Ecosystem Polish
Feature
ESM + CJS dual publish
fastify-plugin metadata
Expand test matrix
TypeScript module augmentation docs

---

### 📋 Release Roadmap

#### v3.1.0 — "Fix the Foundation" (1-2 days)

_Non-breaking. Ship fast._

- [x] Move `typeorm` to `peerDependencies`, add `peerDependenciesMeta` with `optional: false`
- [x] Fix `onClose` hook: async/await + try/catch + `fastify.log.error` on destroy failure
- [x] Stop mutating options: spread/clone before `delete namespace`
- [x] Fix logger assignment for pre-built DataSource (`options.connection` path)
- [x] Remove `return Promise.resolve()` cruft
- [x] Remove `@types/react` from devDependencies
- [x] Update SECURITY.md to reference v3.x
- [x] Add `fastify-plugin` metadata (`dependencies: []`)
- [x] Add `synchronize: true` production warning
- [x] Fix `lint:frontend` script name → `lint:eslint` or just `lint:code`

#### v3.2.0 — "Production-Ready" (3-5 days)

_The release that makes this viable for real deployments._

- [x] Fix `PluginDataSource` type system — separate types for namespace vs direct mode, use declaration merging or overloaded decorator signatures
- [x] Add health check: `healthCheck(datasource)` — driver-aware ping (Oracle/SAP/MongoDB handled)
- [x] Add connection retry with exponential backoff on `initialize()` — configurable `retries`, `retryDelay`
- [x] Add `transact()` helper: `transact(datasource, async (manager) => { ... })` wrapping DataSource.transaction()
- [x] Wrap `initialize()` errors with a clear `TypeOrmPluginError` that includes connection details (sans password)
- [x] Add SQLite tests for CI (fast, no external DB)
- [x] Add Node 22 to CI matrix
- [x] Add Postgres to CI matrix

#### v4.0.0 — "DX Leap" (1-2 weeks)

_Breaking changes warranted. Major version bump._

- [x] **ESM output** — `"type": "module"` in package.json, `module: "Node16"`, `target: "ES2022"` in tsconfig _(done in 3.1.0)_
- [ ] **Request-scoped `request.orm`** — opt-in per-request QueryRunner+EntityManager decoration with auto-release on `onResponse`. Pattern:
  ```typescript
  fastify.register(plugin, {
    type: 'postgres', ...,
    requestScoped: true  // enables request.orm
  });
  // In handlers:
  fastify.get('/users', async (request) => {
    return request.orm.getRepository(User).find();
  });
  ```
- [ ] **Route-level auto-transactions** — inspired by `@fastify/postgres`:
  ```typescript
  fastify.get('/transfer', { orm: { transact: true } }, async (req) => {
  	await req.orm.getRepository(Account).decrement({ id: 1 }, 'balance', 100);
  	await req.orm.getRepository(Account).increment({ id: 2 }, 'balance', 100);
  	// Auto-COMMIT or ROLLBACK
  });
  ```
- [ ] **Migration API** — expose `runMigrations()`, `showMigrations()`, `undoLastMigration()` on the decorated instance
- [x] Bump tsconfig target to ES2022 (Node 20+ supports it) _(done in 3.1.0)_
- [x] Drop `lib: ["ES5", "ES6"]` → `lib: ["ES2022"]` _(done in 3.1.0)_
- [x] Restructure `exports` field with `types`, `import`, `require` conditions _(done in 3.1.0)_
- [ ] Add CHANGELOG.md

#### v4.1.0 — "Observability" (stretch)

- [ ] Optional slow query metric emission (tied to `maxQueryExecutionTime`)
- [ ] Connection pool stats exposure (`activeConnections`, `idleConnections`, `waitingRequests`)
- [ ] Optional health check route auto-registration (`/health/db`)

---

What Makes This Plugin Worth Using Over Raw TypeORM
Right now the value proposition is thin: "it calls initialize() and destroy() for you." After this roadmap, the value proposition becomes:

1. Zero-config Pino integration (already exists — unique strength)
2. Production safety (retry, health checks, synchronize guard)
3. Request-scoped transactions (the killer feature consumers actually need)
4. Multi-database namespaces (already exists — clean it up)
5. First-class Fastify lifecycle (proper shutdown, proper encapsulation)
   That's a plugin worth depending on.
