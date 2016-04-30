'use strict';
var url = require('url');
var Promise = require('bluebird');
var replset;
(function (replset_1) {
    var mongodb = require('mongodb');
    var mongodbUri = require('mongodb-uri');
    var request = require('request');
    var _ = {
        chain: require('lodash/fp/chain'),
        find: require('lodash/fp/find'),
        cloneDeep: require('lodash/fp/cloneDeep')
    };
    var MongoClient = mongodb.MongoClient;
    require('../lib/utils').usePromise(require('bluebird'));
    var ReplSetState;
    (function (ReplSetState) {
        ReplSetState[ReplSetState["STARTUP"] = 0] = "STARTUP";
        ReplSetState[ReplSetState["PRIMARY"] = 1] = "PRIMARY";
        ReplSetState[ReplSetState["SECONDARY"] = 2] = "SECONDARY";
        ReplSetState[ReplSetState["RECOVERING"] = 3] = "RECOVERING";
        ReplSetState[ReplSetState["STARTUP2"] = 5] = "STARTUP2";
        ReplSetState[ReplSetState["UNKNOWN"] = 6] = "UNKNOWN";
        ReplSetState[ReplSetState["ARBITER"] = 7] = "ARBITER";
        ReplSetState[ReplSetState["DOWN"] = 8] = "DOWN";
        ReplSetState[ReplSetState["ROLLBACK"] = 9] = "ROLLBACK";
        ReplSetState[ReplSetState["REMOVED"] = 10] = "REMOVED";
    })(ReplSetState || (ReplSetState = {}));
    function countUnReachableeMembers(services) {
        return fetchPrimaryDatabase(services)
            .then(function (primary) {
            console.log('fetchUnReachableeMembers', 0, primary);
            return replSetGetStatus(primary);
        })
            .then(function (status) {
            return Promise.resolve(status.members.filter(function (m) { return m.state === ReplSetState.DOWN; }).length);
        });
    }
    function selectMembersToAdd(services, primary, members) {
        console.log('selectMembersToAdd', 1, 'services', services);
        console.log('selectMembersToAdd', 2, 'primary', primary);
        console.log('selectMembersToAdd', 3, 'members', members);
        return services
            .filter(function (srvUrl) { return url.parse(srvUrl).host !== url.parse(primary).host; })
            .filter(function (srvUrl) {
            for (var i = 0, host = url.parse(srvUrl).host, len = members.length; i < len; i++) {
                if (members[i].host === host) {
                    return false;
                }
            }
            return true;
        });
    }
    function prepareReplSetConfig(config, addToReplset) {
        var _config = _.cloneDeep(config);
        if (addToReplset.length) {
            _config.version += 1;
            _config.members = _config.members.concat(addToReplset);
            _config.members.forEach(function (m, idx) {
                m._id = idx;
            });
        }
        return _config;
    }
    function fetchPrimaryDatabase(services) {
        console.log('fetchPrimaryDatabase', 1, services);
        return Promise.resolve(services)
            .then(Promise['doUntil'](function (conf) {
            if (conf instanceof mongodb.MongoError) {
                return false;
            }
            return isPrimaryDatabase(conf);
        }, function (uri) {
            console.log('fetchPrimaryDatabase', 0, uri);
            return fetchMongoConf(prepareMongoUrl(uri)).then(function (conf) {
                return Promise.resolve(conf);
            }).catch(function (err) {
                console.log('fetchPrimaryDatabase', 3, 'err', err);
                return Promise.reject(err);
            });
        }, function (conf) {
            console.log('fetchPrimaryDatabase', 2, conf);
            return Promise.resolve('tcp://' + conf.primary);
        }, 2000));
    }
    function fetchPrimaryDatabaseTest() {
        fetchPrimaryDatabase(['tcp://192.168.99.103:27017', 'tcp://192.168.99.104:27017'])
            .then(function (primary) {
            console.log(primary);
        })
            .catch(function (err) {
            console.error(err);
        });
    }
    function prepareMongoUrl(uri) {
        var _url = url.parse(uri);
        _url.protocol = 'mongodb';
        _url.auth = 'admin:password';
        _url.pathname = 'admin';
        return url.format(_url);
    }
    function prepareMongoUrlTest() {
        var url = 'tcp://192.168.99.104:27017';
        url = prepareMongoUrl(url);
    }
    function fetchMongoConf(uri) {
        console.log('fetchMongoConf', 1, uri);
        return new Promise(function (resolve, reject) {
            MongoClient.connect(uri)
                .then(function (db) {
                db.admin().ping()
                    .then(function (resp) {
                    if (resp.ok === 1) {
                        return db.admin()
                            .command({ isMaster: 1 })
                            .then(function (config) {
                            db.close();
                            if (isPrimaryDatabase(config)) {
                                var host_1 = url.parse(uri).host;
                                console.log('fetchMongoConf', 2, host_1);
                                if (host_1 !== config.me) {
                                    replSetGetConfig(uri)
                                        .then(function (conf) {
                                        console.log('fetchMongoConf', 3, conf);
                                        conf.version += 1;
                                        conf.members[0].host = host_1;
                                        return replSetReconfig(uri)(conf)
                                            .then(function () {
                                            resolve(conf);
                                        });
                                    })
                                        .catch(reject);
                                }
                                else {
                                    resolve(config);
                                }
                            }
                            else {
                                return resolve(config);
                            }
                        });
                    }
                    db.close();
                    return reject(new Error('The mongod is unreachable'));
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    }
    function fetchMongoConfTest() {
        return fetchMongoConf(prepareMongoUrl('tcp://192.168.99.104:27017'))
            .then(function (config) {
            console.log('done', config);
        })
            .catch(function (err) {
            console.log(err);
        });
    }
    ;
    function replSetGetConfig(uri) {
        console.log('replSetGetConfig', 1, uri);
        return new Promise(function (resolve, reject) {
            MongoClient.connect(uri)
                .then(function (db) {
                return db.admin()
                    .authenticate('admin', 'password')
                    .then(function (resp) {
                    return db.admin().command({
                        'replSetGetConfig': 1
                    });
                })
                    .then(function (resp) {
                    if (resp.ok !== 1) {
                        throw new Error('Something went wrong');
                    }
                    db.close();
                    resolve(resp.config);
                })
                    .catch(function (err) {
                    db.close();
                    throw err;
                });
            })
                .catch(function (err) {
                reject(err);
            });
        });
    }
    function replSetGetConfigTest() {
        replSetGetConfig(prepareMongoUrl('tcp://192.168.99.104:27017'))
            .then(function (conf) {
            console.log(conf);
        })
            .catch(function (err) {
            console.log(err);
            console.error(err.stack);
        });
    }
    function connToDb(uri) {
        return MongoClient.connect(uri)
            .then(function (db) {
            return db.admin()
                .command({ ping: 1 })
                .then(function () {
                return Promise.resolve(db);
            });
        });
    }
    ;
    function connToDbTest() {
        connToDb(prepareMongoUrl('tcp://192.168.99.104:27017'))
            .then(function (db) {
            return db.command({ replSetGetConfig: 1 });
        })
            .then(function (resp) {
            console.log(resp);
        })
            .catch(function (e) {
            console.error(e);
        });
    }
    function replSetGetStatus(uri) {
        return connToDb(uri)
            .then(function (db) {
            return db.command({
                replSetGetStatus: 1
            }).then(function (resp) {
                db.close();
                return Promise.resolve(resp);
            });
        });
    }
    function replSetGetStatusTest() {
        var mongodbUri = prepareMongoUrl("tcp://192.168.99.108:27017");
        replSetGetStatus(mongodbUri)
            .then(function (status) {
            console.log(status);
        })
            .catch(function (err) {
            console.log(err);
        });
    }
    function replSetReconfig(uri) {
        console.log('replSetReconfig', 1);
        return function (conf) {
            console.log('replSetReconfig', 2, conf);
            return connToDb(uri)
                .then(function (db) {
                return db.command({
                    replSetReconfig: conf
                }).then(function (resp) {
                    db.close();
                    return Promise.resolve(resp);
                });
            });
        };
    }
    ;
    function replSetReconfigTest() {
        var host = '192.168.99.104:27017';
        var mongodbUri = prepareMongoUrl("tcp://" + host);
        replSetGetConfig(mongodbUri)
            .then(function (conf) {
            conf.version += 1;
            conf.members[0].host = host;
            return replSetReconfig(mongodbUri)(conf);
        })
            .then(function (resp) {
            console.log('done', resp);
        })
            .catch(function (err) {
            console.log(err);
        });
    }
    function isPrimaryDatabase(conf) {
        if (conf.me && conf.primary && conf.me === conf.primary) {
            return true;
        }
    }
    function isPrimaryDatabaseTest() {
        var host = '127.0.0.1:27017';
        var conf = {
            hosts: [
                host
            ],
            setName: 'rs0',
            setVersion: 1,
            ismaster: true,
            secondary: false,
            primary: host,
            me: host,
            ok: 1
        };
        console.log(isPrimaryDatabase(conf));
    }
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
            });
        };
    }
    function schedule(timeStart, miliseconds, forever) {
        var timeEnd = +new Date;
        var delta = (timeEnd - timeStart);
        var ms = delta < miliseconds ? miliseconds - delta : 0;
        setTimeout(function () { return forever(); }, ms);
    }
    function fetchServicesFromDockerSwarm(manulUrl) {
        return fetchServices(manulUrl)({
            filters: {
                status: ['running'],
                label: ['service=mongo', 'replset=rs0']
            }
        });
    }
    replset_1.fetchServicesFromDockerSwarm = fetchServicesFromDockerSwarm;
    function sync(fetchServices) {
        return fetchServices
            .then(function (services) {
            console.log('sync', 0, services);
            if (!services.length) {
                return Promise.resolve({});
            }
            return fetchPrimaryDatabase(services)
                .then(function (primary) {
                primary = prepareMongoUrl(primary);
                console.log('sync', 1, primary);
                return Promise.props({
                    conf: replSetGetConfig(primary),
                    status: replSetGetStatus(primary)
                }).then(function (replset) {
                    var addToReplset = selectMembersToAdd(services, primary, replset.conf.members)
                        .map(function (srv) { return Object({ host: url.parse(srv).host }); });
                    console.log('sync', 2, addToReplset);
                    var config = prepareReplSetConfig(replset.conf, addToReplset);
                    if (config.version > replset.conf.version) {
                        return replSetReconfig(primary)(config);
                    }
                    return Promise.resolve();
                }).then(function () {
                    return Promise.props({
                        conf: replSetGetConfig(primary),
                        status: replSetGetStatus(primary)
                    });
                });
            });
        });
    }
    replset_1.sync = sync;
    function forever(fn, cb, miliseconds) {
        miliseconds = miliseconds || 5000;
        var timeStart = +new Date;
        fn()
            .then(function (res) {
            if (cb)
                cb(null, res);
            schedule(timeStart, miliseconds, forever.bind(null, fn, cb, miliseconds));
        })
            .catch(function (err) {
            if (cb)
                cb(err);
            schedule(timeStart, miliseconds, forever.bind(null, fn, cb, miliseconds));
        });
    }
    replset_1.forever = forever;
    if (global['describe']) {
        describe('#prepareReplSetConfig()', function () {
            it('should return an uppdated ReplSetConfig', function () {
                return Promise.resolve(true);
            });
        });
    }
})(replset || (replset = {}));
module.exports = replset;
//# sourceMappingURL=configurator.js.map