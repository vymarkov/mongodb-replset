'use strict';

import * as Promise from 'bluebird';
const redis = require('redis');
require('bluebird').promisifyAll(redis.RedisClient.prototype);

interface RedisClient {
  publish(channame: string, msg: any, cb: (Error?, any?) => void): void
  quit() : void
}

interface Chname {
  (): Promise<string>
}

export function pub(chname: Chname, body) {
  return (conn: RedisClient) => {
    return chname()
      .then((name) => {
        return new Promise((resolve, reject) => {
          conn.publish(name, JSON.stringify(body), (err, resp) => {
            if (err) return reject(err);
            resolve(true);
          });
        });
      });
  };
}

export function sub(ch: string, cb: (any) => void) {
  return (conn) => {
    return new Promise<boolean>((resolve, reject) => {
      conn.on('subscribe', () => {
        console.log('subscribed');
        resolve(true);
      });
      conn.on('message', (channel: string, body) => {
        if (channel === ch) {
          cb(JSON.parse(body));
        }
      });
      conn.subscribe(ch);
    });
  };
}

export function conndb(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const c = redis.createClient(url);
    c.on('ready', () => resolve(c));
    c.on('error', reject);
  });
}

export function duplconn(client) {
  return new Promise((resolve, reject) => {
    const c = client.duplicate();
    c.on('ready', () => resolve(c));
    c.on('error', reject);
  });
}

export function crearePubClient(redisurl: () => Promise<string>, channelname: Chname, cb: (Error?, any?) => void) {
  return (err, body) => {
    if (err) {
      cb(err);
    } else {
      redisurl()
        .then(conndb)
        .then(pub(channelname, body))
        .then(() => {
          console.log('message published');
          cb()
        })
        .catch(cb);
    }
  };
}