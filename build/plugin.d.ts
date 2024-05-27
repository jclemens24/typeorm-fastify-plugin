import { FastifyPluginAsync } from 'fastify';
import { DataSource, DataSourceOptions } from 'typeorm';
interface NamespacedDataSource {
    [namespace: string]: DataSource;
}
declare module 'fastify' {
    interface FastifyInstance {
        orm: DataSource & NamespacedDataSource;
    }
}
type DatabaseConfigOptions = {
    connection?: DataSource;
    namespace?: string;
} & DataSourceOptions;
declare const _default: FastifyPluginAsync<DatabaseConfigOptions>;
export default _default;
//# sourceMappingURL=plugin.d.ts.map