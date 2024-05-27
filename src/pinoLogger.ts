import { Logger, QueryRunner } from 'typeorm';
import { FastifyBaseLogger } from 'fastify';

/**
 * Custom logger implementation for TypeORM using Pino logger.
 */
export class PinoTypeormLogger implements Logger {
  /**
   * Creates an instance of PinoTypeormLogger.
   * @param logger - The Pino logger instance. FastifyBaseLogger extends pino.BaseLogger.
   */
  constructor(private readonly logger: FastifyBaseLogger) {}

  /**
   * Logs a database query.
   * @param query - The SQL query.
   * @param parameters - The query parameters.
   * @param queryRunner - The query runner.
   */
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.logger.debug({ msg: this.mergeSql(query, parameters), queryRunner });
  }

  /**
   * Logs an error that occurred during a database query.
   * @param error - The error message or object.
   * @param query - The SQL query.
   * @param parameters - The query parameters.
   * @param queryRunner - The query runner.
   */
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner
  ) {
    this.logger.error({
      msg: `${error} ${this.mergeSql(query, parameters)}`,
      queryRunner,
    });
  }

  /**
   * Logs a slow database query.
   * @param time - The execution time of the query in milliseconds.
   * @param query - The SQL query.
   * @param parameters - The query parameters.
   * @param queryRunner - The query runner.
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner
  ) {
    this.logger.warn({
      msg: `Time ${time}ms - ${this.mergeSql(query, parameters)}`,
      queryRunner,
    });
  }

  /**
   * Logs a message related to schema building.
   * @param message - The log message.
   * @param queryRunner - The query runner.
   */
  logSchemaBuild(message: string, queryRunner?: QueryRunner): void {
    this.logger.debug({ msg: message, queryRunner });
  }

  /**
   * Logs a message related to database migration.
   * @param message - The log message.
   * @param queryRunner - The query runner.
   */
  logMigration(message: string, queryRunner?: QueryRunner): void {
    this.logger.debug({ msg: message, queryRunner });
  }

  /**
   * Logs a generic message.
   * @param level - The log level.
   * @param message - The log message.
   * @param queryRunner - The query runner.
   */
  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    queryRunner?: QueryRunner
  ): void {
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

  /**
   * Converts the query parameters to a string representation.
   * @param parameters - The query parameters.
   * @returns The string representation of the parameters.
   */
  protected stringifyParams(parameters: any[]): string {
    try {
      return JSON.stringify(parameters);
    } catch (error: unknown) {
      return `${error}`;
    }
  }

  /**
   * Merges the SQL query and parameters into a single string.
   * @param query - The SQL query.
   * @param parameters - The query parameters.
   * @returns The merged string.
   */
  protected mergeSql(query: string, parameters?: any[]): string {
    return (
      query +
      (parameters && parameters.length
        ? ` -- PARAMETERS: ${this.stringifyParams(parameters)}`
        : '')
    );
  }
}
