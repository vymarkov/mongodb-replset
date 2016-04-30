'use strict';
var Promise = require('bluebird');
var fetchServices_1 = require('../fetchServices');
var mongoUrl_1 = require('../mongoUrl');
var request = require('request');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var faker = require('faker');
var WriteConcernOpts = (function () {
    function WriteConcernOpts() {
        this.w = 'majority';
        this.wtimeout = 0;
        this.j = false;
    }
    return WriteConcernOpts;
}());
function forever(fn, ms) {
    setInterval(function () {
        fn();
    }, ms || 2000);
}
function conndb() {
    var oldUrl;
    var oldConn;
    return function (url) {
        if (oldUrl && oldConn && oldUrl === url) {
            return Promise.resolve(oldConn);
        }
        if (oldConn) {
            oldConn.close();
        }
        return new Promise(function (resolve, reject) {
            MongoClient.connect(url, {
                promiseLibrary: require('bluebird')
            }, function (err, db) {
                if (err)
                    return reject(err);
                console.log();
                console.log('MongoDB Replica Set connection url %s', url);
                console.log('Connected correctly to server');
                console.log();
                oldUrl = url;
                oldConn = db;
                resolve(oldConn);
            });
        });
    };
}
function insertDoc(doc, opts) {
    return function (collection) {
        return collection.insertOne(doc, opts)
            .tap(function () {
            console.log('Document successfuly inserted', doc);
            console.log();
        })
            .catch(function (err) {
            console.error('Something went wrong when we were trying to insert document', doc);
            throw err;
        });
    };
}
function removeDoc(cond) {
    return function (collection) {
        return collection.deleteOne(cond)
            .tap(function () {
            console.log('Document successfuly removed', cond);
            console.log();
        })
            .catch(function (err) {
            console.error('Something went wrong when we were trying to remove document', cond);
            throw err;
        });
    };
}
function findDoc(cond) {
    return function (collection) {
        return collection.find(cond).limit(1).toArray()
            .tap(function (docs) {
            console.log('Document found', docs[0]);
            console.log();
        });
    };
}
function coll(db) {
    return function (collname) {
        return Promise.resolve(db.collection(collname));
    };
}
function startApp() {
    var manulAdrr = process.env.MANUL_ADDR || 'http://192.168.99.102:3000';
    var services = fetchServices_1.fetchServices(manulAdrr);
    var connection = conndb();
    forever(function () {
        var user = {
            username: faker.internet.userName().toLowerCase(),
            email: faker.internet.email().toLowerCase()
        };
        var delayms = 1500;
        Promise.resolve({
            filters: {
                status: ['running'],
                label: ['service=mongo', 'replset=rs0']
            }
        })
            .then(services)
            .then(function (services) {
            var srvs = services.split(',').map(function (url) {
                var _a = url.split(':'), host = _a[0], port = _a[1];
                return { host: host, port: +port || 27017 };
            });
            return mongoUrl_1.mongoConnectionString(function () { return Promise.resolve(srvs); });
        })
            .then(connection)
            .then(function (db) {
            var collection = coll(db);
            return collection('users')
                .tap(insertDoc(user, {
                w: "majority",
                wtimeout: 0,
                j: false
            }))
                .delay(delayms)
                .tap(findDoc({ username: user.username }))
                .delay(delayms)
                .tap(removeDoc({ username: user.username }))
                .delay(delayms);
        });
    }, 5 * 1000);
}
startApp();
//# sourceMappingURL=mongodb-crud.js.map