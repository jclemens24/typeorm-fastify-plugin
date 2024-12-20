import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { DataSource, DataSourceOptions } from 'typeorm';
import { PinoTypeormLogger } from './pinoLogger.js';

type NamespacedDataSource = {
	[namespace: string]: DataSource;
};

export type PluginDataSource = DataSource & NamespacedDataSource;

declare module 'fastify' {
	export interface FastifyInstance {
		orm: PluginDataSource;
	}
}

type DatabaseConfigOptions = {
	connection?: DataSource;
	namespace?: string;
} & Partial<DataSourceOptions>;

const plugin: FastifyPluginAsync<DatabaseConfigOptions> = async (fastify, options) => {
	const { namespace } = options;
	delete options.namespace;
	let datasource: DataSource;

	if (options.connection) {
		if (!options.connection.options.logger) {
			options.connection.logger = new PinoTypeormLogger(fastify.log);
		}
		datasource = options.connection;
	} else {
		const opts = {
			...options,
			logger: options.logger || new PinoTypeormLogger(fastify.log)
		};
		datasource = new DataSource(opts as DataSourceOptions);
	}

	// If a namespace is passed
	if (namespace) {
		// If fastify instance does not already have orm initialized
		if (!fastify.orm) {
			fastify.decorate('orm', Object.create(null));
		}

		// Check if namespace is already used
		if (fastify.orm[namespace]) {
			throw new Error(
				`Namespace ${namespace} is already in use. Please choose a unique name. Existing namespace are ${Object.keys(fastify.orm).join(', ')}.`
			);
		} else {
			fastify.orm[namespace] = datasource;
			await fastify.orm[namespace].initialize();
			fastify.addHook('onClose', (instance, done) => {
				instance.orm[namespace].destroy().then(() => {
					done();
				});
			});

			return Promise.resolve();
		}
	}
	// Else there isn't a namespace, initialize the connection directly on orm

	fastify.decorate('orm', datasource as PluginDataSource);
	await fastify.orm.initialize();
	fastify.addHook('onClose', (instance, done) => {
		instance.orm.destroy().then(() => {
			done();
		});
	});

	return Promise.resolve();
};

export default fp(plugin, {
	fastify: '5.x',
	name: 'typeorm-fastify-plugin'
});
