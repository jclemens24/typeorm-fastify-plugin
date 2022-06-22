import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { DataSource, DataSourceOptions } from 'typeorm';

declare module 'fastify' {
	interface FastifyInstance {
		orm: DataSource;
	}
}

type DBConfigOptions = {
	connection?: DataSource;
} & Partial<DataSourceOptions>;

const pluginAsync: FastifyPluginAsync<DBConfigOptions> = async (
	fastify,
	options
) => {
	let connection: DataSource;

	if (options.connection) {
		connection = options.connection;
	} else {
		connection = new DataSource(options as DataSourceOptions);
	}

	await connection.initialize();
	fastify.decorate('orm', connection);
	fastify.addHook('onClose', async (fastifyInstance, done) => {
		await fastifyInstance.orm.destroy();
		done();
	});

	return Promise.resolve();
};

export default fp(pluginAsync, {
	fastify: '4.x',
	name: '@fastify-typeorm',
});
