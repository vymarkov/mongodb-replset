'use strict';

module.exports = {
  type: 'object',
  properties: {
    _id: {
      type: 'integer'
    },
    host: {
      type: 'string',
      format: 'hostname'
    },
    arbiterOnly: {
      type: 'boolean'
    },
    buildIndexes: {
      type: 'boolean'
    },
    hidden: {
      type: 'boolean'
    },
    priority: {
      type: 'integer',
      minLength: 0,
      maxLength: 1000
    },
    slaveDelay: {
      type: 'integer'
    },
    votes: {
      type: 'number'
    }
  },
  required: ['_id', 'host'],
  additionalItems: true
};