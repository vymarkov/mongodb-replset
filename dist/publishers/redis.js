'use strict';
var Promise = require('bluebird');
var redis = require('redis');
require('bluebird').promisifyAll(redis.RedisClient.prototype);
function pub(chname, body) {
    return function (conn) {
        return chname()
            .then(function (name) {
            return new Promise(function (resolve, reject) {
                conn.publish(name, JSON.stringify(body), function (err, resp) {
                    if (err)
                        return reject(err);
                    resolve(true);
                });
            });
        });
    };
}
exports.pub = pub;
function sub(ch, cb) {
    return function (conn) {
        return new Promise(function (resolve, reject) {
            conn.on('subscribe', function () {
                console.log('subscribed');
                resolve(true);
            });
            conn.on('message', function (channel, body) {
                if (channel === ch) {
                    cb(JSON.parse(body));
                }
            });
            conn.subscribe(ch);
        });
    };
}
exports.sub = sub;
function conndb(url) {
    return new Promise(function (resolve, reject) {
        var c = redis.createClient(url);
        c.on('ready', function () { return resolve(c); });
        c.on('error', reject);
    });
}
exports.conndb = conndb;
function duplconn(client) {
    return new Promise(function (resolve, reject) {
        var c = client.duplicate();
        c.on('ready', function () { return resolve(c); });
        c.on('error', reject);
    });
}
exports.duplconn = duplconn;
function crearePubClient(redisurl, channelname, cb) {
    return function (err, body) {
        if (err) {
            cb(err);
        }
        else {
            redisurl()
                .then(conndb)
                .then(pub(channelname, body))
                .then(function () {
                console.log('message published');
                cb();
            })
                .catch(cb);
        }
    };
}
exports.crearePubClient = crearePubClient;
//# sourceMappingURL=redis.js.map