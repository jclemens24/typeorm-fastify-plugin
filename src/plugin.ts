import { FastifyPluginAsync, FastifyBaseLogger } from 'fastify';
import fp from 'fastify-plugin';
import { DataSource, DataSourceOptions, EntityManager } from 'typeorm';
import { PinoTypeormLogger } from './pinoLogger.js';
export { PinoTypeormLogger } from './pinoLogger.js';

/**
 * A record of namespace keys to DataSource instances.
 *
 * Use when registering the plugin with a `namespace` option.
 * Augment `FastifyInstance` in your project for full type safety:
 *
 * @example
 * ```typescript
 * declare module 'fastify' {
 *   interface FastifyInstance {
 *     orm: TypeOrmNamespaceStore;
 *   }
 * }
 *
 * fastify.orm['postgres1'].getRepository(User);
 * ```
 */
export interface TypeOrmNamespaceStore {
	[namespace: string]: DataSource;
}

/**
 * @deprecated Use `DataSource` directly for non-namespace mode,
 * or `TypeOrmNamespaceStore` for namespace mode.
 */
export type PluginDataSource = DataSource;

export type DatabaseConfigOptions = {
	connection?: DataSource;
	namespace?: string;
	retries?: number;
	retryDelay?: number;
} & Partial<DataSourceOptions>;

export class TypeOrmPluginError extends Error {
	public readonly connectionDetails: Record<string, unknown>;

	constructor(
		message: string,
		dsOptions: DataSourceOptions,
		public readonly cause: unknown
	) {
		super(message);
		this.name = 'TypeOrmPluginError';
		this.connectionDetails = sanitizeConnectionDetails(dsOptions);
	}
}

function sanitizeConnectionDetails(options: DataSourceOptions): Record<string, unknown> {
	const opts = options as unknown as Record<string, unknown>;
	return {
		type: opts.type,
		host: opts.host,
		port: opts.port,
		database: opts.database,
		username: opts.username
	};
}

declare module 'fastify' {
	export interface FastifyInstance {
		/** TypeORM DataSource. For namespace mode, see {@link TypeOrmNamespaceStore}. */
		orm: DataSource;
	}
}

export async function healthCheck(datasource: DataSource): Promise<boolean> {
	if (!datasource.isInitialized) return false;
	try {
		const query = getHealthCheckQuery(datasource.options.type);
		if (!query) return datasource.isInitialized;
		await datasource.query(query);
		return true;
	} catch {
		return false;
	}
}

function getHealthCheckQuery(dbType: string): string | null {
	switch (dbType) {
		case 'oracle':
			return 'SELECT 1 FROM DUAL';
		case 'sap':
			return 'SELECT now() FROM dummy';
		case 'mongodb':
			return null;
		default:
			return 'SELECT 1';
	}
}

export async function transact<T>(
	datasource: DataSource,
	callback: (manager: EntityManager) => Promise<T>
): Promise<T> {
	return datasource.transaction(callback);
}

async function initializeWithRetry(
	datasource: DataSource,
	retries: number,
	retryDelay: number,
	log: FastifyBaseLogger
): Promise<void> {
	const maxAttempts = retries + 1;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			await datasource.initialize();
			return;
		} catch (error) {
			if (attempt === maxAttempts) {
				throw new TypeOrmPluginError(
					`Failed to initialize DataSource after ${maxAttempts} attempt(s)`,
					datasource.options,
					error
				);
			}
			const delay = retryDelay * Math.pow(2, attempt - 1);
			log.warn(
				`typeorm-fastify-plugin: connection attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
}

const plugin: FastifyPluginAsync<DatabaseConfigOptions> = async (fastify, options) => {
	const { namespace, connection, retries = 0, retryDelay = 1000, ...rest } = options;
	let datasource: DataSource;

	if (connection) {
		if (!connection.options.logger) {
			Object.assign(connection.options, {
				logger: new PinoTypeormLogger(fastify.log, connection.options.logging)
			});
		}
		datasource = connection;
	} else {
		const opts = {
			...rest,
			logger: rest.logger || new PinoTypeormLogger(fastify.log, rest.logging)
		};
		datasource = new DataSource(opts as DataSourceOptions);
	}

	if (datasource.options.synchronize && process.env.NODE_ENV === 'production') {
		fastify.log.warn(
			'typeorm-fastify-plugin: "synchronize: true" is enabled in production. ' +
				'This WILL auto-alter your database schema and may cause data loss. ' +
				'Use migrations instead.'
		);
	}

	if (namespace) {
		if (!fastify.orm) {
			fastify.decorate('orm', Object.create(null) as DataSource);
		}

		const store = fastify.orm as unknown as TypeOrmNamespaceStore;

		if (store[namespace]) {
			throw new Error(
				`Namespace ${namespace} is already in use. Please choose a unique name. Existing namespaces are ${Object.keys(store).join(', ')}.`
			);
		}

		store[namespace] = datasource;
		await initializeWithRetry(store[namespace], retries, retryDelay, fastify.log);

		fastify.addHook('onClose', async (instance) => {
			const ns = instance.orm as unknown as TypeOrmNamespaceStore;
			await ns[namespace].destroy();
		});

		return;
	}

	fastify.decorate('orm', datasource);
	await initializeWithRetry(fastify.orm, retries, retryDelay, fastify.log);

	fastify.addHook('onClose', async (instance) => {
		await instance.orm.destroy();
	});
};

export default fp(plugin, {
	fastify: '5.x',
	name: 'typeorm-fastify-plugin',
	dependencies: []
});
