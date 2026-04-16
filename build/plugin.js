import fp from 'fastify-plugin';
import { DataSource } from 'typeorm';
import { PinoTypeormLogger } from './pinoLogger.js';
export { PinoTypeormLogger } from './pinoLogger.js';
export class TypeOrmPluginError extends Error {
    cause;
    connectionDetails;
    constructor(message, dsOptions, cause) {
        super(message);
        this.cause = cause;
        this.name = 'TypeOrmPluginError';
        this.connectionDetails = sanitizeConnectionDetails(dsOptions);
    }
}
function sanitizeConnectionDetails(options) {
    const opts = options;
    return {
        type: opts.type,
        host: opts.host,
        port: opts.port,
        database: opts.database,
        username: opts.username
    };
}
export async function healthCheck(datasource) {
    if (!datasource.isInitialized)
        return false;
    try {
        const query = getHealthCheckQuery(datasource.options.type);
        if (!query)
            return datasource.isInitialized;
        await datasource.query(query);
        return true;
    }
    catch {
        return false;
    }
}
function getHealthCheckQuery(dbType) {
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
export async function transact(datasource, callback) {
    return datasource.transaction(callback);
}
async function initializeWithRetry(datasource, retries, retryDelay, log) {
    const maxAttempts = retries + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await datasource.initialize();
            return;
        }
        catch (error) {
            if (attempt === maxAttempts) {
                throw new TypeOrmPluginError(`Failed to initialize DataSource after ${maxAttempts} attempt(s)`, datasource.options, error);
            }
            const delay = retryDelay * Math.pow(2, attempt - 1);
            log.warn(`typeorm-fastify-plugin: connection attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}
const plugin = async (fastify, options) => {
    const { namespace, connection, retries = 0, retryDelay = 1000, ...rest } = options;
    let datasource;
    if (connection) {
        if (!connection.options.logger) {
            Object.assign(connection.options, {
                logger: new PinoTypeormLogger(fastify.log, connection.options.logging)
            });
        }
        datasource = connection;
    }
    else {
        const opts = {
            ...rest,
            logger: rest.logger || new PinoTypeormLogger(fastify.log, rest.logging)
        };
        datasource = new DataSource(opts);
    }
    if (datasource.options.synchronize && process.env.NODE_ENV === 'production') {
        fastify.log.warn('typeorm-fastify-plugin: "synchronize: true" is enabled in production. ' +
            'This WILL auto-alter your database schema and may cause data loss. ' +
            'Use migrations instead.');
    }
    if (namespace) {
        if (!fastify.orm) {
            fastify.decorate('orm', Object.create(null));
        }
        const store = fastify.orm;
        if (store[namespace]) {
            throw new Error(`Namespace ${namespace} is already in use. Please choose a unique name. Existing namespaces are ${Object.keys(store).join(', ')}.`);
        }
        store[namespace] = datasource;
        await initializeWithRetry(store[namespace], retries, retryDelay, fastify.log);
        fastify.addHook('onClose', async (instance) => {
            const ns = instance.orm;
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
//# sourceMappingURL=plugin.js.map