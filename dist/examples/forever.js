"use strict";
var configurator_1 = require('../configurator');
var ms = 10 * 1000;
var manulUrl = process.env.MANUL_ADDR;
configurator_1.forever(function () { return configurator_1.sync(configurator_1.fetchServicesFromDockerSwarm(manulUrl)); }, function proggres(err, replset) {
    if (err) {
        console.error(err.stack);
    }
    else {
        console.dir(replset, {
            depth: null,
            colors: true
        });
    }
}, ms);
//# sourceMappingURL=forever.js.map