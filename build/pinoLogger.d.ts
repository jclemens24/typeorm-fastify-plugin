import { AbstractLogger } from 'typeorm';
import type { QueryRunner, LogLevel, LogMessage, LoggerOptions } from 'typeorm';
import type { FastifyBaseLogger } from 'fastify';
export declare class PinoTypeormLogger extends AbstractLogger {
    private readonly pinoLogger;
    constructor(pinoLogger: FastifyBaseLogger, options?: LoggerOptions);
    protected writeLog(level: LogLevel, logMessage: LogMessage | string | number | (LogMessage | string | number)[], queryRunner?: QueryRunner): void;
}
//# sourceMappingURL=pinoLogger.d.ts.map