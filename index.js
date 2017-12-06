/**
* @name Service Router
* @description This is the service entry point
*/
'use strict';

const http = require('http');
const hydra = require('hydra');
const jmdb = require('./lib/jmdb');
let appLogger;

/**
* Router route list.
*/
let routeList = [
  '[get]/v1/{serviceName}/*rest',
  '[post]/v1/{serviceName}/*rest',
  '[put]/v1/{serviceName}/*rest',
  '[delete]/v1/{serviceName}/*rest',
];

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

let main = async () => {
  try
  {
    console.log("     | |  \\/  | __| | |__  ");
    console.log("  _  | | |\\/| |/ _` | '_ \\ ");
    console.log(" | |_| | |  | | (_| | |_) |");
    console.log("  \\___/|_|  |_|\\__,_|_.__/");

    const HydraLogger = require('fwsp-logger').HydraLogger;
    let hydraLogger = new HydraLogger();
    hydra.use(hydraLogger);

    let newConfig = await hydra.init(`${__dirname}/config/config.json`, false);
    let serviceInfo = await hydra.registerService();

    // let newConfig = hydraExpress.getRuntimeConfig();

    let logEntry = `Starting jmdb service ${serviceInfo.serviceName}:${hydra.getInstanceVersion()} on ${serviceInfo.serviceIP}:${serviceInfo.servicePort}`;
    console.log(logEntry);
    hydra.sendToHealthLog('info', logEntry);

    appLogger = hydraLogger.getLogger();
    appLogger.info({
      msg: logEntry
    });

    if (global.gc) {
      global.gc();
    } else {
      console.warn('No GC hook! Start jmdb using `node --expose-gc index.js`.');
    }

    hydra.on('log', (_entry) => {});

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
    await hydra.registerRoutes(updatedRouteList);
    jmdb.init(newConfig, appLogger);
  } catch (err) {
    let stack = err.stack;
    console.log(stack); // console log because appLogger isn't available in this case.
    process.emit('cleanup');
  }
}

main();