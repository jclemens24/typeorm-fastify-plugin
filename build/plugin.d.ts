import { FastifyPluginAsync } from 'fastify';
import { DataSource, DataSourceOptions } from 'typeorm';
declare module 'fastify' {
    interface FastifyInstance {
        orm: DataSource & FastifyTypeormInstance.FastifyTypeormNamespace;
    }
}
declare namespace FastifyTypeormInstance {
    interface FastifyTypeormNamespace {
        [namespace: string]: DataSource;
    }
}
declare type DBConfigOptions = {
    connection?: DataSource;
    namespace?: string;
} & Partial<DataSourceOptions>;
declare const _default: FastifyPluginAsync<DBConfigOptions, import("fastify").RawServerDefault, import("fastify").FastifyTypeProviderDefault>;
export default _default;
