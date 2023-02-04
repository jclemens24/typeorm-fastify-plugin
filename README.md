# typeorm-fastify-plugin

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/jclemens24/typeorm-fastify-plugin/ci.yml?style=plastic)

A Fastify plugin that connects, organizes, and decorates all your database connections to your Fastify server. [Uses TypeORM](https://typeorm.io/)

## Install

```bash
npm install typeorm-fastify-plugin
```

## Usage

```javascript
const Fastify = require('fastify');
const dbConn = require('typeorm-fastify-plugin');

const fastify = Fastify();

fastify
  .register(dbConn, {
    host: 'localhost',
    port: 3306,
    type: 'mysql',
    database: 'your_database_name',
    username: 'your_username',
    password: 'your_database_password',
    entities: [Users, Products],
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

### Fastify server will be decorated with `orm` key and available everywhere in your app

---

You can also pass your connection as `connection`

## Example

```javascript
const fastify = require('fastify');
const dbConn = require('typeorm-fastify-plugin');
const { DataSource } = require('typeorm');

const connection = new DataSource({
  host: 'localhost',
  port: 3306,
  type: 'mysql',
  database: 'your_database_name',
  username: 'your_username',
  password: 'your_database_password',
});

fastify.register(dbConn, { connection: connection });
```

Note: You need to install the proper driver as a dependency. For example, if using MySQL, install mysql or mysql2.

---

## With ES6

```javascript
import Fastify from 'fastify';
import plugin from 'typeorm-fastify-plugin';

const fastify = Fastify();
fastify.register(plugin, {
  /* your config options here */
});
```

---

## Usage With Multiple Namespaces

Typorm allows you to use multiple `DataSource` instances across your application globally. It only makes sense that this plugin would enable you to do the same thing. Using a namespace is easy but completely optional.

```javascript
import Fastify from 'fastify';
import plugin from 'typeorm-fastify-plugin';

const fastify = Fastify();
fastify.register(plugin, {
  namespace: 'postgres1',
  host: 'localhost',
  port: 5432,
  username: 'test',
  password: 'test',
  database: 'test_db',
  type: 'postgres',
});
```

This is the only way to initialize a "namespaced" instance using this plugin.

The namespace will be available everywhere your fastify server is. For example, to access the namespace declared in the above code: `fastify.orm['postgres1'].getRepository()`

This is the default behavior of wrapping code in `fastify-plugin` module;
