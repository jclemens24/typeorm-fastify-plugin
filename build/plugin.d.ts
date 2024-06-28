import { FastifyPluginAsync } from 'fastify';
import { DataSource, DataSourceOptions } from 'typeorm';
type NamespacedDataSource = {
    [namespace: string]: DataSource;
};
export type PluginDataSource = DataSource & NamespacedDataSource;
declare module 'fastify' {
    interface FastifyInstance {
        orm: PluginDataSource;
    }
}
type DatabaseConfigOptions = {
    connection?: DataSource;
    namespace?: string;
} & Partial<DataSourceOptions>;
declare const _default: FastifyPluginAsync<DatabaseConfigOptions>;
export default _default;
//# sourceMappingURL=plugin.d.ts.map