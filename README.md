# typeorm-fastify-plugin

![Travis (.org)](https://img.shields.io/travis/jclemens24/fastify-typeorm?style=plastic)

A Fastify plugin that connects fastify to TypeORM database connection. [Uses TypeORM](https://typeorm.io/)

> Why another plugin? Doesn't fastify-typeorm-plugin exist?

Yes, you are right, it does and it works fine. This plugin was created because fastify-typeorm-plugin uses the deprecated `createConnection()` under the hood. This plugin uses `new Datasource()` and `initialize()` to initialize the connection.

## Install

```bash
npm install typeorm-fastify-plugin
```

## Usage

```javascript
const fastify = require('fastify');
const fastifyORMPlugin = require('typeorm-fastify-plugin');

fastify
	.register(fastifyORMPlugin, {
		host: 'localhost',
		port: 3306,
		type: 'mysql',
		database: 'your_database_name',
		username: 'your_username',
		password: 'your_database_password',
	})
	.ready();

fastify.listen(3000, () => {
	console.log('Listening on port 3000');
});
```

routes.js

```javascript
const root = async (fastify, opts) => {
	fastify.get('/', async function (request, reply) {
		const userRepository = fastify.orm.getRepository(Users);
	});
};
```

### Fastify server will be decorated with _orm_ key and available everywhere in your app

---

You can also pass your connection as _connection_

## Example

```javascript
const fastify = require('fastify');
const fastifyTypeOrmPlugin = require('typeorm-fastify-plugin');
const { DataSource } = require('typeorm');

const connection = new DataSource({
	host: 'localhost',
	port: 3306,
	type: 'mysql',
	database: 'your_database_name',
	username: 'your_username',
	password: 'your_database_password',
});

fastify.register(fastifyTypeOrmPlugin, { connection: connection });
```

Note: You need to install the proper driver as a dependency. For example, if using MySQL, install mysql or mysql2.

---

## Works with ESM too

```javascript
import Fastify from 'fastify';
import plugin from 'typeorm-fastify-plugin';

const fastify = Fastify();
fastify.register(plugin, {
	/* your config options here */
});
```
