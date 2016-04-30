'use strict';
var url = require('url');
var Promise = require('bluebird');
var request = require('request');
function fetchServices(manulUrl) {
    return function (opts) {
        return new Promise(function (resolve, reject) {
            request({
                method: 'GET',
                url: manulUrl,
                qs: opts,
                json: true,
                timeout: 5 * 1000
            }, function (err, res, body) {
                if (err) {
                    return reject(err);
                }
                resolve(body.split(',').map(function (str) { return str.trim(); }));
            });
        }).then(function (services) {
            services = services.map(function (uri) { return url.parse(uri).host; });
            return Promise.resolve(services.join(','));
        });
    };
}
exports.fetchServices = fetchServices;
;
//# sourceMappingURL=fetchServices.js.map