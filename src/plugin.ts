import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { DataSource, DataSourceOptions } from 'typeorm';

declare module 'fastify' {
  export interface FastifyInstance {
    orm: DataSource & FastifyTypeormInstance;
  }
}
interface FastifyTypeormInstance {
  [namespace: string]: DataSource;
}

type DBConfigOptions = {
  connection?: DataSource;
  namespace?: string;
} & Partial<DataSourceOptions>;

const pluginAsync: FastifyPluginAsync<DBConfigOptions> = async (
  fastify,
  options
) => {
  const { namespace } = options;
  delete options.namespace;
  let connection: DataSource;

  if (options.connection) {
    connection = options.connection;
  } else {
    connection = new DataSource(options as DataSourceOptions);
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
      fastify.orm[namespace] = connection;
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

  await connection.initialize();
  // @ts-ignore
  fastify.decorate('orm', connection);
  fastify.addHook('onClose', (fastifyInstance, done) => {
    fastifyInstance.orm.destroy().then(() => {
      done();
    });
  });

  return Promise.resolve();
};

export default fp(pluginAsync, {
  fastify: '4.x',
  name: '@fastify-typeorm-plugin',
});
