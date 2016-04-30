'use strict';
var Promise = require('bluebird');
var url = require('url');
var request = require('request');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var WriteConcernOpts = (function () {
    function WriteConcernOpts() {
        this.w = 'majority';
        this.wtimeout = 0;
        this.j = false;
    }
    return WriteConcernOpts;
}());
function fetchServices(manulUrl) {
    return function (opts) {
        return new Promise(function (resolve, reject) {
            request({
                method: 'GET',
                url: manulUrl,
                qs: opts,
                json: true,
                timeout: 5 * 1000
            }, function (err, res, body) {
                if (err) {
                    return reject(err);
                }
                resolve(body.split(',').map(function (str) { return str.trim(); }));
            });
        }).then(function (services) {
            services = services.map(function (uri) { return url.parse(uri).host; });
            return Promise.resolve(services.join(','));
        });
    };
}
;
function mongoUrl(services) {
    return Promise.resolve("mongodb://admin:password@" + services + "/dev?replSet=rs0");
}
function forever(fn, ms) {
    setInterval(function () {
        fn();
    }, ms || 2000);
}
function conndb() {
    var oldUrl;
    var oldConn;
    return function (url) {
        console.log('MongoDB Replica Set connection url %s', url);
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
    var services = fetchServices(manulAdrr);
    var connection = conndb();
    Promise.resolve({
        filters: {
            status: ['running'],
            label: ['service=mongo', 'replset=rs0']
        }
    }).then(services)
        .then(mongoUrl)
        .then(connection)
        .then(function (db) {
        db.topology.on('serverDescriptionChanged', function (event) {
            console.log('received serverDescriptionChanged');
            console.log(JSON.stringify(event, null, 2));
        });
        db.topology.on('serverHeartbeatStarted', function (event) {
            console.log('received serverHeartbeatStarted');
            console.log(JSON.stringify(event, null, 2));
        });
        db.topology.on('serverHeartbeatSucceeded', function (event) {
            console.log('received serverHeartbeatSucceeded');
            console.log(JSON.stringify(event, null, 2));
        });
        db.topology.on('serverHearbeatFailed', function (event) {
            console.log('received serverHearbeatFailed');
            console.log(JSON.stringify(event, null, 2));
        });
        db.topology.on('serverOpening', function (event) {
            console.log('received serverOpening');
            console.log(JSON.stringify(event, null, 2));
        });
        db.topology.on('serverClosed', function (event) {
            console.log('received serverClosed');
            console.log(JSON.stringify(event, null, 2));
        });
        db.topology.on('topologyOpening', function (event) {
            console.log('received topologyOpening');
            console.log(JSON.stringify(event, null, 2));
        });
        db.topology.on('topologyClosed', function (event) {
            console.log('received topologyClosed');
            console.log(JSON.stringify(event, null, 2));
        });
        db.topology.on('topologyDescriptionChanged', function (event) {
            console.log('received topologyDescriptionChanged');
            console.log(JSON.stringify(event, null, 2));
        });
    });
}
startApp();
//# sourceMappingURL=mongodb-tm.js.map