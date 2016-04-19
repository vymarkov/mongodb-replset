'use strict';
const url = require('url');
const Promise = require('bluebird');
var replset;
(function (replset_1) {
    const mongodb = require('mongodb');
    const mongodbUri = require('mongodb-uri');
    const request = require('request');
    const _ = require('lodash');
    const MongoClient = mongodb.MongoClient;
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
    function initReplset(services) {
        return Promise.resolve();
    }
    function initReplsetTest() {
        initReplset(['tcp://192.168.99.104:27017'])
            .then(() => {
            console.log('done');
        });
    }
    function countUnReachableeMembers(services) {
        return fetchPrimaryDatabase(services)
            .then((primary) => {
            console.log('fetchUnReachableeMembers', 0, primary);
            return replSetGetStatus(primary);
        })
            .then((status) => {
            return Promise.resolve(status.members.filter((m) => m.state === ReplSetState.DOWN).length);
        });
    }
    function selectMembersToAdd(services, primary, members) {
        return services
            .filter((srvUrl) => url.parse(srvUrl).host !== url.parse(primary).host)
            .filter((srvUrl) => {
            return !_.find(members, (m) => m.host === url.parse(srvUrl).host);
        });
    }
    function prepareReplSetConfig(config, addToReplset) {
        const _config = _.cloneDeep(config);
        if (addToReplset.length) {
            _config.version += 1;
            _config.members = _config.members.concat(addToReplset);
            _config.members.forEach((m, idx) => {
                m._id = idx;
            });
        }
        return _config;
    }
    function fetchPrimaryDatabase(services) {
        console.log('fetchPrimaryDatabase', 1, services);
        return Promise.resolve(services)
            .then(Promise['doUntil']((conf) => {
            if (conf instanceof mongodb.MongoError) {
                return false;
            }
            return isPrimaryDatabase(conf);
        }, (uri) => {
            console.log('fetchMongoConf', 0, uri);
            return fetchMongoConf(prepareMongoUrl(uri)).then((conf) => {
                return Promise.resolve(conf);
            }).catch((err) => {
                return Promise.resolve(err);
            });
        }, (conf) => {
            console.log('fetchPrimaryDatabase', 2, conf);
            return Promise.resolve('tcp://' + conf.primary);
        }, 2000));
    }
    function fetchPrimaryDatabaseTest() {
        fetchPrimaryDatabase(['tcp://192.168.99.103:27017', 'tcp://192.168.99.104:27017'])
            .then((primary) => {
            console.log(primary);
        })
            .catch((err) => {
            console.error(err);
        });
    }
    function prepareMongoUrl(uri) {
        let _url = url.parse(uri);
        _url.protocol = 'mongodb';
        _url.auth = 'admin:password';
        _url.pathname = 'admin';
        return url.format(_url);
    }
    function prepareMongoUrlTest() {
        let url = 'tcp://192.168.99.104:27017';
        url = prepareMongoUrl(url);
    }
    function fetchMongoConf(uri) {
        console.log('fetchMongoConf', 1, uri);
        return new Promise((resolve, reject) => {
            MongoClient.connect(uri)
                .then((db) => {
                db.admin().ping()
                    .then((resp) => {
                    if (resp.ok === 1) {
                        return db.admin()
                            .command({ isMaster: 1 })
                            .then((config) => {
                            db.close();
                            if (isPrimaryDatabase(config)) {
                                const host = url.parse(uri).host;
                                console.log('fetchMongoConf', 2, host);
                                if (host !== config.me) {
                                    replSetGetConfig(uri)
                                        .then((conf) => {
                                        conf.version += 1;
                                        conf.members[0].host = host;
                                        return replSetReconfig(uri)(conf);
                                    }).then(() => {
                                        resolve(config);
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
            }).catch((err) => {
                reject(err);
            });
        });
    }
    function fetchMongoConfTest() {
        return fetchMongoConf(prepareMongoUrl('tcp://192.168.99.104:27017'))
            .then((config) => {
            console.log('done', config);
        })
            .catch((err) => {
            console.log(err);
        });
    }
    ;
    function replSetGetConfig(uri) {
        console.log('replSetGetConfig', 1, uri);
        return new Promise((resolve, reject) => {
            MongoClient.connect(uri)
                .then((db) => {
                return db.admin()
                    .authenticate('admin', 'password')
                    .then((resp) => {
                    return db.admin().command({
                        'replSetGetConfig': 1
                    });
                })
                    .then((resp) => {
                    if (resp.ok !== 1) {
                        throw new Error('Something went wrong');
                    }
                    db.close();
                    resolve(resp.config);
                })
                    .catch((err) => {
                    db.close();
                    throw err;
                });
            })
                .catch((err) => {
                err.args = arguments;
                reject(err);
            });
        });
    }
    function replSetGetConfigTest() {
        replSetGetConfig(prepareMongoUrl('tcp://192.168.99.104:27017'))
            .then((conf) => {
            console.log(conf);
        })
            .catch((err) => {
            console.log(err);
            console.error(err.stack);
        });
    }
    function connToDb(uri) {
        return MongoClient.connect(uri)
            .then((db) => {
            return db.admin()
                .command({ ping: 1 })
                .then(() => {
                return Promise.resolve(db);
            });
        });
    }
    ;
    function connToDbTest() {
        connToDb(prepareMongoUrl('tcp://192.168.99.104:27017'))
            .then((db) => {
            return db.command({ replSetGetConfig: 1 });
        })
            .then((resp) => {
            console.log(resp);
        })
            .catch((e) => {
            console.error(e);
        });
    }
    function replSetGetStatus(uri) {
        return connToDb(uri)
            .then((db) => {
            return db.command({
                replSetGetStatus: 1
            }).then((resp) => {
                db.close();
                return Promise.resolve(resp);
            });
        });
    }
    function replSetGetStatusTest() {
        const mongodbUri = prepareMongoUrl(`tcp://192.168.99.108:27017`);
        replSetGetStatus(mongodbUri)
            .then((status) => {
            console.log(status);
        })
            .catch((err) => {
            console.log(err);
        });
    }
    function replSetReconfig(uri) {
        console.log('replSetReconfig', 1);
        return (conf) => {
            return connToDb(uri)
                .then((db) => {
                return db.command({
                    replSetReconfig: conf
                }).then((resp) => {
                    db.close();
                    return Promise.resolve(resp);
                });
            });
        };
    }
    ;
    function replSetReconfigTest() {
        const host = '192.168.99.104:27017';
        const mongodbUri = prepareMongoUrl(`tcp://${host}`);
        replSetGetConfig(mongodbUri)
            .then((conf) => {
            conf.version += 1;
            conf.members[0].host = host;
            return replSetReconfig(mongodbUri)(conf);
        })
            .then((resp) => {
            console.log('done', resp);
        })
            .catch((err) => {
            console.log(err);
        });
    }
    function isPrimaryDatabase(conf) {
        return conf.me === conf.primary;
    }
    function isPrimaryDatabaseTest() {
        let host = '127.0.0.1:27017';
        let conf = {
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
        return (opts) => {
            return new Promise((resolve, reject) => {
                request({
                    method: 'GET',
                    url: manulUrl,
                    qs: opts,
                    json: true,
                    timeout: 5 * 1000
                }, (err, res, body) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(body.split(','));
                });
            });
        };
    }
    function schedule(timeStart, miliseconds, forever) {
        let timeEnd = +new Date;
        let delta = (timeEnd - timeStart);
        let ms = delta < miliseconds ? miliseconds - delta : 0;
        setTimeout(() => forever(), ms);
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
            .then((services) => {
            console.log('sync', 0, services);
            return fetchPrimaryDatabase(services)
                .then((primary) => {
                primary = prepareMongoUrl(primary);
                console.log('sync', 1, primary);
                return Promise.props({
                    conf: replSetGetConfig(primary),
                    status: replSetGetStatus(primary)
                }).then((replset) => {
                    const addToReplset = selectMembersToAdd(services, primary, replset.conf.members)
                        .map((srv) => Object({ host: url.parse(srv).host }));
                    const config = prepareReplSetConfig(replset.conf, addToReplset);
                    if (config.version > replset.conf.version) {
                        return replSetReconfig(primary)(config);
                    }
                    return Promise.resolve();
                }).then(() => {
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
        let timeStart = +new Date;
        fn()
            .then((res) => {
            if (cb)
                cb(null, res);
            schedule(timeStart, miliseconds, forever.bind(null, fn, cb, miliseconds));
        })
            .catch((err) => {
            if (cb)
                cb(err);
            schedule(timeStart, miliseconds, forever.bind(null, fn, cb, miliseconds));
        });
    }
    replset_1.forever = forever;
    if (global['describe']) {
        describe('#prepareReplSetConfig()', () => {
            it('should return an uppdated ReplSetConfig', () => {
                return Promise.resolve(true);
            });
        });
    }
})(replset || (replset = {}));
module.exports = replset;
//# sourceMappingURL=configurator.js.map