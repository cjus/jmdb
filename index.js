/**
* @name Service Router
* @description This is the service entry point
*/
'use strict';

/**
* Router route list.
*/
let routeList = [
  '[get]/v1/{serviceName}/*rest',
  '[post]/v1/{serviceName}/*rest',
  '[put]/v1/{serviceName}/*rest',
  '[delete]/v1/{serviceName}/*rest',
];

const http = require('http');
const hydra = require('hydra');
const jrstor = require('./jrstor');

const HydraLogger = require('fwsp-logger').HydraLogger;
let hydraLogger = new HydraLogger();
hydra.use(hydraLogger);
let appLogger;

let config = {};

/**
* Initialize hydra for use by Service Router.
*/
hydra.init(`${__dirname}/config/config.json`, false)
  .then((newConfig) => {
    config = newConfig;
    return hydra.registerService();
  })
  .then((serviceInfo) => {
    let logEntry = `Starting JRStor service ${serviceInfo.serviceName}:${hydra.getInstanceVersion()} on ${serviceInfo.serviceIP}:${serviceInfo.servicePort}`;
    console.log(logEntry);
    hydra.sendToHealthLog('info', logEntry);

    appLogger = hydraLogger.getLogger();
    appLogger.info({
      msg: logEntry
    });

    hydra.on('log', (_entry) => {
    });

    process.on('cleanup', () => {
      hydra.shutdown();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      appLogger.fatal('Received SIGTERM');
      process.emit('cleanup');
    });
    process.on('SIGINT', () => {
      appLogger.fatal('Received SIGINT');
      process.emit('cleanup');
    });
    process.on('unhandledRejection', (reason, _p) => {
      appLogger.fatal(reason);
      process.emit('cleanup');
    });
    process.on('uncaughtException', (err) => {
      let stack = err.stack;
      delete err.__cached_trace__;
      delete err.__previous__;
      delete err.domain;
      appLogger.fatal({
        stack
      });
      process.emit('cleanup');
    });

    /**
    * @summary Start HTTP server and add request handler callback.
    * @param {object} request - Node HTTP request object
    * @param {object} response - Node HTTP response object
    */
    let server = http.createServer((request, response) => {
      jrstor.routeRequest(request, response);
    });
    server.listen(serviceInfo.servicePort);
    let updatedRouteList = [];
    routeList.forEach((route) => {
      updatedRouteList.push(route.replace('{serviceName}', serviceInfo.serviceName));
    });
    return hydra.registerRoutes(updatedRouteList);
  })
  .then(() => {
    jrstor.init(config, appLogger);
    return null; // to silence promise warning: http://goo.gl/rRqMUw
  })
  .catch((err) => {
    console.log(err);
    process.exit(-1);
  });
