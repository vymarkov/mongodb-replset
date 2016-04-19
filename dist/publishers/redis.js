'use strict';
const Promise = require('bluebird');
const redis = require('redis');
require('bluebird').promisifyAll(redis.RedisClient.prototype);
function pub() {
}
exports.pub = pub;
function conndb(host = 'redis', port = 6379) {
    host = 'redis';
    port = 6379;
    return new Promise((resolve, reject) => {
        const c = redis.createClient(port, host);
        c.on('ready', () => resolve(c));
        c.on('error', reject);
    });
}
function init() {
    const host = 'redis', port = 6379, channelname = 'replset';
    const sub = redis.createClient(port, host);
    sub.on('subscribe', (channel, count) => {
    });
    sub.on('message', (channel, message) => {
        console.log("sub channel " + channel + ": " + message);
        console.log(message);
    });
    sub.subscribe('replset');
    return () => {
        const pub = redis.createClient(port, host);
        setInterval(() => {
            pub.publish(channelname, {
                uid: 1,
                username: 'mike'
            });
        }, 1000);
    };
}
exports.init = init;
conndb()
    .then((client) => {
    console.log(client.server_info);
});
//# sourceMappingURL=redis.js.map