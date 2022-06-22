/// <reference types="node" />
import { FastifyPluginAsync } from 'fastify';
import { DataSource, DataSourceOptions } from 'typeorm';
declare module 'fastify' {
	interface FastifyInstance {
		orm: DataSource;
	}
}
declare type DBConfigOptions = {
	connection?: DataSource;
} & Partial<DataSourceOptions>;
declare const _default: FastifyPluginAsync<
	DBConfigOptions,
	import('http').Server,
	import('fastify').FastifyTypeProviderDefault
>;
export default _default;
export {};
