![](./images/logo.png)
##A JSON Memory Database with a RESTFul API

## Introduction

JMdb is a JSON [datastore](https://en.wikipedia.org/wiki/Data_store) microservice.

You can think of JMdb as an interface to a database with an HTTP front-end. This approach was popularize by CouchDB in early 2005 and is still in use today in [Apache CouchDB](http://couchdb.apache.org/) and the commercial [CouchBase](http://www.couchbase.com) products.

The end result is that database operations become familiar HTTP requests and working with JSON retains its native feel. Gone are database adapters and database programming.

This abstraction allows services to focus on core functionality without the additional and often unnecessary burdens involved. As such, JMdb is intended to help speed the development of services which require a database to store information.

## Warning

JMdb is NOT intended to replace even the weakest of databases! You have been warned. The reason is because JMdb lacks data integrity features which help prevent data loss in those less-than-happy-path scenarios. So great for prototyping but once your application is well underway you'll need to replace JMdb with your database of choice.

Here are just some of the downsides:

* Operations are not atomic
  * Two processes can update data underneath the other
* Query capabilities are limited

## Data storage model

The JMdb store consists of a single database which is organized into categories called `collections`.
A collection is really a named category such as `users`, `purchases`, `friends` etc... Each container consists of JSON data called documents. So a `users` collection might have hundreds of JSON documents. A document consists of JSON fields and values. In this regard, JMdb is inspired by the NoSQL MongoDB.

Collections are stored as `.json` text files with arrays of documents.

## API endpoints

JMdb exposes API endpoints for use by other services and applications.  Each operation that JMdb supports can be accessed via an HTTP verb (such as GET, POST, PUT, DELETE).

HTTP Verb | Usage
--- | ---
GET | Used to *retrieve* a full JSON document or a sub portion (branch).  Also used to *query* portions of the document
POST | Used to *add* a new JSON document
PUT | Used to *update* a JSON document or portion thereof
DELETE | Used to *remove* a document or document branch

### Connecting with JMdb

You can connect with JMdb using your web browser. HTTP GET operations can be issued from the browser search field and other HTTP operations can be performed using your browsers devtools.  

You can also use the free [Postman application](https://www.getpostman.com/)

![](./images/Postman.jpg)

The remainder of this document will use the command-line `curl` utility.

### Adding documents

We can use the HTTP POST method to add a new document.

JMdb exposes endpoints with `/v1/jmdb/` prefix. This signifies that we're accessing the version 1 API for jmdb. The prefix appended with the name of the collection we're interested in working with. It's ok if the collection doesn't currently exists - it will be created if necessary.  The body of our POST call will contain a JSON document.  The document must be an object with one or more fields inside.

```shell
## Add user Jim
curl -X "POST" "http://localhost:4111/v1/jmdb/users" \
     -H "content-type: application/json" \
     -d $'{
  "firstName": "Jim",
  "homeCity": "Bronx",
  "age": 34,
  "userName": "jimmy",
  "homeState": "NY",
  "lastName": "Jones"
}'
```

The return value will be:

```javascript
{
  "statusCode": 201,
  "statusMessage": "Created",
  "statusDescription": "Resource created",
  "result": {
    "_id": "591b496c6b681d6aee880815"
  }
}
```

Note that the statusCode returned is 201 or HTTP 201 Created. This indicates success. The result will container an _id field which represents the document ID. You'll need to provide the document ID when performing update or delete operations on container documents. Don't worry about having to keep track of those document IDs - you get back document ID for every document created or returned from a query.

### Updating documents

To update a document we'll use the HTTP PUT method.  Note that we're providing a partial document which will be embedded in the document specified by the document ID (`_id`). Notice that the document ID matches the value we received when we create (stored) the original document.

```shell
## Update user Jim
curl -X "PUT" "http://localhost:4111/v1/jmdb/users" \
     -H "content-type: application/json" \
     -d $'{
  "_id": "591b44f0327f77696d986473",
  "music": {
    "favorites": {
      "artists": [
        "Armin Van Buuren",
        "Paul Oakenfold",
        "Led Zeppelin",
        "New Order",
        "Spanish Harlem Orchestra"
      ],
      "styles": [
        "Techno",
        "Rock",
        "Latin"
      ]
    }
  }
}'
```

### Retrieving collections

```shell
## Get all users
curl "http://localhost:4111/v1/jmdb/users"
```

### Deleting documents

```shell
## Delete single user
curl -X "DELETE" "http://localhost:4111/v1/jmdb/users?_id=591b496c6b681d6aee880815"
```

### Deleting collections

```shell
## Delete users catalog
curl -X "DELETE" "http://localhost:4111/v1/jmdb/users"
```
