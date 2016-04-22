'use strict';

import * as url from 'url';
import * as Promise from 'bluebird';

const request = require('request');

export function fetchServices(manulUrl: string) {
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
