"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tap_1 = tslib_1.__importDefault(require("tap"));
const fastify_1 = tslib_1.__importDefault(require("fastify"));
const typeorm_1 = require("typeorm");
const index_1 = tslib_1.__importDefault(require("../src/index"));
const test = tap_1.default.test;
test('MySQL instance should be available', async (t) => {
    const fastify = (0, fastify_1.default)();
    const datasource = fastify.register(index_1.default, {
        host: '127.0.0.1',
        port: 3306,
        type: 'mysql',
        database: 'test_db',
        username: 'jclemens',
        password: 'qzpm*QZPM24',
    });
    await fastify.ready();
    t.ok(fastify.orm);
    t.equal(fastify.orm, datasource.orm);
    await fastify.close();
});
test('Should be able to pass a connection', async (t) => {
    const fastify = (0, fastify_1.default)();
    const connection = new typeorm_1.DataSource({
        host: '127.0.0.1',
        port: 3306,
        type: 'mysql',
        database: 'test_db',
        username: 'jclemens',
        password: 'qzpm*QZPM24',
    });
    fastify.register(index_1.default, { connection: connection });
    await fastify.ready();
    t.ok(fastify.orm);
    t.equal(fastify.orm, connection);
    await fastify.close();
});
test('Should reject invalid DataSourceOptions passed', async (t) => {
    const fastify = (0, fastify_1.default)();
    fastify.register(index_1.default, {
        host: '127.0.0.1',
        port: 3306,
        type: 'mysql',
    });
    try {
        await fastify.ready();
        t.fail('should reject without proper config info');
    }
    catch (err) {
        t.ok(err);
        await fastify.close();
    }
});
//# sourceMappingURL=coverage.js.map