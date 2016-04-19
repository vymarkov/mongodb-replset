'use strict';

module.exports.usePromise = function usePromise(Promise) {
  require('./promise-if-else')(Promise);
  require('./promise-doUntil')(Promise);
  
  return Promise;
};
