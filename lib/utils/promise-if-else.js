'use strict';

var _ = require('lodash');

module.exports = function(Promise) {
  Promise.prototype.ifElse = function(predicatePromise, expressionFn, expressionPromiseOrFn2) {
    expressionPromiseOrFn2 = expressionPromiseOrFn2 || function() {
      return Promise.resolve();
    };

    return predicatePromise
      .then(function(ifStatement) {
        if (ifStatement) {
          return expressionFn();
        }
        return expressionPromiseOrFn2();
      });
  };

  Promise.prototype.if = Promise.prototype.ifElse;
  Promise.if = Promise.prototype.ifElse;
  Promise.ifElse = Promise.prototype.ifElse;

  Promise._call = function(ctx, method) {
    var args = arguments;
    if (_.isFunction(ctx)) {
      var l = 1;
      method = ctx;
      ctx = null;
    } else if (_.isObject(ctx) && _.isString(method)) {
      var l = 2;
      method = ctx[method];
    }

    return function() {
      return method.apply(ctx, _.takeRight(args, _.size(args) - l).concat(_.toArray(arguments)));
    };
  };
};
