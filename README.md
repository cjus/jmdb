![](./documentation/images/logo.png)
## A JSON Memory Database with a RESTFul API

JMdb allows clients to store, retrieve, query, update and delete JSON documents. This is accomplished using HTTP methods to specify CRUD (Create, Request, Update and Delete) operations on JSON data. Query operations are also supported which aids in requesting only the specific information your application needs.

[See the full documentation](./documentation/documentation.md)

## Installation

```shell
$ npm install pino-elasticsearch -g
$ npm install
```

## Use

Start JMdb and connect via its Restful API.

```shell
$ npm start
```

```shell
$ curl http://localhost:4111/v1/jmdb
```

## Tests

Artillery (https://artillery.io/) tests can be found in the `test` folder.

