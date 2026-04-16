import tap from 'tap';
import Fastify from 'fastify';
import { DataSource, EntitySchema } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import sinon from 'sinon';
import plugin, {
	healthCheck,
	transact,
	TypeOrmPluginError,
	PinoTypeormLogger,
	type TypeOrmNamespaceStore,
	type DatabaseConfigOptions
} from '../build/plugin.js';

interface User {
	id: number;
	name: string;
}

const UserSchema = new EntitySchema<User>({
	name: 'User',
	tableName: 'users',
	columns: {
		id: { type: Number, primary: true, generated: 'increment' },
		name: { type: String }
	}
});

const test = tap.test;

test('registers with inline SQLite config', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:'
	});

	await fastify.ready();
	t.ok(fastify.orm, 'orm should be decorated');
	t.ok(fastify.orm.isInitialized, 'datasource should be initialized');
	t.equal(fastify.orm.options.type, 'better-sqlite3');
	await fastify.close();
});

test('registers with a pre-built DataSource', async (t) => {
	const fastify = Fastify();
	const connection = new DataSource({
		type: 'better-sqlite3',
		database: ':memory:'
	});

	fastify.register(plugin, { connection });
	await fastify.ready();

	t.ok(fastify.orm.isInitialized);
	t.equal(fastify.orm, connection, 'orm should be the same DataSource instance');
	await fastify.close();
});

test('assigns PinoTypeormLogger when no logger provided (inline)', async (t) => {
	const fastify = Fastify({ logger: true });
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:'
	});

	await fastify.ready();
	t.equal(
		fastify.orm.options.logger?.constructor.name,
		'PinoTypeormLogger',
		'should use PinoTypeormLogger by default'
	);
	await fastify.close();
});

test('assigns PinoTypeormLogger to pre-built DataSource without logger', async (t) => {
	const fastify = Fastify({ logger: true });
	const connection = new DataSource({
		type: 'better-sqlite3',
		database: ':memory:'
	});

	fastify.register(plugin, { connection });
	await fastify.ready();

	t.equal(
		fastify.orm.options.logger?.constructor.name,
		'PinoTypeormLogger',
		'should inject PinoTypeormLogger into pre-built connection'
	);
	await fastify.close();
});

test('does not overwrite existing logger on pre-built DataSource', async (t) => {
	const fastify = Fastify({ logger: true });
	const connection = new DataSource({
		type: 'better-sqlite3',
		database: ':memory:',
		logger: 'advanced-console'
	});

	fastify.register(plugin, { connection });
	await fastify.ready();

	t.equal(fastify.orm.options.logger, 'advanced-console', 'should preserve the existing logger');
	await fastify.close();
});

test('registers with a namespace', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		namespace: 'db1',
		type: 'better-sqlite3',
		database: ':memory:'
	});

	await fastify.ready();
	const store = fastify.orm as unknown as TypeOrmNamespaceStore;
	t.ok(store['db1'], 'namespace db1 should exist');
	t.ok(store['db1'].isInitialized, 'namespace datasource should be initialized');
	await fastify.close();
});

test('registers multiple namespaces', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		namespace: 'primary',
		type: 'better-sqlite3',
		database: ':memory:'
	});
	fastify.register(plugin, {
		namespace: 'secondary',
		type: 'better-sqlite3',
		database: ':memory:'
	});

	await fastify.ready();
	const store = fastify.orm as unknown as TypeOrmNamespaceStore;
	t.ok(store['primary'], 'primary namespace should exist');
	t.ok(store['secondary'], 'secondary namespace should exist');
	t.not(store['primary'], store['secondary'], 'should be distinct DataSource instances');
	await fastify.close();
});

test('rejects duplicate namespace', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		namespace: 'dup',
		type: 'better-sqlite3',
		database: ':memory:'
	});
	fastify.register(plugin, {
		namespace: 'dup',
		type: 'better-sqlite3',
		database: ':memory:'
	});

	try {
		await fastify.ready();
		t.fail('should reject duplicate namespace');
	} catch (err) {
		t.match(String(err), /Namespace dup is already in use/);
	}
	await fastify.close();
});

test('destroys datasource on close (direct mode)', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:'
	});

	await fastify.ready();
	t.ok(fastify.orm.isInitialized, 'should be initialized before close');
	await fastify.close();
	t.notOk(fastify.orm.isInitialized, 'should be destroyed after close');
});

test('destroys datasource on close (namespace mode)', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		namespace: 'ns1',
		type: 'better-sqlite3',
		database: ':memory:'
	});

	await fastify.ready();
	const store = fastify.orm as unknown as TypeOrmNamespaceStore;
	t.ok(store['ns1'].isInitialized);
	await fastify.close();
	t.notOk(store['ns1'].isInitialized, 'namespace datasource should be destroyed');
});

test('healthCheck returns true for initialized SQLite datasource', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:'
	});

	await fastify.ready();
	const result = await healthCheck(fastify.orm);
	t.equal(result, true);
	await fastify.close();
});

test('healthCheck returns false for uninitialized datasource', async (t) => {
	const ds = new DataSource({
		type: 'better-sqlite3',
		database: ':memory:'
	});
	const result = await healthCheck(ds);
	t.equal(result, false);
});

test('healthCheck returns false after datasource is destroyed', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:'
	});

	await fastify.ready();
	const orm = fastify.orm;
	await fastify.close();
	const result = await healthCheck(orm);
	t.equal(result, false);
});

test('transact commits on success', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:',
		entities: [UserSchema],
		synchronize: true
	});

	await fastify.ready();
	await transact(fastify.orm, async (manager) => {
		const repo = manager.getRepository(UserSchema);
		await repo.save(repo.create({ name: 'Alice' }));
	});

	const users = await fastify.orm.getRepository(UserSchema).find();
	t.equal(users.length, 1);
	t.equal(users[0].name, 'Alice');
	await fastify.close();
});

test('transact rolls back on error', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:',
		entities: [UserSchema],
		synchronize: true
	});

	await fastify.ready();

	await transact(fastify.orm, async (manager) => {
		const repo = manager.getRepository(UserSchema);
		await repo.save(repo.create({ name: 'Bob' }));
	});

	try {
		await transact(fastify.orm, async (manager) => {
			const repo = manager.getRepository(UserSchema);
			await repo.save(repo.create({ name: 'Charlie' }));
			throw new Error('forced rollback');
		});
		t.fail('should have thrown');
	} catch (err) {
		t.match(String(err), /forced rollback/);
	}

	const users = await fastify.orm.getRepository(UserSchema).find();
	t.equal(users.length, 1, 'rollback should have reverted Charlie insert');
	t.equal(users[0].name, 'Bob');
	await fastify.close();
});

test('transact returns the callback value', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:',
		entities: [UserSchema],
		synchronize: true
	});

	await fastify.ready();
	const result = await transact(fastify.orm, async (manager) => {
		const repo = manager.getRepository(UserSchema);
		const saved = await repo.save(repo.create({ name: 'Dave' }));
		return saved.id;
	});

	t.type(result, 'number', 'transact should return the callback result');
	await fastify.close();
});

test('warns when synchronize: true in production', async (t) => {
	const originalEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'production';

	const fastify = Fastify({ logger: true });
	const warnSpy = sinon.spy(fastify.log, 'warn');

	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:',
		synchronize: true
	});

	await fastify.ready();
	t.ok(
		warnSpy.calledWithMatch(/synchronize: true.*production/i),
		'should warn about synchronize in production'
	);

	process.env.NODE_ENV = originalEnv;
	warnSpy.restore();
	await fastify.close();
});

test('does not warn when synchronize: true outside production', async (t) => {
	const originalEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'development';

	const fastify = Fastify({ logger: true });
	const warnSpy = sinon.spy(fastify.log, 'warn');

	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:',
		synchronize: true
	});

	await fastify.ready();
	t.notOk(
		warnSpy.calledWithMatch(/synchronize: true.*production/i),
		'should not warn outside production'
	);

	process.env.NODE_ENV = originalEnv;
	warnSpy.restore();
	await fastify.close();
});

test('succeeds on first attempt without retries configured', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: ':memory:'
	});

	await fastify.ready();
	t.ok(fastify.orm.isInitialized);
	await fastify.close();
});

test('TypeOrmPluginError exposes connectionDetails without password', async (t) => {
	const cause = new Error('connection failed');
	const dsOptions = {
		type: 'better-sqlite3' as const,
		database: ':memory:',
		host: 'localhost',
		port: 5432,
		username: 'admin',
		password: 'super_secret'
	};

	const error = new TypeOrmPluginError('init failed', dsOptions, cause);

	t.equal(error.name, 'TypeOrmPluginError');
	t.equal(error.message, 'init failed');
	t.equal(error.cause, cause);
	t.equal(error.connectionDetails.type, 'better-sqlite3');
	t.equal(error.connectionDetails.host, 'localhost');
	t.equal(error.connectionDetails.port, 5432);
	t.equal(error.connectionDetails.username, 'admin');
	t.notOk('password' in error.connectionDetails, 'password must not be in connectionDetails');
});

test('throws TypeOrmPluginError on invalid datasource config with retries exhausted', async (t) => {
	const fastify = Fastify();
	fastify.register(plugin, {
		type: 'better-sqlite3',
		database: '/nonexistent/path/that/cannot/exist/db.sqlite',
		retries: 1,
		retryDelay: 10
	});

	try {
		await fastify.ready();
		t.fail('should throw on invalid database path');
	} catch (err) {
		t.ok(err instanceof TypeOrmPluginError, 'error should be TypeOrmPluginError');
		t.match(String(err), /Failed to initialize DataSource after 2 attempt/);
		t.ok((err as TypeOrmPluginError).cause, 'should have a cause');
	}
	await fastify.close();
});

test('does not mutate the caller options object', async (t) => {
	const fastify = Fastify();
	const opts: DatabaseConfigOptions = {
		namespace: 'immutable_test',
		type: 'better-sqlite3',
		database: ':memory:'
	};

	const optsCopy = { ...opts };
	fastify.register(plugin, opts);

	await fastify.ready();
	t.strictSame(opts, optsCopy, 'original options object should not be mutated');
	await fastify.close();
});

function mockPino() {
	return {
		debug: sinon.spy(),
		info: sinon.spy(),
		warn: sinon.spy(),
		error: sinon.spy(),
		trace: sinon.spy(),
		fatal: sinon.spy(),
		child: sinon.stub().returnsThis(),
		level: 'debug',
		silent: sinon.spy(),
		isLevelEnabled: sinon.stub().returns(true)
	} as any;
}

test('PinoTypeormLogger: logQuery routes to pino.debug', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	logger.logQuery('SELECT 1', ['param1']);

	t.ok(pino.debug.called, 'debug should be called');
	t.match(pino.debug.firstCall.args[1], /SELECT 1/, 'should contain query text');
});

test('PinoTypeormLogger: logQueryError routes to pino.error', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	logger.logQueryError('some error', 'SELECT bad');

	t.ok(pino.error.called, 'error should be called');
});

test('PinoTypeormLogger: logQuerySlow routes to pino.warn', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	logger.logQuerySlow(5000, 'SELECT slow');

	t.ok(pino.warn.called, 'warn should be called for slow queries');
});

test('PinoTypeormLogger: logSchemaBuild routes to pino.debug', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	logger.logSchemaBuild('building schema');

	t.ok(pino.debug.called, 'debug should be called for schema build');
});

test('PinoTypeormLogger: logMigration routes to pino.debug', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	logger.logMigration('running migration');

	t.ok(pino.debug.called, 'debug should be called for migration');
});

test('PinoTypeormLogger: log("info") routes to pino.info', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	logger.log('info', 'some info message');

	t.ok(pino.info.called, 'info should be called');
});

test('PinoTypeormLogger: log("warn") routes to pino.warn', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	logger.log('warn', 'some warning');

	t.ok(pino.warn.called, 'warn should be called');
});

test('PinoTypeormLogger: log("log") routes to pino.debug', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	logger.log('log', 'general log');

	t.ok(pino.debug.called, 'debug should be called for log level');
});

test('PinoTypeormLogger: logQuery with QueryRunner having active transaction', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	const mockQR = {
		isTransactionActive: true,
		data: {}
	} as unknown as QueryRunner;

	logger.logQuery('SELECT 1', [], mockQR);

	t.ok(pino.debug.called, 'debug should be called');
	const entry = pino.debug.firstCall.args[0];
	t.ok(entry.queryRunner, 'should have queryRunner context');
	t.equal(entry.queryRunner.isTransactionActive, true, 'should capture isTransactionActive');
});

test('PinoTypeormLogger: logQuery with QueryRunner having data', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	const mockQR = {
		isTransactionActive: false,
		data: { traceId: 'abc-123' }
	} as unknown as QueryRunner;

	logger.logQuery('SELECT 1', [], mockQR);

	t.ok(pino.debug.called, 'debug should be called');
	const entry = pino.debug.firstCall.args[0];
	t.ok(entry.queryRunner, 'should have queryRunner context');
	t.equal(entry.queryRunner.data.traceId, 'abc-123', 'should capture data');
});

test('PinoTypeormLogger: logQuery with QueryRunner having both transaction and data', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	const mockQR = {
		isTransactionActive: true,
		data: { requestId: 'req-1' }
	} as unknown as QueryRunner;

	logger.logQuery('SELECT 1', [], mockQR);

	const entry = pino.debug.firstCall.args[0];
	t.equal(entry.queryRunner.isTransactionActive, true);
	t.equal(entry.queryRunner.data.requestId, 'req-1');
});

test('PinoTypeormLogger: logQuery with QueryRunner having no context (empty)', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	const mockQR = {
		isTransactionActive: false,
		data: {}
	} as unknown as QueryRunner;

	logger.logQuery('SELECT 1', [], mockQR);

	t.ok(pino.debug.called, 'debug should still be called');
	const entry = pino.debug.firstCall.args[0];
	t.notOk(entry.queryRunner, 'should not include queryRunner when context is empty');
});

test('PinoTypeormLogger: logQuery without QueryRunner', async (t) => {
	const pino = mockPino();
	const logger = new PinoTypeormLogger(pino, 'all');

	logger.logQuery('SELECT 1');

	t.ok(pino.debug.called, 'debug should be called');
	const entry = pino.debug.firstCall.args[0];
	t.notOk(entry.queryRunner, 'should not include queryRunner when not provided');
});

test('healthCheck returns false when initialized datasource query throws', async (t) => {
	const ds = {
		isInitialized: true,
		options: { type: 'better-sqlite3' },
		query: sinon.stub().rejects(new Error('query failed'))
	} as unknown as DataSource;

	const result = await healthCheck(ds);
	t.equal(result, false, 'should return false when query throws');
});

test('healthCheck uses SELECT 1 FROM DUAL for oracle', async (t) => {
	const queryStub = sinon.stub().resolves();
	const ds = {
		isInitialized: true,
		options: { type: 'oracle' },
		query: queryStub
	} as unknown as DataSource;

	const result = await healthCheck(ds);
	t.equal(result, true);
	t.ok(queryStub.calledWith('SELECT 1 FROM DUAL'), 'should use oracle-specific query');
});

test('healthCheck uses SELECT now() FROM dummy for sap', async (t) => {
	const queryStub = sinon.stub().resolves();
	const ds = {
		isInitialized: true,
		options: { type: 'sap' },
		query: queryStub
	} as unknown as DataSource;

	const result = await healthCheck(ds);
	t.equal(result, true);
	t.ok(queryStub.calledWith('SELECT now() FROM dummy'), 'should use sap-specific query');
});

test('healthCheck returns isInitialized for mongodb (no query)', async (t) => {
	const ds = {
		isInitialized: true,
		options: { type: 'mongodb' }
	} as unknown as DataSource;

	const result = await healthCheck(ds);
	t.equal(result, true, 'should return true for initialized mongodb');
});

test('healthCheck returns false for uninitialized mongodb', async (t) => {
	const ds = {
		isInitialized: false,
		options: { type: 'mongodb' }
	} as unknown as DataSource;

	const result = await healthCheck(ds);
	t.equal(result, false, 'should return false for uninitialized mongodb');
});
