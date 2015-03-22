'use strict';

const app = require('koa')();
const serve = require('koa-static');
const route = require('koa-route');
const cs = require('co-stream');
const byline = require('byline');
const stripAnsi = require('strip-ansi');
const co = require('co');
const request = require('co-request');
const log = require('five-bells-shared/services/log');
const notifications = require('./controllers/notifications');
const config = require('./services/config');
const crawler = require('./services/crawler');
const broker = require('./services/broker');
require('./services/subscriber');

app.use(serve(__dirname + '/public'));

app.use(route.post('/notifications', notifications.post));

const server = require('http').createServer(app.callback());
const io = require('socket.io')(server);

broker.setBroadcaster(io);

['ledger', 'trader', 'user'].forEach(function (type) {
  crawler.on(type, function *(detail) {
    broker.emit({
      type: type,
      detail: detail
    });
  });
});

// crawler.on('trader', function (detail) {
//   broker.emit({
//     type: 'trader',
//     detail: detail
//   });
// });

if (!module.parent) {
  co(function *() {
    server.listen(config.server.port);
    log('app').info('visualizer listening on ' + config.server.bind_ip + ':' +
      config.server.port);
    log('app').info('public at ' + config.server.base_uri);

    yield crawler.crawl();
  }).catch(function (err) {
    console.error(typeof err === 'object' && err.stack ? err.stack : err);
  });
}
