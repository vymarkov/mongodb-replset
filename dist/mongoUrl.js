'use strict';
var Promise = require('bluebird');
var mongodbUri = require('mongodb-uri');
function mongoConnectionString(fetchServices) {
    var env = process.env;
    var hosts = (env.MONGODB_HOSTS || '').split(',').map(function (hostname) {
        var _a = hostname.split(':'), host = _a[0], port = _a[1];
        return {
            host: host, port: port || 27017
        };
    });
    var _a = [env.MONGODB_AUTH === 'yes', env.MONGODB_USERNAME || env.MONGODB_USER, env.MONGODB_PASSWORD || env.MONGODB_PASS], authEnabled = _a[0], user = _a[1], pass = _a[2];
    var _b = [env.MONGODB_HOST || 'localhost', env.MONGODB_PORT || 27017, env.MONGODB_DATABASE || 'test'], host = _b[0], port = _b[1], db = _b[2];
    var _c = [env.MONGODB_REPLSET === 'yes', env.MONGODB_REPLSET_NAME], replSetEnabled = _c[0], replSetName = _c[1];
    return fetchServices()
        .then(function (services) {
        var opts = {};
        var uri = {
            hosts: services,
            database: db,
            options: opts
        };
        if (replSetEnabled) {
            opts.replSet = replSetName;
        }
        if (authEnabled) {
            uri.username = user;
            uri.password = pass;
        }
        return Promise.resolve(mongodbUri.format(uri));
    });
}
exports.mongoConnectionString = mongoConnectionString;
function mongoConnectionStringTest() {
    process.env.MONGODB_AUTH = 'yes';
    process.env.MONGODB_USERNAME = 'user';
    process.env.MONGODB_PASSWORD = 'pass';
    process.env.MONGODDB_REPLSET = 'yes';
    process.env.MONGODB_REPLSET_NAME = 'rs0';
    process.env.MONGODB_DATABASE = 'test';
    var exConnString = 'mongodb://user:pass@localhost:27001,localhost:27002,localhost:27003/test?replSet=rs0';
    mongoConnectionString(function () { return Promise.resolve([{
            host: 'localhost',
            port: 27001
        }, {
            host: 'localhost',
            port: 27002
        }, {
            host: 'localhost',
            port: 27003
        }]); })
        .then(function (url) {
        console.log(url === exConnString);
        console.log(url);
    });
}
//# sourceMappingURL=mongoUrl.js.map