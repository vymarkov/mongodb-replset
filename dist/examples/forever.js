"use strict";
const configurator_1 = require('../configurator');
const ms = 10 * 1000;
const manulUrl = process.env.MANUL_ADDR;
configurator_1.forever(() => configurator_1.sync(configurator_1.fetchServicesFromDockerSwarm(manulUrl)), function proggres(err, replset) {
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