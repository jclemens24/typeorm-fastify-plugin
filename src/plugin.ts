import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { DataSource, DataSourceOptions } from 'typeorm';
import { PinoTypeormLogger } from './pinoLogger';

interface NamespacedDataSource {
  [namespace: string]: DataSource;
}
declare module 'fastify' {
  export interface FastifyInstance {
    orm: DataSource & NamespacedDataSource;
  }
}

type DatabaseConfigOptions = {
  connection?: DataSource;
  namespace?: string;
} & DataSourceOptions;

const plugin: FastifyPluginAsync<DatabaseConfigOptions> = async (
  fastify,
  options
) => {
  const { namespace } = options;
  delete options.namespace;
  let datasource;

  if (options.connection) {
    if (!options.connection.options.logger) {
      options.connection.logger = new PinoTypeormLogger(fastify.log);
    }
    datasource = options.connection;
  } else {
    const opts: DatabaseConfigOptions = {
      ...options,
      logger: options.logger || new PinoTypeormLogger(fastify.log),
    };
    datasource = new DataSource(opts);
  }

  // If a namespace is passed
  if (namespace) {
    // If fastify instance does not already have orm initialized
    if (!fastify.orm) {
      // @ts-ignore
      fastify.decorate('orm', {});
    }

    // Check if namespace is already used
    if (fastify.orm[namespace]) {
      throw new Error(`This namespace has already been declared: ${namespace}`);
    } else {
      fastify.orm[namespace] = datasource;
      await fastify.orm[namespace].initialize();
      fastify.addHook('onClose', (instance, done) => {
        instance.orm[namespace].destroy().then(() => {
          done();
        });
      });

      return;
    }
  }
  // Else there isn't a namespace, initialize the connection directly on orm

  // @ts-ignore
  fastify.decorate('orm', datasource);
  await fastify.orm.initialize();
  fastify.addHook('onClose', (fastifyInstance, done) => {
    fastifyInstance.orm.destroy().then(() => {
      done();
    });
  });

  return Promise.resolve();
};

export default fp(plugin, {
  fastify: '4.x',
  name: '@fastify-typeorm-plugin',
});
