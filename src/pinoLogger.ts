import { AbstractLogger } from 'typeorm';
import type { QueryRunner, LogLevel, LogMessage, LoggerOptions } from 'typeorm';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Extracts serialization-safe metadata from a QueryRunner.
 *
 * QueryRunner holds the full DataSource, connection pool, and driver —
 * passing it directly to Pino's JSON serializer would produce
 * enormous output or circular-reference errors.
 */
function extractQueryRunnerContext(queryRunner: QueryRunner): Record<string, unknown> | undefined {
	const context: Record<string, unknown> = {};

	if (queryRunner.isTransactionActive) {
		context.isTransactionActive = true;
	}

	if (queryRunner.data && Object.keys(queryRunner.data).length > 0) {
		context.data = queryRunner.data;
	}

	return Object.keys(context).length > 0 ? context : undefined;
}

/**
 * TypeORM logger that routes database logs through Fastify's Pino
 * instance. Extends {@link AbstractLogger} so the `logging` option
 * from `DataSourceOptions` is respected automatically.
 *
 * Instantiated by the plugin when no custom `logger` is provided.
 * Consumers can also import and use it directly:
 *
 * @example
 * ```typescript
 * import { PinoTypeormLogger } from 'typeorm-fastify-plugin';
 *
 * const ds = new DataSource({
 *   type: 'postgres',
 *   logging: ['query', 'error'],
 *   logger: new PinoTypeormLogger(fastify.log, ['query', 'error']),
 * });
 * ```
 */
export class PinoTypeormLogger extends AbstractLogger {
	/**
	 * @param pinoLogger - Fastify's Pino logger instance.
	 * @param options    - Which log categories to emit.
	 *                     Pass the same value as `DataSourceOptions.logging`.
	 *                     When omitted, no SQL output is produced (TypeORM default).
	 */
	constructor(
		private readonly pinoLogger: FastifyBaseLogger,
		options?: LoggerOptions
	) {
		super(options);
	}

	/**
	 * Core logging method called by {@link AbstractLogger} after
	 * verifying the message's category is enabled.
	 */
	protected writeLog(
		level: LogLevel,
		logMessage: LogMessage | string | number | (LogMessage | string | number)[],
		queryRunner?: QueryRunner
	): void {
		const messages = this.prepareLogMessages(
			logMessage,
			{ highlightSql: false, appendParameterAsComment: true, addColonToPrefix: false },
			queryRunner
		);

		const context = queryRunner ? extractQueryRunnerContext(queryRunner) : undefined;

		for (const message of messages) {
			const entry: Record<string, unknown> = {};
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
