"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinoTypeormLogger = void 0;
class PinoTypeormLogger {
    constructor(logger) {
        this.logger = logger;
    }
    logQuery(query, parameters, queryRunner) {
        this.logger.debug({ msg: this.mergeSql(query, parameters), queryRunner });
    }
    logQueryError(error, query, parameters, queryRunner) {
        this.logger.error({
            msg: `${error} ${this.mergeSql(query, parameters)}`,
            queryRunner,
        });
    }
    logQuerySlow(time, query, parameters, queryRunner) {
        this.logger.warn({
            msg: `Time ${time}ms - ${this.mergeSql(query, parameters)}`,
            queryRunner,
        });
    }
    logSchemaBuild(message, queryRunner) {
        this.logger.debug({ msg: message, queryRunner });
    }
    logMigration(message, queryRunner) {
        this.logger.debug({ msg: message, queryRunner });
    }
    log(level, message, queryRunner) {
        switch (level) {
            case 'log':
                this.logger.debug({ msg: message, queryRunner });
                break;
            case 'info':
                this.logger.info({ msg: message, queryRunner });
                break;
            case 'warn':
                this.logger.warn({ msg: message, queryRunner });
                break;
        }
    }
    stringifyParams(parameters) {
        try {
            return JSON.stringify(parameters);
        }
        catch (error) {
            return `${error}`;
        }
    }
    mergeSql(query, parameters) {
        return (query +
            (parameters && parameters.length
                ? ` -- PARAMETERS: ${this.stringifyParams(parameters)}`
                : ''));
    }
}
exports.PinoTypeormLogger = PinoTypeormLogger;
//# sourceMappingURL=pinoLogger.js.map