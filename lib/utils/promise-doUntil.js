'use strict';

var _ = require('lodash');
var async = require('async');

module.exports = function(Promise) {
  Promise.prototype.doUntil = function(arr, predicateFn, doSomethingFn, onCompleteFn, interval) {
    var args = arguments;
    var size = _.size(args);

    if ((size === 4 || size === 3) && !_.isArray(arr)) {
      interval = onCompleteFn;
      onCompleteFn = doSomethingFn;
      doSomethingFn = predicateFn;
      predicateFn = arr;

      var doUntil = function doUntil(done, interval, times) {
        times = times || 0;
        interval = interval || 250;

        var res;

        doSomethingFn()
          .tap(function(thing) {
            res = thing
          })
          .then(predicateFn)
          .then(function(state) {
            return Promise.delay(times === 0 ? 0 : interval)
              .then(function() {
                return Promise.resolve(state);
              });
          })
          .then(function(state) {
            if (!state) {
              return doUntil(done, interval, ++times);
            }

            return (onCompleteFn ? onCompleteFn(res) : Promise.resolve(res))
              .then(function(res) {
                return done(null, res);
              });
          })
          .error(done);
      };

      return new Promise(function(resolve, reject) {
        doUntil(function(err, res) {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        }, interval);
      });
    } else if ((size === 5 || size === 4) && _.isArray(arr)) {
      var doUntil = function doUntil(arr, iterator, done, interval, times) {
        times = times || 0;
        interval = interval || 0;

        var res;

        async.mapSeries(arr, function(thing, next) {
          iterator(thing)
            .tap(function(thing) {
              res = thing;
            })
            .then(predicateFn)
            .then(function(state) {
              return Promise.delay(times++ === 0 ? 0 : interval)
                .then(function() {
                  return Promise.resolve(state);
                });
            })
            .then(function(state) {
              if (!state) {
                return next();
              }

              var prom = onCompleteFn ? onCompleteFn(res) : Promise.resolve(res);
              if (!(prom instanceof Promise)) {
                prom = Promise.resolve(prom);
              }

              return prom
                .then(function(res) {
                  return done(null, res);
                });
            })
            .catch(next);
        }, function(err, results) {
          if (err) {
            return done(err);
          }
          return doUntil(arr, iterator, done, interval, times);
        });
      };

      return new Promise(function(resolve, reject) {
        doUntil(arr, doSomethingFn, function(err, res) {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        }, interval);
      });
    } else {
      return Promise.reject(new Error());
    }
  };

  Promise.doUntil = function() {
    var args = _.toArray(arguments);

    return function(resp) {
      if (_.isArray(resp)) {
        args.unshift(resp);
        return Promise.prototype.doUntil.apply(this, args);
      }

      var doSomethingFn = args[1];
      args[1] = function() {
        return doSomethingFn.call(null, resp);
      };

      return Promise.prototype.doUntil.apply(this, args);
    };
  };
};
