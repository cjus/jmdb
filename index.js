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

let appLogger;

process.on('cleanup', () => {
  hydra.shutdown()
    .then(() => {
      process.exit(-1);
    });
});
process.on('SIGTERM', () => {
  appLogger && appLogger.fatal('Received SIGTERM');
  process.emit('cleanup');
});
process.on('SIGINT', () => {
  appLogger && appLogger.fatal('Received SIGINT');
  process.emit('cleanup');
});
process.on('unhandledRejection', (reason, _p) => {
  appLogger && appLogger.fatal(reason);
  process.emit('cleanup');
});
process.on('uncaughtException', (err) => {
  let stack = err.stack;
  delete err.__cached_trace__;
  delete err.__previous__;
  delete err.domain;
  appLogger && appLogger.fatal({
    stack
  });
  process.emit('cleanup');
});

const http = require('http');
const hydra = require('hydra');
const jmdb = require('./jmdb');
let config = require('./config/config.json');

if (!config.hydra) {
  /**
  * @summary Start HTTP server and add request handler callback.
  * @param {object} request - Node HTTP request object
  * @param {object} response - Node HTTP response object
  */
  let server = http.createServer((request, response) => {
    jmdb.routeRequest(request, response);
  });
  server.listen(config.servicePort);
  let logEntry = `Starting jmdb service on ${config.servicePort}`;
  console.log(logEntry);
  jmdb.init(config, {});
}

if (config.hydra) {
  const HydraLogger = require('fwsp-logger').HydraLogger;
  let hydraLogger = new HydraLogger();
  hydra.use(hydraLogger);

  hydra.init(`${__dirname}/config/config.json`, false)
    .then((newConfig) => {
      config = newConfig;
      return hydra.registerService();
    })
    .then((serviceInfo) => {
      let logEntry = `Starting jmdb service ${serviceInfo.serviceName}:${hydra.getInstanceVersion()} on ${serviceInfo.serviceIP}:${serviceInfo.servicePort}`;
      console.log(logEntry);
      hydra.sendToHealthLog('info', logEntry);

      if (global.gc) {
        global.gc();
      } else {
        console.warn('No GC hook! Start jmdb using `node --expose-gc index.js`.');
      }

      appLogger = hydraLogger.getLogger();
      appLogger.info({
        msg: logEntry
      });

      hydra.on('log', (_entry) => {
      });

      /**
      * @summary Start HTTP server and add request handler callback.
      * @param {object} request - Node HTTP request object
      * @param {object} response - Node HTTP response object
      */
      let server = http.createServer((request, response) => {
        jmdb.routeRequest(request, response);
      });
      server.listen(serviceInfo.servicePort);
      let updatedRouteList = [];
      routeList.forEach((route) => {
        updatedRouteList.push(route.replace('{serviceName}', serviceInfo.serviceName));
      });
      return hydra.registerRoutes(updatedRouteList);
    })
    .then(() => {
      jmdb.init(config, appLogger);
      return null; // to silence promise warning: http://goo.gl/rRqMUw
    })
    .catch((err) => {
      let stack = err.stack;
      console.log(stack); // console log because appLogger isn't available in this case.
      process.emit('cleanup');
    });
}
