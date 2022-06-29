/// <reference types="node" />
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
/**
 * @typedef {DBConfigOptions}
 * @property {DataSource} connection - A new DataSource passed to plugin
 * @property {string} namespace - Optional namespace to declare multiple DataSources in your project
 */
declare type DBConfigOptions = {
    connection?: DataSource;
    namespace?: string;
} & Partial<DataSourceOptions>;
declare const _default: FastifyPluginAsync<DBConfigOptions, import("http").Server, import("fastify").FastifyTypeProviderDefault>;
export default _default;
