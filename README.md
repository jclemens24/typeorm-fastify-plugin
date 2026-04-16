# typeorm-fastify-plugin

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/jclemens24/typeorm-fastify-plugin/ci.yml)
![npm](https://img.shields.io/npm/v/typeorm-fastify-plugin)
![node](https://img.shields.io/node/v/typeorm-fastify-plugin)

A Fastify plugin that connects, organizes, and decorates your [TypeORM](https://typeorm.io/) DataSource instances. Includes health checks, connection retry, transaction helpers, and automatic Pino logging.

## Install

```bash
npm install typeorm-fastify-plugin typeorm fastify
```

`typeorm` and `fastify` are peer dependencies — install the versions your project needs. You also need the driver for your database (e.g. `pg`, `mysql2`, `better-sqlite3`).

## Quick Start

```typescript
import Fastify from 'fastify';
import plugin from 'typeorm-fastify-plugin';

const fastify = Fastify({ logger: true });

fastify.register(plugin, {
	type: 'postgres',
	host: 'localhost',
	port: 5432,
	username: 'app',
	password: 'secret',
	database: 'mydb',
	entities: [User, Product],
	synchronize: false
});

await fastify.ready();

const users = await fastify.orm.getRepository(User).find();
```

The Fastify instance is decorated with `orm` — a fully initialized TypeORM `DataSource` available everywhere in your app.

## Pre-built DataSource

```typescript
import { DataSource } from 'typeorm';

const connection = new DataSource({
	type: 'postgres',
	host: 'localhost',
	database: 'mydb',
	entities: [User]
});

fastify.register(plugin, { connection });
```

## Multiple Namespaces

Register multiple databases using the `namespace` option:

```typescript
fastify.register(plugin, {
	namespace: 'primary',
	type: 'postgres',
	host: 'localhost',
	database: 'main_db'
});

fastify.register(plugin, {
	namespace: 'analytics',
	type: 'postgres',
	host: 'localhost',
	database: 'analytics_db'
});

await fastify.ready();

fastify.orm['primary'].getRepository(User);
fastify.orm['analytics'].getRepository(Event);
```

## Health Check

```typescript
import { healthCheck } from 'typeorm-fastify-plugin';

fastify.get('/health/db', async () => {
	const healthy = await healthCheck(fastify.orm);
	if (!healthy) throw { statusCode: 503, message: 'database unavailable' };
	return { status: 'ok' };
});
```

Runs a driver-aware ping (`SELECT 1`, `SELECT 1 FROM DUAL` for Oracle, etc.). Returns `false` for uninitialized connections or query failures.

## Transactions

```typescript
import { transact } from 'typeorm-fastify-plugin';

const userId = await transact(fastify.orm, async (manager) => {
	const user = manager.getRepository(User).create({ name: 'Alice' });
	const saved = await manager.getRepository(User).save(user);
	return saved.id;
});
```

Wraps the callback in `BEGIN` / `COMMIT` with automatic `ROLLBACK` on error.

## Connection Retry

```typescript
fastify.register(plugin, {
	type: 'postgres',
	host: 'localhost',
	database: 'mydb',
	retries: 3,
	retryDelay: 1000 // ms, doubles each attempt (exponential backoff)
});
```

If all attempts fail, throws a `TypeOrmPluginError` with sanitized connection details (no password).

## Logging

When Fastify logging is enabled and no custom `logger` is provided, the plugin automatically bridges TypeORM logs through Pino via `PinoTypeormLogger`.

```typescript
const fastify = Fastify({ logger: true });

fastify.register(plugin, {
	type: 'postgres',
	host: 'localhost',
	database: 'mydb',
	logging: ['query', 'error']
});
```

You can also use it directly:

```typescript
import { PinoTypeormLogger } from 'typeorm-fastify-plugin';

const ds = new DataSource({
	type: 'postgres',
	logging: ['query', 'error'],
	logger: new PinoTypeormLogger(fastify.log, ['query', 'error'])
});
```

To use a different logger, pass any TypeORM-compatible logger:

```typescript
fastify.register(plugin, {
	type: 'postgres',
	host: 'localhost',
	database: 'mydb',
	logger: 'advanced-console'
});
```

## API

### Plugin Options

| Option       | Type                | Default | Description                                        |
| ------------ | ------------------- | ------- | -------------------------------------------------- |
| `connection` | `DataSource`        | —       | Pre-built DataSource instance                      |
| `namespace`  | `string`            | —       | Register under a namespace key                     |
| `retries`    | `number`            | `0`     | Additional connection attempts after first failure |
| `retryDelay` | `number`            | `1000`  | Base delay in ms (doubles each retry)              |
| `...rest`    | `DataSourceOptions` | —       | Passed directly to `new DataSource()`              |

### Exports

| Export                  | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `default`               | Fastify plugin function                                      |
| `healthCheck(ds)`       | Returns `Promise<boolean>` — driver-aware connectivity check |
| `transact(ds, fn)`      | Runs `fn` inside a transaction, returns its result           |
| `TypeOrmPluginError`    | Error class with `.connectionDetails` and `.cause`           |
| `PinoTypeormLogger`     | TypeORM logger that routes through Pino                      |
| `TypeOrmNamespaceStore` | Type for namespace mode (`{ [key]: DataSource }`)            |
| `DatabaseConfigOptions` | Type for plugin options                                      |

## License

MIT
