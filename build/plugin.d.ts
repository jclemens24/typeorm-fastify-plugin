import { FastifyPluginAsync } from 'fastify';
import { DataSource, DataSourceOptions, EntityManager } from 'typeorm';
export { PinoTypeormLogger } from './pinoLogger.js';
export interface TypeOrmNamespaceStore {
    [namespace: string]: DataSource;
}
export type PluginDataSource = DataSource;
export type DatabaseConfigOptions = {
    connection?: DataSource;
    namespace?: string;
    retries?: number;
    retryDelay?: number;
} & Partial<DataSourceOptions>;
export declare class TypeOrmPluginError extends Error {
    readonly cause: unknown;
    readonly connectionDetails: Record<string, unknown>;
    constructor(message: string, dsOptions: DataSourceOptions, cause: unknown);
}
declare module 'fastify' {
    interface FastifyInstance {
        orm: DataSource;
    }
}
export declare function healthCheck(datasource: DataSource): Promise<boolean>;
export declare function transact<T>(datasource: DataSource, callback: (manager: EntityManager) => Promise<T>): Promise<T>;
declare const _default: FastifyPluginAsync<DatabaseConfigOptions>;
export default _default;
//# sourceMappingURL=plugin.d.ts.map