"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fastify_plugin_1 = tslib_1.__importDefault(require("fastify-plugin"));
const typeorm_1 = require("typeorm");
const pluginAsync = async (fastify, options) => {
    const { namespace } = options;
    delete options.namespace;
    let connection;
    if (options.connection) {
        connection = options.connection;
    }
    else {
        connection = new typeorm_1.DataSource(options);
    }
    if (namespace) {
        if (!fastify.orm) {
            fastify.decorate('orm', {});
        }
        if (fastify.orm[namespace]) {
            throw new Error(`This namespace has already been declared: ${namespace}`);
        }
        else {
            fastify.orm[namespace] = connection;
            await fastify.orm[namespace].initialize();
            fastify.addHook('onClose', (instance, done) => {
                instance.orm[namespace].destroy().then(() => {
                    done();
                });
            });
            return;
        }
    }
    await connection.initialize();
    fastify.decorate('orm', connection);
    fastify.addHook('onClose', (fastifyInstance, done) => {
        fastifyInstance.orm.destroy().then(() => {
            done();
        });
    });
    return Promise.resolve();
};
exports.default = (0, fastify_plugin_1.default)(pluginAsync, {
    fastify: '4.x',
    name: '@fastify-typeorm-plugin',
});
//# sourceMappingURL=plugin.js.map