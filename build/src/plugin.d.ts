import { FastifyPluginAsync } from 'fastify';
import { DataSource, DataSourceOptions } from 'typeorm';
declare module 'fastify' {
    interface FastifyInstance {
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
declare const _default: FastifyPluginAsync<DBConfigOptions>;
export default _default;
//# sourceMappingURL=plugin.d.ts.map