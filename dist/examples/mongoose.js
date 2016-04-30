'use strict';
var fetchServices_1 = require('../fetchServices');
var Promise = require('bluebird');
var READ_PREFERENCES_PRIMARY = 'primary';
var READ_PREFERENCES_SECONDARY = 'secondary';
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var mongodbUri = require('mongodb-uri');
var Schema = mongoose.Schema;
var UserSchema = Schema({
    username: String,
    email: String
}, {
    read: 'secondary',
    safe: { w: 'majority', wtimeout: 10000 }
});
function mongoUrl(services) {
    return Promise.resolve({
        filters: {
            status: ['running'],
            label: ['service=mongo', 'replset=rs0']
        }
    })
        .then(services)
        .then(function (services) {
        console.log(services);
        var obj = {
            username: 'admin',
            password: 'password',
            hosts: services.split(',').map(function (url) {
                return {
                    host: url.split(':')[0],
                    port: url.split(':')[1] || 27017
                };
            }),
            database: 'dev',
            options: {
                replSet: 'rs0'
            }
        };
        return Promise.resolve(mongodbUri.format(obj));
    });
}
function connection(url, schemas) {
    var cachedUrl, cachedConn;
    return function () {
        return Promise.props({
            url: url(),
            schemas: schemas()
        })
            .then(function (m) {
            if (cachedUrl && cachedConn && cachedUrl === m.url) {
                return Promise.resolve(cachedConn);
            }
            cachedUrl = m.url;
            return new Promise(function (resolve, reject) {
                cachedConn = mongoose.createConnection(m.url);
                mongoose.set('debug', true);
                cachedConn.on('error', function (err) {
                    console.log('ocurred error', err.stack);
                });
                cachedConn.on('connected', function () {
                    console.log('---');
                    console.log('MongoDB Replica Set connection url %s', m.url);
                    console.log('Connected correctly to server');
                    console.log('---');
                    Object.keys(m.schemas).forEach(function (schemaname) { return cachedConn.model(m.schemas[schemaname]); });
                    resolve(cachedConn);
                });
                cachedConn.on('all', function () {
                    console.log('All members of the replica set are connected');
                });
                cachedConn.on('fullsetup', function () {
                    console.log('A primary and at least one secondary are connected');
                });
            });
        });
    };
}
function main() {
    var schemas = function () {
        var schemas = {};
        schemas['User'] = UserSchema;
        return Promise.resolve(schemas);
    };
    var manulAdrr = process.env.MANUL_ADDR || 'http://192.168.99.102:3000';
    var services = fetchServices_1.fetchServices(manulAdrr);
    var url = function () { return mongoUrl(services); };
    var conn = connection(url, schemas);
    setInterval(function () {
        conn()
            .tap(function (conn) {
            var User = conn.model('User');
            return User.create({ username: 'mike', email: 'mike@gmail.com' })
                .delay(1500)
                .then(function (doc) {
                console.log('User successfully added', doc);
                return User.findOne({ username: 'mike' });
            })
                .delay(1500)
                .then(function (doc) {
                console.log('User found', doc);
            });
        });
    }, 5000);
}
main();
//# sourceMappingURL=mongoose.js.map