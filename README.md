![](./documentation/images/logo.png)
## A JSON Memory Database with a RESTFul API

JMdb allows clients to store, retrieve, query, update and delete JSON documents. This is accomplished using HTTP methods to specify CRUD (Create, Request, Update and Delete) operations on JSON data. Query operations are also supported which aids in requesting only the specific information your application needs.

### Sample operations

You can connect to JMdb via your application using [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) or a [request library](https://github.com/request/request).

| Operation | METHOD | URL |
| --- | --- | --- |
| Retrieve all users | GET | /v1/jmdb/users |
| Retrieve a singe user | GET | /v1/jmdb/users?q=_id=591b496c6b681d6aee880815 |
| Query users by favorite artists | GET | /v1/jmdb/users?q=.music.favorites.artists |
| Query users who have computers created after 2010 | GET | /v1/jmdb/users?q={.gear.computers.models.year > 2010} |
| Delete specific user | DELETE | /v1/jmdb/users?q=_id=591b496c6b681d6aee880815 |

[See the full documentation](./documentation/documentation.md)

## Installation

Rather then run JMdb from source it's recommended that you use the published docker container which is also available at [Docker container](https://hub.docker.com/r/cjus/jmdb/tags).

To build JMdb from source:

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

