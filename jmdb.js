'use strict';

const Promise = require('bluebird');
const hydra = require('hydra');
const objectID = require('bson-objectid');
const Utils = hydra.getUtilsHelper();
const ServerResponse = hydra.getServerResponseHelper();
const serverResponse = new ServerResponse;
const stor = require('./lib/stor');

const url = require('url');
const querystring = require('querystring');

const version = require('./package.json').version;

const INFO = 'info';
const ERROR = 'error';
const FATAL = 'fatal';

/**
* @name JMDB
* @description JSON Memeory Database
*/
class JMDB {
  /**
  * @name constructor
  * @return {undefined}
  */
  constructor() {
    this.config = null;
    this.appLogger = null;
    serverResponse.enableCORS(true);
  }

  /*
  * @name init
  * @summary Initialize the service router using a route object
  * @param {object} config - configuration object
  * @param {object} appLogger - logging object
  * @return {undefined}
  */
  init(config, appLogger) {
    this.config = config;
    this.serviceName = hydra.getServiceName();
    this.appLogger = appLogger;
  }

  /**
  * @name log
  * @summary log a message
  * @param {string} type - type (info, error, fatal)
  * @param {string} message - message to log
  * @return {undefined}
  */
  log(type, message) {
    if (type === ERROR || type === FATAL) {
      this.appLogger[type](message);
    } else if (this.config.debugLogging) {
      this.appLogger[type](message);
    }
  }

  /**
  * @name routeRequest
  * @summary Routes a request to an available service
  * @param {object} request - Node HTTP request object
  * @param {object} response - Node HTTP response object
  * @return {object} Promise - promise resolving if success or rejection otherwise
  */
  routeRequest(request, response) {
    return new Promise((resolve, _reject) => {
      if (request.method === 'OPTIONS') {
        this._handleCORSRequest(request, response);
        return;
      }

      let requestUrl = request.url;
      let urlPath = `http://${request.headers['host']}${requestUrl}`;
      let urlData = url.parse(urlPath);
      let paths = urlData.pathname
        .split('/')
        .filter((item) => item.length > 0);

      if (paths.length < 3) {
        serverResponse.sendInvalidRequest(response);
        resolve();
        return;
      }

      let catalog = paths[2];
      let method = request.method;

      if (['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
        this[`_handle${method}`](catalog, urlData, request, response, resolve);
      } else {
        serverResponse.sendMethodNotImplemented(response);
        resolve();
      }
    });
  }

  /**
  * @name _handleGET
  * @summary Handle an HTTP GET request
  * @param {string} catalog - name of database catalog
  * @param {object} urlData - URL data
  * @param {object} request - Node HTTP request object
  * @param {object} response - Node HTTP response object
  * @param {object} resolve - promise to resolve
  * @return {undefined}
  */
  _handleGET(catalog, urlData, request, response, resolve) {
    let qs = querystring.parse(urlData.query);
    let doc;
    if (qs._id) {
      doc = stor.findRecordByID(catalog, qs._id);
    } else if (qs.q) {
      doc = stor.queryCatalog(catalog, qs.q);
    } else {
      doc = stor.getCatalog(catalog);
    }
    serverResponse.sendOk(response, {
      result: doc
    });
    resolve();
  }

  /**
  * @name _handlePOST
  * @summary Handle an HTTP POST request
  * @param {string} catalog - name of database catalog
  * @param {object} urlData - URL data
  * @param {object} request - Node HTTP request object
  * @param {object} response - Node HTTP response object
  * @param {object} resolve - promise to resolve
  * @return {undefined}
  */
  _handlePOST(catalog, urlData, request, response, resolve) {
    let body = '';
    request.on('data', (data) => {
      body += data;
    });
    request.on('end', () => {
      let doc = Utils.safeJSONParse(body);
      if (doc) {
        doc._id = objectID();
        stor.insertRecord(catalog, doc);
        serverResponse.sendCreated(response, {
          result: {
            _id: doc._id
          }
        });
      } else {
        serverResponse.sendInvalidRequest(response, {
          reason: 'Missing document body'
        });
      }
      resolve();
    });
  }

  /**
  * @name _handlePUT
  * @summary Handle an HTTP PUT request
  * @param {string} catalog - name of database catalog
  * @param {object} urlData - URL data
  * @param {object} request - Node HTTP request object
  * @param {object} response - Node HTTP response object
  * @param {object} resolve - promise to resolve
  * @return {undefined}
  */
  _handlePUT(catalog, urlData, request, response, resolve) {
    let body = '';
    request.on('data', (data) => {
      body += data;
    });
    request.on('end', () => {
      let doc = Utils.safeJSONParse(body);
      if (doc) {
        if (!doc._id) {
          serverResponse.sendInvalidRequest(response, {
            reason: 'Missing document _id'
          });
        } else {
          let fullDoc = stor.findRecordByID(catalog, doc._id);
          if (!fullDoc) {
            serverResponse.sendNotFound(response);
          } else {
            let newDoc = Object.assign(fullDoc, doc);
            stor.updateRecord(catalog, newDoc);
            serverResponse.sendOk(response);
          }
        }
      } else {
        serverResponse.sendInvalidRequest(response, {
          reason: 'Invalid JSON data?'
        });
      }
      resolve();
    });
  }

  /**
  * @name _handleDELETE
  * @summary Handle an HTTP DELETE request
  * @param {string} catalog - name of database catalog
  * @param {object} urlData - URL data
  * @param {object} request - Node HTTP request object
  * @param {object} response - Node HTTP response object
  * @param {object} resolve - promise to resolve
  * @return {undefined}
  */
  _handleDELETE(catalog, urlData, request, response, resolve) {
    let qs = querystring.parse(urlData.query);
    if (qs._id) {
      if (!stor.findRecordByID(catalog, qs._id)) {
        serverResponse.sendNotFound(response);
        resolve();
        return;
      }
      stor.deleteRecord(catalog, qs._id);
    } else {
      // safty precaution to avoid deleting the catalog if caller used `id` then they meant `_id`
      if (this._isObjectEmpty(qs)) {
        stor.deleteCatalog(catalog);
      }
    }
    serverResponse.sendOk(response);
    resolve();
  }

  /**
  * @name _handleCORSRequest
  * @summary handle a CORS preflight request
  * @param {object} request - Node HTTP request object
  * @param {object} response - Node HTTP response object
  * @return {undefined}
  */
  _handleCORSRequest(request, response) {
    // Handle CORS preflight
    response.writeHead(ServerResponse.HTTP_OK, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'accept, authorization, cache-control, content-type, x-requested-with',
      'access-control-max-age': 10,
      'Content-Type': 'application/json'
    });
    response.end();
  }

  /**
  * @name _isObjectEmpty
  * @summary Determine if object is empty
  * @param {object} obj = object
  * @return {boolean} true / false
  */
  _isObjectEmpty(obj) {
    let hasOwnProperty = Object.prototype.hasOwnProperty;
    if (obj == null) {
      return true;
    } else if (obj.length > 0) {
      return false;
    } else if (obj.length === 0) {
      return true;
    } else if (typeof obj !== 'object') {
      return true;
    } else {
      for (let key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          return false;
        }
      }
    }
    return true;
  }

}

module.exports = new JMDB();
