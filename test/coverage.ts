import tap from 'tap';
import Fastify from 'fastify';
import { DataSource } from 'typeorm';
import plugin from '../src/plugin';

const test = tap.test;

test('MySQL instance should be available', async t => {
	const fastify = Fastify();

	const datasource = fastify.register(plugin, {
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

test('Should be able to pass a connection', async t => {
	const fastify = Fastify();

	const connection = new DataSource({
		host: '127.0.0.1',
		port: 3306,
		type: 'mysql',
		database: 'test_db',
		username: 'jclemens',
		password: 'qzpm*QZPM24',
	});

	fastify.register(plugin, { connection: connection });

	await fastify.ready();
	t.ok(fastify.orm);
	t.equal(fastify.orm, connection);
	await fastify.close();
});

test('Should reject invalid DataSourceOptions passed', async t => {
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
