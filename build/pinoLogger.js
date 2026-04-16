import { AbstractLogger } from 'typeorm';
function extractQueryRunnerContext(queryRunner) {
    const context = {};
    if (queryRunner.isTransactionActive) {
        context.isTransactionActive = true;
    }
    if (queryRunner.data && Object.keys(queryRunner.data).length > 0) {
        context.data = queryRunner.data;
    }
    return Object.keys(context).length > 0 ? context : undefined;
}
export class PinoTypeormLogger extends AbstractLogger {
    pinoLogger;
    constructor(pinoLogger, options) {
        super(options);
        this.pinoLogger = pinoLogger;
    }
    writeLog(level, logMessage, queryRunner) {
        const messages = this.prepareLogMessages(logMessage, { highlightSql: false, appendParameterAsComment: true, addColonToPrefix: false }, queryRunner);
        const context = queryRunner ? extractQueryRunnerContext(queryRunner) : undefined;
        for (const message of messages) {
            const entry = {};
            if (context) {
                entry.queryRunner = context;
            }
            if (message.prefix) {
                entry.prefix = message.prefix;
            }
            const text = String(message.message);
            switch (message.type ?? level) {
                case 'query':
                case 'log':
                case 'schema-build':
                case 'migration':
                    this.pinoLogger.debug(entry, text);
                    break;
                case 'info':
                    this.pinoLogger.info(entry, text);
                    break;
                case 'warn':
                case 'query-slow':
                    this.pinoLogger.warn(entry, text);
                    break;
                case 'error':
                case 'query-error':
                    this.pinoLogger.error(entry, text);
                    break;
            }
        }
    }
}
//# sourceMappingURL=pinoLogger.js.map