'use strict';

// MongoDb Topology Management
// 
// more info: http://mongodb.github.io/node-mongodb-native/2.1/reference/management/sdam-monitoring/

import Promise = require('bluebird');
import url = require('url');

const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

interface WriteConcern {
  w: number | string,
  wtimeout: number;
  j: boolean;
}

class WriteConcernOpts implements WriteConcern {
  w: number | string = 'majority';
  wtimeout: number = 0;
  j: boolean = false;

  constructor() { }
}

// @TODO: move to separate module
function fetchServices(manulUrl: string) {
  interface Opts {
    filters: {
      status: string[],
      label: string[]
    }
  }

  return (opts: Opts) => {
    return <Promise<string>>new Promise<string[]>((resolve: (services: string[]) => void, reject: (err) => void) => {
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
    }).then((services: string[]) => {
      services = services.map(uri => url.parse(uri).host);
      return Promise.resolve(services.join(','));
    });
  };
};

function mongoUrl(services: string) {
  return Promise.resolve(`mongodb://admin:password@${services}/dev?replSet=rs0`);
}

function forever(fn: () => void, ms?: number) {
  setInterval(() => {
    fn();
  }, ms || 2000);
}

function conndb() {
  let oldUrl;
  let oldConn;

  return (url: string) => {
    console.log('MongoDB Replica Set connection url %s', url);
    
    if (oldUrl && oldConn && oldUrl === url) {
      return Promise.resolve(oldConn);
    }

    if (oldConn) {
      oldConn.close();
    }

    return new Promise((resolve, reject) => {
      MongoClient.connect(url, {
        promiseLibrary: require('bluebird')
      }, (err, db) => {
        if (err) return reject(err);

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

function insertDoc<T>(doc: T, opts?: WriteConcern) {
  return (collection) => {
    return collection.insertOne(doc, opts)
      .tap(() => {
        console.log('Document successfuly inserted', doc);
        console.log();
      })
      .catch((err) => {
        console.error('Something went wrong when we were trying to insert document', doc);
        throw err;
      });
  };
}

function removeDoc(cond: any) {
  return (collection) => {
    return collection.deleteOne(cond)
      .tap(() => {
        console.log('Document successfuly removed', cond);
        console.log();
      })
      .catch((err) => {
        console.error('Something went wrong when we were trying to remove document', cond);
        throw err;
      });
  };
}

function findDoc(cond: any) {
  return (collection) => {
    return collection.find(cond).limit(1).toArray()
      .tap((docs) => {
        console.log('Document found', docs[0]);
        console.log();
      });
  };
}

function coll(db) : (collname: string) => Promise<any>  {
  return (collname: string) => {
    return Promise.resolve(db.collection(collname));
  };
}

function startApp() : void {
  // it's a manul (name may confuse :) microservice which fetching all services 
  // from Docker Swarm user Docker labels as tags for services in Docker Swarm
  // for the first time, you need to start manul using commands below from the root repo folder:
  //
  // $ docker-compose -f docker-compose/docker-compose.manul.yml build --pull
  // $ docker-compose -f docker-compose/docker-compose.manul.yml up -d
  // 
  const manulAdrr = process.env.MANUL_ADDR || 'http://192.168.99.102:3000';
  const services = fetchServices(manulAdrr);
  const connection = conndb();

  Promise.resolve({
    filters: {
      status: ['running'],
      label: ['service=mongo', 'replset=rs0']
    }
  }).then(services)
    .then(mongoUrl)
    .then(connection)
    .then((db) => {
      db.topology.on('serverDescriptionChanged', function(event) {
        console.log('received serverDescriptionChanged');
        console.log(JSON.stringify(event, null, 2));
      });

      db.topology.on('serverHeartbeatStarted', function(event) {
        console.log('received serverHeartbeatStarted');
        console.log(JSON.stringify(event, null, 2));
      });

      db.topology.on('serverHeartbeatSucceeded', function(event) {
        console.log('received serverHeartbeatSucceeded');
        console.log(JSON.stringify(event, null, 2));
      });

      db.topology.on('serverHearbeatFailed', function(event) {
        console.log('received serverHearbeatFailed');
        console.log(JSON.stringify(event, null, 2));
      });

      db.topology.on('serverOpening', function(event) {
        console.log('received serverOpening');
        console.log(JSON.stringify(event, null, 2));
      });

      db.topology.on('serverClosed', function(event) {
        console.log('received serverClosed');
        console.log(JSON.stringify(event, null, 2));
      });

      db.topology.on('topologyOpening', function(event) {
        console.log('received topologyOpening');
        console.log(JSON.stringify(event, null, 2));
      });

      db.topology.on('topologyClosed', function(event) {
        console.log('received topologyClosed');
        console.log(JSON.stringify(event, null, 2));
      });

      db.topology.on('topologyDescriptionChanged', function(event) {
        console.log('received topologyDescriptionChanged');
        console.log(JSON.stringify(event, null, 2));
      });
    });
}
startApp();