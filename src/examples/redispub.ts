import { ReplSet, sync, forever, fetchServicesFromDockerSwarm as fetchServices } from '../configurator';
import {crearePubClient} from '../publishers/redis';
import * as Promise from 'bluebird';

// a number milliseconds between attempts to sync the replset 
const ms = 10 * 1000;
// the manul microservice address which retrieve the started containers using docker labels as conditions
const manulUrl = process.env.MANUL_ADDR;
const redisUrl = process.env.REDIS_ADDR || 'redis://redis:6379/1';
const channelname = process.env.REDIS_CHANNEL_NAME || 'replset';

const chname = () => Promise.resolve(channelname);
const redisAddr = () => Promise.resolve(redisUrl);
const errch = (err) => {
  // an error can be passed from the sync function or crearePubClient directly 
  if (err) {
    console.error(err);
  }
};
const progress = crearePubClient(redisAddr, chname, errch);
const services = fetchServices(manulUrl);
forever(() => sync(services), progress, ms);