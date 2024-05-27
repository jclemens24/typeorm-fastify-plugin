/// <reference path="../build/plugin.d.ts" />

import tap from 'tap';
import Fastify, { FastifyBaseLogger } from 'fastify';
import { DataSource, QueryRunner } from 'typeorm';
import plugin from '../build/plugin.js';
import { PinoTypeormLogger } from '../build/pinoLogger.js';
import sinon from 'sinon';

declare module 'fastify' {
  interface FastifyInstance {
    orm: DataSource & FastifyTypeormInstance;
  }
}
interface FastifyTypeormInstance {
  [namespace: string]: DataSource;
}

const test = tap.test;

test('MySQL instance should be available', async (t) => {
  const fastify = Fastify();

  const connection = new DataSource({
    host: 'localhost',
    port: 3306,
    type: 'mysql',
    database: 'test_db',
    username: 'root',
    password: 'root',
  });
  const datasource = fastify.register(plugin, {
    connection: connection,
    ...connection.options,
  });

  await fastify.ready();
  t.ok(fastify.orm);
  t.equal(fastify.orm, datasource.orm);
  // Test the logger. Declaring no logger should default to PinoTypeormLogger
  // const logger = fastify.orm.options.logger as PinoTypeormLogger;
  // t.ok(
  //   logger instanceof PinoTypeormLogger,
  //   'Logger should be an instance of PinoTypeormLogger'
  // );
  await fastify.close();
});

test('Logger should log expected message', async (t) => {
  const fastify = Fastify({ logger: true });
  const logger = new PinoTypeormLogger(fastify.log);
  fastify.register(plugin, {
    host: '127.0.0.1',
    port: 3306,
    type: 'mysql',
    database: 'test_db',
    username: 'root',
    password: 'root',
    logger: logger,
  });

  await fastify.ready();

  t.ok(
    fastify.orm.options.logger instanceof PinoTypeormLogger,
    'Logger should be an instance of PinoTypeormLogger'
  );
  await fastify.close();
});

test('Should be able to pass a connection', async (t) => {
  const fastify = Fastify();

  // const connection = new DataSource({
  //   host: '127.0.0.1',
  //   port: 3306,
  //   type: 'mysql',
  //   database: 'test_db',
  //   username: 'root',
  //   password: 'root',
  //   logger: 'simple-console',
  // });

  fastify.register(plugin, {
    host: '127.0.0.1',
    port: 3306,
    type: 'mysql',
    database: 'test_db',
    username: 'root',
    password: 'root',
    logger: 'simple-console',
  });

  await fastify.ready();
  t.ok(fastify.orm);
  // t.equal(fastify.orm, connection);
  await fastify.close();
});

test('Should be able to initialize a namespace', async (t) => {
  const fastify = Fastify();

  fastify.register(plugin, {
    namespace: 'mysql1',
    type: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    database: 'test_db',
    username: 'root',
    password: 'root',
  });

  await fastify.ready();
  t.ok(fastify.orm['mysql1']);
  await fastify.close();
});

test('Should reject same namespace used twice', async (t) => {
  const fastify = Fastify();

  fastify.register(plugin, {
    namespace: 'mysql1',
    type: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    database: 'test_db',
    username: 'root',
    password: 'root',
  });

  fastify.register(plugin, {
    namespace: 'mysql1',
    type: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    database: 'test_db',
    username: 'root',
    password: 'root',
  });

  try {
    await fastify.ready();
    t.fail('should reject same namespace being used twice');
  } catch (err) {
    t.ok(err);
    await fastify.close();
  }
});

test('Should reject invalid DataSourceOptions passed', async (t) => {
  const fastify = Fastify();

  fastify.register(plugin, {
    host: '127.0.0.1',
    port: 3306,
    type: 'mysql',
  });

  try {
    await fastify.ready();
    t.fail('should reject without proper config info');
  } catch (err) {
    t.ok(err);
    await fastify.close();
  }
});

test('PinoTypeormLogger', async (t) => {
  const mockLogger = {
    debug: sinon.spy(),
    error: sinon.spy(),
    info: sinon.spy(),
    warn: sinon.spy(),
  } as unknown as FastifyBaseLogger;

  const logger = new PinoTypeormLogger(mockLogger);

  logger.logQuery('SELECT * FROM users', ['param1', 'param2']);
  t.ok(
    (mockLogger.debug as sinon.SinonSpy).calledWithExactly({
      msg: 'SELECT * FROM users -- PARAMETERS: ["param1","param2"]',
      queryRunner: undefined,
    }),
    'logQuery should call debug with correct arguments'
  );

  logger.logQueryError(
    new Error('Error, something went wrong'),
    'SELECT * FROM users',
    ['param1', 'param2']
  );
  t.ok(
    (mockLogger.error as sinon.SinonSpy).calledWithExactly({
      msg: 'Error: Error, something went wrong SELECT * FROM users -- PARAMETERS: ["param1","param2"]',
      queryRunner: undefined,
    }),
    'logQueryError should call error with correct arguments'
  );

  logger.logQuerySlow(1000, 'SELECT * FROM users', ['param1', 'param2']);
  t.ok(
    (mockLogger.warn as sinon.SinonSpy).calledWithExactly({
      msg: 'Time 1000ms - SELECT * FROM users -- PARAMETERS: ["param1","param2"]',
      queryRunner: undefined,
    }),
    'logQuerySlow should call warn with correct arguments'
  );

  logger.logSchemaBuild('Schema build successful');
  t.ok(
    (mockLogger.debug as sinon.SinonSpy).calledWithExactly({
      msg: 'Schema build successful',
      queryRunner: undefined,
    }),
    'logSchemaBuild should call info with correct arguments'
  );

  logger.logMigration('Migration successful');
  t.ok(
    (mockLogger.debug as sinon.SinonSpy).calledWithExactly({
      msg: 'Migration successful',
      queryRunner: undefined,
    }),
    'logMigration should call info with correct arguments'
  );
  logger.log('info', 'Log Message');
  t.ok(
    (mockLogger.info as sinon.SinonSpy).calledWithExactly({
      msg: 'Log Message',
      queryRunner: undefined,
    }),
    'log should call info with correct arguments'
  );
  logger.log('warn', 'Log Message');
  t.ok(
    (mockLogger.warn as sinon.SinonSpy).calledWithExactly({
      msg: 'Log Message',
      queryRunner: undefined,
    }),
    'log should call warn with correct arguments'
  );
  logger.log('log', 'Log Message');
  t.ok(
    (mockLogger.info as sinon.SinonSpy).calledWithExactly({
      msg: 'Log Message',
      queryRunner: undefined,
    }),
    'log should call info with correct arguments'
  );
});

test('PinoTypeormLogger stringifyParams with circular reference', async (t) => {
  const app = Fastify({ logger: true });
  const realLogger = app.log;

  const logger = new PinoTypeormLogger(realLogger);

  // Create an object with a circular reference
  interface CircularObject {
    self?: CircularObject;
  }
  const circularObject: CircularObject = {
    self: undefined,
  };
  circularObject['self'] = circularObject;

  // Call stringifyParams with the circular object
  const result = logger['stringifyParams']([circularObject]);

  t.match(
    result,
    /TypeError: Converting circular structure to JSON\s*-->\s*starting at object with constructor 'Object'\s*--- property 'self' closes the circle/,
    'stringifyParams should return an error message when it cannot stringify parameters'
  );
});

test('PinoTypeormLogger with console logging', async (t) => {
  const app = Fastify({ logger: { level: 'debug' } });
  const realLogger = app.log;

  const logger = new PinoTypeormLogger(realLogger);

  logger.logQuery('SELECT * FROM users', ['param1', 'param2']);
  logger.logQueryError('Error message', 'SELECT * FROM users', [
    'param1',
    'param2',
  ]);
  logger.logQuerySlow(1000, 'SELECT * FROM users', ['param1', 'param2']);
  logger.logSchemaBuild('Schema build successful');
});

test('PinoTypeormLogger with QueryRunner', async (t) => {
  const mockLogger = {
    debug: sinon.spy(),
    error: sinon.spy(),
    info: sinon.spy(),
    warn: sinon.spy(),
  } as unknown as FastifyBaseLogger;

  const mockQueryRunner = {
    connect: sinon.stub(),
    disconnect: sinon.stub(),
    startTransaction: sinon.stub(),
    commitTransaction: sinon.stub(),
    rollbackTransaction: sinon.stub(),
    release: sinon.stub(),
  } as unknown as QueryRunner;

  const logger = new PinoTypeormLogger(mockLogger);

  logger.logQuery('SELECT * FROM users', ['param1', 'param2'], mockQueryRunner);
  t.ok(
    (mockLogger.debug as sinon.SinonSpy).calledWithExactly({
      msg: 'SELECT * FROM users -- PARAMETERS: ["param1","param2"]',
      queryRunner: mockQueryRunner,
    }),
    'logQuery should call debug with correct arguments'
  );
});
