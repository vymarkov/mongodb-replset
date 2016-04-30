"use strict";
var configurator_1 = require('../configurator');
var redis_1 = require('../publishers/redis');
var Promise = require('bluebird');
var ms = 10 * 1000;
var manulUrl = process.env.MANUL_ADDR;
var redisUrl = process.env.REDIS_ADDR || 'redis://redis:6379/1';
var channelname = process.env.REDIS_CHANNEL_NAME || 'replset';
var chname = function () { return Promise.resolve(channelname); };
var redisAddr = function () { return Promise.resolve(redisUrl); };
var errch = function (err) {
    if (err) {
        console.error(err);
    }
};
var progress = redis_1.crearePubClient(redisAddr, chname, errch);
var services = configurator_1.fetchServicesFromDockerSwarm(manulUrl);
configurator_1.forever(function () { return configurator_1.sync(services); }, progress, ms);
//# sourceMappingURL=redispub.js.map