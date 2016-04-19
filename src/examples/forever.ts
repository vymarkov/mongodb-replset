import {
  ReplSet,
  sync,
  forever,
  fetchServicesFromDockerSwarm as fetchServices
} from '../configurator';

// a number milliseconds between attempts to sync the replset 
const ms = 10 * 1000;
// the manul microservice address which retrieve the started containers using docker labels as conditions
const manulUrl = process.env.MANUL_ADDR;

forever(() => sync(fetchServices(manulUrl)), function proggres(err: Error, replset: ReplSet) {
  if (err) {
    console.error(err.stack);
  } else {
    console.dir(replset, {
      depth: null,
      colors: true
    });
  }
}, ms);