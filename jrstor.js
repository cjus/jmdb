'use strict';

const Promise = require('bluebird');
const hydra = require('hydra');
const uuid = require('uuid');
const UMFMessage = hydra.getUMFMessageHelper();
const Utils = hydra.getUtilsHelper();
const ServerResponse = hydra.getServerResponseHelper();
const serverResponse = new ServerResponse;

const url = require('url');
const querystring = require('querystring');

const version = require('./package.json').version;

const INFO = 'info';
const ERROR = 'error';
const FATAL = 'fatal';

/**
* @name JRStor
* @description JSON Redis Store
*/
class JRStor {
  /**
  * @name constructor
  * @return {undefined}
  */
  constructor() {
    this.config = null;
    this.appLogger = null;
    this.dataStor = {
      catalogs: {}
    };
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
    this.issueLog.push({
      ts: new Date().toISOString(),
      type,
      entry: message
    });
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
        serverResponse.sendInvalidRequest(response);
        resolve();
        return;
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
    let doc = {};
    let qs = querystring.parse(urlData.query);
    if (qs._id) {
      this.dataStor.catalogs[catalog].forEach((document) => {
        if (document._id === qs._id) {
          doc = document;
        }
      });
    } else {
      doc = this.dataStor.catalogs[catalog];
    }
    serverResponse.sendResponse(ServerResponse.HTTP_OK, response, {
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
        doc._id = uuid.v4();
        if (!this.dataStor.catalogs[catalog]) {
          this.dataStor.catalogs[catalog] = [];
        }
        this.dataStor.catalogs[catalog].push(doc);
        serverResponse.sendResponse(ServerResponse.HTTP_OK, response, {
          result: {
            _id: doc._id
          }
        });
      } else {
        serverResponse.sendInvalidRequest(response, {
          reason: 'missing document body'
        });
        resolve();
        return;
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
      serverResponse.sendResponse(ServerResponse.HTTP_OK, response, {
        result: {
        }
      });
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
      let idx = -1;
      let i = -1;
      this.dataStor.catalogs[catalog].forEach((document) => {
        idx++;
        if (document._id === qs._id) {
          i = idx;
        }
      });
      if (i !== -1) {
        this.dataStor.catalogs[catalog].splice(i, 1);
      }
    } else {
      delete this.dataStor.catalogs[catalog];
    }
    serverResponse.sendResponse(ServerResponse.HTTP_OK, response);
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

}

module.exports = new JRStor();
