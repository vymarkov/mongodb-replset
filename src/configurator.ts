'use strict';

// https://jira.mongodb.org/browse/SERVER-20144

import * as util from 'util';
import * as url from 'url';
import * as Promise from 'bluebird';

namespace replset {
  const mongodb = require('mongodb');
  const mongodbUri = require('mongodb-uri');
  const request = require('request');

  const _ = {
    chain: require('lodash/fp/chain'),
    find: require('lodash/fp/find'),
    cloneDeep: require('lodash/fp/cloneDeep')
  };

  const MongoClient = mongodb.MongoClient;

  require('../lib/utils').usePromise(require('bluebird'));

  export interface MongodConf {
    hosts: string[];
    setName: string;
    setVersion: number;
    ismaster: boolean;
    secondary: boolean;
    primary: string;
    me: string;
    ok: number;
  }

  export interface ReplSetMember {
    _id: number;
    host: string;
    arbiterOnly?: boolean;
    buildIndexes?: boolean;
    hidden?: boolean;
    priority?: number;
    tags?: {
      [tag: string]: string
    },
    slaveDelay?: number;
    votes?: number;
  }

  export interface ReplSetConfig {
    _id: string;
    version: number;
    protocolVersion?: number;
    members: ReplSetMember[],
    settings?: {
      chainingAllowed: boolean;
      heartbeatIntervalMillis: number;
      heartbeatTimeoutSecs: number;
      electionTimeoutMillis: number;
    }
  }

  enum ReplSetState {
    STARTUP = 0,
    PRIMARY = 1,
    SECONDARY = 2,
    RECOVERING = 3,
    STARTUP2 = 5,
    UNKNOWN = 6,
    ARBITER = 7,
    DOWN = 8,
    ROLLBACK = 9,
    REMOVED = 10
  }

  export interface ReplSetStatus {
    set: string;
    myState: number;
    term: number;
    heartbeatIntervalMillis: number;
    members: {
      _id: number;
      name: string;
      health: number;
      state: number;
      stateStr: string;
      uptime: string;
      configVersion: number;
      pingMs: number;
      self?: boolean;
    }[]
  }

  // const doUntil: (arr: any[], test: (...any) => Promise<boolean>, doSomething: (...any) => Promise<any>, fn: (...any) => Promise<any>, tm?: number) => () => Promise<any> = Promise['doUntil'];

  function countUnReachableeMembers(services: string[]): Promise<number> {
    return <Promise<number>>fetchPrimaryDatabase(services)
      .then((primary: string) => {
        console.log('fetchUnReachableeMembers', 0, primary);
        return replSetGetStatus(primary);
      })
      .then((status: ReplSetStatus) => {
        return Promise.resolve(status.members.filter((m) => m.state === ReplSetState.DOWN).length);
      });
  }

  function selectMembersToAdd(services: string[], primary: string, members: ReplSetMember[]): string[] {
    console.log('selectMembersToAdd', 1, 'services', services);
    console.log('selectMembersToAdd', 2, 'primary', primary);
    console.log('selectMembersToAdd', 3, 'members', members);

    return services
      .filter((srvUrl) => url.parse(srvUrl).host !== url.parse(primary).host)
      .filter((srvUrl) => {
        for (var i = 0, host = url.parse(srvUrl).host, len = members.length; i < len; i++) {
          if (members[i].host === host) {
            return false;
          }
        }
        return true;
      });
  }

  function prepareReplSetConfig(config: ReplSetConfig, addToReplset: ReplSetMember[]): ReplSetConfig {
    const _config = _.cloneDeep(config);

    if (addToReplset.length) {
      _config.version += 1;
      _config.members = _config.members.concat(addToReplset);
      _config.members.forEach((m: ReplSetMember, idx: number) => {
        m._id = idx;
      });
    }

    return <ReplSetConfig>_config;
  }

  function fetchPrimaryDatabase(services: string[]) {
    console.log('fetchPrimaryDatabase', 1, services);

    return Promise.resolve(services)
      .then(Promise['doUntil']((conf) => {
        // @TODO: add to doUntil function the ability continue working even 
        // if we receive an error from the `doSomething` function
        if (conf instanceof mongodb.MongoError) {
          return false;
        }
        return isPrimaryDatabase(conf);
      }, (uri: string) => {
        console.log('fetchPrimaryDatabase', 0, uri);

        return fetchMongoConf(prepareMongoUrl(uri)).then((conf: MongodConf) => {
          return Promise.resolve(conf);
        }).catch((err) => {
          console.log('fetchPrimaryDatabase', 3, 'err', err);
          
          return Promise.reject(err);
          // return Promise.resolve(err);
        });
      }, (conf: MongodConf) => {
        console.log('fetchPrimaryDatabase', 2, conf);

        return Promise.resolve('tcp://' + conf.primary);
      }, 2000));
  }

  function fetchPrimaryDatabaseTest() {
    fetchPrimaryDatabase(['tcp://192.168.99.103:27017', 'tcp://192.168.99.104:27017'])
      .then((primary: string) => {
        console.log(primary);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function prepareMongoUrl(uri: string): string {
    let _url: url.Url = url.parse(uri);
    _url.protocol = 'mongodb';
    _url.auth = 'admin:password';
    _url.pathname = 'admin';
    return url.format(_url);
  }

  function prepareMongoUrlTest() {
    let url = 'tcp://192.168.99.104:27017';
    url = prepareMongoUrl(url);
  }

  function fetchMongoConf(uri: string): Promise<MongodConf> {
    console.log('fetchMongoConf', 1, uri);
    return new Promise<MongodConf>((resolve: (MongodConf) => void, reject) => {
      MongoClient.connect(uri)
        .then((db) => {
          db.admin().ping()
            .then((resp: { ok: number }) => {
              if (resp.ok === 1) {
                return db.admin()
                  .command({ isMaster: 1 })
                  .then((config: MongodConf) => {
                    db.close();

                    // @TODO: refactor that block code 
                    if (isPrimaryDatabase(config)) {
                      const host = url.parse(uri).host;
                      console.log('fetchMongoConf', 2, host);
                      if (host !== config.me) {
                        replSetGetConfig(uri)
                          .then((conf: ReplSetConfig) => {
                            console.log('fetchMongoConf', 3, conf);

                            conf.version += 1;
                            conf.members[0].host = host;
                            return replSetReconfig(uri)(conf)
                              .then(() => {
                                resolve(conf);
                              });
                          })
                          .catch(reject);
                      } else {
                        resolve(config);
                      }
                    } else {
                      return resolve(config);
                    }
                  });
              }
              db.close();
              return reject(new Error('The mongod is unreachable'));
            });
        }).catch((err) => {
          reject(err);
        })
    });
  }

  function fetchMongoConfTest() {
    return fetchMongoConf(prepareMongoUrl('tcp://192.168.99.104:27017'))
      .then((config: MongodConf) => {
        console.log('done', config);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  function replSetGetConfig(uri: string) {
    console.log('replSetGetConfig', 1, uri);

    return new Promise<ReplSetConfig>((resolve: (ReplSetConfig) => void, reject) => {
      MongoClient.connect(uri)
        .then((db) => {
          return db.admin()
            .authenticate('admin', 'password')
            .then((resp) => {
              return db.admin().command({
                'replSetGetConfig': 1
              });
            })
            .then((resp: { config: ReplSetConfig, ok: number }) => {
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
      .then((conf: ReplSetConfig) => {
        console.log(conf);
      })
      .catch((err) => {
        console.log(err);
        console.error(err.stack);
      });
  }

  function connToDb(uri: string) {
    return MongoClient.connect(uri)
      .then((db) => {
        return db.admin()
          .command({ ping: 1 })
          .then(() => {
            return Promise.resolve(db);
          });
      });
  };

  function connToDbTest() {
    connToDb(prepareMongoUrl('tcp://192.168.99.104:27017'))
      .then((db) => {
        // db.close();
        return db.command({ replSetGetConfig: 1 });
      })
      .then((resp) => {
        console.log(resp);
      })
      .catch((e) => {
        console.error(e);
      })
  }

  function replSetGetStatus(uri: string): Promise<ReplSetStatus> {
    return <Promise<ReplSetStatus>>connToDb(uri)
      .then((db) => {
        return db.command({
          replSetGetStatus: 1
        }).then((resp) => {
          db.close();
          return Promise.resolve(resp);
        })
      });
  }

  function replSetGetStatusTest() {
    const mongodbUri = prepareMongoUrl(`tcp://192.168.99.108:27017`);
    replSetGetStatus(mongodbUri)
      .then((status: ReplSetStatus) => {
        console.log(status);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function replSetReconfig(uri: string) {
    console.log('replSetReconfig', 1);
    
    return (conf: ReplSetConfig) => {
      console.log('replSetReconfig', 2, conf);

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
  };

  function replSetReconfigTest() {
    const host = '192.168.99.104:27017';
    const mongodbUri = prepareMongoUrl(`tcp://${host}`);

    replSetGetConfig(mongodbUri)
      .then((conf: ReplSetConfig) => {
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

  function isPrimaryDatabase(conf: MongodConf) {
    if (conf.me && conf.primary && conf.me === conf.primary) {
      return true;
    }
  }

  function isPrimaryDatabaseTest() {
    let host = '127.0.0.1:27017';
    let conf: MongodConf = {
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

  function fetchServices(manulUrl: string) {
    interface Opts {
      filters: {
        status: string[],
        label: string[]
      }
    }

    return (opts: Opts) => {
      return <Promise<string[]>>new Promise<string[]>((resolve: (services: string[]) => void, reject: (err) => void) => {
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
          resolve(body.split(',').map(str => str.trim()));
        });
      });
    };
  }

  function schedule<T>(timeStart: number, miliseconds: number, forever: () => void): void {
    let timeEnd = +new Date;
    let delta = (timeEnd - timeStart);
    let ms = delta < miliseconds ? miliseconds - delta : 0;
    // console.log('fn will be started in %s ms', ms);
    setTimeout(() => forever(), ms);
  }

  export function fetchServicesFromDockerSwarm(manulUrl: string): Promise<string[]> {
    return fetchServices(manulUrl)({
      filters: {
        status: ['running'],
        label: ['service=mongo', 'replset=rs0']
      }
    });
  }

  export interface ReplSet {
    conf: ReplSetConfig;
    status: ReplSetStatus
  }

  export function sync(fetchServices: Promise<string[]>): Promise<ReplSet> {
    return <Promise<ReplSet>>fetchServices
      .then((services: string[]) => {
        console.log('sync', 0, services);

        if (!services.length) {
          return Promise.resolve(<ReplSet>{});
        }

        return fetchPrimaryDatabase(services)
          .then((primary: string) => {
            primary = prepareMongoUrl(primary);
            console.log('sync', 1, primary);

            return Promise.props({
              conf: replSetGetConfig(primary),
              status: replSetGetStatus(primary)
            }).then((replset: { conf: ReplSetConfig, status: ReplSetStatus }) => {
              const addToReplset: ReplSetMember[] = selectMembersToAdd(services, primary, replset.conf.members)
                .map((srv) => Object({ host: url.parse(srv).host }));

              console.log('sync', 2, addToReplset);

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

  export function forever<T>(fn: () => Promise<T>, cb?: (Error?, any?) => void, miliseconds?: number): void {
    miliseconds = miliseconds || 5000;

    let timeStart = +new Date;
    fn()
      .then((res) => {
        if (cb) cb(null, res);
        schedule(timeStart, miliseconds, forever.bind(null, fn, cb, miliseconds));
      })
      .catch((err) => {
        if (cb) cb(err);
        schedule(timeStart, miliseconds, forever.bind(null, fn, cb, miliseconds));
      });
  }

  if (global['describe']) {
    describe('#prepareReplSetConfig()', () => {
      it('should return an uppdated ReplSetConfig', () => {
        return Promise.resolve(true);
      });
    });
  }
}

export = replset;