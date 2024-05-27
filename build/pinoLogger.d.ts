import { Logger, QueryRunner } from 'typeorm';
import { FastifyBaseLogger } from 'fastify';
export declare class PinoTypeormLogger implements Logger {
    private readonly logger;
    constructor(logger: FastifyBaseLogger);
    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): void;
    logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: QueryRunner): void;
    logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): void;
    logSchemaBuild(message: string, queryRunner?: QueryRunner): void;
    logMigration(message: string, queryRunner?: QueryRunner): void;
    log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner): void;
    protected stringifyParams(parameters: any[]): string;
    protected mergeSql(query: string, parameters?: any[]): string;
}
//# sourceMappingURL=pinoLogger.d.ts.map