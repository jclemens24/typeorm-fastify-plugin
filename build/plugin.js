"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fastify_plugin_1 = tslib_1.__importDefault(require("fastify-plugin"));
const typeorm_1 = require("typeorm");
const pinoLogger_js_1 = require("./pinoLogger.js");
const plugin = async (fastify, options) => {
    const { namespace } = options;
    delete options.namespace;
    let datasource;
    if (options.connection) {
        if (!options.connection.options.logger) {
            options.connection.logger = new pinoLogger_js_1.PinoTypeormLogger(fastify.log);
        }
        datasource = options.connection;
    }
    else {
        const opts = {
            ...options,
            logger: options.logger || new pinoLogger_js_1.PinoTypeormLogger(fastify.log),
        };
        datasource = new typeorm_1.DataSource(opts);
    }
    if (namespace) {
        if (!fastify.orm) {
            fastify.decorate('orm', Object.create(null));
        }
        if (fastify.orm[namespace]) {
            throw new Error(`Namespace ${namespace} is already in use. Please use a different unique name.`);
        }
        else {
            fastify.orm[namespace] = datasource;
            await fastify.orm[namespace].initialize();
            fastify.addHook('onClose', (instance, done) => {
                instance.orm[namespace].destroy().then(() => {
                    done();
                });
            });
            return Promise.resolve();
        }
    }
    fastify.decorate('orm', datasource);
    await fastify.orm.initialize();
    fastify.addHook('onClose', (fastifyInstance, done) => {
        fastifyInstance.orm.destroy().then(() => {
            done();
        });
    });
    return Promise.resolve();
};
exports.default = (0, fastify_plugin_1.default)(plugin, {
    fastify: '4.x',
    name: '@fastify-typeorm-plugin',
});
//# sourceMappingURL=plugin.js.map